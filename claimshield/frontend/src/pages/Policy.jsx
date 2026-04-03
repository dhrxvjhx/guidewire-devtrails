// src/pages/Policy.jsx
// Full policy management — compare plans, see live premium, activate/cancel.

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { policyApi, premiumApi } from '../api';

const PLANS_META = {
  basic:    { color: '#5a7a9a', glow: 'rgba(90,122,154,0.15)' },
  standard: { color: '#0055ff', glow: 'rgba(0,85,255,0.12)'  },
  pro:      { color: '#ffb300', glow: 'rgba(255,179,0,0.10)' },
};

const TRIGGER_ICONS = {
  rainfall:          '🌧️',
  heat:              '🌡️',
  flood:             '🚨',
  platform_downtime: '📉',
  pollution:         '😷',
  curfew:            '🚧',
};

export default function Policy() {
  const { userProfile } = useAuth();

  const [activePolicy, setActivePolicy] = useState(null);
  const [allQuotes, setAllQuotes]       = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage]           = useState('');
  const [error, setError]               = useState('');

  // ── Load current policy + all plan quotes ─────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [policyRes, quotesRes] = await Promise.allSettled([
        policyApi.getMine(),
        premiumApi.calculate({
          plan: selectedPlan,
          city:              userProfile?.city || 'chennai',
          zone:              userProfile?.zone || 'central',
          platform:          userProfile?.platform || 'swiggy',
          avgDailyEarnings:  userProfile?.avgDailyEarnings || 900,
          hoursPerDay:       userProfile?.hoursPerDay || 8,
          experienceMonths:  userProfile?.experienceMonths || 6,
        }),
      ]);

      if (policyRes.status === 'fulfilled') {
        setActivePolicy(policyRes.value.policy);
        if (policyRes.value.policy) {
          setSelectedPlan(policyRes.value.policy.plan);
        }
      }
      if (quotesRes.status === 'fulfilled') {
        setAllQuotes(quotesRes.value.allPlans || []);
      }
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Create policy ──────────────────────────────────────────────────────
  async function handleCreate() {
    setActionLoading(true);
    setError('');
    try {
      await policyApi.create(selectedPlan);
      setMessage('✅ Policy activated! Coverage starts immediately.');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // ── Cancel policy ──────────────────────────────────────────────────────
  async function handleCancel() {
    if (!confirm('Cancel your coverage? You will lose protection immediately.')) return;
    setActionLoading(true);
    setError('');
    try {
      await policyApi.cancel();
      setMessage('Policy cancelled. You can reactivate anytime.');
      setActivePolicy(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 relative z-10">
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 relative z-10 page-enter">

      <div className="mb-8">
        <div className="section-tag">// Policy Engine</div>
        <h1 className="font-display text-3xl font-extrabold mb-1">
          {activePolicy ? 'Manage Your Coverage' : 'Choose Your Coverage'}
        </h1>
        <p className="text-gray-400 text-sm">
          Weekly parametric insurance. Auto-payouts. No claim forms.
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-green/8 border border-green/25
                        text-green text-sm font-mono">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-danger/8 border border-danger/25
                        text-danger text-sm font-mono">
          {error}
        </div>
      )}

      {/* Active policy summary */}
      {activePolicy && (
        <div className="cs-card cs-card-accent mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="section-tag">// Current Plan</div>
              <div className="font-display text-xl font-bold mb-1">{activePolicy.planName}</div>
              <div className="font-mono text-xs text-gray-500">
                Policy #{activePolicy.id?.slice(-8).toUpperCase()} · Active since{' '}
                {new Date(activePolicy.startDate).toLocaleDateString('en-IN')}
              </div>
            </div>
            <span className="badge badge-green">● ACTIVE</span>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-border">
            <div>
              <div className="text-xs text-gray-500 mb-1">Weekly Premium</div>
              <div className="font-mono text-lg font-bold">₹{activePolicy.premium}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Coverage/Event</div>
              <div className="font-mono text-lg font-bold text-green">₹{activePolicy.coveragePerEvent}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Total Paid Out</div>
              <div className="font-mono text-lg font-bold text-accent">₹{activePolicy.totalPayoutsReceived || 0}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Next Billing</div>
              <div className="font-mono text-lg font-bold text-amber">
                {new Date(activePolicy.nextBillingDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Active triggers */}
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2">Covered disruptions</div>
            <div className="flex flex-wrap gap-2">
              {activePolicy.triggers?.map(t => (
                <span key={t}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                             bg-bg border border-border text-xs text-gray-300">
                  {TRIGGER_ICONS[t] || '⚡'} {t.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button onClick={handleCancel} disabled={actionLoading}
              className="btn-outline w-auto px-6 text-danger border-danger/30 hover:border-danger hover:text-danger">
              {actionLoading ? 'Processing...' : 'Cancel Policy'}
            </button>
          </div>
        </div>
      )}

      {/* Plan comparison */}
      <div className="mb-6">
        <h2 className="font-display text-lg font-bold mb-1">
          {activePolicy ? 'Upgrade Options' : 'Select a Plan'}
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Premiums are personalised for your zone ({userProfile?.zone || 'central'}) and earnings bracket.
        </p>

        <div className="grid grid-cols-3 gap-4">
          {allQuotes.map(quote => {
            const meta = PLANS_META[quote.plan];
            const isSelected = selectedPlan === quote.plan;
            const isCurrent = activePolicy?.plan === quote.plan;

            return (
              <button key={quote.plan} type="button"
                onClick={() => setSelectedPlan(quote.plan)}
                className={`text-left rounded-xl border-2 p-5 transition-all duration-200
                  ${isSelected
                    ? 'border-current bg-current/5'
                    : 'border-border hover:border-gray-600 bg-surface'}`}
                style={{
                  borderColor: isSelected ? meta.color : undefined,
                  backgroundColor: isSelected ? meta.glow : undefined,
                }}>

                {/* Plan header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="font-display text-base font-bold">{quote.planName}</div>
                  {isCurrent && (
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-green/10 text-green border border-green/25">
                      CURRENT
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mb-3">
                  <span className="font-display text-3xl font-extrabold"
                    style={{ color: meta.color }}>
                    ₹{quote.adjustedPremium}
                  </span>
                  <span className="text-gray-500 text-sm"> / week</span>
                  {quote.adjustedPremium !== quote.basePremium && (
                    <div className="text-xs text-gray-600 font-mono mt-0.5">
                      Base ₹{quote.basePremium} · zone adjusted
                    </div>
                  )}
                </div>

                {/* Coverage */}
                <div className="text-sm text-gray-400 mb-3">
                  Up to <span className="text-white font-bold">₹{quote.coveragePerEvent}</span>/event ·{' '}
                  <span className="text-white">{quote.maxEventsPerWeek}</span> events/week
                </div>

                {/* Triggers */}
                <div className="space-y-1.5">
                  {quote.triggers?.map(t => (
                    <div key={t} className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{TRIGGER_ICONS[t] || '⚡'}</span>
                      <span className="capitalize">{t.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>

                {/* Risk + actuarial note */}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">
                      ~{quote.actuarial?.estimatedTriggerFrequencyPerMonth} triggers/mo
                    </span>
                    <span className={quote.riskBand === 'LOW' ? 'text-green'
                      : quote.riskBand === 'MEDIUM' ? 'text-amber' : 'text-danger'}>
                      {quote.riskBand} risk
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actuarial explainer */}
      {allQuotes.length > 0 && (
        <div className="cs-card mb-6">
          <div className="section-tag">// Financial Model — How We Price Your Coverage</div>
          <div className="grid grid-cols-4 gap-6">
            {[
              { label: 'Target Loss Ratio',      value: '65%',   note: 'Industry standard micro-insurance' },
              { label: 'Premium Pool / 100',      value: `₹${allQuotes.find(q => q.plan === 'standard')?.adjustedPremium * 100 || 4900}`, note: 'Weekly collection' },
              { label: 'Max Payout Exposure',    value: `₹${Math.round((allQuotes.find(q => q.plan === 'standard')?.adjustedPremium * 100 || 4900) * 0.65)}`, note: '65% of pool' },
              { label: 'Avg Trigger Frequency', value: `${allQuotes.find(q => q.plan === 'standard')?.actuarial?.estimatedTriggerFrequencyPerMonth || '2.3'}/mo`, note: `In ${userProfile?.city || 'your city'}` },
            ].map(s => (
              <div key={s.label}>
                <div className="font-display text-xl font-bold text-accent mb-1">{s.value}</div>
                <div className="text-xs text-gray-400 font-medium mb-0.5">{s.label}</div>
                <div className="text-xs text-gray-600">{s.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {!activePolicy && (
        <div className="flex items-center gap-4">
          <button onClick={handleCreate} disabled={actionLoading} className="btn-primary w-auto px-10">
            {actionLoading ? 'Activating...' : `⚡ Activate ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Shield`}
          </button>
          <p className="text-xs text-gray-500 font-mono">
            First premium deducted now · Renews every Sunday automatically
          </p>
        </div>
      )}
    </div>
  );
}
