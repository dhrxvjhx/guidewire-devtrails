const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { calculatePremium, getModelInfo } = require('../services/mlPremiumModel');
const { getPincodesByCity } = require('../data/pincodeRisk');

router.get('/calculate', requireAuth, async (req, res) => {
  const {
    plan = 'standard', city = 'chennai', pincode,
    zone = 'central', platform = 'swiggy',
    avgDailyEarnings = 900, hoursPerDay = 8, experienceMonths = 6,
  } = req.query;

  try {
    const quote = calculatePremium({
      plan, city, pincode, zone, platform,
      avgDailyEarnings: Number(avgDailyEarnings),
      hoursPerDay: Number(hoursPerDay),
      experienceMonths: Number(experienceMonths),
    });

    const allPlans = ['basic', 'standard', 'pro'].map(p =>
      calculatePremium({
        plan: p, city, pincode, zone, platform,
        avgDailyEarnings: Number(avgDailyEarnings),
        hoursPerDay: Number(hoursPerDay),
        experienceMonths: Number(experienceMonths),
      })
    );

    return res.status(200).json({ quote, allPlans });
  } catch (err) {
    console.error('[PREMIUM] Calculation error:', err.message);
    return res.status(500).json({ error: 'Premium calculation failed' });
  }
});

router.get('/pincodes', (req, res) => {
  const { city } = req.query;
  if (!city) return res.status(400).json({ error: 'city is required' });
  const pincodes = getPincodesByCity(city);
  return res.status(200).json({ pincodes });
});

router.get('/plans', (req, res) => {
  const { PLANS } = require('../services/mlPremiumModel');
  return res.status(200).json({ plans: PLANS });
});

// Model introspection — judges can inspect the ML architecture
router.get('/model-info', (req, res) => {
  return res.status(200).json(getModelInfo());
});

module.exports = router;