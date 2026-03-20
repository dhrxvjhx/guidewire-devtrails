# ClaimShield — Adversarial Defense & Anti-Spoofing Strategy

> **Design Philosophy:** Our defense assumes GPS will be compromised. We built for that.

---

## 1. Differentiation: Real vs. Bad Actor

We replace a single GPS coordinate with a **Contextual Legitimacy Score (CLS)** using signals that are hard to fake together.

### Device Sensor Fusion
- **Accelerometer/Gyroscope** — a storm-stranded worker shows micro-movements of being in a vehicle or covered space; a spoofer at home shows stillness
- **Barometric pressure** — must match the claimed weather zone
- **Cellular signal degradation & battery drain** — real storms affect both; spoofed claims don't

### Behavioural Continuity
Every worker has a historical mobility graph. A genuine claim is preceded by an active delivery session and a route into the weather zone. A spoofer has no recent activity trail leading there.

### Order/Activity Trail
Legitimate claims are tied to a real delivery in progress before the alert. No active order = immediate flag.

---

## 2. The Data: Beyond GPS

We detect coordinated rings with population-level analytics, not just per-claim checks.

| Signal | What It Catches |
|---|---|
| **Spatial clustering** | Multiple claims from the exact same GPS coordinate within minutes |
| **Temporal patterning** | A sharp spike of claims immediately after an alert (no natural ramp-up) |
| **Device fingerprinting** | Dozens of devices sharing the same home Wi-Fi or cell tower while claiming to be in a distant storm zone |
| **Network graph** | Workers sharing anomalies (same spoofed location, same device fingerprint) auto-surface as a syndicate |
| **Historical baseline** | A worker who has never been in a red-alert zone suddenly claiming the moment one is announced, especially with others, triggers a syndicate flag |
| **Weather API cross-validation** | The claimed coordinates must actually be under a red-alert at that moment |

> Even if one spoofed claim slips through, mass simultaneous claims from a geographic cluster is a statistical anomaly caught at the network level.

---

## 3. UX Balance: Fair Handling of Flagged Claims

We use a three-tier response so honest workers are never penalised.

### 🟢 Green — High Trust
Auto-approved, instant payout. No friction.

### 🟡 Amber — Anomaly Detected, Not Confirmed Fraud
Payout is **held, not denied**. Worker gets a simple in-app prompt:

> *"We noticed a signal issue — please confirm your location via a 10-second video or a quick selfie with surroundings."*

Honest workers in bad weather can do this; syndicate actors at home cannot. Most clear within minutes.

### 🔴 Red — Coordinated Cluster or Clear Spoofing
Claims frozen, flagged for human review. Worker is notified transparently with an appeal path. A one-tap dispute button escalates to priority review, and if a genuine worker was delayed due to system error, we add a compensation gesture (small bonus) to maintain trust.

### Protecting Honest Workers with Network Issues
A genuine worker who loses GPS in bad weather still has a plausible route history, an active delivery session, and matching sensor data — keeping them in Amber, not Red. **The burden of proof is proportional to the anomaly score.**

---

## Conclusion

We do not trust GPS. By fusing device sensors, behavioral continuity, and population-level graph analytics, our architecture makes a single spoofed coordinate useless. Genuine workers experience low-friction verification; syndicates are exposed automatically.

**This is not a patch — it's the foundation.**
