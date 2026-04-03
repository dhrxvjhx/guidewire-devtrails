// THE SCHEDULER — replaces the stub from Module 1.
// Runs every 5 minutes. Orchestrates the full parametric insurance loop.
//
// Every cycle:
//   1. Fetch weather for all 4 cities
//   2. Evaluate 5 triggers
//   3. For each fired trigger → find eligible policies
//   4. Run CLS on each worker
//   5. Process payouts (GREEN instant, AMBER hold, RED block)
//   6. Log everything to Firestore
//
// Every Sunday midnight:
//   → Deduct weekly premiums from all active policies

const cron = require('node-cron');
const { fetchAllCities } = require('./services/weatherService');
const { evaluateTriggers, saveTriggerEvent, completeTriggerEvent, getEligiblePolicies } = require('./services/triggerEngine');
const { batchScore } = require('./services/clsEngine');
const { processPayout, deductWeeklyPremiums } = require('./services/payoutService');

// ── Circuit breaker state ──────────────────────────────────────────────────
// Prevents pool drain. If total payouts in a cycle exceed the cap, stop.
const CIRCUIT_BREAKER = {
  maxPayoutPerCycle: 500000,   // ₹5 lakh per 5-min cycle
  tripped: false,
  tripCount: 0,
};

// ── Main trigger cycle ─────────────────────────────────────────────────────
async function runTriggerCycle() {
  const cycleStart = Date.now();
  console.log(`\n[SCHEDULER] ━━━ Cycle started at ${new Date().toISOString()} ━━━`);

  // Reset circuit breaker each cycle
  CIRCUIT_BREAKER.tripped = false;
  let cyclePayoutTotal = 0;

  const stats = {
    citiesChecked: 0,
    triggersFound: 0,
    policiesEvaluated: 0,
    green: 0, amber: 0, red: 0,
    totalPaid: 0,
    errors: 0,
  };

  try {
    // ── Step 1: Fetch weather ──────────────────────────────────────────────
    console.log('[SCHEDULER] Step 1: Fetching weather data...');
    const weatherData = await fetchAllCities();
    stats.citiesChecked = weatherData.length;

    console.log('[SCHEDULER] Weather summary:');
    weatherData.forEach(w => {
      console.log(`  ${w.city.padEnd(12)} rain=${w.rainfall}mm  temp=${w.temp}°C  alert=${w.alertLevel}  source=${w.source}`);
    });

    // ── Step 2: Evaluate triggers per city ────────────────────────────────
    console.log('\n[SCHEDULER] Step 2: Evaluating triggers...');

    for (const weather of weatherData) {
      const firedTriggers = evaluateTriggers(weather);

      if (firedTriggers.length === 0) {
        console.log(`  ${weather.city}: no triggers fired`);
        continue;
      }

      console.log(`  ${weather.city}: ${firedTriggers.length} trigger(s) fired — ${firedTriggers.map(t => t.name).join(', ')}`);
      stats.triggersFound += firedTriggers.length;

      // ── Step 3: Process each fired trigger ──────────────────────────────
      for (const trigger of firedTriggers) {
        if (CIRCUIT_BREAKER.tripped) {
          console.warn('[CIRCUIT BREAKER] ⚡ Tripped — skipping remaining payouts this cycle');
          break;
        }

        // Save trigger event to Firestore
        const triggerId = await saveTriggerEvent(trigger);
        console.log(`\n  [TRIGGER] ${trigger.icon} ${trigger.name} in ${trigger.city} — id: ${triggerId}`);

        // ── Step 4: Find eligible policies ────────────────────────────────
        const policies = await getEligiblePolicies(trigger.city, trigger.eligiblePlans);
        console.log(`  [TRIGGER] ${policies.length} eligible policies found`);

        if (policies.length === 0) {
          await completeTriggerEvent(triggerId, { policiesFound: 0 });
          continue;
        }

        stats.policiesEvaluated += policies.length;

        // ── Step 5: Run CLS on all workers ────────────────────────────────
        console.log(`  [CLS] Running fraud check on ${policies.length} workers...`);
        const clsResults = await batchScore(policies, trigger);

        const tierCounts = { GREEN: 0, AMBER: 0, RED: 0 };
        clsResults.forEach(r => tierCounts[r.tier]++);
        console.log(`  [CLS] Results — GREEN: ${tierCounts.GREEN} | AMBER: ${tierCounts.AMBER} | RED: ${tierCounts.RED}`);

        // ── Step 6: Process payouts ───────────────────────────────────────
        console.log(`  [PAYOUT] Processing ${tierCounts.GREEN} green payouts...`);

        for (let i = 0; i < policies.length; i++) {
          const policy = policies[i];
          const clsResult = clsResults[i];

          // Circuit breaker check
          const payoutAmt = Math.round(policy.coveragePerEvent * trigger.payoutMultiplier);
          if (cyclePayoutTotal + payoutAmt > CIRCUIT_BREAKER.maxPayoutPerCycle) {
            CIRCUIT_BREAKER.tripped = true;
            CIRCUIT_BREAKER.tripCount++;
            console.warn(`  [CIRCUIT BREAKER] ⚡ Cap reached at ₹${cyclePayoutTotal} — stopping`);
            break;
          }

          try {
            const result = await processPayout(policy, trigger, clsResult, triggerId);

            if (clsResult.tier === 'GREEN') {
              cyclePayoutTotal += payoutAmt;
              stats.totalPaid += payoutAmt;
              stats.green++;
            } else if (clsResult.tier === 'AMBER') {
              stats.amber++;
            } else {
              stats.red++;
            }
          } catch (err) {
            console.error(`  [PAYOUT] Error for ${policy.userId.slice(0, 8)}:`, err.message);
            stats.errors++;
          }
        }

        // Mark trigger complete
        await completeTriggerEvent(triggerId, {
          policiesFound: policies.length,
          green: tierCounts.GREEN,
          amber: tierCounts.AMBER,
          red: tierCounts.RED,
          totalPaid: stats.totalPaid,
          circuitTripped: CIRCUIT_BREAKER.tripped,
        });
      }
    }

  } catch (err) {
    console.error('[SCHEDULER] Cycle error:', err.message);
    stats.errors++;
  }

  const elapsed = ((Date.now() - cycleStart) / 1000).toFixed(1);
  console.log(`\n[SCHEDULER] ━━━ Cycle complete in ${elapsed}s ━━━`);
  console.log(`  Cities: ${stats.citiesChecked} | Triggers: ${stats.triggersFound} | Workers: ${stats.policiesEvaluated}`);
  console.log(`  GREEN: ${stats.green} | AMBER: ${stats.amber} | RED: ${stats.red} | Paid: ₹${stats.totalPaid}`);
  if (stats.errors > 0) console.warn(`  Errors: ${stats.errors}`);

  return stats;
}

