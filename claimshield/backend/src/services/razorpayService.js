// Razorpay sandbox integration.
// If RAZORPAY_KEY_ID is set → real sandbox API calls.
// If not → mock mode that simulates the response (works for demo without keys).

const axios = require('axios');

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const MOCK_MODE = !KEY_ID || KEY_ID === 'rzp_test_xxxxxxxxxxxx';

if (MOCK_MODE) {
    console.warn('[RAZORPAY] No keys found — running in mock mode');
} else {
    console.log('[RAZORPAY] Sandbox mode active ✓');
}

// ── Create a payout (UPI / bank transfer) ─────────────────────────────────
async function createPayout({ amount, upiId, workerName, payoutId, note }) {
    if (MOCK_MODE) {
        // Simulate 300ms network delay
        await new Promise(r => setTimeout(r, 300));
        return {
            id: `mock_${Date.now()}`,
            entity: 'payout',
            amount: amount * 100,   // Razorpay uses paise
            currency: 'INR',
            status: 'processed',
            utr: `UTR${Math.floor(Math.random() * 1e10)}`,
            mode: 'UPI',
            purpose: 'payout',
            narration: note || 'ClaimShield Insurance Payout',
            createdAt: new Date().toISOString(),
            mock: true,
        };
    }

    // Real Razorpay Payouts API
    try {
        const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
        const response = await axios.post(
            'https://api.razorpay.com/v1/payouts',
            {
                account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
                fund_account: {
                    account_type: 'vpa',
                    vpa: { address: upiId || 'default@upi' },
                    contact: {
                        name: workerName,
                        type: 'customer',
                        contact: '9999999999',
                    },
                },
                amount: amount * 100,
                currency: 'INR',
                mode: 'UPI',
                purpose: 'payout',
                queue_if_low_balance: true,
                narration: note || 'ClaimShield Insurance Payout',
                reference_id: payoutId,
            },
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'X-Payout-Idempotency': payoutId,
                },
                timeout: 10000,
            }
        );
        return response.data;
    } catch (err) {
        console.error('[RAZORPAY] Payout error:', err.response?.data || err.message);
        throw new Error(err.response?.data?.error?.description || 'Razorpay payout failed');
    }
}

module.exports = { createPayout, MOCK_MODE };