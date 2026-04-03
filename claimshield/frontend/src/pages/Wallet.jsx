import { useState, useEffect } from 'react';
import { walletApi } from '../api';
import api from '../api';

const CATEGORY_ICONS = {
  payout: { icon: '💸', bg: 'bg-green/10' },
  premium: { icon: '📋', bg: 'bg-danger/10' },
  topup: { icon: '➕', bg: 'bg-accent/10' },
  default: { icon: '💳', bg: 'bg-surface2' },
};

const MOCK_TRANSACTIONS = [
  { id: 1, type: 'credit', category: 'payout', amount: 450, reason: 'Heavy Rainfall — auto payout', clsTier: 'GREEN', status: 'completed', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 2, type: 'debit', category: 'premium', amount: 49, reason: 'Standard Shield — weekly premium', status: 'completed', createdAt: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: 3, type: 'credit', category: 'payout', amount: 450, reason: 'Heat Wave — auto payout', clsTier: 'GREEN', status: 'completed', createdAt: new Date(Date.now() - 25 * 3600000).toISOString() },
];

// ── Appeal modal ────────────────────────────────────────────────────────────
function AppealModal({ payout, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await onSubmit(payout.payoutId || payout.id, reason);
      setDone(true);
    } catch (err) {
      alert('Appeal failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="cs-card cs-card-accent w-full max-w-md">

        {done ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <div className="font-display text-xl font-bold mb-2">Appeal Submitted</div>
            <p className="text-gray-400 text-sm mb-5">
              Our team will review your case within 24 hours. You'll be notified of the outcome.
            </p>
            <button onClick={onClose} className="btn-primary w-auto px-8">Done</button>
          </div>
        ) : (
          <>
            <div className="section-tag">// Raise a Dispute</div>
            <h2 className="font-display text-xl font-bold mb-1">This doesn't look right?</h2>
            <p className="text-gray-400 text-sm mb-5">
              If you believe this payout was incorrectly blocked, tell us what happened.
              Honest workers are never permanently denied.
            </p>

            <div className="bg-danger/8 border border-danger/20 rounded-xl p-4 mb-5">
              <div className="font-mono text-xs text-danger mb-1">BLOCKED PAYOUT</div>
              <div className="text-sm font-semibold">{payout.reason}</div>
              <div className="font-mono text-xs text-gray-500 mt-1">
                ₹{payout.amount} · CLS score too low
              </div>
            </div>

            <div className="mb-4">
              <label className="cs-label">What were you doing at the time?</label>
              <textarea
                className="cs-input min-h-[100px] resize-none"
                placeholder="e.g. I was on an active Swiggy delivery in Chennai when the rainfall alert fired. My GPS shows I was at Anna Nagar at 3:42 PM..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="btn-outline w-auto px-6">Cancel</button>
              <button onClick={handleSubmit} disabled={loading || !reason.trim()} className="btn-primary">
                {loading ? 'Submitting...' : 'Submit Appeal →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Transaction row ─────────────────────────────────────────────────────────
function TxnRow({ txn, onAppeal }) {
  const cat = CATEGORY_ICONS[txn.category] || CATEGORY_ICONS.default;
  const isCredit = txn.type === 'credit';
  const isBlocked = txn.clsTier === 'RED' || txn.status === 'blocked';

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border
                    last:border-0 hover:bg-surface2 transition-colors">
      <div className={`w-9 h-9 rounded-lg ${cat.bg} flex items-center
                       justify-center text-base flex-shrink-0`}>
        {isBlocked ? '🚫' : cat.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{txn.reason}</span>
          {txn.clsTier && (
            <span className={`badge text-xs px-2 py-0.5 flex-shrink-0
              ${txn.clsTier === 'GREEN' ? 'badge-green'
                : txn.clsTier === 'AMBER' ? 'badge-amber'
                  : 'badge-red'}`}>
              CLS {txn.clsTier}
            </span>
          )}
        </div>
        <div className="font-mono text-xs text-gray-500 mt-0.5">
          {new Date(txn.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className={`font-mono text-sm font-bold
          ${isBlocked ? 'text-danger line-through opacity-50'
            : isCredit ? 'text-green' : 'text-danger'}`}>
          {isCredit ? '+' : '−'}₹{txn.amount}
        </div>

        {isBlocked && onAppeal && (
          <button onClick={() => onAppeal(txn)}
            className="font-mono text-xs px-3 py-1.5 rounded-lg
                       bg-amber/10 text-amber border border-amber/25
                       hover:bg-amber/20 transition-colors whitespace-nowrap">
            Appeal →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appealTarget, setAppealTarget] = useState(null);

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

  async function handleAppeal(payoutId, reason) {
    await api.post('/payouts/appeal', { payoutId, reason });
  }

  const totalPayouts = transactions
    .filter(t => t.type === 'credit' && t.status === 'completed')
    .reduce((s, t) => s + t.amount, 0);
  const totalPremiums = transactions
    .filter(t => t.category === 'premium' && t.status === 'completed')
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 relative z-10 page-enter">

      <div className="mb-8">
        <div className="section-tag">// Wallet</div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold">
          Your Earnings Protection
        </h1>
      </div>

      {/* Balance hero */}
      <div className="cs-card cs-card-accent text-center mb-6 py-8">
        <div className="font-mono text-xs text-gray-500 tracking-widest uppercase mb-2">
          Available Balance
        </div>
        <div className="font-display text-5xl sm:text-6xl font-extrabold text-green mb-1">
          ₹{balance.toLocaleString('en-IN')}
        </div>
        <div className="text-xs text-gray-500">Auto-credited from disruption payouts</div>

        <div className="grid grid-cols-3 gap-4 sm:gap-6 mt-6 pt-6 border-t border-border">
          <div>
            <div className="font-display text-lg sm:text-xl font-bold text-accent">
              ₹{totalPayouts.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-gray-500 mt-1">Total paid out</div>
          </div>
          <div>
            <div className="font-display text-lg sm:text-xl font-bold text-danger">
              ₹{totalPremiums.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-gray-500 mt-1">Total premiums</div>
          </div>
          <div>
            <div className="font-display text-lg sm:text-xl font-bold text-green">
              ₹{(totalPayouts - totalPremiums).toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-gray-500 mt-1">Net benefit</div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="cs-card p-0 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="font-display font-bold">Transaction History</div>
          <div className="font-mono text-xs text-gray-500">{transactions.length} records</div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            No transactions yet.
          </div>
        ) : (
          transactions.map(txn => (
            <TxnRow key={txn.id} txn={txn} onAppeal={setAppealTarget} />
          ))
        )}
      </div>

      {/* Appeal modal */}
      {appealTarget && (
        <AppealModal
          payout={appealTarget}
          onClose={() => setAppealTarget(null)}
          onSubmit={handleAppeal}
        />
      )}
    </div>
  );
}