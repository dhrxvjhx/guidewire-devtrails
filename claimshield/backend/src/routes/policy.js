// src/routes/policy.js
//
// Policy & Subscription Engine — the financial product layer.
//
// A "policy" is a weekly insurance contract. It:
//   - Has a premium (auto-deducted every Sunday)
//   - Has a coverage cap (max payout per event, per week)
//   - Has parametric triggers that can fire it
//   - Has a status: active | paused | cancelled | expired
//
// Routes:
//   POST /api/policy/create      → create + activate a new policy
//   GET  /api/policy/mine        → get current user's active policy
//   GET  /api/policy/history     → full policy history
//   PUT  /api/policy/pause       → pause (keep record, stop billing)
//   PUT  /api/policy/cancel      → cancel + end coverage
//   GET  /api/policy/quote       → get premium quote without creating policy

const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { requireAuth } = require('../middleware/auth');
const { calculatePremium, PLANS } = require('../services/premiumEngine');

// ─── POST /api/policy/create ─────────────────────────────────────────────
// Creates and activates a policy for the authenticated worker.
// Immediately charges the first premium from wallet (or marks as pending).
router.post('/create', requireAuth, async (req, res) => {
  const { plan = 'standard' } = req.body;

  if (!PLANS[plan]) {
    return res.status(400).json({ error: `Invalid plan: ${plan}. Choose basic, standard, or pro.` });
  }

  try {
    // Fetch worker profile — must have completed onboarding
    const userDoc = await db.collection('users').doc(req.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userDoc.data();
    if (!user.onboardingComplete) {
      return res.status(400).json({ error: 'Complete onboarding before creating a policy' });
    }

    // Check no active policy already exists
    const existing = await db.collection('policies')
      .where('userId', '==', req.uid)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(409).json({
        error: 'Active policy already exists. Cancel it before creating a new one.',
        existingPolicyId: existing.docs[0].id,
      });
    }

    // Compute premium for this worker + plan
    const quote = calculatePremium({
      plan,
      city: user.city,
      zone: user.zone,
      platform: user.platform,
      avgDailyEarnings: user.avgDailyEarnings,
      hoursPerDay: user.hoursPerDay,
      experienceMonths: user.experienceMonths,
    });

    // Build policy document
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const policyData = {
      userId: req.uid,
      userName: user.name,
      city: user.city,
      zone: user.zone,
      platform: user.platform,

      // Plan details
      plan,
      planName: quote.planName,
      premium: quote.adjustedPremium,
      basePremium: quote.basePremium,
      coveragePerEvent: quote.coveragePerEvent,
      maxEventsPerWeek: quote.maxEventsPerWeek,
      maxWeeklyCoverage: quote.maxWeeklyCoverage,
      triggers: quote.triggers,

      // Risk profile at time of policy creation
      riskScore: quote.riskScore,
      riskBand: quote.riskBand,

      // Dates
      status: 'active',
      startDate: now.toISOString(),
      currentWeekStart: weekStart.toISOString(),
      currentWeekEnd: weekEnd.toISOString(),
      nextBillingDate: quote.nextBillingDate,

      // Tracking
      eventsThisWeek: 0,
      totalPayoutsReceived: 0,
      totalPremiumsPaid: 0,

      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Write policy
    const policyRef = await db.collection('policies').add(policyData);

    // Log first premium charge as pending (scheduler will settle it)
    await db.collection('transactions').add({
      userId: req.uid,
      policyId: policyRef.id,
      type: 'debit',
      category: 'premium',
      amount: quote.adjustedPremium,
      reason: `${quote.planName} — first week premium`,
      status: 'pending',
      createdAt: now.toISOString(),
    });

    // Deduct from wallet
    const newBalance = (user.walletBalance || 0) - quote.adjustedPremium;
    await db.collection('users').doc(req.uid).update({
      walletBalance: newBalance,
      activePolicyId: policyRef.id,
    });

    return res.status(201).json({
      message: 'Policy created and activated',
      policyId: policyRef.id,
      policy: { id: policyRef.id, ...policyData },
      walletBalance: newBalance,
    });
  } catch (err) {
    console.error('[POLICY] Create error:', err);
    return res.status(500).json({ error: 'Failed to create policy' });
  }
});

// ─── GET /api/policy/mine ─────────────────────────────────────────────────
// Returns the active policy for the current user.
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('policies')
      .where('userId', '==', req.uid)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ policy: null, message: 'No active policy' });
    }

    const doc = snapshot.docs[0];
    return res.status(200).json({
      policy: { id: doc.id, ...doc.data() },
    });
  } catch (err) {
    console.error('[POLICY] Fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch policy' });
  }
});

// ─── GET /api/policy/history ──────────────────────────────────────────────
router.get('/history', requireAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('policies')
      .where('userId', '==', req.uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const policies = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ policies });
  } catch (err) {
    console.error('[POLICY] History error:', err);
    return res.status(500).json({ error: 'Failed to fetch policy history' });
  }
});

// ─── PUT /api/policy/pause ────────────────────────────────────────────────
router.put('/pause', requireAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('policies')
      .where('userId', '==', req.uid)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'No active policy to pause' });
    }

    const doc = snapshot.docs[0];
    await doc.ref.update({
      status: 'paused',
      pausedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json({ message: 'Policy paused. No premium will be charged until resumed.' });
  } catch (err) {
    console.error('[POLICY] Pause error:', err);
    return res.status(500).json({ error: 'Failed to pause policy' });
  }
});

// ─── PUT /api/policy/cancel ───────────────────────────────────────────────
router.put('/cancel', requireAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('policies')
      .where('userId', '==', req.uid)
      .where('status', 'in', ['active', 'paused'])
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'No active policy to cancel' });
    }

    const doc = snapshot.docs[0];
    await doc.ref.update({
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.collection('users').doc(req.uid).update({ activePolicyId: null });

    return res.status(200).json({ message: 'Policy cancelled. Coverage ends immediately.' });
  } catch (err) {
    console.error('[POLICY] Cancel error:', err);
    return res.status(500).json({ error: 'Failed to cancel policy' });
  }
});

// ─── GET /api/policy/quote ────────────────────────────────────────────────
// Get a premium quote without creating a policy (used on onboarding screen)
router.get('/quote', requireAuth, async (req, res) => {
  const { plan, city, zone, platform, avgDailyEarnings, hoursPerDay, experienceMonths } = req.query;

  try {
    const quote = calculatePremium({
      plan: plan || 'standard',
      city: city || 'chennai',
      zone: zone || 'central',
      platform: platform || 'swiggy',
      avgDailyEarnings: Number(avgDailyEarnings) || 900,
      hoursPerDay: Number(hoursPerDay) || 8,
      experienceMonths: Number(experienceMonths) || 6,
    });

    return res.status(200).json({ quote });
  } catch (err) {
    console.error('[POLICY] Quote error:', err);
    return res.status(500).json({ error: 'Failed to compute quote' });
  }
});

module.exports = router;
