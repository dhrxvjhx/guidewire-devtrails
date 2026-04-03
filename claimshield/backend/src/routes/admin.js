// src/routes/admin.js
// Admin-only routes — manual cycle trigger, stats, fraud review.

const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { requireAuth } = require('../middleware/auth');
const { runTriggerCycle } = require('../scheduler');

// POST /api/admin/trigger-cycle — manually run a scheduler cycle (for demo)
router.post('/trigger-cycle', requireAuth, async (req, res) => {
    console.log(`[ADMIN] Manual cycle triggered by ${req.uid}`);
    try {
        const stats = await runTriggerCycle();
        return res.status(200).json({ message: 'Cycle complete', stats });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/simulate-trigger
// Body: { city: 'chennai', triggerType: 'rainfall' }
// Forces a trigger to fire regardless of real weather — for demo only.
router.post('/simulate-trigger', requireAuth, async (req, res) => {
    const { city = 'chennai', triggerType = 'rainfall' } = req.body;
    const { simulateTrigger } = require('../services/triggerEngine');
    const { batchScore } = require('../services/clsEngine');
    const { processPayout } = require('../services/payoutService');
    const { getEligiblePolicies, saveTriggerEvent, completeTriggerEvent } = require('../services/triggerEngine');

    console.log(`\n[ADMIN] 🧪 Simulating ${triggerType} trigger in ${city}...`);

    try {
        const trigger = await simulateTrigger(city, triggerType);
        const triggerId = await saveTriggerEvent({ ...trigger, simulated: true });
        const policies = await getEligiblePolicies(city, trigger.eligiblePlans);

        console.log(`[ADMIN] Found ${policies.length} eligible policies`);

        if (policies.length === 0) {
            return res.status(200).json({
                message: `Trigger fired but no active ${trigger.eligiblePlans.join('/')} policies found in ${city}. Create a policy first.`,
                trigger,
                policies: 0,
            });
        }

        const clsResults = await batchScore(policies, trigger);
        const payouts = [];

        for (let i = 0; i < policies.length; i++) {
            const result = await processPayout(policies[i], trigger, clsResults[i], triggerId);
            payouts.push(result);
        }

        const green = payouts.filter(p => p.clsTier === 'GREEN').length;
        const amber = payouts.filter(p => p.clsTier === 'AMBER').length;
        const red = payouts.filter(p => p.clsTier === 'RED').length;
        const paid = payouts.filter(p => p.clsTier === 'GREEN').reduce((s, p) => s + p.amount, 0);

        await completeTriggerEvent(triggerId, { policiesFound: policies.length, green, amber, red, totalPaid: paid, simulated: true });

        return res.status(200).json({
            message: `Simulation complete — ₹${paid} paid to ${green} workers`,
            trigger: { type: triggerType, city, name: trigger.name },
            stats: { total: policies.length, green, amber, red, totalPaid: paid },
            payouts,
        });

    } catch (err) {
        console.error('[ADMIN] Simulate error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/stats — platform-wide stats for admin dashboard
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const [usersSnap, policiesSnap, payoutsSnap, fraudSnap, txSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('policies').where('status', '==', 'active').get(),
            db.collection('payouts').where('status', '==', 'paid').get(),
            db.collection('fraud_events').get(),
            db.collection('transactions').where('category', '==', 'premium').where('status', '==', 'completed').get(),
        ]);

        const totalPaid = payoutsSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);
        const fraudPrevented = fraudSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);
        const totalPremiums = txSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);

        return res.status(200).json({
            totalWorkers: usersSnap.size,
            activePolicies: policiesSnap.size,
            totalPayouts: totalPaid,
            totalPremiums,
            fraudPrevented,
            payoutCount: payoutsSnap.size,
        });
    } catch (err) {
        console.error('[ADMIN] stats error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/triggers/recent — last 20 trigger events
router.get('/triggers/recent', requireAuth, async (req, res) => {
    try {
        const snapshot = await db.collection('triggers')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        const triggers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        return res.status(200).json({ triggers });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;