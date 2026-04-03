import { useState, useEffect, useCallback } from 'react';
import api from '../api';

function StatCard({ label, value, sub, color = 'text-white' }) {
    return (
        <div className="bg-surface px-6 py-5 border-r border-border last:border-0">
            <div className="font-mono text-xs text-gray-500 tracking-widest uppercase mb-2">{label}</div>
            <div className={`font-display text-2xl font-extrabold ${color}`}>{value}</div>
            {sub && <div className="text-xs text-gray-600 font-mono mt-1">{sub}</div>}
        </div>
    );
}

function LossRatioBar({ city, ratio }) {
    const pct = Math.min(ratio, 100);
    const color = pct > 75 ? '#ff1744' : pct > 60 ? '#ffb300' : '#00e676';
    const status = pct > 75 ? 'text-danger' : pct > 60 ? 'text-amber' : 'text-green';
    return (
        <div className="flex items-center gap-3 mb-3">
            <div className="w-24 font-mono text-xs text-gray-400 capitalize">{city}</div>
            <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${pct}%`, background: color }} />
            </div>
            <div className={`w-10 text-right font-mono text-xs font-bold ${status}`}>{pct}%</div>
        </div>
    );
}

function PredictiveRisk() {
    const forecasts = [
        { city: 'Chennai', risk: 'HIGH', rain: '72mm expected', temp: '30°C', payoutEst: '₹2,800', color: 'text-danger', bg: 'bg-danger/8', border: 'border-danger/20' },
        { city: 'Mumbai', risk: 'MEDIUM', rain: '38mm expected', temp: '31°C', payoutEst: '₹800', color: 'text-amber', bg: 'bg-amber/8', border: 'border-amber/20' },
        { city: 'Hyderabad', risk: 'LOW', rain: '2mm expected', temp: '36°C', payoutEst: '₹0', color: 'text-green', bg: 'bg-green/8', border: 'border-green/20' },
        { city: 'Bengaluru', risk: 'LOW', rain: '5mm expected', temp: '28°C', payoutEst: '₹0', color: 'text-green', bg: 'bg-green/8', border: 'border-green/20' },
    ];

    return (
        <div className="cs-card">
            <div className="font-mono text-xs text-gray-500 tracking-widest uppercase mb-1">
                Predictive Risk — Next 48h
            </div>
            <div className="text-xs text-gray-600 mb-4">
                Weather forecast · Est. payout exposure
            </div>
            <div className="space-y-2">
                {forecasts.map(f => (
                    <div key={f.city} className={`rounded-xl px-3 py-2.5 border ${f.bg} ${f.border}`}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold">{f.city}</span>
                            <span className={`font-mono text-xs font-bold ${f.color}`}>{f.risk}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>{f.rain} · {f.temp}</span>
                            <span className={`font-mono ${f.payoutEst !== '₹0' ? 'text-amber' : 'text-gray-600'}`}>
                                {f.payoutEst}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border text-xs text-gray-600 font-mono">
                Total est. exposure next 48h:{' '}
                <span className="text-amber font-bold">₹3,600</span>
            </div>
        </div>
    );
}

const TIER_STYLE = {
    GREEN: 'badge-green',
    AMBER: 'badge-amber',
    RED: 'badge-red',
};

export default function Admin() {
    const [stats, setStats] = useState(null);
    const [payouts, setPayouts] = useState([]);
    const [triggers, setTriggers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [simCity, setSimCity] = useState('chennai');
    const [simType, setSimType] = useState('rainfall');
    const [simming, setSimming] = useState(false);
    const [simResult, setSimResult] = useState(null);

    const load = useCallback(async () => {
        try {
            const [statsRes, payoutsRes, triggersRes] = await Promise.allSettled([
                api.get('/admin/stats'),
                api.get('/payouts/all?limit=10'),
                api.get('/admin/triggers/recent'),
            ]);
            if (statsRes.status === 'fulfilled') setStats(statsRes.value);
            if (payoutsRes.status === 'fulfilled') setPayouts(payoutsRes.value.payouts || []);
            if (triggersRes.status === 'fulfilled') setTriggers(triggersRes.value.triggers || []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function runSimulation() {
        setSimming(true);
        setSimResult(null);
        try {
            const result = await api.post('/admin/simulate-trigger', { city: simCity, triggerType: simType });
            setSimResult({ ok: true, data: result });
            await load();
        } catch (err) {
            setSimResult({ ok: false, error: err.message });
        } finally {
            setSimming(false);
        }
    }

    async function releasePayout(payoutId) {
        try {
            await api.post(`/payouts/release/${payoutId}`);
            await load();
        } catch (err) {
            alert('Release failed: ' + err.message);
        }
    }

    const cityPayouts = {};
    const cityPremiums = { chennai: 4900, mumbai: 5800, hyderabad: 3100, bengaluru: 2700 };
    payouts.filter(p => p.status === 'paid').forEach(p => {
        cityPayouts[p.city] = (cityPayouts[p.city] || 0) + p.amount;
    });
    const lossRatios = Object.entries(cityPremiums).map(([city, premiums]) => ({
        city,
        ratio: Math.round(((cityPayouts[city] || 0) / premiums) * 100),
    }));

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-10 relative z-10">
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10 page-enter">

            <div className="mb-6">
                <div className="font-mono text-xs text-accent tracking-widest uppercase mb-2">
          // Insurer Intelligence Dashboard
                </div>
                <h1 className="font-display text-3xl font-extrabold">Operations Overview</h1>
            </div>

            {/* Top stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 bg-surface2 border border-border rounded-xl overflow-hidden mb-6">
                <StatCard label="Total Workers" value={stats?.totalWorkers || 0} sub="registered" color="text-blue-400" />
                <StatCard label="Active Policies" value={stats?.activePolicies || 0} sub="this week" color="text-white" />
                <StatCard label="Premiums Collected" value={`₹${(stats?.totalPremiums || 0).toLocaleString('en-IN')}`} sub="all time" color="text-accent" />
                <StatCard label="Payouts Issued" value={`₹${(stats?.totalPayouts || 0).toLocaleString('en-IN')}`} sub={`${stats?.payoutCount || 0} events`} color="text-green" />
                <StatCard label="Fraud Prevented" value={`₹${(stats?.fraudPrevented || 0).toLocaleString('en-IN')}`} sub="blocked CLS" color="text-danger" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left col */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Trigger Simulator */}
                    <div className="cs-card cs-card-accent">
                        <div className="font-mono text-xs text-accent tracking-widest uppercase mb-4">
              // Trigger Simulator — Demo Mode
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 mb-4">
                            <div className="flex-1">
                                <label className="cs-label">City</label>
                                <select className="cs-select" value={simCity} onChange={e => setSimCity(e.target.value)}>
                                    <option value="chennai">Chennai</option>
                                    <option value="mumbai">Mumbai</option>
                                    <option value="hyderabad">Hyderabad</option>
                                    <option value="bengaluru">Bengaluru</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="cs-label">Trigger Type</label>
                                <select className="cs-select" value={simType} onChange={e => setSimType(e.target.value)}>
                                    <option value="rainfall">🌧️ Heavy Rainfall</option>
                                    <option value="heat">🌡️ Extreme Heat</option>
                                    <option value="flood">🚨 Flood Alert</option>
                                    <option value="pollution">😷 Pollution</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button onClick={runSimulation} disabled={simming}
                                    className="btn-primary w-full sm:w-auto px-6 py-3 whitespace-nowrap">
                                    {simming ? '⚡ Running...' : '⚡ Fire Trigger'}
                                </button>
                            </div>
                        </div>

                        {simResult && (
                            <div className={`rounded-xl px-4 py-3 font-mono text-sm border
                ${simResult.ok
                                    ? 'bg-green/8 border-green/25 text-green'
                                    : 'bg-danger/8 border-danger/25 text-danger'}`}>
                                {simResult.ok
                                    ? `✓ ${simResult.data.message} — GREEN: ${simResult.data.stats?.green} | AMBER: ${simResult.data.stats?.amber} | RED: ${simResult.data.stats?.red}`
                                    : `✗ ${simResult.error}`}
                            </div>
                        )}
                    </div>

                    {/* Payout Queue */}
                    <div className="cs-card p-0 overflow-hidden">
                        <div className="px-5 py-4 border-b border-border flex justify-between items-center">
                            <div className="font-display font-bold">Payout Queue</div>
                            <div className="font-mono text-xs text-gray-500">{payouts.length} records</div>
                        </div>
                        {payouts.length === 0 ? (
                            <div className="py-12 text-center text-gray-500 text-sm">
                                No payouts yet. Run a simulation above.
                            </div>
                        ) : (
                            <div>
                                {payouts.map(p => (
                                    <div key={p.id}
                                        className="flex items-center gap-3 px-5 py-3.5 border-b border-border
                               last:border-0 hover:bg-surface2 transition-colors">
                                        <div className="w-8 h-8 rounded-lg bg-accent2/15 flex items-center
                                    justify-center font-display text-xs font-bold text-blue-400 flex-shrink-0">
                                            {(p.userId || '?').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                <span className="text-sm font-semibold">{p.triggerName || p.triggerType}</span>
                                                <span className={`badge ${TIER_STYLE[p.clsTier]} text-xs`}>
                                                    CLS {p.clsTier} · {p.clsScore}
                                                </span>
                                            </div>
                                            <div className="font-mono text-xs text-gray-500">
                                                {p.city?.toUpperCase()} · {new Date(p.createdAt).toLocaleString('en-IN')}
                                                {p.simulated && <span className="ml-2 text-accent">· SIM</span>}
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 flex items-center gap-3">
                                            <div>
                                                <div className={`font-mono text-sm font-bold
                          ${p.status === 'paid' ? 'text-green'
                                                        : p.status === 'pending_verification' ? 'text-amber'
                                                            : 'text-danger'}`}>
                                                    ₹{p.amount}
                                                </div>
                                                <div className="font-mono text-xs text-gray-600 capitalize">
                                                    {p.status?.replace(/_/g, ' ')}
                                                </div>
                                            </div>
                                            {p.status === 'pending_verification' && (
                                                <button onClick={() => releasePayout(p.id)}
                                                    className="font-mono text-xs px-3 py-1.5 rounded-lg
                                     bg-green/10 text-green border border-green/25
                                     hover:bg-green/20 transition-colors whitespace-nowrap">
                                                    Release →
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Trigger Event Log */}
                    <div className="cs-card p-0 overflow-hidden">
                        <div className="px-5 py-4 border-b border-border">
                            <div className="font-display font-bold">Trigger Event Log</div>
                        </div>
                        {triggers.length === 0 ? (
                            <div className="py-8 text-center text-gray-500 text-sm">No trigger events yet.</div>
                        ) : (
                            <div>
                                {triggers.slice(0, 8).map(t => (
                                    <div key={t.id}
                                        className="flex items-center gap-3 px-5 py-3 border-b border-border
                               last:border-0 font-mono text-xs">
                                        <span className="text-lg flex-shrink-0">{t.icon || '⚡'}</span>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-white font-bold">{t.name}</span>
                                            <span className="text-gray-500 ml-2">{t.city?.toUpperCase()}</span>
                                            {t.simulated && <span className="text-accent ml-2">[SIM]</span>}
                                        </div>
                                        <div className="text-gray-500 flex-shrink-0">
                                            {new Date(t.firedAt || t.createdAt).toLocaleTimeString('en-IN')}
                                        </div>
                                        <div className={`flex-shrink-0 ${t.status === 'completed' ? 'text-green' : 'text-amber'}`}>
                                            {t.status}
                                        </div>
                                        {t.stats && (
                                            <div className="text-gray-600 flex-shrink-0">
                                                G:{t.stats.green} A:{t.stats.amber} R:{t.stats.red}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right col */}
                <div className="space-y-5">

                    {/* Loss Ratio */}
                    <div className="cs-card">
                        <div className="font-mono text-xs text-gray-500 tracking-widest uppercase mb-4">
                            Loss Ratio by City
                        </div>
                        {lossRatios.map(lr => <LossRatioBar key={lr.city} city={lr.city} ratio={lr.ratio} />)}
                        <div className="mt-4 pt-4 border-t border-border">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Target loss ratio</span>
                                <span className="font-mono text-accent">65%</span>
                            </div>
                            <div className="flex justify-between text-xs mt-1">
                                <span className="text-gray-500">Overall</span>
                                <span className={`font-mono font-bold
                  ${lossRatios.reduce((s, l) => s + l.ratio, 0) / 4 > 75 ? 'text-danger' : 'text-green'}`}>
                                    {Math.round(lossRatios.reduce((s, l) => s + l.ratio, 0) / 4)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Predictive Risk */}
                    <PredictiveRisk />

                    {/* Pool Health */}
                    <div className="cs-card">
                        <div className="font-mono text-xs text-gray-500 tracking-widest uppercase mb-4">
                            Pool Health
                        </div>
                        <div className="space-y-3">
                            {[
                                { label: 'Premium pool / week', value: '₹4,900', note: '100 Standard workers' },
                                { label: 'Max payout exposure', value: '₹3,185', note: '65% of pool' },
                                { label: 'Circuit breaker cap', value: '₹5,00,000', note: 'per 5-min cycle' },
                                { label: 'CLS GREEN threshold', value: '60/100', note: 'auto-approve' },
                            ].map(s => (
                                <div key={s.label} className="flex justify-between items-start">
                                    <div>
                                        <div className="text-xs text-gray-400">{s.label}</div>
                                        <div className="text-xs text-gray-600">{s.note}</div>
                                    </div>
                                    <div className="font-mono text-sm font-bold text-accent">{s.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CLS Signal Weights */}
                    <div className="cs-card">
                        <div className="font-mono text-xs text-gray-500 tracking-widest uppercase mb-4">
                            CLS Signal Weights
                        </div>
                        {[
                            { signal: 'Account Age', max: 20 },
                            { signal: 'Policy Tenure', max: 20 },
                            { signal: 'Claim Frequency', max: 20 },
                            { signal: 'Geo Consistency', max: 20 },
                            { signal: 'Temporal Pattern', max: 10 },
                            { signal: 'Population Clustering', max: 10 },
                        ].map(s => (
                            <div key={s.signal} className="flex justify-between text-xs mb-2">
                                <span className="text-gray-400">{s.signal}</span>
                                <span className="font-mono text-gray-500">{s.max} pts</span>
                            </div>
                        ))}
                        <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs font-bold">
                            <span className="text-white">GREEN threshold</span>
                            <span className="font-mono text-green">≥ 60 / 100</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}