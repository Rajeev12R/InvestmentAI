# Phase 7 Portfolio Intelligence & Multi-Asset Exposure

## 1. Concentration & Concentration Metrics
- **Top 1 Weight**: Maximum weight across all holdings ($\ge 35\%$ triggers `PORTFOLIO_CONCENTRATION` alert).
- **Top 3 Weight**: Aggregate weight of top 3 holdings ($\ge 65\%$ triggers concentration alert).
- **Herfindahl-Hirschman Index (HHI)**:
  $$\text{HHI} = \sum_{i=1}^N (w_i \times 100)^2$$
  - $\text{HHI} \ge 2500$: Highly Concentrated
  - $1500 \le \text{HHI} < 2500$: Moderately Concentrated
  - $\text{HHI} < 1500$: Diversified
- **Effective Number of Independent Bets ($N_{\text{eff}}$)**:
  $$N_{\text{eff}} = \frac{1}{\sum_{i=1}^N w_i^2}$$

---

## 2. Pairwise Correlation Clustering
- Evaluates pairwise correlation matrix $R \in [-1, 1]^{N \times N}$.
- Detects pairs with $r_{i,j} \ge 0.80$.
- Alerts when $\ge 3$ pairs cluster at $r \ge 0.80$ or portfolio average correlation $\ge 0.65$.

---

## 3. Multi-Period Portfolio State Drift ($T_0 \to T_1$)
- **Holding Allocation Drift**: Explicitly separates percentage-point change ($\Delta pp = (w_1 - w_0) \times 100$) from percentage change ($\% \Delta = \frac{w_1 - w_0}{w_0} \times 100$).
- **Sector Drift**: Flags sector exposure shifts $\ge 1.0\text{ pp}$.
- **Decision Distribution Drift**: Monitors portfolio-wide migration across `BUY`, `WATCH`, `HOLD`, and `AVOID`.
