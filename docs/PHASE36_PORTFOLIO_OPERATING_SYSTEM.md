# PHASE 36 — INSTITUTIONAL PORTFOLIO OPERATING SYSTEM

## 1. Executive Summary

Phase 36 establishes the **Institutional Portfolio Operating System** for InvestmentAI.
It elevates Portfolio into a first-class institutional operating object positioned within the multi-tenant hierarchy:

```
Organization (Phase 35)
    ↓
Workspace (Phase 35)
    ↓
Portfolio (Phase 36)
    ↓
Strategy & Mandate (Phase 36)
    ↓
Authoritative Holdings & Investment State (Phase 36)
    ↓
Exposure & Concentration Engine (Phase 30 / Phase 7)
    ↓
Risk & Volatility Forecasting (Phase 31 / Phase 3)
    ↓
Attribution & Decomposition (Phase 32 / Phase 12)
    ↓
Policy & Compliance Engine (Phase 16)
    ↓
Quantitative Optimization Proposals (Phase 33)
```

---

## 2. Core Architecture & Operating Invariants

### 2.1 Multi-Tenant Tenant Scoping & Anti-IDOR Invariant
* Every portfolio is strictly bound to `orgId` and `workspaceId`.
* All API endpoints enforce dual headers `x-org-id` and `x-workspace-id` with token validation.
* Cross-tenant and cross-workspace access attempts are rejected immediately with `403 Forbidden` or `404 Not Found`.

### 2.2 Domain Lifecycle State Machine
* **`DRAFT`**: Provisional mandate & configuration; not live.
* **`ACTIVE`**: Fully operational portfolio with live valuation, risk forecasting, attribution, and optimization proposals.
* **`PAUSED`**: Read-only hold. Consequential actions (holdings reconciliation, optimization proposals) are strictly restricted.
* **`CLOSED`**: Winding down; holdings frozen. Can only transition to `ARCHIVED`.
* **`ARCHIVED`**: Immutable terminal archive. Read-only forever.

### 2.3 Authoritative Position & Data Freshness Model
Every holding maintains explicit position metadata:
* `ticker`, `securityName`, `quantity`, `price`, `marketValue`, `weight`, `costBasis`, `unrealizedPnL`, `unrealizedPnLPct`, `currency`, `sector`, `geography`.
* `freshness`: `FRESH`, `STALE`, `UNAVAILABLE`, `PARTIAL`.
* Zero fake zeroes: unpriced or stale assets are flagged explicitly.

### 2.4 Point-in-Time Sealed Snapshots
* Snapshots capture complete portfolio state: AUM, cash, holdings, and multi-domain analytics at timestamp $t$.
* Each snapshot is sealed with a deterministic SHA-256 integrity hash across canonical sorted JSON keys.
* Historical point-in-time state reconstruction allows auditable replay of exact portfolio metrics at any historical timestamp.

### 2.5 Zero Math Formula Duplication
All portfolio analytics delegate directly to existing certified quantitative engines:
* **Exposure & Concentration**: Phase 30 / Phase 7 (`calculateConcentration`, HHI, $N_{eff}$).
* **Risk & Volatility Forecasting**: Phase 31 / Phase 3 (Parametric Volatility, Normal VaR 95/99, Expected Shortfall 95).
* **Risk Decomposition & Attribution**: Phase 32 (Marginal Risk Contribution MRC, Component Risk Contribution CRC, Percentage Risk Contribution PRC).
* **Optimization Proposals**: Phase 33 Decision Engine (`PortfolioOptimizationEngine.runOptimization`). Proposals require explicit human authorization and **never** mutate holdings automatically.

---

## 3. Operating Cockpit UI

The frontend provides an institutional operating cockpit:
1. **Overview Tab**: Key executive metrics (AUM, Cash, Day P&L, Active Alerts, Mandate Target Volatility/Return).
2. **Holdings Tab**: Live valuation grid, sector distribution, cost basis, unrealized gain/loss, and data freshness badges.
3. **Risk & Factor Exposure Tab**: HHI, Effective N ($N_{eff}$), Parametric Volatility, VaR 95/99, Expected Shortfall 95, Asset Risk Contributions (MRC/CRC/PRC).
4. **Performance & Attribution Tab**: Time-Weighted Return (TWR), active Sharpe ratio, benchmark tracking.
5. **Optimization Tab**: Phase 33 solver integration generating auditable proposals with explanation DAGs and sealed verification hashes.
6. **Snapshots Tab**: Point-in-Time immutable ledger with SHA-256 verification and historical reconstruction.

---

## 4. Verification & Certification

* **50+ Phase 36 Automated Assertions across 9 Sections**: 100% PASS.
* **Master Regression across all 353 Suites (20,593 Assertions)**: 100% PASS.
* **Zero Math Duplication**: Verified.
* **Client Frontend Compilation**: 1,941 modules compiled cleanly in 469ms.
