// Payout Engine — moves money after CLS approves.
// GREEN  → instant payout, wallet credited, transaction logged
// AMBER  → payout held, worker notified (push in prod, log for now)
// RED    → blocked, fraud logged, appeal path recorded

const { db } = require('../firebase');

// ── Process a single payout ────────────────────────────────────────────────
async function processPayout(policy, trigger, clsResult, triggerId) {
    const now = new Date().toISOString();
    const payoutAmt = Math.round(policy.coveragePerEvent * trigger.payoutMultiplier);

    // Build payout record
    const payoutData = {
        userId: policy.userId,
        policyId: policy.id,
        triggerId,
        triggerType: trigger.type,
        triggerName: trigger.name,
        city: trigger.city,
        amount: payoutAmt,
        clsScore: clsResult.score,
        clsTier: clsResult.tier,
        clsSignals: clsResult.signals || {},
        status: clsResult.tier === 'GREEN' ? 'paid'
            : clsResult.tier === 'AMBER' ? 'pending_verification'
                : 'blocked',
        createdAt: now,
        mobilityEligible: policy.mobilityEligible || false,
        detectedPincode: policy.detectedPincode || null,
        detectedWard: policy.detectedWard || null,
    };

    const payoutRef = await db.collection('payouts').add(payoutData);

    if (clsResult.tier === 'GREEN') {
        await creditWallet(policy.userId, payoutAmt, {
            payoutId: payoutRef.id,
            triggerId,
            triggerName: trigger.name,
            clsTier: 'GREEN',
            createdAt: now,
        });

        // Increment events used this week on the policy
        await db.collection('policies').doc(policy.id).update({
            eventsThisWeek: (policy.eventsThisWeek || 0) + 1,
            totalPayoutsReceived: (policy.totalPayoutsReceived || 0) + payoutAmt,
            updatedAt: now,
        });

        console.log(`[PAYOUT] ✓ GREEN ₹${payoutAmt} → ${policy.userId.slice(0, 8)}... (CLS: ${clsResult.score})`);

    } else if (clsResult.tier === 'AMBER') {
        // Payout held — NO wallet credit, NO transaction yet.
        // Transaction is written only when admin releases via /payouts/release/:id
        console.log(`[PAYOUT] ⚠ AMBER held ₹${payoutAmt} → ${policy.userId.slice(0, 8)}... (CLS: ${clsResult.score})`);

    } else {
        // RED — blocked, log for audit
        await db.collection('fraud_events').add({
            userId: policy.userId,
            policyId: policy.id,
            triggerId,
            clsScore: clsResult.score,
            clsSignals: clsResult.signals || {},
            amount: payoutAmt,
            reason: 'CLS RED — automated block',
            appealOpen: true,
            createdAt: now,
        });

        console.log(`[PAYOUT] ✗ RED blocked ₹${payoutAmt} → ${policy.userId.slice(0, 8)}... (CLS: ${clsResult.score})`);
    }

    return { payoutId: payoutRef.id, ...payoutData };
}

// ── Credit wallet + log transaction ───────────────────────────────────────
async function creditWallet(userId, amount, meta) {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const current = userDoc.data()?.walletBalance || 0;
    const newBal = current + amount;

    await userRef.update({ walletBalance: newBal });

    await db.collection('transactions').add({
        userId,
        type: 'credit',
        category: 'payout',
        amount,
        reason: `${meta.triggerName} — auto payout`,
        status: 'completed',
        clsTier: meta.clsTier,
        payoutId: meta.payoutId,
        triggerId: meta.triggerId,
        createdAt: meta.createdAt,
    });

    return newBal;
}

// ── Sunday premium deduction ───────────────────────────────────────────────
async function deductWeeklyPremiums() {
    console.log('[PREMIUMS] Starting weekly deduction...');

    const snapshot = await db.collection('policies')
        .where('status', '==', 'active')
        .get();

    const policies = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    let deducted = 0, failed = 0;

    for (const policy of policies) {
        try {
            const userRef = db.collection('users').doc(policy.userId);
            const userDoc = await userRef.get();
            const balance = userDoc.data()?.walletBalance || 0;
            const now = new Date().toISOString();

            if (balance >= policy.premium) {
                // Enough balance — deduct
                await userRef.update({ walletBalance: balance - policy.premium });

                await db.collection('transactions').add({
                    userId: policy.userId,
                    policyId: policy.id,
                    type: 'debit',
                    category: 'premium',
                    amount: policy.premium,
                    reason: `${policy.planName} — weekly premium`,
                    status: 'completed',
                    createdAt: now,
                });

                // Reset weekly event counter + advance billing date
                const nextBilling = new Date();
                nextBilling.setDate(nextBilling.getDate() + 7);

                await db.collection('policies').doc(policy.id).update({
                    eventsThisWeek: 0,
                    nextBillingDate: nextBilling.toISOString(),
                    totalPremiumsPaid: (policy.totalPremiumsPaid || 0) + policy.premium,
                    updatedAt: now,
                });

                deducted++;
            } else {
                // Insufficient balance — pause policy
                await db.collection('policies').doc(policy.id).update({
                    status: 'paused',
                    pausedReason: 'insufficient_balance',
                    updatedAt: now,
                });

                await db.collection('transactions').add({
                    userId: policy.userId,
                    policyId: policy.id,
                    type: 'debit',
                    category: 'premium',
                    amount: policy.premium,
                    reason: `${policy.planName} — premium FAILED (insufficient balance)`,
                    status: 'failed',
                    createdAt: now,
                });

                failed++;
                console.warn(`[PREMIUMS] ⚠ Insufficient balance for ${policy.userId.slice(0, 8)}... — policy paused`);
            }
        } catch (err) {
            console.error(`[PREMIUMS] Error for policy ${policy.id}:`, err.message);
            failed++;
        }
    }

    console.log(`[PREMIUMS] Done — ${deducted} deducted, ${failed} failed`);
    return { deducted, failed, total: policies.length };
}

module.exports = { processPayout, creditWallet, deductWeeklyPremiums };