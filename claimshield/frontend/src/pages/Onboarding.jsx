import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, premiumApi } from '../api';

const PLATFORMS = [
  { value: 'swiggy', label: 'Swiggy', icon: '🟠' },
  { value: 'zomato', label: 'Zomato', icon: '🔴' },
  { value: 'zepto', label: 'Zepto', icon: '🟣' },
  { value: 'blinkit', label: 'Blinkit', icon: '🟡' },
  { value: 'amazon', label: 'Amazon Flex', icon: '📦' },
  { value: 'dunzo', label: 'Dunzo', icon: '🔵' },
];

const CITIES = [
  { value: 'chennai', label: 'Chennai', state: 'Tamil Nadu' },
  { value: 'mumbai', label: 'Mumbai', state: 'Maharashtra' },
  { value: 'hyderabad', label: 'Hyderabad', state: 'Telangana' },
  { value: 'bengaluru', label: 'Bengaluru', state: 'Karnataka' },
];

const VEHICLES = [
  { value: 'bike', label: 'Motorcycle' },
  { value: 'scooter', label: 'Scooter' },
  { value: 'cycle', label: 'Bicycle' },
];

const PLANS = [
  {
    id: 'basic', name: 'Basic Shield', basePremium: 29, coverage: 150, events: 1,
    triggers: ['Heavy Rainfall', 'Extreme Heat'],
    color: 'border-gray-600', badge: '',
  },
  {
    id: 'standard', name: 'Standard Shield', basePremium: 49, coverage: 300, events: 2,
    triggers: ['Rainfall', 'Heat', 'Flood Alert', 'Platform Downtime'],
    color: 'border-accent2', badge: 'MOST POPULAR',
  },
  {
    id: 'pro', name: 'Pro Shield', basePremium: 79, coverage: 600, events: 3,
    triggers: ['All Standard triggers', 'Pollution / AQI', 'Curfew / Zone Closure'],
    color: 'border-amber', badge: 'MAX COVERAGE',
  },
];

const RISK_COLORS = {
  LOW: 'text-green border-green/20 bg-green/5',
  MEDIUM: 'text-amber border-amber/20 bg-amber/5',
  HIGH: 'text-danger border-danger/20 bg-danger/5',
  VERY_HIGH: 'text-danger border-danger/30 bg-danger/8',
};

function StepBar({ current, total }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center
            font-mono text-xs font-bold transition-all duration-300
            ${i < current
              ? 'bg-green text-bg'
              : i === current
                ? 'bg-accent2 text-white ring-2 ring-accent2/30'
                : 'bg-surface2 text-gray-500 border border-border'}`}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-px w-8 transition-all duration-300
              ${i < current ? 'bg-green' : 'bg-border'}`} />
          )}
        </div>
      ))}
      <span className="font-mono text-xs text-gray-500 ml-2">
        Step {current + 1} of {total}
      </span>
    </div>
  );
}

function RiskBand({ band, score }) {
  const styles = { LOW: 'badge-green', MEDIUM: 'badge-amber', HIGH: 'badge-red' };
  return (
    <span className={`badge ${styles[band] || 'badge-blue'}`}>
      Risk: {band} ({score}/100)
    </span>
  );
}

