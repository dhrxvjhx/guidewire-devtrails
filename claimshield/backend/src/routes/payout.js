// src/routes/payout.js
// Payout history + manual payout release (for AMBER → GREEN after verification)

const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { requireAuth } = require('../middleware/auth');
const { createPayout } = require('../services/razorpayService');
const payoutService = require('../services/payoutService');

// GET /api/payouts/mine — worker's payout history
router.get('/mine', requireAuth, async (req, res) => {
    try {
        const snapshot = await db.collection('payouts')
            .where('userId', '==', req.uid)
            .get();

        const payouts = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 20);

        return res.status(200).json({ payouts });
    } catch (err) {
        console.error('[PAYOUT] fetch error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch payouts' });
    }
});

// GET /api/payouts/all — admin: all payouts across platform
router.get('/all', requireAuth, async (req, res) => {
    const limit = Number(req.query.limit) || 50;
    try {
        const snapshot = await db.collection('payouts').get();
        const payouts = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);

        return res.status(200).json({ payouts });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch payouts' });
    }
});

// POST /api/payouts/release/:payoutId — release an AMBER payout after verification
router.post('/release/:payoutId', requireAuth, async (req, res) => {
    const { payoutId } = req.params;

    try {
        const payoutDoc = await db.collection('payouts').doc(payoutId).get();
        if (!payoutDoc.exists) return res.status(404).json({ error: 'Payout not found' });

        const payout = payoutDoc.data();
        if (payout.status !== 'pending_verification') {
            return res.status(400).json({ error: `Payout is ${payout.status} — cannot release` });
        }

        // Fetch worker UPI ID
        const userDoc = await db.collection('users').doc(payout.userId).get();
        const user = userDoc.data() || {};

        // Fire Razorpay
        const rzpResult = await createPayout({
            amount: payout.amount,
            upiId: user.upiId || 'default@upi',
            workerName: user.name || 'Worker',
            payoutId,
            note: `ClaimShield — ${payout.triggerName}`,
        });

        const now = new Date().toISOString();

        // Update payout record
        await db.collection('payouts').doc(payoutId).update({
            status: 'paid',
            razorpayId: rzpResult.id,
            utr: rzpResult.utr,
            releasedAt: now,
            releasedBy: req.uid,
        });

        // Credit wallet
        await payoutService.creditWallet(payout.userId, payout.amount, {
            payoutId,
            triggerId: payout.triggerId,
            triggerName: payout.triggerName,
            clsTier: 'GREEN',
            createdAt: now,
        });

        // Update policy stats
        const policyDoc = await db.collection('policies').doc(payout.policyId).get();
        if (policyDoc.exists) {
            const p = policyDoc.data();
            await policyDoc.ref.update({
                eventsThisWeek: (p.eventsThisWeek || 0) + 1,
                totalPayoutsReceived: (p.totalPayoutsReceived || 0) + payout.amount,
            });
        }

        return res.status(200).json({
            message: `₹${payout.amount} released to ${user.name}`,
            razorpayId: rzpResult.id,
            utr: rzpResult.utr,
            mock: rzpResult.mock || false,
        });
    } catch (err) {
        console.error('[PAYOUT] release error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// POST /api/payouts/appeal
// Worker raises a dispute on a blocked payout
router.post('/appeal', requireAuth, async (req, res) => {
    const { payoutId, reason } = req.body;
    if (!payoutId || !reason) {
        return res.status(400).json({ error: 'payoutId and reason are required' });
    }

    try {
        await db.collection('appeals').add({
            userId: req.uid,
            payoutId,
            reason,
            status: 'open',
            createdAt: new Date().toISOString(),
        });

        return res.status(200).json({
            message: 'Appeal submitted. Our team will review within 24 hours.',
        });
    } catch (err) {
        console.error('[APPEAL] error:', err.message);
        return res.status(500).json({ error: 'Failed to submit appeal' });
    }
});

module.exports = router;