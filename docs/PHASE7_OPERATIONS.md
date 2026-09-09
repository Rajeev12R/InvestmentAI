# Phase 7 Decision Operations & Review Queue

## 1. Decision Review Workflow
The Decision Operations engine monitors snapshot transitions and flagged attention items to populate the **Decision Review Queue**:
- **Triggers**:
  - Decision Shift (`BUY -> WATCH`, `BUY -> AVOID`, `HOLD -> AVOID`)
  - Triggered or Approaching Thesis Breaker
  - Valuation Drift $|\Delta \text{DCF}| \ge 10\%$
  - Portfolio Concentration Breach
- **Urgency Levels**:
  - `IMMEDIATE`: AVOID downgrade or triggered thesis breaker
  - `HIGH`: BUY -> WATCH or approaching breaker or $|\Delta \text{DCF}| \ge 15\%$
  - `NORMAL`: Moderate valuation shift ($5\% - 10\%$) or holding change
  - `LOW`: Baseline maintenance
- **Recommended Actions**:
  - `CONSIDER_EXIT`
  - `REASSESS_THESIS`
  - `REVIEW_POSITION_SIZING`
  - `REVIEW_VALUATION`
  - `MONITOR_METRICS`

---

## 2. Operational State vs Truth Boundary
- Operational statuses (`REVIEW`, `INVESTIGATING`, `DISMISSED`, `RESOLVED`) and analyst investigation notes are persisted in `server/data/operations/operations_{workspaceId}.json`.
- State transitions update workflow metadata only and **never mutate Truth Packages, financial facts, or snapshots**.
