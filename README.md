# ClaimShield — Parametric Income Insurance for India's Delivery Workers

> *Swiggy and Zomato workers lose 20–30% of monthly income when rain, heat, or floods hit. They have no safety net. ClaimShield fixes that — automatically.*

**Team:** Ctrl+Alt+Delete | **DEVTrails 2026 — Phase 2 (Scale)**

---

## The Problem

Meet **Ravi**, a Swiggy delivery partner in Chennai. He earns ₹800–1,200/day. When the northeast monsoon hits, he can't ride. He doesn't work, he doesn't earn. No insurance covers him. No government scheme reaches him. He just loses the money.

This is not a niche problem. India has **12 million+ gig delivery workers**. Extreme weather events, platform outages, and curfews cost them collectively **₹2,400 crore in lost income every year**. They bear 100% of this risk alone.

---

## Our Solution: Parametric Micro-Insurance

ClaimShield is a **parametric insurance platform** — meaning payouts are triggered automatically by real-world events, not by filing claims.

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

| Plan | Premium | Max Payout | Coverage Cap/week |
|------|---------|------------|-------------------|
| Basic | ₹29 | ₹150/event | 1 event/week |
| Standard | ₹49 | ₹300/event | 2 events/week |
| Pro | ₹79 | ₹600/event | 3 events/week |

**ML-adjusted pricing:** Base premium is adjusted ±₹8/week using hyper-local risk factors:
- Zone flood history (last 6 months)
- Avg monthly rain days in the worker's operating zone
- Platform (Swiggy/Zomato/Zepto) shift pattern risk

**Actuarial basis:**
- Target loss ratio: 65% (industry standard for micro-insurance)
- Premium pool of 100 workers (Standard): ₹4,900/week
- Max payout exposure: ₹3,185 (65% of pool)
- Estimated trigger frequency: 2.3 events/month in Chennai (monsoon season)

---

## Parametric Triggers (5 Automated)

| Trigger | Data Source | Threshold | Payout |
|---------|-------------|-----------|--------|
| Heavy Rainfall | OpenWeatherMap API | >45mm/hr OR IMD Orange Alert | Full coverage |
| Extreme Heat | OpenWeatherMap + IMD | >42°C + Heat Wave declaration | Full coverage |
| Flood Alert | NDMA mock API | Level 2+ alert in city | Full coverage |
| Platform Downtime | Swiggy/Zomato mock API | >30min outage | 50% coverage |
| Severe Pollution | CPCB AQI mock | AQI >300 (Hazardous) | Pro plan only |

All thresholds checked every 5 minutes by automated scheduler. **No manual claim process exists.**

---

## AI / ML Integration

1. **Dynamic Premium Engine** — XGBoost model (mocked with rule-based logic for demo) adjusts weekly premium based on zone risk score, historical claim frequency, and predictive weather data
2. **CLS Fraud Detection** — 6-signal Contextual Legitimacy Score runs on every payout (GPS sensor fusion, cell tower, behavioural continuity, active order check, weather cross-reference, population clustering). Honest workers face zero friction.
3. **Predictive Risk Dashboard** — Admin view predicts next week's likely payouts based on 7-day weather forecast, helping the insurer maintain loss ratio

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Scheduler | node-cron (every 5 min) |
| Weather API | OpenWeatherMap (free tier) |
| Payments | Razorpay sandbox / mock |
| Fraud Engine | Rule-based CLS (XGBoost-ready) |
| Hosting | Firebase Hosting + Cloud Functions |

---

## System Flow

```
Sunday midnight
  → Premium deducted from all active policies
  
Every 5 minutes:
  → Fetch weather data for all covered cities
  → Evaluate trigger thresholds
  → If trigger fires:
      → Query all active policies in affected city
      → Run CLS fraud check on each worker
      → GREEN → instant payout via Razorpay
      → AMBER → soft verify prompt (selfie)
      → RED → freeze + human review
  → Update wallet + transaction ledger
  → Log all events to admin dashboard
```

---

## Project Structure

```
claimshield/
├── backend/          Node.js API + scheduler + CLS engine
├── frontend/         React app (worker portal + admin)
├── firebase/         Firestore rules + config
└── README.md
```

---

## Running Locally

```bash
# Backend
cd backend && npm install
cp .env.example .env   # fill in Firebase + API keys
npm run dev            # starts on :3001

# Frontend  
cd frontend && npm install
npm run dev            # starts on :5173
```

---

## Key Design Decisions

- **Web platform** (not mobile): Delivery workers use phones but onboarding and admin are easier on web. Progressive Web App approach ensures mobile usability.
- **Weekly billing**: Matches gig worker income cycle. Workers paid weekly → insured weekly.
- **Parametric over indemnity**: No loss assessment, no adjuster, no delay. Event happens → payout happens. Trust is built through speed.
- **CLS as backstop, not gatekeeper**: Fraud check runs invisibly. 95%+ of honest workers never know it's there.