export default function Onboarding() {
  const { userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [pincodes, setPincodes] = useState([]);
  const [pincodeSearch, setPincodeSearch] = useState('');

  const [form, setForm] = useState({
    platform: '', city: '', zone: '', pincode: '',
    avgDailyEarnings: '', hoursPerDay: '', experienceMonths: '',
    vehicleType: 'bike', phone: '', upiId: '',
    preferredPlan: 'standard',
  });

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
    setError('');
  }

  // Fetch pincodes when city changes
  useEffect(() => {
    if (!form.city) return;
    premiumApi.pincodes(form.city)
      .then(data => setPincodes(data.pincodes || []))
      .catch(() => setPincodes([]));
    set('pincode', '');
    set('zone', '');
    setPincodeSearch('');
  }, [form.city]);

  // Live premium calculation
  const fetchQuote = useCallback(async () => {
    if (!form.city || !form.platform || !form.avgDailyEarnings) return;
    setQuoteLoading(true);
    try {
      const data = await premiumApi.calculate({
        plan: form.preferredPlan,
        city: form.city,
        pincode: form.pincode,
        zone: form.zone || 'central',
        platform: form.platform,
        avgDailyEarnings: form.avgDailyEarnings,
        hoursPerDay: form.hoursPerDay || 8,
        experienceMonths: form.experienceMonths || 0,
      });
      setQuote(data.quote);
    } catch {
      // silent fail — shows base values
    } finally {
      setQuoteLoading(false);
    }
  }, [form.city, form.pincode, form.zone, form.platform, form.avgDailyEarnings,
  form.hoursPerDay, form.experienceMonths, form.preferredPlan]);

  useEffect(() => { if (step >= 2) fetchQuote(); }, [step, fetchQuote]);
  useEffect(() => { if (step === 2) fetchQuote(); }, [form.preferredPlan]);

  function validateStep(s) {
    if (s === 0) {
      if (!form.platform) return 'Select your delivery platform';
      if (!form.city) return 'Select your city';
      if (!form.pincode) return 'Select your area / pincode';
    }
    if (s === 1) {
      if (!form.avgDailyEarnings || form.avgDailyEarnings <= 0)
        return 'Enter your average daily earnings';
      if (!form.hoursPerDay || form.hoursPerDay <= 0)
        return 'Enter how many hours you work daily';
      if (!form.phone || form.phone.length < 10)
        return 'Enter a valid 10-digit phone number';
    }
    return null;
  }

  function nextStep() {
    const err = validateStep(step);
    if (err) return setError(err);
    setStep(s => s + 1);
    setError('');
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      await authApi.onboarding({
        ...form,
        avgDailyEarnings: Number(form.avgDailyEarnings),
        hoursPerDay: Number(form.hoursPerDay),
        experienceMonths: Number(form.experienceMonths) || 0,
      });
      await refreshProfile();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Onboarding failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const filteredPincodes = pincodes.filter(p =>
    p.ward.toLowerCase().includes(pincodeSearch.toLowerCase()) ||
    p.pincode.includes(pincodeSearch)
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative z-10">
      <div className="w-full max-w-2xl">

        <div className="mb-8">
          <div className="section-tag">// Setting up your coverage</div>
          <h1 className="font-display text-3xl font-extrabold mb-2">
            Let's protect your income,{' '}
            <span className="text-accent">
              {userProfile?.name?.split(' ')[0] || 'partner'}
            </span>.
          </h1>
          <p className="text-gray-400 text-sm">
            3 quick steps. Your premium is calculated from your actual work profile — not a generic rate.
          </p>
        </div>

        <StepBar current={step} total={3} />

        {/* ── STEP 0: Identity ── */}
        {step === 0 && (
          <div className="cs-card cs-card-accent page-enter">
            <h2 className="font-display text-xl font-bold mb-1">Your Delivery Profile</h2>
            <p className="text-gray-400 text-sm mb-6">
              Which platform do you work for, and where?
            </p>

            {/* Platform */}
            <div className="mb-5">
              <label className="cs-label">Delivery Platform</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PLATFORMS.map(p => (
                  <button key={p.value} type="button"
                    onClick={() => set('platform', p.value)}
                    className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2
                      transition-all duration-200
                      ${form.platform === p.value
                        ? 'border-accent2 bg-accent2/8 text-white'
                        : 'border-border bg-surface hover:border-gray-600 text-gray-400'}`}>
                    <span className="text-2xl">{p.icon}</span>
                    <span className="text-xs font-bold">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* City */}
            <div className="mb-5">
              <label className="cs-label">City</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CITIES.map(c => (
                  <button key={c.value} type="button"
                    onClick={() => { set('city', c.value); set('pincode', ''); set('zone', ''); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2
                      transition-all duration-200 text-left
                      ${form.city === c.value
                        ? 'border-accent2 bg-accent2/8 text-white'
                        : 'border-border bg-surface hover:border-gray-600 text-gray-400'}`}>
                    <div>
                      <div className="text-sm font-bold">{c.label}</div>
                      <div className="text-xs opacity-60">{c.state}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pincode / Ward selector */}
            {form.city && (
              <div className="mb-5">
                <label className="cs-label">Your Area / Pincode</label>
                <p className="text-xs text-gray-500 mb-3">
                  Select your primary delivery zone. Risk levels are based on real NDMA flood
                  vulnerability data — flood-prone areas are priced higher.
                </p>

                <input
                  type="text"
                  className="cs-input mb-3"
                  placeholder="Search by area name or pincode..."
                  value={pincodeSearch}
                  onChange={e => setPincodeSearch(e.target.value)}
                />

                {pincodes.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    <div className="skeleton h-10 rounded-xl mb-2" />
                    <div className="skeleton h-10 rounded-xl mb-2" />
                    <div className="skeleton h-10 rounded-xl" />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {filteredPincodes.length === 0 ? (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No areas match "{pincodeSearch}"
                      </div>
                    ) : (
                      filteredPincodes.map(p => (
                        <button key={p.pincode} type="button"
                          onClick={() => { set('pincode', p.pincode); set('zone', p.ward); }}
                          className={`w-full flex items-center justify-between px-4 py-3
                            rounded-xl border-2 transition-all duration-150 text-left
                            ${form.pincode === p.pincode
                              ? 'border-accent bg-accent/6 text-white'
                              : 'border-border bg-surface hover:border-gray-600 text-gray-400'}`}>
                          <div>
                            <div className="text-sm font-semibold">{p.ward}</div>
                            <div className="font-mono text-xs opacity-60">{p.pincode}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {p.knownHazards?.length > 0 && (
                              <span className="text-xs text-gray-600 hidden sm:block">
                                {p.knownHazards[0].replace(/_/g, ' ')}
                              </span>
                            )}
                            <span className={`font-mono text-xs px-2 py-0.5 rounded border
                              ${RISK_COLORS[p.floodRisk]}`}>
                              {p.floodRisk.replace('_', ' ')}
                            </span>
                            {form.pincode === p.pincode && (
                              <span className="text-accent text-xs font-mono">✓</span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Show selected pincode risk summary */}
                {form.pincode && (() => {
                  const selected = pincodes.find(p => p.pincode === form.pincode);
                  if (!selected) return null;
                  return (
                    <div className={`mt-3 px-4 py-3 rounded-xl border
                      ${RISK_COLORS[selected.floodRisk]}`}>
                      <div className="font-mono text-xs font-bold mb-1">
                        {selected.ward} — {selected.floodRisk.replace('_', ' ')} FLOOD RISK
                      </div>
                      {selected.knownHazards?.length > 0 && (
                        <div className="text-xs opacity-80">
                          Known hazards: {selected.knownHazards.map(h => h.replace(/_/g, ' ')).join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {error && <p className="field-error mb-4">{error}</p>}

            <button onClick={nextStep} className="btn-primary">
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 1: Earnings ── */}
        {step === 1 && (
          <div className="cs-card cs-card-accent page-enter">
            <h2 className="font-display text-xl font-bold mb-1">Your Earnings Profile</h2>
            <p className="text-gray-400 text-sm mb-6">
              This is how we calculate your coverage. Be honest — it only helps you.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="cs-label">Avg Daily Earnings (₹)</label>
                <input type="number" className="cs-input" placeholder="900"
                  value={form.avgDailyEarnings}
                  onChange={e => set('avgDailyEarnings', e.target.value)} />
                <p className="text-xs text-gray-600 mt-1">On a typical working day</p>
              </div>
              <div>
                <label className="cs-label">Hours Worked Daily</label>
                <input type="number" className="cs-input" placeholder="8"
                  min="1" max="16"
                  value={form.hoursPerDay}
                  onChange={e => set('hoursPerDay', e.target.value)} />
                <p className="text-xs text-gray-600 mt-1">Average active hours</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="cs-label">Months on Platform</label>
                <input type="number" className="cs-input" placeholder="6" min="0"
                  value={form.experienceMonths}
                  onChange={e => set('experienceMonths', e.target.value)} />
                <p className="text-xs text-gray-600 mt-1">Veterans get a loyalty discount</p>
              </div>
              <div>
                <label className="cs-label">Vehicle Type</label>
                <select className="cs-select"
                  value={form.vehicleType}
                  onChange={e => set('vehicleType', e.target.value)}>
                  {VEHICLES.map(v => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="cs-label">Mobile Number</label>
                <input type="tel" className="cs-input" placeholder="9876543210"
                  maxLength={10}
                  value={form.phone}
                  onChange={e => set('phone', e.target.value.replace(/\D/g, ''))} />
              </div>
              <div>
                <label className="cs-label">UPI ID (for payouts)</label>
                <input type="text" className="cs-input" placeholder="ravi@upi"
                  value={form.upiId}
                  onChange={e => set('upiId', e.target.value)} />
                <p className="text-xs text-gray-600 mt-1">Payouts land here within 60s</p>
              </div>
            </div>

            {form.avgDailyEarnings && (
              <div className="bg-bg border border-border rounded-xl p-4 mb-5">
                <div className="font-mono text-xs text-gray-500 tracking-widest mb-2">
                  INCOME AT RISK
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="font-display text-lg font-bold text-white">
                      ₹{(form.avgDailyEarnings * 25).toLocaleString('en-IN')}
                    </div>
                    <div className="text-xs text-gray-500">Monthly earnings</div>
                  </div>
                  <div>
                    <div className="font-display text-lg font-bold text-amber">
                      ₹{Math.round(form.avgDailyEarnings * 25 * 0.25).toLocaleString('en-IN')}
                    </div>
                    <div className="text-xs text-gray-500">At risk (25% loss)</div>
                  </div>
                  <div>
                    <div className="font-display text-lg font-bold text-green">
                      ₹{Math.round(form.avgDailyEarnings * 25 * 0.25 * 0.12).toLocaleString('en-IN')}
                    </div>
                    <div className="text-xs text-gray-500">Annual premium</div>
                  </div>
                </div>
              </div>
            )}

            {error && <p className="field-error mb-4">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="btn-outline w-auto px-6">
                ← Back
              </button>
              <button onClick={nextStep} className="btn-primary">
                See My Quote →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Plan selection ── */}
        {step === 2 && (
          <div className="page-enter">
            <div className="cs-card mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="section-tag">// Your Personalised Quote</div>
                  <h2 className="font-display text-xl font-bold">Choose Your Plan</h2>
                </div>
                {quote && !quoteLoading && (
                  <RiskBand band={quote.riskBand} score={quote.riskScore} />
                )}
              </div>

              {quote && !quoteLoading && (
                <div className="bg-bg border border-border rounded-xl p-4 mb-5">
                  <div className="font-mono text-xs text-gray-500 tracking-widest mb-3">
                    WHY YOUR PREMIUM IS ₹{quote.adjustedPremium}/WEEK
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Base premium</span>
                      <span className="font-mono">₹{quote.basePremium}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        {quote.ward || quote.zone} · {quote.floodRisk?.replace('_', ' ')}
                      </span>
                      <span className="font-mono text-amber">
                        {quote.adjustedPremium > quote.basePremium
                          ? `+₹${quote.adjustedPremium - quote.basePremium}`
                          : `-₹${quote.basePremium - quote.adjustedPremium}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Earnings bracket</span>
                      <span className="font-mono">{quote.earningsBracket}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Max coverage/event</span>
                      <span className="font-mono text-green">₹{quote.coveragePerEvent}</span>
                    </div>
                    {quote.drainageScore && (
                      <div className="flex justify-between col-span-2">
                        <span className="text-gray-500">Drainage quality</span>
                        <span className="font-mono">
                          {quote.drainageScore}/5
                          {quote.drainageScore <= 2 && (
                            <span className="text-danger ml-1">(poor — risk factor)</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {quote.knownHazards?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="font-mono text-xs text-gray-500 mb-1">KNOWN HAZARDS IN YOUR AREA</div>
                      <div className="flex flex-wrap gap-2">
                        {quote.knownHazards.map(h => (
                          <span key={h} className="text-xs px-2 py-0.5 rounded bg-danger/8
                            border border-danger/20 text-danger font-mono">
                            {h.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {quote.actuarial && (
                    <div className="mt-3 pt-3 border-t border-border text-xs flex gap-4">
                      <span className="text-gray-500">
                        Est. {quote.actuarial.estimatedTriggerFrequencyPerMonth} triggers/month
                      </span>
                      <span className={quote.actuarial.poolHealthy ? 'text-green' : 'text-amber'}>
                        {quote.actuarial.poolHealthy ? '✓ Pool healthy' : '⚠ High risk pool'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {quoteLoading && (
                <div className="space-y-3 mb-5">
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-3/4" />
                </div>
              )}
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 gap-4 mb-4">
              {PLANS.map(plan => {
                const selected = form.preferredPlan === plan.id;
                return (
                  <button key={plan.id} type="button"
                    onClick={() => set('preferredPlan', plan.id)}
                    className={`w-full text-left cs-card border-2 transition-all duration-200
                      ${selected ? 'border-accent2 bg-accent2/5' : `${plan.color} hover:bg-surface`}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-display text-lg font-bold">{plan.name}</div>
                          {plan.badge && (
                            <span className="font-mono text-xs px-2 py-0.5 rounded
                              bg-accent2/15 text-blue-400 border border-accent2/25">
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 text-xs">
                          Up to <span className="text-white font-bold">₹{plan.coverage}</span> per event ·{' '}
                          <span className="text-white">{plan.events}</span> events/week
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className="font-display text-2xl font-extrabold text-accent">
                          ₹{quoteLoading || !quote
                            ? plan.basePremium
                            : form.preferredPlan === plan.id
                              ? quote.adjustedPremium
                              : plan.basePremium}
                        </div>
                        <div className="text-xs text-gray-500">/ week</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {plan.triggers.map(t => (
                        <span key={t} className="text-xs px-2 py-1 rounded
                          bg-bg border border-border text-gray-400">
                          {t}
                        </span>
                      ))}
                    </div>
                    {selected && (
                      <div className="mt-3 pt-3 border-t border-accent2/20
                        flex items-center gap-2 text-xs text-accent">
                        <span>✓</span> Selected — premium deducted every Sunday
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {error && <p className="field-error mb-4">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-outline w-auto px-6">
                ← Back
              </button>
              <button onClick={handleSubmit} className="btn-primary" disabled={loading}>
                {loading ? 'Activating your coverage...' : '⚡ Activate Coverage →'}
              </button>
            </div>

            <p className="text-xs text-gray-600 text-center mt-4 font-mono">
              No manual claim process. If it rains too hard to ride, we pay you automatically.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}