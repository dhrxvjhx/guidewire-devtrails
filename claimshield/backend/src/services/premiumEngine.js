// src/services/premiumEngine.js
//
// THE ACTUARIAL BRAIN — This is what was missing from Phase 1.
//
// This engine takes a worker's profile and outputs:
//   - Adjusted weekly premium (₹)
//   - Coverage cap (₹ per event)
//   - Risk band (LOW / MEDIUM / HIGH)
//   - Risk score breakdown (for transparency to worker)
//
// Financial model:
//   Base loss ratio target: 65%
//   Premium pool (100 Standard workers): ₹4,900/week
//   Max payout exposure: ₹3,185 (65% of pool)
//   Trigger frequency (Chennai, monsoon): ~2.3 events/month
//
// ML note: In production this would be an XGBoost model trained on
// 6 months of hyper-local weather + claim data. For the demo it uses
// calibrated rule-based logic that produces the same shape of output.

// ─── Zone risk data ────────────────────────────────────────────────────────
// Multipliers derived from historical flood/rain/heat frequency per city-zone.
// Source: IMD district-level rainfall data + NDMA flood records (mocked).
const ZONE_RISK = {
  // Chennai zones
  'chennai-north':  { multiplier: 1.35, label: 'Flood-prone', avgRainDays: 62 },
  'chennai-south':  { multiplier: 1.20, label: 'Moderate risk', avgRainDays: 55 },
  'chennai-central':{ multiplier: 1.10, label: 'Low-moderate', avgRainDays: 48 },
  // Mumbai zones
  'mumbai-west':    { multiplier: 1.40, label: 'High flood risk', avgRainDays: 71 },
  'mumbai-east':    { multiplier: 1.25, label: 'Moderate flood', avgRainDays: 64 },
  'mumbai-central': { multiplier: 1.15, label: 'Moderate', avgRainDays: 58 },
  // Hyderabad zones
  'hyderabad-north':{ multiplier: 1.30, label: 'Heat + rain risk', avgRainDays: 45 },
  'hyderabad-south':{ multiplier: 1.20, label: 'Moderate', avgRainDays: 40 },
  // Bengaluru zones
  'bengaluru-north':{ multiplier: 0.95, label: 'Low risk', avgRainDays: 38 },
  'bengaluru-south':{ multiplier: 0.85, label: 'Very low risk', avgRainDays: 32 },
  // Default fallback
  'default':        { multiplier: 1.00, label: 'Standard', avgRainDays: 45 },
};

// ─── Platform risk modifier ────────────────────────────────────────────────
// Zepto/Blinkit workers do more night shifts → higher heat exposure in summer
const PLATFORM_RISK = {
  swiggy:   0.00,
  zomato:   0.00,
  zepto:    0.08,   // night shifts, more heat exposure
  blinkit:  0.08,
  amazon:   0.05,   // longer routes = more weather exposure
  flipkart: 0.05,
  dunzo:    0.03,
  default:  0.00,
};

// ─── Plan definitions ──────────────────────────────────────────────────────
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

// ─── Earnings bracket adjustment ──────────────────────────────────────────
// Workers with higher daily earnings get proportionally larger coverage
function getEarningsBracket(avgDailyEarnings) {
  if (avgDailyEarnings < 500)  return { label: 'Entry',    coverageMultiplier: 0.75 };
  if (avgDailyEarnings < 800)  return { label: 'Standard', coverageMultiplier: 1.00 };
  if (avgDailyEarnings < 1200) return { label: 'Active',   coverageMultiplier: 1.25 };
  return                               { label: 'Power',    coverageMultiplier: 1.50 };
}

// ─── Main premium calculation function ────────────────────────────────────
/**
 * calculatePremium(workerProfile) → PremiumQuote
 *
 * workerProfile: {
 *   plan: 'basic' | 'standard' | 'pro'
 *   city: 'chennai' | 'mumbai' | 'hyderabad' | 'bengaluru'
 *   zone: 'north' | 'south' | 'central'          (sub-area of city)
 *   platform: 'swiggy' | 'zomato' | 'zepto' | ...
 *   avgDailyEarnings: number                      (₹ per day)
 *   hoursPerDay: number                           (avg working hours)
 *   experienceMonths: number                      (months on platform)
 * }
 */
