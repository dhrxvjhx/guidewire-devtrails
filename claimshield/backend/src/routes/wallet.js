// src/routes/wallet.js
const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { requireAuth } = require('../middleware/auth');

router.get('/balance', requireAuth, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.uid).get();
    if (!userDoc.exists) return res.status(200).json({ balance: 0 });
    const { walletBalance = 0 } = userDoc.data();
    return res.status(200).json({ balance: walletBalance });
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED') return res.status(200).json({ balance: 0 });
    console.error('[WALLET] balance error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

router.get('/transactions', requireAuth, async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  try {
    const snapshot = await db.collection('transactions')
      .where('userId', '==', req.uid)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    const transactions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ transactions });
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED') return res.status(200).json({ transactions: [] });
    if (err.code === 9 || err.message?.includes('index')) {
      console.warn('[WALLET] Firestore index not ready:', err.message);
      return res.status(200).json({ transactions: [], indexPending: true });
    }
    console.error('[WALLET] transactions error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.post('/topup', requireAuth, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  try {
    const userRef = db.collection('users').doc(req.uid);
    const userDoc = await userRef.get();
    const newBalance = (userDoc.data()?.walletBalance || 0) + Number(amount);
    await userRef.update({ walletBalance: newBalance });
    await db.collection('transactions').add({
      userId: req.uid, type: 'credit', category: 'topup',
      amount: Number(amount), reason: 'Wallet top-up',
      status: 'completed', createdAt: new Date().toISOString(),
    });
    return res.status(200).json({ balance: newBalance, credited: amount });
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED') return res.status(503).json({ error: 'Firebase not configured' });
    return res.status(500).json({ error: 'Top-up failed' });
  }
});

module.exports = router;