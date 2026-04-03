# ClaimShield — Parametric Income Insurance for India's Delivery Workers

> *Swiggy and Zomato workers lose 20–30% of monthly income when rain, heat, or floods hit. They have no safety net. ClaimShield fixes that — automatically.*

**Team:** Ctrl+Alt+Delete | **DEVTrails 2026 — Phase 2: Automation & Protection**

---

## The Problem

Meet **Ravi**, a Swiggy delivery partner in Chennai. He earns ₹800–1,200/day. When the northeast monsoon hits, he can't ride. He doesn't work, he doesn't earn. No insurance covers him. No government scheme reaches him. He just loses the money.

This is not a niche problem. India has **12 million+ gig delivery workers**. Extreme weather events, platform outages, and curfews cost them collectively **₹2,400 crore in lost income every year**. They bear 100% of this risk alone.

---

## Our Solution: Parametric Micro-Insurance

ClaimShield is a **parametric insurance platform** — payouts are triggered automatically by real-world events, not by filing claims.

**How it works in 3 steps:**
1. Ravi pays **₹49/week** — deducted automatically every Sunday
2. Our system **monitors Chennai's weather, NDMA alerts, and Swiggy's uptime** every 5 minutes
3. When rainfall exceeds 45mm/hr, **₹300 lands in Ravi's wallet instantly** — no app to open, no claim to file, no adjuster to call

---

## Persona

**Primary persona: Food Delivery Partners (Swiggy / Zomato)**
- Avg daily earnings: ₹800–1,200
- Working hours: 10am–10pm (peak: lunch + dinner)
- Key risk: Cannot ride in heavy rain, extreme heat (>42°C), or during flood alerts
- No existing income protection — health insurance is separate and excluded here

**Coverage scope:** LOSS OF INCOME ONLY. We do not cover vehicle repairs, health, accidents, or personal property. We insure the lost hours of work caused by uncontrollable external events.

---

## Weekly Premium Model

| Plan | Premium | Max Payout | Events/Week |
|------|---------|------------|-------------|
| Basic | ₹29 | ₹150/event | 1 |
| Standard | ₹49 | ₹300/event | 2 |
| Pro | ₹79 | ₹600/event | 3 |

**ML-ready dynamic pricing:** Base premium is adjusted ±₹8/week using hyper-local risk factors:
- Zone flood history (last 6 months)
- Avg monthly rain days in the worker's operating zone
- Platform (Swiggy/Zomato/Zepto) shift pattern risk
- Worker experience (loyalty discount for 6+ month veterans)

Current implementation uses a rule-based model with the same input/output shape as a trained ML model — designed to be swapped for XGBoost or similar with no API changes.

**Actuarial basis:**
- Target loss ratio: 65% (industry standard for micro-insurance)
- Premium pool of 100 Standard workers: ₹4,900/week
- Max payout exposure: ₹3,185 (65% of pool)
- Estimated trigger frequency: 2.3 events/month in Chennai (monsoon season)

---

## Parametric Triggers (5 Automated)

| Trigger | Data Source | Threshold | Payout |
|---------|-------------|-----------|--------|
| Heavy Rainfall | OpenWeatherMap API | >45mm/hr | Full coverage |
| Extreme Heat | OpenWeatherMap + IMD | >42°C | Full coverage |
| Flood Alert | Rainfall >35mm + Alert | Level 2+ | Full coverage |
| Platform Downtime | Mock API | >30min outage | 50% coverage |
| Severe Pollution | CPCB AQI mock | AQI >300 | Pro plan only |

All thresholds checked every 5 minutes by automated scheduler. **No manual claim process exists anywhere in the product.**

---

## AI / ML Integration

1. **Dynamic Premium Engine** — Rule-based actuarial model adjusting weekly premium based on zone risk score, historical claim frequency, and worker profile. ML-ready: same interface, pluggable model.
2. **CLS Fraud Detection** — 6-signal Contextual Legitimacy Score runs on every payout. Signals: account age, policy tenure, claim frequency, geographic consistency, temporal pattern, population clustering. GREEN (≥60) → instant pay. AMBER (35–59) → admin review. RED (<35) → blocked + appeal path.
3. **Predictive Risk Dashboard** — Admin view shows 48-hour weather forecast per city with estimated payout exposure for next week.

