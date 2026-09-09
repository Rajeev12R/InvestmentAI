# Phase 14 — Mathematical Methodology & Optimization Formulas

## 1. Optimization Methods

### 1.1 Equal Weight (1/N)
$$w_i = \text{proj}_{\Omega}\left(\frac{1}{N}\right)$$
Subject to box bounds $w_{\min, i} \le w_i \le w_{\max, i}$ and $\sum_{i=1}^N w_i = 1.0$.

### 1.2 Minimum Variance
$$\min_{w \in \Omega} w^T \Sigma w$$
Subject to $\sum_{i=1}^N w_i = 1.0$ and $w_{\min, i} \le w_i \le w_{\max, i}$.
Solved via Projected Gradient Descent with Lipschitz step sizing and exact Box-Simplex dual bisection projection.

### 1.3 Mean-Variance Optimization
$$\max_{w \in \Omega} \mu^T w - \lambda w^T \Sigma w$$
Where $\mu$ is the expected return vector and $\lambda$ is the risk aversion parameter ($\lambda = 2.5$ in $V_1$, $\lambda = 3.0$ in $V_2$).

### 1.4 Risk Parity (Equal Risk Contribution)
Targets identical Component Risk Contribution across assets:
$$RC_i = RC_j = \frac{\sigma_p}{N} \quad \forall i, j$$
Solved via iterative coordinate descent on risk weights.

### 1.5 Maximum Diversification
Maximizes the portfolio Diversification Ratio (Choueifaty & Coignard, 2008):
$$\max_{w \in \Omega} \frac{w^T \sigma}{\sqrt{w^T \Sigma w}}$$
Where $\sigma = (\sqrt{\Sigma_{11}}, \dots, \sqrt{\Sigma_{NN}})^T$.

### 1.6 Conviction-Weighted
$$w_i \propto \text{ConvictionScore}_i$$

### 1.7 Valuation / Conviction Hybrid
$$S_i = \alpha_{\text{val}} \tilde{\mu}_i + \alpha_{\text{conv}} \tilde{C}_i + \alpha_{\text{risk}} \tilde{\sigma}_i^{-1}$$
Normalized onto constraints $\Omega$.

---

## 2. Solver Convergence Contract & Quality Validation

For every iterative optimization method, the convergence contract mandates:
- **Maximum Iterations**: `maxIterations: 1000` (V1), `2000` (V2).
- **Convergence Tolerance**: `convergenceTolerance: 1e-7` (V1), `1e-8` (V2).
- **Objective Improvement Tolerance**: `objectiveImprovementTolerance: 1e-9` (V1), `1e-10` (V2).
- **Stationarity Criterion**: Projected gradient step difference $\|w_{k+1} - w_k\|_1 < \text{tol}$.
- **Feasibility Tolerance**: Box bounds and weight sum within `feasibilityTolerance: 1e-6`.
- **Deterministic Termination**: Terminate upon tolerance satisfaction or return explicit `NON_CONVERGENT` status.
- **Independent Quality Validation**: Post-solve recomputation of objective value, bounds, risk, and variance. Suboptimal or malformed candidates return `OPTIMIZATION_INVALID`.

---

## 3. Covariance Numerical Policy & Matrix Classification

The platform enforces strict matrix classification:
1. **Positive Definite (PD)**: All eigenvalues $\lambda_i > 0$, Cholesky diagonal elements $L_{ii} \ge 10^{-5}$, condition number $\kappa(\Sigma) \le 10^6$. Valid for optimization.
2. **Positive Semi-Definite Singular (PSD_SINGULAR)**: Mathematically PSD ($\lambda_i \ge 0$), but $\lambda_{\min} < 10^{-6}$ or rank-deficient. Deterministic failure state:
   > *PSD is mathematically valid, but the current optimization implementation requires PD for numerical stability.*
3. **Near-Singular / Ill-Conditioned (ILL_CONDITIONED)**: Condition number $\kappa(\Sigma) = \lambda_{\max} / \lambda_{\min} > 10^6$. Rejected with `NUMERICAL_FAILURE`.
4. **Non-PSD (NON_PSD)**: Minimum eigenvalue or Cholesky diagonal $< -10^{-8}$. Rejected with `NUMERICAL_FAILURE`.
5. **Asymmetric (ASYMMETRIC)**: $\max_{i, j} |\Sigma_{ij} - \Sigma_{ji}| > 10^{-6}$. Rejected with `NUMERICAL_FAILURE`.
6. **Dimension Mismatch (NON_SQUARE_MATRIX)**: Row/column counts non-square or not matching universe. Rejected with `INVALID_INPUT`.

---

## 4. Risk Decomposition (Euler's Theorem)

- **Portfolio Volatility**: $\sigma_p = \sqrt{w^T \Sigma w}$
- **Marginal Risk Contribution (MRC)**:
  $$MRC_i = \frac{\partial \sigma_p}{\partial w_i} = \frac{(\Sigma w)_i}{\sigma_p}$$
- **Component Risk Contribution (RC)**:
  $$RC_i = w_i \cdot MRC_i = \frac{w_i (\Sigma w)_i}{\sigma_p}$$
- **Percentage Risk Contribution (PRC)**:
  $$PRC_i = \frac{RC_i}{\sigma_p}$$
- **Exact Reconciliation Invariant**:
  $$\sum_{i=1}^N RC_i = \sigma_p \quad (\text{tolerance} < 10^{-4})$$

---

## 5. Turnover Terminology & Reconciliation

- **Two-Way Turnover**: Total absolute sum of position weight deltas across all assets:
  $$\text{TwoWayTurnover} = \sum_{i=1}^N |w_{\text{target}, i} - w_{\text{current}, i}|$$
- **One-Way Turnover**: Buy-side / sell-side equivalent under a fully funded rebalance ($\sum w_{\text{target}} = \sum w_{\text{current}} = 1.0$):
  $$\text{OneWayTurnover} = \frac{1}{2} \sum_{i=1}^N |w_{\text{target}, i} - w_{\text{current}, i}|$$
- **Reconciliation Invariant**:
  $$\text{TwoWayTurnover} = 2 \times \text{OneWayTurnover}$$
  $$\text{BuySideTurnover} = \text{SellSideTurnover} = \text{OneWayTurnover}$$
- **Transaction Costs (Linear + Quadratic Market Impact)**:
  $$\text{Cost Amount} = \text{TradedValue} \times \left(\frac{\text{Fee}_{\text{linear}} + \text{Spread}}{10000}\right) + \text{TradedValue} \times \left(\frac{\gamma \cdot \text{Turnover}}{10000}\right)$$
