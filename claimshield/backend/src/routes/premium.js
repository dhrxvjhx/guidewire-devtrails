// src/routes/premium.js
// Standalone premium calculation endpoint — used on plan selection screen
// to show live adjusted quote as worker changes their inputs.

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { calculatePremium, PLANS, ZONE_RISK } = require('../services/premiumEngine');

// GET /api/premium/calculate
// Query params: plan, city, zone, platform, avgDailyEarnings, hoursPerDay, experienceMonths
router.get('/calculate', requireAuth, async (req, res) => {
  const {
    plan = 'standard',
    city = 'chennai',
    zone = 'central',
    platform = 'swiggy',
    avgDailyEarnings = 900,
    hoursPerDay = 8,
    experienceMonths = 6,
  } = req.query;

  try {
    const quote = calculatePremium({
      plan,
      city,
      zone,
      platform,
      avgDailyEarnings: Number(avgDailyEarnings),
      hoursPerDay: Number(hoursPerDay),
      experienceMonths: Number(experienceMonths),
    });

    // Also return all 3 plan quotes for comparison
    const allPlans = ['basic', 'standard', 'pro'].map(p =>
      calculatePremium({
        plan: p, city, zone, platform,
        avgDailyEarnings: Number(avgDailyEarnings),
        hoursPerDay: Number(hoursPerDay),
        experienceMonths: Number(experienceMonths),
      })
    );

    return res.status(200).json({ quote, allPlans });
  } catch (err) {
    console.error('[PREMIUM] Calculation error:', err);
    return res.status(500).json({ error: 'Premium calculation failed' });
  }
});

// GET /api/premium/zones — return zone list for a city (used in onboarding dropdown)
router.get('/zones', (req, res) => {
  const { city } = req.query;
  if (!city) return res.status(400).json({ error: 'city is required' });

  const zones = Object.entries(ZONE_RISK)
    .filter(([key]) => key.startsWith(city + '-'))
    .map(([key, data]) => ({
      key,
      zone: key.split('-')[1],
      label: data.label,
      multiplier: data.multiplier,
      avgRainDays: data.avgRainDays,
    }));

  return res.status(200).json({ zones });
});

// GET /api/premium/plans — return plan definitions
router.get('/plans', (req, res) => {
  return res.status(200).json({ plans: PLANS });
});

const { getPincodesByCity, getRiskLabel } = require('../data/pincodeRisk');

// GET /api/premium/pincodes?city=chennai
// Returns all pincodes for a city with risk profiles — used in onboarding dropdown
router.get('/pincodes', (req, res) => {
  const { city } = req.query;
  if (!city) return res.status(400).json({ error: 'city is required' });

  const pincodes = getPincodesByCity(city);
  return res.status(200).json({ pincodes });
});

module.exports = router;
