// src/services/premiumEngine.js
const { getPincodeRisk } = require('../data/pincodeRisk');

// ── Plan definitions (unchanged) ──────────────────────────────────────────
const PLANS = {
  basic: {
    name: 'Basic Shield',
    basePremium: 29,
    coveragePerEvent: 150,
    maxEventsPerWeek: 1,
    triggers: ['rainfall', 'heat'],
  },
  standard: {
    name: 'Standard Shield',
    basePremium: 49,
    coveragePerEvent: 300,
    maxEventsPerWeek: 2,
    triggers: ['rainfall', 'heat', 'flood', 'platform_downtime'],
  },
  pro: {
    name: 'Pro Shield',
    basePremium: 79,
    coveragePerEvent: 600,
    maxEventsPerWeek: 3,
    triggers: ['rainfall', 'heat', 'flood', 'platform_downtime', 'pollution', 'curfew'],
  },
};

// ── Platform risk modifier ────────────────────────────────────────────────
const PLATFORM_RISK = {
  swiggy: 0.00,
  zomato: 0.00,
  zepto: 0.08,
  blinkit: 0.08,
  amazon: 0.05,
  flipkart: 0.05,
  dunzo: 0.03,
  default: 0.00,
};

// ── Earnings bracket ──────────────────────────────────────────────────────
function getEarningsBracket(avgDailyEarnings) {
  if (avgDailyEarnings < 500) return { label: 'Entry', coverageMultiplier: 0.75 };
  if (avgDailyEarnings < 800) return { label: 'Standard', coverageMultiplier: 1.00 };
  if (avgDailyEarnings < 1200) return { label: 'Active', coverageMultiplier: 1.25 };
  return { label: 'Power', coverageMultiplier: 1.50 };
}

// ── Main premium calculation — now pincode-aware ──────────────────────────
function calculatePremium(workerProfile) {
  const {
    plan = 'standard',
    city = 'chennai',
    pincode,                        // NEW — primary risk input
    zone = 'central',               // kept for backwards compat
    platform = 'swiggy',
    avgDailyEarnings = 900,
    hoursPerDay = 8,
    experienceMonths = 6,
  } = workerProfile;

  const planConfig = PLANS[plan] || PLANS.standard;
  const pincodeData = getPincodeRisk(pincode, city);
  const platformRisk = PLATFORM_RISK[platform?.toLowerCase()] || PLATFORM_RISK.default;
  const earningsBracket = getEarningsBracket(avgDailyEarnings);

  // ── Risk score (0–100) ───────────────────────────────────────────────────
  // Now uses pincode-level multiplier instead of broad zone
  const zoneScore = (pincodeData.riskMultiplier - 0.7) / 1.1 * 40;
  const platformScore = platformRisk * 100 * 0.15;
  const earningsScore = Math.min((avgDailyEarnings / 1500) * 25, 25);
  const hoursScore = Math.min((hoursPerDay / 14) * 10, 10);
  const newbieScore = experienceMonths < 3 ? 10 : 0;
  // Drainage quality affects risk — poor drainage = higher risk
  const drainageScore = (5 - pincodeData.drainageScore) * 3; // 0–12 pts

  const rawRiskScore = Math.round(
    zoneScore + platformScore + earningsScore + hoursScore + newbieScore + drainageScore
  );

  let riskBand;
  if (rawRiskScore < 30) riskBand = 'LOW';
  else if (rawRiskScore < 60) riskBand = 'MEDIUM';
  else riskBand = 'HIGH';

  // ── Premium adjustment ───────────────────────────────────────────────────
  const zoneAdjust = planConfig.basePremium * (pincodeData.riskMultiplier - 1.0);
  const platformAdjust = planConfig.basePremium * platformRisk;
  const expDiscount = experienceMonths >= 12 ? -5 : experienceMonths >= 6 ? -3 : 0;

  const adjustedPremium = Math.round(
    planConfig.basePremium + zoneAdjust + platformAdjust + expDiscount
  );

  const clampedPremium = Math.max(
    planConfig.basePremium - 12,
    Math.min(planConfig.basePremium + 20, adjustedPremium) // raised cap for VERY_HIGH zones
  );

  // ── Coverage cap ─────────────────────────────────────────────────────────
  const adjustedCoverage = Math.round(
    planConfig.coveragePerEvent * earningsBracket.coverageMultiplier
  );

  // ── Next billing ─────────────────────────────────────────────────────────
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const nextBilling = new Date(now);
  nextBilling.setDate(now.getDate() + daysUntilSunday);
  nextBilling.setHours(0, 0, 0, 0);

  return {
    plan,
    planName: planConfig.name,
    basePremium: planConfig.basePremium,
    adjustedPremium: clampedPremium,
    coveragePerEvent: adjustedCoverage,
    maxEventsPerWeek: planConfig.maxEventsPerWeek,
    maxWeeklyCoverage: adjustedCoverage * planConfig.maxEventsPerWeek,
    riskScore: Math.min(rawRiskScore, 100),
    riskBand,
    riskBreakdown: {
      zoneRisk: Math.round(zoneScore),
      platformRisk: Math.round(platformScore),
      earningsExposure: Math.round(earningsScore),
      hoursExposure: Math.round(hoursScore),
      drainageRisk: Math.round(drainageScore),
      experienceFlag: newbieScore,
    },

    // Pincode-level details (new)
    pincode: pincode || 'unknown',
    ward: pincodeData.ward,
    floodRisk: pincodeData.floodRisk,
    drainageScore: pincodeData.drainageScore,
    avgRainDaysPerYear: pincodeData.avgRainDays || 45,
    knownHazards: pincodeData.knownHazards,
    zone: pincodeData.ward, // ward name replaces zone label

    earningsBracket: earningsBracket.label,
    triggers: planConfig.triggers,
    nextBillingDate: nextBilling.toISOString(),

    actuarial: {
      targetLossRatio: 0.65,
      estimatedTriggerFrequencyPerMonth: estimateTriggerFrequency(city, plan, pincodeData.floodRisk),
      breakEvenPremium: computeBreakEven(adjustedCoverage, city, pincodeData.floodRisk),
      poolHealthy: clampedPremium >= computeBreakEven(adjustedCoverage, city, pincodeData.floodRisk) * 0.9,
    },
  };
}

function estimateTriggerFrequency(city, plan, floodRisk) {
  const baseFreq = { chennai: 2.3, mumbai: 2.1, hyderabad: 1.6, bengaluru: 1.0 };
  const riskMult = { LOW: 0.7, MEDIUM: 1.0, HIGH: 1.4, VERY_HIGH: 1.9 };
  const planMult = plan === 'pro' ? 1.4 : plan === 'standard' ? 1.0 : 0.6;
  return (((baseFreq[city] || 1.5) * (riskMult[floodRisk] || 1.0) * planMult)).toFixed(1);
}

function computeBreakEven(coveragePerEvent, city, floodRisk) {
  const freq = parseFloat(estimateTriggerFrequency(city, 'standard', floodRisk));
  return Math.round((freq * coveragePerEvent * 0.65) / 4);
}

module.exports = { calculatePremium, PLANS };