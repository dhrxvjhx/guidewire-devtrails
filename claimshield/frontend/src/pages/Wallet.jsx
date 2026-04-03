// src/pages/Wallet.jsx
// Full wallet view — balance, all transactions, premium schedule.

import { useState, useEffect } from 'react';
import { walletApi } from '../api';

const CATEGORY_ICONS = {
  payout:  { icon: '💸', color: 'text-green', bgColor: 'bg-green/10' },
  premium: { icon: '📋', color: 'text-danger', bgColor: 'bg-danger/10' },
  topup:   { icon: '➕', color: 'text-accent', bgColor: 'bg-accent/10' },
  default: { icon: '💳', color: 'text-gray-400', bgColor: 'bg-surface2' },
};

function TxnRow({ txn }) {
  const cat = CATEGORY_ICONS[txn.category] || CATEGORY_ICONS.default;
  const isCredit = txn.type === 'credit';

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0
                    hover:bg-surface2 transition-colors">
      <div className={`w-9 h-9 rounded-lg ${cat.bgColor} flex items-center justify-center
                       text-base flex-shrink-0`}>
        {cat.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{txn.reason}</div>
        <div className="font-mono text-xs text-gray-500">
          {new Date(txn.createdAt).toLocaleDateString('en-IN', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
          {txn.clsTier && (
            <span className={`ml-2 ${txn.clsTier === 'GREEN' ? 'text-green' : 'text-amber'}`}>
              · CLS {txn.clsTier}
            </span>
          )}
        </div>
      </div>
      <div className={`font-mono text-sm font-bold flex-shrink-0 ${isCredit ? 'text-green' : 'text-danger'}`}>
        {isCredit ? '+' : '−'}₹{txn.amount}
      </div>
    </div>
  );
}

// Mock transactions for demo (Module 3 will wire real data)
const MOCK_TRANSACTIONS = [
  { id: 1, type: 'credit', category: 'payout', amount: 300, reason: 'Rainfall Payout — Chennai', clsTier: 'GREEN', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 2, type: 'debit',  category: 'premium', amount: 49, reason: 'Standard Shield — Weekly Premium', createdAt: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: 3, type: 'credit', category: 'payout', amount: 300, reason: 'Heat Wave Payout — Chennai', clsTier: 'GREEN', createdAt: new Date(Date.now() - 25 * 3600000).toISOString() },
  { id: 4, type: 'debit',  category: 'premium', amount: 49, reason: 'Standard Shield — Weekly Premium', createdAt: new Date(Date.now() - 7 * 24 * 3600000).toISOString() },
  { id: 5, type: 'credit', category: 'payout', amount: 300, reason: 'Flood Alert Payout — Chennai', clsTier: 'GREEN', createdAt: new Date(Date.now() - 5 * 24 * 3600000).toISOString() },
];

export default function Wallet() {
  const [balance, setBalance]       = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [balRes, txRes] = await Promise.allSettled([
          walletApi.balance(),
          walletApi.transactions(50),
        ]);
        if (balRes.status === 'fulfilled') setBalance(balRes.value.balance);
        const real = txRes.status === 'fulfilled' ? txRes.value.transactions : [];
        setTransactions(real.length > 0 ? real : MOCK_TRANSACTIONS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalPayouts  = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalPremiums = transactions.filter(t => t.category === 'premium').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 relative z-10 page-enter">

      <div className="mb-8">
        <div className="section-tag">// Wallet</div>
        <h1 className="font-display text-3xl font-extrabold">Your Earnings Protection</h1>
      </div>

      {/* Balance hero */}
      <div className="cs-card cs-card-accent text-center mb-6 py-8">
        <div className="font-mono text-xs text-gray-500 tracking-widest uppercase mb-2">
          Available Balance
        </div>
        <div className="font-display text-6xl font-extrabold text-green mb-1">
          ₹{balance.toLocaleString('en-IN')}
        </div>
        <div className="text-xs text-gray-500">Auto-credited from disruption payouts</div>

        <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-border">
          <div>
            <div className="font-display text-xl font-bold text-accent">
              ₹{totalPayouts.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-gray-500 mt-1">Total paid out</div>
          </div>
          <div>
            <div className="font-display text-xl font-bold text-danger">
              ₹{totalPremiums.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-gray-500 mt-1">Total premiums paid</div>
          </div>
          <div>
            <div className="font-display text-xl font-bold text-green">
              ₹{(totalPayouts - totalPremiums).toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-gray-500 mt-1">Net benefit</div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="cs-card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="font-display font-bold">Transaction History</div>
          <div className="font-mono text-xs text-gray-500">{transactions.length} records</div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            No transactions yet. Activate a policy to get started.
          </div>
        ) : (
          <div>
            {transactions.map(txn => <TxnRow key={txn.id} txn={txn} />)}
          </div>
        )}
      </div>
    </div>
  );
}