---

## Phase 2 Deliverables

Everything below is built and running:

| Deliverable | Status | Where to see it |
|-------------|--------|-----------------|
| Worker registration + onboarding | ✅ Complete | `/onboarding` — 3-step Swiggy persona form |
| Insurance policy management | ✅ Complete | `/policy` — create, pause, cancel + live quote |
| Dynamic premium calculation | ✅ Complete | Updates live as you change earnings/zone |
| Claims management (parametric) | ✅ Complete | Automatic — no claim button exists |
| Trigger engine (5 triggers) | ✅ Complete | Scheduler fires every 5 min |
| Fraud detection (CLS) | ✅ Complete | 6-signal score on every payout |
| Payout engine | ✅ Complete | GREEN instant, AMBER admin review, RED blocked |
| Wallet + transaction ledger | ✅ Complete | `/wallet` — full history with CLS tags |
| Worker disruption notifications | ✅ Complete | In-app real-time alerts on payout |
| Admin dashboard | ✅ Complete | `/admin` — stats, queue, loss ratio, simulator |
| Trigger simulator (demo) | ✅ Complete | Fire any trigger from admin UI |
| Appeal flow for RED workers | ✅ Complete | Dispute button on blocked transactions |

---

## System Flow

```
Sunday midnight
  → Premium deducted from all active policies
  
Every 5 minutes:
→ Fetch live weather (OpenWeatherMap) for Chennai, Mumbai, Hyderabad, Bengaluru
→ Evaluate 5 trigger thresholds
→ If trigger fires:
→ Query all active policies in affected city
→ Run CLS fraud check (6 signals, 0–100 score)
→ GREEN (≥60) → instant payout via Razorpay mock → wallet credited
→ AMBER (35–59) → held, admin releases after review
→ RED (<35) → blocked, fraud logged, appeal path open
→ Worker sees in-app notification: "₹300 credited — Heavy Rainfall detected"
→ All events logged to admin dashboard

**AMBER verification note:** In Phase 2, AMBER payouts are reviewed and released via the admin dashboard. Worker-facing selfie/video verification prompt is scoped for Phase 3.
```

---

**AMBER verification note:** In Phase 2, AMBER payouts are reviewed and released via the admin dashboard. Worker-facing selfie/video verification prompt is scoped for Phase 3.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Scheduler | node-cron (every 5 min) |
| Weather API | OpenWeatherMap (live) |
| Payments | Razorpay mock (sandbox-shaped response with UTR) |
| Fraud Engine | Rule-based CLS (6 signals, ML-ready interface) |

---

## Running Locally
```bash
# Backend
cd claimshield/backend
cp .env.example .env        # fill Firebase + OpenWeatherMap keys
npm install
npm run dev                 # starts on :3001

# Frontend
cd claimshield/frontend
cp .env.example .env        # fill Firebase web config
npm install
npm run dev                 # starts on :5173
```

**Demo credentials:** demo@claimshield.in / demo1234

**To simulate a trigger (no rain needed):**
Go to `/admin` → select city + trigger type → click ⚡ Fire Trigger

---

## Key Design Decisions

- **Web platform:** Onboarding and admin are desktop-first. Dashboard and wallet are mobile-responsive for workers checking payouts on their phones.
- **Weekly billing:** Matches gig worker income cycle. Paid weekly → insured weekly.
- **Parametric over indemnity:** No loss assessment, no adjuster, no delay. Event happens → payout happens.
- **CLS as invisible backstop:** Fraud check runs silently. 95%+ of honest workers never know it's there — they just get paid.
- **Circuit breaker:** Pool drain protection. If a cycle exceeds ₹5 lakh in payouts, auto-freeze triggers before the pool is drained.