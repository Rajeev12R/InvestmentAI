# Phase 14 — Production Reality & Operational Status

## 1. Reality Status Classifications

In accordance with InvestmentAI's truthful architecture, every subsystem is classified into explicit reality states:

| Subsystem / Component | Classification | Operational Reality |
| :--- | :--- | :--- |
| **Portfolio Optimizer Engine** | `PRODUCTION_PROVEN_ENGINE` | Deterministic Mean-Variance, Min-Variance, Risk Parity, Max Diversification, Equal Weight |
| **Covariance & PSD Matrix Engine** | `PRODUCTION_PROVEN_ENGINE` | Cholesky PSD validation, symmetry checks, condition number gating |
| **Constraint & Feasibility Engine** | `PRODUCTION_PROVEN_ENGINE` | Exact Box-Simplex projection, infeasible constraint detection |
| **Risk Budgeting & Decomposition** | `PRODUCTION_PROVEN_ENGINE` | Exact Euler decomposition, $\sum RC_i = \sigma_p$ reconciliation |
| **Turnover & Transaction Cost Engine** | `PRODUCTION_PROVEN_ENGINE` | Deterministic one-way/two-way turnover and quadratic market impact model |
| **Liquidity-Aware Sizing Engine** | `PRODUCTION_PROVEN_ENGINE` | ADV participation bounds and liquidation days calculation |
| **What-If & Stress Test Engines** | `PRODUCTION_PROVEN_ENGINE` | Non-mutating scenario simulations and macro stress testing |
| **Explanation DAG Engine** | `PRODUCTION_PROVEN_ENGINE` | Auditable causal node-edge graph linking allocation to Truth |
| **Sealed Package Builder** | `PRODUCTION_PROVEN_ENGINE` | Canonical JSON serialization, SHA-256 seal, recursive `deepFreeze` |
| **REST API Routes (`/api/portfolio-construction`)** | `PRODUCTION_PROVEN_ENGINE` | Authenticated Express router with RBAC and IDOR tenant isolation |
| **Copilot Tool Adapter** | `PRODUCTION_PROVEN_ENGINE` | Read-only adapter for sealed package consumption |
| **AAPL Golden Allocation Trace** | `INTEGRATION_PROVEN` | Full E2E chain evaluated from real $T_0$ facts and returns |
| **JPM / RELIANCE.NS / TMPV.NS / TSM** | `INSUFFICIENT_DATA` | Tickers lacking internal decision/forecast history return `INSUFFICIENT_DATA` |
| **Automated Broker Trade Execution** | `EXECUTION_NOT_CONNECTED` | Phase 14 is decision-support only; no broker execution API connected |

---

## 2. Distinction of Data Types

- **Deterministic Calculation**: Numerical optimizations, risk budgeting, turnover, transaction cost estimates.
- **Model Assumption**: Risk aversion parameter $\lambda$, transaction cost linear/quadratic basis points.
- **Empirical Observation**: Real historical market returns, DCF intrinsic valuations from SEC filings.
- **Unavailable Data**: Missing covariance history or ticker facts return `UNAVAILABLE` / `INSUFFICIENT_DATA` (never fabricated).
- **Hypothetical Scenario**: What-if and macro stress tests clearly labeled as `HYPOTHETICAL` / `MODELLED`.
