# Phase 14 — System Limitations & Governance Boundaries

## 1. Governance & Execution Boundary
1. **Decision-Support Only**: Phase 14 generates proposed allocations (`PROPOSED`), not trade executions. No broker API is connected, and no live order routing is performed.
2. **Mandatory Human Review**: State transitions to `HUMAN_APPROVED` require explicit Portfolio Manager review via authenticated API.

## 2. Mathematical & Numerical Boundaries
1. **Sample Covariance Sensitivity**: Markowitz Mean-Variance optimization is sensitive to small errors in expected return and covariance estimates. Phase 14 provides alternative robust methods (Minimum Variance, Risk Parity, Maximum Diversification, Conviction-Weighted) and enforces box constraints to mitigate extreme weights.
2. **Covariance Horizon Requirement**: Minimum 30 daily observations are required to construct a covariance matrix. Shorter histories produce `INSUFFICIENT_DATA`.
3. **Liquidity Assumptions**: Liquidity models evaluate participation relative to historical ADV. In stressed market regimes, ADV may contract non-linearly.

## 3. Data Availability Handling
1. **No Defaulted Returns**: If a security lacks a verified valuation DCF, scenario model, or forecast ledger entry, its expected return is marked `UNAVAILABLE` rather than defaulting to market returns (e.g. 8% or 10%).
2. **Survivorship Bias Warning**: If historical universe membership cannot be reconstructed, the universe is flagged as `HISTORICAL_UNIVERSE_INCOMPLETE`.
