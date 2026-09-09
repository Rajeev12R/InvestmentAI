# Phase 18 — Institutional Liquidity & Trading Intelligence Methodology

## 1. Executive Summary & Core Principle
Phase 18 implements an institutional-grade investment implementation intelligence layer answering:
> *"Can this portfolio actually be implemented, traded, and liquidated safely under normal and stressed market conditions?"*

**Critical Execution Boundary**:
InvestmentAI is an **intelligence and decision support system**, NOT an autonomous broker or execution engine.
- InvestmentAI never autonomously places, routes, amends, cancels, or executes trades.
- Human authorization remains the ultimate boundary.
- Missing market or quote data returns `UNAVAILABLE` (never zero).

---

## 2. Market Liquidity Metrics & Formulations

### 2.1 Average Daily Volume (ADV)
Average Daily Volume over $N$ trading day observations:
$$\text{ADV}_N = \frac{1}{N} \sum_{i=1}^N \text{Volume}_i$$
Supported configurable windows: `5D`, `20D`, `30D`, `60D`, `90D`.
Every derived ADV result links to specific observation IDs (`includedObservationIds[]`).

### 2.2 Dollar ADV
$$\text{DollarADV} = \text{ADV} \times P_{\text{ref}}$$
Where $P_{\text{ref}}$ is the verified reference price linked to `priceObservationId`.

### 2.3 Bid-Ask Spread & Basis Points
$$\text{Mid} = \frac{\text{Bid} + \text{Ask}}{2}$$
$$\text{Spread} = \text{Ask} - \text{Bid}$$
$$\text{SpreadBps} = 10,000 \times \frac{\text{Spread}}{\text{Mid}}$$
Validation Invariants: $\text{Bid} > 0, \text{Ask} > 0, \text{Ask} \ge \text{Bid}, \text{Mid} > 0$. Inverted quotes return `INVALID_QUOTE`.

### 2.4 Participation Rate
$$\text{ParticipationRate} = \frac{\text{OrderQuantity}}{\text{ADV}}$$
$$\text{ParticipationPercent} = 100 \times \frac{\text{OrderQuantity}}{\text{ADV}}$$

---

## 3. Market Impact Modeling (`SQUARE_ROOT_IMPACT_MODEL_V1`)

### 3.1 Model Identity & Functional Form
The model is formally registered as `SQUARE_ROOT_IMPACT_MODEL_V1` ("Square Root Market Impact Approximation"):
$$\text{ImpactBps} = c \times 10,000 \times \sqrt{\frac{\text{OrderNotional}}{\text{DollarADV}}}$$
$$\text{ImpactCost} = \text{OrderNotional} \times \left(\frac{\text{ImpactBps}}{10,000}\right)$$
Where $c$ is the configured impact coefficient (default: $0.10$, unit: `dimensionless_scaling_factor`).

### 3.2 Provenance Category Separation
1. **Model Lineage / Academic Inspiration**: Square-root functional form inspired by institutional quantitative literature (Barra / Almgren-Chriss lineage).
2. **Regulatory Context**: MiFID II RTS 27 / SEC Rule 605 reference execution transparency frameworks, but are **not** mathematical calibrations of this formula.
3. **Calibration Status**: `CONFIGURED_ASSUMPTION` (`calibrationUniverse = UNAVAILABLE`, `calibrationPeriod = UNAVAILABLE`).

---

## 4. Liquidity Score Reproducibility (`LIQUIDITY_SCORE_V1`)

The 0–100 liquidity score is an exact additive composite model:
$$\text{TotalScore} = \text{Clamp}_{[0, 100]} (\text{advComponent} + \text{spreadComponent} + \text{mktCapComponent})$$

### 4.1 Exact Component Definitions
1. **ADV Component** (0 – 50 pts, weight: 0.50):
   $$\text{advComponent} = \min\left(50, \max\left(0, \log_{10}\left(\max\left(1, \frac{\text{DollarADV}}{100,000}\right)\right) \times 12.5\right)\right)$$
2. **Spread Component** (0 – 35 pts, weight: 0.35):
   $$\text{spreadComponent} = \max(0, \min(35, 35 - (\text{SpreadBps} \times 0.35)))$$
3. **Market Cap Component** (0 – 15 pts, weight: 0.15):
   $$\text{mktCapComponent} = \begin{cases} 15.0 & \text{if MarketCap} \ge \$10\text{B} \\ 10.0 & \text{if } \$2\text{B} \le \text{MarketCap} < \$10\text{B} \\ 5.0 & \text{if MarketCap} < \$2\text{B} \end{cases}$$

### 4.2 Missing Data Policy
If `DollarADV` is missing or $\le 0$, the score is returned as `UNAVAILABLE` (`reason = INSUFFICIENT_LIQUIDITY_DATA`), preventing silent defaults.

---

## 5. Componentized Implementation Cost Model

$$\text{TotalEstimatedTradingCost} = \text{ExplicitCommission} + \text{SpreadCost} + \text{MarketImpactCost} + \text{ExchangeFees} + \text{TransactionTaxes}$$
- One-way: $\text{HalfSpreadCost} = \text{Notional} \times \frac{\text{SpreadBps} / 2}{10,000}$
- Round-trip: $\text{FullSpreadCost} = \text{Notional} \times \frac{\text{SpreadBps}}{10,000}$

---

## 6. Liquidation Horizon & Capacity

$$\text{AllowedDailyParticipation} = \text{ADV} \times \text{MaxParticipationRate}$$
$$\text{RequiredTradingDays} = \left\lceil \frac{\text{OrderQuantity}}{\text{AllowedDailyParticipation}} \right\rceil$$
$$\text{MaxPositionNotional} = \text{DollarADV} \times \text{MaxParticipationRate} \times \text{MaxLiquidationDays}$$

---

## 7. Stressed Liquidity Analysis

- ADV Contraction: $-25\%, -50\%, -75\%$
- Spread Expansion: $\times 1.5, \times 2.0, \times 3.0$
- Joint Severe Stress: $\text{ADV} -50\% + \text{Spread} \times 2.0 + \text{Impact} \times 2.0$

---

## 8. Real-Data Observation Provenance (AAPL Trace Example)

```text
AAPL Liquidity Result (Tier 1, Score 96.2)
       ↓
ADV (45,000,000 shares) ← Observation IDs: [OBS-AAPL-VOL-20240725, ..., OBS-AAPL-VOL-20240731]
       ↓
Spread (1.78 bps) ← Bid ID: OBS-AAPL-QUOTE-BID-20240731, Ask ID: OBS-AAPL-QUOTE-ASK-20240731
       ↓
Dollar ADV ($10.1B) ← Price ID: OBS-AAPL-PRICE-CLOSE-20240731
       ↓
Provider Record: FEED-US-AAPL-20240731 (TRUTH_LAYER_DIRECT_FEED)
       ↓
Evidence ID: EVID-OBS-AAPL-20240731 (Hash: e3b0c442...)
```
