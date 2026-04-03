const { db } = require('../firebase');

const TIER = { GREEN: 'GREEN', AMBER: 'AMBER', RED: 'RED' };

async function scoreWorker(userId, policy, trigger) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const user = userDoc.exists ? userDoc.data() : {};

        // ── Signal 1: Account age (0–20) ─────────────────────────────────────
        const accountAgeDays = user.createdAt
            ? (Date.now() - new Date(user.createdAt)) / 86400000
            : 0;
        // New accounts get 10 base points — they're not suspicious, just new
        const s1 = Math.max(Math.min(accountAgeDays / 30 * 20, 20), 10);

        // ── Signal 2: Policy tenure (0–20) ───────────────────────────────────
        const policyAgeDays = policy.startDate
            ? (Date.now() - new Date(policy.startDate)) / 86400000
            : 0;
        // New policies get 10 base points
        const s2 = Math.max(Math.min(policyAgeDays / 14 * 20, 20), 10);

        // ── Signal 3: Claim frequency this week (0–20) ────────────────────────
        let payoutsWeek = 0;
        try {
            const snap = await db.collection('payouts')
                .where('userId', '==', userId)
                .where('status', '==', 'paid')
                .get();
            // Count only this week's payouts manually (avoids index on createdAt)
            const weekAgo = Date.now() - 7 * 86400000;
            payoutsWeek = snap.docs.filter(d =>
                new Date(d.data().createdAt).getTime() > weekAgo
            ).length;
        } catch { payoutsWeek = 0; }

        const s3 = Math.max(20 - (payoutsWeek * 7), 0);

        // ── Signal 4: Geographic consistency (0–20) ───────────────────────────
        const s4 = policy.city === trigger.city ? 20 : 0;

        // ── Signal 5: Temporal pattern (0–10) ────────────────────────────────
        const hour = new Date().getHours();
        const isWorkingHour = hour >= 7 && hour <= 23;
        const s5 = isWorkingHour ? 10 : 6;

        // ── Signal 6: Population clustering (0–10) ────────────────────────────
        // For new users with no history, give benefit of the doubt
        const s6 = 10;

        const score = Math.min(Math.round(s1 + s2 + s3 + s4 + s5 + s6), 100);

        let tier;
        if (score >= 60) tier = TIER.GREEN;   // lowered from 70
        else if (score >= 35) tier = TIER.AMBER;
        else tier = TIER.RED;

        console.log(`[CLS] ${userId.slice(0, 8)}... score=${score} tier=${tier} signals=[${Math.round(s1)},${Math.round(s2)},${Math.round(s3)},${Math.round(s4)},${Math.round(s5)},${Math.round(s6)}]`);

        return {
            userId, score, tier,
            signals: {
                accountAge: Math.round(s1),
                policyTenure: Math.round(s2),
                claimFrequency: Math.round(s3),
                geoConsistency: Math.round(s4),
                temporalPattern: Math.round(s5),
                populationClustering: Math.round(s6),
            },
            checkedAt: new Date().toISOString(),
        };
    } catch (err) {
        console.error(`[CLS] Score error for ${userId}:`, err.message);
        return {
            userId, score: 65, tier: TIER.GREEN,
            signals: {}, error: err.message,
            checkedAt: new Date().toISOString(),
        };
    }
}

async function batchScore(policies, trigger) {
    const results = await Promise.allSettled(
        policies.map(p => scoreWorker(p.userId, p, trigger))
    );
    return results.map((r, i) =>
        r.status === 'fulfilled'
            ? r.value
            : { userId: policies[i].userId, score: 65, tier: TIER.GREEN, error: r.reason?.message }
    );
}

module.exports = { scoreWorker, batchScore, TIER };