// Evaluates 5 parametric triggers against live weather data.
// Returns a list of fired triggers with severity and payout multiplier.

const { db } = require('../firebase');

// ── Trigger definitions ────────────────────────────────────────────────────
const TRIGGERS = {
    rainfall: {
        name: 'Heavy Rainfall',
        icon: '🌧️',
        check: (weather) => weather.rainfall > 45,
        severity: (weather) => weather.rainfall > 80 ? 'SEVERE' : 'MODERATE',
        payoutMultiplier: 1.0,
        plans: ['basic', 'standard', 'pro'],
    },
    heat: {
        name: 'Extreme Heat',
        icon: '🌡️',
        check: (weather) => weather.temp > 42,
        severity: (weather) => weather.temp > 46 ? 'SEVERE' : 'MODERATE',
        payoutMultiplier: 1.0,
        plans: ['basic', 'standard', 'pro'],
    },
    flood: {
        name: 'Flood Alert',
        icon: '🚨',
        // Flood = sustained heavy rain (>35mm) — in prod this hits NDMA API
        check: (weather) => weather.rainfall > 35 && weather.alertLevel !== 'GREEN',
        severity: () => 'MODERATE',
        payoutMultiplier: 1.0,
        plans: ['standard', 'pro'],
    },
    platform_downtime: {
        name: 'Platform Downtime',
        icon: '📉',
        // In prod: hit Swiggy/Zomato status API. Mock: never fires automatically.
        check: (weather) => false,
        severity: () => 'MODERATE',
        payoutMultiplier: 0.5,   // 50% payout for platform issues
        plans: ['standard', 'pro'],
    },
    pollution: {
        name: 'Severe Pollution',
        icon: '😷',
        check: (weather) => weather.aqi > 300,
        severity: () => 'MODERATE',
        payoutMultiplier: 1.0,
        plans: ['pro'],
    },
};

// ── Evaluate triggers against weather data ─────────────────────────────────
function evaluateTriggers(weatherData) {
    const fired = [];

    for (const [triggerKey, trigger] of Object.entries(TRIGGERS)) {
        if (trigger.check(weatherData)) {
            fired.push({
                type: triggerKey,
                name: trigger.name,
                icon: trigger.icon,
                city: weatherData.city,
                severity: trigger.severity(weatherData),
                payoutMultiplier: trigger.payoutMultiplier,
                eligiblePlans: trigger.plans,
                weather: {
                    rainfall: weatherData.rainfall,
                    temp: weatherData.temp,
                    aqi: weatherData.aqi,
                    condition: weatherData.condition,
                },
                firedAt: new Date().toISOString(),
            });
        }
    }

    return fired;
}

// ── Save trigger event to Firestore ───────────────────────────────────────
async function saveTriggerEvent(trigger) {
    const ref = await db.collection('triggers').add({
        ...trigger,
        status: 'processing',
        createdAt: new Date().toISOString(),
    });
    return ref.id;
}

// ── Mark trigger as processed ─────────────────────────────────────────────
async function completeTriggerEvent(triggerId, stats) {
    await db.collection('triggers').doc(triggerId).update({
        status: 'completed',
        stats,
        completedAt: new Date().toISOString(),
    });
}

// ── Get eligible policies — includes mobile workers ────────────────────────
// A worker is eligible if:
//   1. Their registered city matches the trigger city (original logic)
//   OR
//   2. Their last known GPS location was in the trigger city within 4 hours
async function getEligiblePolicies(city, eligiblePlans, triggerPincode) {
    // All active policies in the triggered city (registered)
    const snapshot = await db.collection('policies')
        .where('city', '==', city)
        .where('status', '==', 'active')
        .get();

    const registeredWorkers = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => eligiblePlans.includes(p.plan))
        .filter(p => (p.eventsThisWeek || 0) < p.maxEventsPerWeek);

    // Also check workers from OTHER cities whose GPS puts them in this city
    const allPoliciesSnap = await db.collection('policies')
        .where('status', '==', 'active')
        .get();

    const fourHoursAgo = new Date(Date.now() - 4 * 3600000).toISOString();

    const mobileWorkers = [];
    const registeredIds = new Set(registeredWorkers.map(p => p.userId));

    for (const doc of allPoliciesSnap.docs) {
        const policy = { id: doc.id, ...doc.data() };

        // Skip if already in registered list or wrong city
        if (registeredIds.has(policy.userId)) continue;
        if (!eligiblePlans.includes(policy.plan)) continue;
        if ((policy.eventsThisWeek || 0) >= policy.maxEventsPerWeek) continue;

        // Check this worker's last known GPS location
        try {
            const userDoc = await db.collection('users').doc(policy.userId).get();
            const user = userDoc.data() || {};

            // Worker must have been in the triggered city within last 4 hours
            if (
                user.lastKnownPincode &&
                user.lastLocationAt > fourHoursAgo &&
                user.lastKnownPincode.startsWith(city === 'chennai' ? '6000'
                    : city === 'mumbai' ? '400'
                        : city === 'hyderabad' ? '500'
                            : '560')
            ) {
                mobileWorkers.push({
                    ...policy,
                    mobilityEligible: true,
                    detectedPincode: user.lastKnownPincode,
                    detectedWard: user.lastKnownWard,
                });
                console.log(`[TRIGGER] Mobile worker detected — ${policy.userId.slice(0, 8)} in ${user.lastKnownWard} (registered: ${policy.city})`);
            }
        } catch {
            // Skip if user doc fetch fails
        }
    }

    const allEligible = [...registeredWorkers, ...mobileWorkers];
    console.log(`[TRIGGER] ${registeredWorkers.length} registered + ${mobileWorkers.length} mobile workers eligible`);

    return allEligible;
}

// ── Simulate a trigger for demo/testing purposes ───────────────────────────
// Called by POST /api/admin/simulate-trigger
// Injects fake weather data to force a trigger to fire.
async function simulateTrigger(city, triggerType) {
    const SIMULATED_WEATHER = {
        rainfall: { rainfall: 67, temp: 29, aqi: 60, condition: 'Heavy Rain', alertLevel: 'RED' },
        heat: { rainfall: 0, temp: 44, aqi: 80, condition: 'Extreme Heat', alertLevel: 'RED' },
        flood: { rainfall: 40, temp: 30, aqi: 70, condition: 'Flooding', alertLevel: 'RED' },
        pollution: { rainfall: 0, temp: 32, aqi: 320, condition: 'Hazardous Air', alertLevel: 'RED' },
    };

    const weather = { city, ...SIMULATED_WEATHER[triggerType] };
    const firedTriggers = evaluateTriggers(weather);

    if (firedTriggers.length === 0) {
        throw new Error(`Trigger type '${triggerType}' did not fire with simulated data`);
    }

    return firedTriggers[0];
}

module.exports = { evaluateTriggers, saveTriggerEvent, completeTriggerEvent, getEligiblePolicies, TRIGGERS, simulateTrigger };