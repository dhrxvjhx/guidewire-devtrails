// src/pages/Login.jsx
// Sign in + Sign up — clean, minimal, no clutter.
// After auth → redirect to onboarding (new) or dashboard (returning).

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, signup, isOnboarded } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login');   // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
  });

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Validate
    if (mode === 'signup') {
      if (!form.name.trim()) return setError('Name is required');
      if (form.password !== form.confirmPassword) return setError('Passwords do not match');
      if (form.password.length < 6) return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await signup(form.name.trim(), form.email, form.password);
        navigate('/onboarding');
      } else {
        await login(form.email, form.password);
        navigate(isOnboarded ? '/dashboard' : '/onboarding');
      }
    } catch (err) {
      // Make Firebase errors readable
      const msg = err.message
        .replace('Firebase: ', '')
        .replace(/\(auth\/.*\)/, '')
        .replace('Error', '')
        .trim();
      setError(msg || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative z-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="font-mono text-xs text-accent tracking-widest uppercase mb-4">
            // DEVTrails 2026
          </div>
          <div className="font-display text-4xl font-extrabold mb-3">
            Claim<span className="text-accent">Shield</span>
          </div>
          <div className="text-gray-400 text-sm leading-relaxed">
            Parametric income insurance for<br />
            Swiggy & Zomato delivery workers.
          </div>
        </div>

        {/* Card */}
        <div className="cs-card cs-card-accent">

          {/* Mode toggle */}
          <div className="flex rounded-lg bg-bg border border-border p-1 mb-6">
            {['login', 'signup'].map(m => (
              <button key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-display font-bold transition-all duration-200
                  ${mode === m
                    ? 'bg-accent2 text-white shadow'
                    : 'text-gray-400 hover:text-white'}`}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {mode === 'signup' && (
              <div>
                <label className="cs-label">Full Name</label>
                <input
                  type="text"
                  className="cs-input"
                  placeholder="e.g. Ravi Kumar"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="cs-label">Email</label>
              <input
                type="email"
                className="cs-input"
                placeholder="ravi@example.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="cs-label">Password</label>
              <input
                type="password"
                className="cs-input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="cs-label">Confirm Password</label>
                <input
                  type="password"
                  className="cs-input"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)}
                  required
                />
              </div>
            )}

            {error && (
              <div className="text-danger text-sm font-mono bg-danger/8 border border-danger/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary mt-2" disabled={loading}>
              {loading
                ? 'Please wait...'
                : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* What is this */}
          {mode === 'signup' && (
            <div className="mt-6 pt-5 border-t border-border">
              <div className="font-mono text-xs text-gray-500 tracking-widest uppercase mb-3">
                What you get
              </div>
              <div className="space-y-2">
                {[
                  '₹300 auto-payout when it rains too hard to ride',
                  'Zero claim filing — we watch the weather for you',
                  'Weekly coverage from ₹29 — less than a chai per day',
                ].map(t => (
                  <div key={t} className="flex gap-2 text-xs text-gray-400">
                    <span className="text-green mt-0.5 flex-shrink-0">✓</span>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Demo credentials hint */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-600 font-mono">
            Demo: demo@claimshield.in / demo1234
          </p>
        </div>
      </div>
    </div>
  );
}
