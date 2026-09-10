# Phase 15 — Mathematical Methodology & Monitoring Formulas

## 1. Portfolio Drift Formulations

### 1.1 Position-Level Drift
- **Absolute Drift**:
  $$\text{AbsoluteDrift}_i = |w_i^{\text{actual}} - w_i^{\text{target}}|$$
- **Relative Drift**:
  $$\text{RelativeDrift}_i = \frac{|w_i^{\text{actual}} - w_i^{\text{target}}|}{\max(|w_i^{\text{target}}|, \epsilon)} \quad (\epsilon = 10^{-6})$$

### 1.2 Aggregated Drift
- **Sector Drift**:
  $$\text{SectorDrift}_s = |\sum_{i \in s} w_i^{\text{actual}} - \sum_{i \in s} w_i^{\text{target}}|$$
- **One-Way Drift Turnover**:
  $$\text{OneWayDriftTurnover} = \frac{1}{2} \sum_{i=1}^N |w_i^{\text{actual}} - w_i^{\text{target}}|$$

---

## 2. Holdings Reconciliation Metrics

- **Share Difference**: $\Delta S_i = S_i^{\text{actual}} - S_i^{\text{expected}}$
- **Value Difference**: $\Delta V_i = V_i^{\text{actual}} - V_i^{\text{expected}}$
- **Weight Difference**: $\Delta w_i = w_i^{\text{actual}} - w_i^{\text{target}}$
- **Completeness Ratio**:
  $$\text{CompletenessRatio} = \frac{\text{Matched Positions Count}}{\text{Total Universe Positions Count}}$$

---

## 3. Transaction Impact & Cost Mechanics

- **Linear Broker Fee**:
  $$\text{LinearCost} = \text{TradeValue} \times \left(\frac{\text{Fee}_{\text{linear}}}{10000}\right)$$
- **Bid-Ask Spread Execution Cost**:
  $$\text{SpreadCost} = \text{TradeValue} \times \left(\frac{\text{Spread}_{\text{bps}}}{10000}\right)$$
- **Quadratic Market Impact Cost**:
  $$\text{MarketImpact} = \text{TradeValue} \times \left(\frac{\gamma_{\text{quadratic}}}{10000}\right) \times \left(\frac{\text{TradeValue}}{\text{ADV}_{\text{USD}}}\right)^2$$
- **Net Expected Rebalance Benefit**:
  $$\text{NetExpectedBenefit}_{\text{bps}} = \Delta \mu_{\text{bps}} - \text{TotalCost}_{\text{bps}}$$

---

## 4. Implementation Quality Metrics

- **Root-Mean-Square Weight Tracking Error**:
  $$\text{RMS Weight Error} = \sqrt{\frac{1}{N} \sum_{i=1}^N (w_i^{\text{actual}} - w_i^{\text{target}})^2}$$
- **Maximum Absolute Weight Error**: $\max_i |w_i^{\text{actual}} - w_i^{\text{target}}|$