// ── Cron jobs ──────────────────────────────────────────────────────────────

// Every 5 minutes — trigger checks + payouts
cron.schedule('*/5 * * * *', async () => {
  try {
    await runTriggerCycle();
  } catch (err) {
    console.error('[SCHEDULER] Unhandled cycle error:', err);
  }
});

// Every Sunday at midnight — premium deduction
cron.schedule('0 0 * * 0', async () => {
  console.log('\n[SCHEDULER] ━━━ Sunday premium deduction ━━━');
  try {
    const result = await deductWeeklyPremiums();
    console.log(`[PREMIUMS] Complete — ${result.deducted} deducted, ${result.failed} failed`);
  } catch (err) {
    console.error('[SCHEDULER] Premium deduction error:', err);
  }
});

// Reset weekly event counters every Monday at midnight
cron.schedule('0 0 * * 1', async () => {
  console.log('[SCHEDULER] Resetting weekly event counters...');
  try {
    const snapshot = await require('./firebase').db
      .collection('policies').where('status', '==', 'active').get();
    const batch = require('./firebase').db.batch();
    snapshot.docs.forEach(doc => batch.update(doc.ref, { eventsThisWeek: 0 }));
    await batch.commit();
    console.log(`[SCHEDULER] Reset ${snapshot.size} policies`);
  } catch (err) {
    console.error('[SCHEDULER] Reset error:', err);
  }
});

// Export for manual trigger (used in admin routes + testing)
module.exports = { runTriggerCycle };