function calculatePremium(workerProfile) {
  const {
    plan = 'standard',
    city = 'chennai',
    zone = 'central',
    platform = 'swiggy',
    avgDailyEarnings = 900,
    hoursPerDay = 8,
    experienceMonths = 6,
  } = workerProfile;

  const planConfig = PLANS[plan] || PLANS.standard;
  const zoneKey = `${city}-${zone}`;
  const zoneData = ZONE_RISK[zoneKey] || ZONE_RISK.default;
  const platformRisk = PLATFORM_RISK[platform.toLowerCase()] || PLATFORM_RISK.default;
  const earningsBracket = getEarningsBracket(avgDailyEarnings);

  // ── Step 1: Compute raw risk score (0–100) ──────────────────────────────
  // This is what an ML model would output. We compute it analytically here.
  const zoneScore    = (zoneData.multiplier - 0.8) / 0.6 * 40;   // 0–40 pts
  const platformScore = platformRisk * 100 * 0.15;                 // 0–15 pts
  const earningsScore = Math.min((avgDailyEarnings / 1500) * 25, 25); // 0–25 pts
  const hoursScore   = Math.min((hoursPerDay / 14) * 10, 10);      // 0–10 pts
  const newbieScore  = experienceMonths < 3 ? 10 : 0;              // newbie flag

  const rawRiskScore = Math.round(
    zoneScore + platformScore + earningsScore + hoursScore + newbieScore
  );

  // ── Step 2: Risk band ───────────────────────────────────────────────────
  let riskBand;
  if (rawRiskScore < 30) riskBand = 'LOW';
  else if (rawRiskScore < 60) riskBand = 'MEDIUM';
  else riskBand = 'HIGH';

  // ── Step 3: Premium adjustment from base ───────────────────────────────
  // Zone multiplier is the primary driver (actuarial)
  // Platform risk adds a small surcharge
  // Experience discount: veteran workers get up to ₹5 off
  const zoneAdjust     = planConfig.basePremium * (zoneData.multiplier - 1.0);
  const platformAdjust = planConfig.basePremium * platformRisk;
  const expDiscount    = experienceMonths >= 12 ? -5 : experienceMonths >= 6 ? -3 : 0;

  const adjustedPremium = Math.round(
    planConfig.basePremium + zoneAdjust + platformAdjust + expDiscount
  );

  // Clamp: never more than ±₹12 from base (keeps it fair for workers)
  const clampedPremium = Math.max(
    planConfig.basePremium - 12,
    Math.min(planConfig.basePremium + 12, adjustedPremium)
  );

  // ── Step 4: Coverage cap adjusted by earnings bracket ──────────────────
  const adjustedCoverage = Math.round(
    planConfig.coveragePerEvent * earningsBracket.coverageMultiplier
  );

  // ── Step 5: Next billing date (next Sunday midnight) ───────────────────
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const nextBilling = new Date(now);
  nextBilling.setDate(now.getDate() + daysUntilSunday);
  nextBilling.setHours(0, 0, 0, 0);

  // ── Return full quote ───────────────────────────────────────────────────
  return {
    plan,
    planName: planConfig.name,

    // Financial
    basePremium: planConfig.basePremium,
    adjustedPremium: clampedPremium,
    coveragePerEvent: adjustedCoverage,
    maxEventsPerWeek: planConfig.maxEventsPerWeek,
    maxWeeklyCoverage: adjustedCoverage * planConfig.maxEventsPerWeek,

    // Risk profile
    riskScore: rawRiskScore,
    riskBand,
    riskBreakdown: {
      zoneRisk: Math.round(zoneScore),
      platformRisk: Math.round(platformScore),
      earningsExposure: Math.round(earningsScore),
      hoursExposure: Math.round(hoursScore),
      experienceFlag: newbieScore,
    },

    // Zone info
    zone: zoneKey,
    zoneLabel: zoneData.label,
    avgRainDaysPerYear: zoneData.avgRainDays,

    // Coverage details
    earningsBracket: earningsBracket.label,
    triggers: planConfig.triggers,
    nextBillingDate: nextBilling.toISOString(),

    // Actuarial summary (shown in admin dashboard)
    actuarial: {
      targetLossRatio: 0.65,
      estimatedTriggerFrequencyPerMonth: estimateTriggerFrequency(city, plan),
      breakEvenPremium: computeBreakEven(adjustedCoverage, city),
      poolHealthy: clampedPremium >= computeBreakEven(adjustedCoverage, city) * 0.9,
    },
  };
}

// ─── Helper: trigger frequency estimate by city ───────────────────────────
function estimateTriggerFrequency(city, plan) {
  const baseFreq = {
    chennai:   2.3,   // monsoon + cyclone belt
    mumbai:    2.1,
    hyderabad: 1.6,
    bengaluru: 1.0,
  };
  const planMult = plan === 'pro' ? 1.4 : plan === 'standard' ? 1.0 : 0.6;
  return ((baseFreq[city] || 1.5) * planMult).toFixed(1);
}

// ─── Helper: break-even premium calculation ───────────────────────────────
function computeBreakEven(coveragePerEvent, city) {
  const freq = parseFloat(estimateTriggerFrequency(city, 'standard'));
  // freq events/month × coverage × 65% loss ratio / 4 weeks
  return Math.round((freq * coveragePerEvent * 0.65) / 4);
}

// ─── Export ───────────────────────────────────────────────────────────────
module.exports = { calculatePremium, PLANS, ZONE_RISK };
