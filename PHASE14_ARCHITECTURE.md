# Phase 14 — Institutional Portfolio Construction & Optimization Architecture

## 1. Executive Summary

Phase 14 builds upon InvestmentAI's verified data pipelines (Phases 1–13) to provide a deterministic, institutional-grade decision-support and capital allocation engine.

$$\text{Truth} \rightarrow \text{Valuation} \rightarrow \text{Risk} \rightarrow \text{Decision} \rightarrow \text{Process} \rightarrow \text{Portfolio Construction} \rightarrow \text{Sealed Package} \rightarrow \text{Human Review}$$

---

## 2. Core Architectural Invariants

1. **Strict Determinism**:
   Optimization algorithms (Mean-Variance, Minimum Variance, Equal Weight, Risk Parity, Maximum Diversification, Conviction-Weighted, Valuation/Conviction Hybrid) are deterministic numerical procedures.
2. **AI Hard Boundary**:
   AI Copilot consumes only sealed, deep-frozen `PortfolioConstructionIntelligencePackage` objects. AI is strictly barred from modifying weights, constraints, expected returns, covariance, or triggering broker executions.
3. **Strict Input Provenance**:
   Expected returns are derived solely from verified DCF valuation models, probabilistic scenarios, or forecast ledgers. Missing data produces explicit `UNAVAILABLE` states and is never defaulted to synthetic returns (e.g. 0%, 8%, or market return).
4. **Feasibility Verification & Failure Handling**:
   Constraint sets are evaluated before optimization. If bounds or sector limits cannot simultaneously be satisfied, the engine returns `INFEASIBLE_CONSTRAINTS` without silent relaxation.
5. **Sealed Package & Immutability**:
   Every optimization produces a canonicalized, SHA-256 sealed, deep-frozen package.
6. **Execution Boundary**:
   States: `PROPOSED`, `REVIEW_REQUIRED`, `HUMAN_APPROVED`, `EXECUTION_NOT_CONNECTED`, `EXECUTED_EXTERNALLY`.

---

## 3. Namespace & Module Layout

```text
server/
├── portfolioConstruction/
│   ├── portfolioConstruction.types.js          # Enums, types, deepFreeze, canonicalHash
│   ├── portfolioConstructionConfig.js           # Versioned policy configurations (V1, V2)
│   ├── portfolioConstruction.inputValidator.js  # Input package validator & temporal bounds
│   ├── portfolioConstruction.expectedReturn.engine.js # DCF / Scenario return derivation
│   ├── portfolioConstruction.covariance.engine.js    # Covariance matrix, PSD check & risk budgeting
│   ├── portfolioConstruction.constraints.engine.js   # Position, sector, turnover & feasibility checks
│   ├── portfolioConstruction.optimizer.engine.js     # 7 deterministic optimization methods
│   ├── portfolioConstruction.turnover.engine.js      # One-way / two-way turnover calculations
│   ├── portfolioConstruction.liquidity.engine.js     # ADV participation & days to liquidate
│   ├── portfolioConstruction.transactionCost.engine.js # Linear & quadratic market impact model
│   ├── portfolioConstruction.scenario.engine.js      # What-if simulations (non-mutating)
│   ├── portfolioConstruction.stressTest.engine.js    # Deterministic macro stress scenarios
│   ├── portfolioConstruction.comparison.engine.js    # Current vs Proposed allocation matrix
│   ├── portfolioConstruction.explanation.engine.js   # Auditable causal DAG generator
│   ├── portfolioConstruction.validation.engine.js    # Post-optimization invariant checks
│   ├── portfolioConstruction.package.js              # Sealed package builder
│   └── portfolioConstruction.repository.js           # Tenant-isolated storage & review manager
├── routes/
│   └── portfolioConstruction.routes.js          # Authenticated Express routes (/api/portfolio-construction)
└── copilot/tools/
    └── portfolioConstruction.tool.js            # Read-only Copilot tool adapter
```
