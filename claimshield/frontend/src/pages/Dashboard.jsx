// src/pages/Dashboard.jsx
// Worker's primary view — shows coverage status, recent events, wallet snapshot.
// This is the screen they see every day. Design priority: trust + clarity.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { policyApi, walletApi } from '../api';

// ── Mock trigger events (Module 2 will replace with real data) ────────────
const MOCK_EVENTS = [
  {
    id: 1, type: 'rainfall', city: 'chennai',
    icon: '🌧️', title: 'Heavy Rainfall',
    detail: '67mm/hr — exceeded 45mm threshold',
    status: 'paid', amount: 300, timestamp: new Date(Date.now() - 2 * 3600000),
    clsScore: 94, clsTier: 'GREEN',
  },
  {
    id: 2, type: 'heat', city: 'chennai',
    icon: '🌡️', title: 'Extreme Heat Wave',
    detail: '44°C — IMD Heat Wave declared',
    status: 'paid', amount: 300, timestamp: new Date(Date.now() - 26 * 3600000),
    clsScore: 91, clsTier: 'GREEN',
  },
  {
    id: 3, type: 'flood', city: 'chennai',
    icon: '🚨', title: 'Flood Alert — Level 2',
    detail: 'NDMA Orange Alert issued',
    status: 'paid', amount: 300, timestamp: new Date(Date.now() - 5 * 24 * 3600000),
    clsScore: 88, clsTier: 'GREEN',
  },
];

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ── Sub-components ──────────────────────────────────────────────────────────
function PolicyStatusCard({ policy }) {
  if (!policy) {
    return (
      <div className="cs-card border-2 border-dashed border-border text-center py-10">
        <div className="text-4xl mb-3">🛡️</div>
        <div className="font-display text-lg font-bold mb-2">No Active Coverage</div>
        <p className="text-gray-400 text-sm mb-5">
          You're not protected against income loss right now.
        </p>
        <Link to="/policy" className="btn-primary inline-block w-auto px-8 py-2.5">
          Get Covered →
        </Link>
      </div>
    );
  }

  const weekPct = Math.min(
    (policy.eventsThisWeek / policy.maxEventsPerWeek) * 100, 100
  );

  return (
    <div className="cs-card cs-card-accent">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="section-tag">// Active Policy</div>
          <div className="font-display text-xl font-bold">{policy.planName}</div>
          <div className="font-mono text-xs text-gray-500 mt-1">
            #{policy.id?.slice(-8).toUpperCase()} · {policy.city?.toUpperCase()} · {policy.platform?.toUpperCase()}
          </div>
        </div>
        <span className="badge badge-green">● ACTIVE</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Weekly Premium</div>
          <div className="font-display text-xl font-bold">₹{policy.premium}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Per-Event Payout</div>
          <div className="font-display text-xl font-bold text-green">₹{policy.coveragePerEvent}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Next Billing</div>
          <div className="font-display text-xl font-bold text-amber">
            {new Date(policy.nextBillingDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Weekly usage bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>This week's events</span>
          <span>{policy.eventsThisWeek} / {policy.maxEventsPerWeek}</span>
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${weekPct}%`,
              background: 'linear-gradient(90deg, #0055ff, #00e5ff)',
            }} />
        </div>
      </div>
    </div>
  );
}

function EventCard({ event }) {
  const statusColors = {
    paid: 'text-green',
    pending: 'text-amber',
    denied: 'text-danger',
  };
  const tierBadge = {
    GREEN: 'badge-green',
    AMBER: 'badge-amber',
    RED: 'badge-red',
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border
                    bg-surface hover:bg-surface2 transition-colors duration-150">
      <div className="w-9 h-9 rounded-lg bg-surface2 border border-border
                      flex items-center justify-center text-lg flex-shrink-0">
        {event.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold">{event.title}</span>
          <span className={`badge ${tierBadge[event.clsTier]} text-xs px-2 py-0.5`}>
            CLS {event.clsTier}
          </span>
        </div>
        <div className="font-mono text-xs text-gray-500 truncate">{event.detail}</div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className={`font-mono text-sm font-bold ${statusColors[event.status]}`}>
          {event.status === 'paid' ? `+₹${event.amount}` : event.status.toUpperCase()}
        </div>
        <div className="font-mono text-xs text-gray-600">{timeAgo(event.timestamp)}</div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { userProfile } = useAuth();
  const [policy, setPolicy] = useState(null);
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [policyRes, balRes, txRes] = await Promise.allSettled([
          policyApi.getMine(),
          walletApi.balance(),
          walletApi.transactions(5),
        ]);

        if (policyRes.status === 'fulfilled') setPolicy(policyRes.value.policy);
        setWallet({
          balance: balRes.status === 'fulfilled' ? balRes.value.balance : 0,
          transactions: txRes.status === 'fulfilled' ? txRes.value.transactions : [],
        });
      } finally {
        setDataLoading(false);
      }
    }
    load();
  }, []);

  const firstName = userProfile?.name?.split(' ')[0] || 'Partner';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (dataLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 relative z-10">
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10 page-enter">

      {/* Header */}
      <div className="mb-8">
        <div className="section-tag">// Worker Dashboard</div>
        <h1 className="font-display text-3xl font-extrabold mb-1">
          {greeting}, <span className="text-accent">{firstName}</span>.
        </h1>
        <p className="text-gray-400 text-sm">
          {policy
            ? "Your coverage is active. We're watching the weather for you."
            : "You're not covered yet. Get protection in 2 minutes."}
        </p>
      </div>

      {/* Top metric row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden mb-6">
        {[
          { label: 'Wallet Balance', value: `₹${wallet.balance.toLocaleString('en-IN')}`, color: 'text-green' },
          { label: 'Coverage Active', value: policy ? policy.planName : 'None', color: policy ? 'text-white' : 'text-danger' },
          { label: 'Total Protected', value: `₹${(policy?.totalPayoutsReceived || 0).toLocaleString('en-IN')}`, color: 'text-accent' },
          { label: 'Trust Score (CLS)', value: `${userProfile?.riskScore ? 100 - userProfile.riskScore + 40 : 94}/100`, color: 'text-green' },
        ].map(m => (
          <div key={m.label} className="bg-surface px-6 py-5">
            <div className="font-mono text-xs text-gray-500 tracking-wider uppercase mb-2">{m.label}</div>
            <div className={`font-display text-2xl font-extrabold ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — 2/3 width */}
        <div className="col-span-1 lg:col-span-2 space-y-6">

          {/* Policy card */}
          <PolicyStatusCard policy={policy} />

          {/* Recent disruption events */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="font-display text-base font-bold">
                Disruption Events
                <span className="ml-2 font-mono text-xs text-gray-500 font-normal">
                  (auto-detected)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="pulse-dot" style={{ width: 6, height: 6 }} />
                <span className="font-mono text-xs text-green">LIVE</span>
              </div>
            </div>

            <div className="space-y-2">
              {MOCK_EVENTS.map(e => <EventCard key={e.id} event={e} />)}
            </div>

            <p className="text-xs text-gray-600 font-mono mt-3 text-center">
              No claim filing required. Events detected automatically every 5 minutes.
            </p>
          </div>
        </div>

        {/* Right — 1/3 width */}
        <div className="space-y-5">

          {/* Wallet snapshot */}
          <div className="cs-card">
            <div className="section-tag">// Wallet</div>
            <div className="text-center mb-4">
              <div className="font-mono text-xs text-gray-500 mb-1">Available</div>
              <div className="font-display text-4xl font-extrabold text-green">
                ₹{wallet.balance.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-gray-500 mt-1">Auto-credited from payouts</div>
            </div>

            <button
              onClick={async () => {
                try {
                  await walletApi.topup(1000);
                  window.location.reload();
                } catch (err) {
                  console.error(err);
                }
              }}
              className="w-full py-2 rounded-lg text-xs font-mono font-bold mb-2
             bg-green/10 text-green border border-green/25
             hover:bg-green/20 transition-colors">
              + Add ₹1000
            </button>
            <Link to="/wallet" className="btn-ghost text-center block text-xs">
              View full history →
            </Link>
          </div>

          {/* How it works — for new users */}
          {!policy && (
            <div className="cs-card">
              <div className="section-tag">// How it works</div>
              <div className="space-y-3">
                {[
                  { n: '01', text: 'Pay ₹49/week — auto-deducted every Sunday' },
                  { n: '02', text: 'We monitor rainfall, heat, flood alerts every 5 min' },
                  { n: '03', text: 'Disruption detected → ₹300 lands in your wallet instantly' },
                ].map(s => (
                  <div key={s.n} className="flex gap-3 items-start">
                    <span className="font-mono text-xs text-accent2 font-bold mt-0.5">{s.n}</span>
                    <span className="text-xs text-gray-400">{s.text}</span>
                  </div>
                ))}
              </div>
              <Link to="/policy" className="btn-primary mt-4 block text-center py-2.5 text-sm">
                Get Covered →
              </Link>
            </div>
          )}

          {/* CLS Trust card */}
          {policy && (
            <div className="cs-card text-center">
              <div className="section-tag">// Your Trust Score</div>
              <div className="font-display text-5xl font-extrabold text-green mb-1">94</div>
              <div className="font-mono text-xs tracking-widest text-green mb-2">TIER GREEN</div>
              <div className="text-xs text-gray-500 leading-relaxed">
                All 6 fraud signals pass. You'll never see friction — payouts land automatically.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
