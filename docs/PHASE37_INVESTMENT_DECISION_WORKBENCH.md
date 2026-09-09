# PHASE 37 — INVESTMENT DECISION WORKBENCH

## 1. Executive Summary

Phase 37 establishes the **Investment Decision Workbench** for InvestmentAI.
It elevates the Investment Decision into a first-class institutional operating object and coordinates the complete institutional decision lifecycle:

```
Research / Evidence
       ↓
Security / Portfolio Context
       ↓
Investment Thesis
       ↓
Decision
       ↓
Alternatives
       ↓
Risk / Exposure / Scenario Analysis
       ↓
Constraints / Compliance
       ↓
Optimization / Proposed Action
       ↓
Human Review
       ↓
Approval / Rejection / Revision
       ↓
Implementation Handoff
       ↓
Outcome
       ↓
Attribution / Learning
       ↓
Audit
```

---

## 2. Core Architectural Principles & Invariants

### 2.1 Not an "AI Recommendation" Feature
InvestmentAI does NOT generate unanchored `BUY`/`SELL` labels or black-box scores.
Instead, it preserves the complete reasoning context:
* What is being considered?
* Why is it being considered?
* What evidence supports it?
* What evidence contradicts it?
* What alternatives exist?
* What risks change?
* What constraints apply?
* Who reviewed it?
* Who authorized it?
* What action was taken?
* What was the post-decision outcome?

### 2.2 Integration & Coordination Layer
The Decision Workbench is an integration and operating layer. It coordinates specialized certified systems:
* **Exposure & Concentration**: Phase 30 / Phase 7 (HHI, Effective N).
* **Risk Forecasting**: Phase 31 (Parametric Volatility, Normal VaR 95/99, Expected Shortfall 95).
* **Attribution**: Phase 32 (Marginal Risk Contributions MRC/CRC/PRC).
* **Scenario Stress**: Phase 19 (Baseline, Bull, Bear, Macro Shock).
* **Compliance**: Phase 16 Policy Engine.
* **Optimization**: Phase 33 Decision Engine.
* **Portfolio Context**: Phase 36 Portfolio Operating System.
* **Audit Lineage**: Cryptographic append-only event log.

### 2.3 Deterministic Decision State Machine
Strict legal lifecycle transitions:
* `DRAFT` $\rightarrow$ `UNDER_REVIEW`
* `UNDER_REVIEW` $\rightarrow$ `CHALLENGED`, `APPROVED`, `REJECTED`, `CANCELLED`
* `CHALLENGED` $\rightarrow$ `UNDER_REVIEW`, `REJECTED`, `CANCELLED`
* `APPROVED` $\rightarrow$ `IMPLEMENTATION_PENDING`, `CANCELLED`, `SUPERSEDED`
* `IMPLEMENTATION_PENDING` $\rightarrow$ `IMPLEMENTED`, `CANCELLED`
* `IMPLEMENTED` $\rightarrow$ `MONITORED`, `CLOSED`
* `MONITORED` $\rightarrow$ `CLOSED`, `SUPERSEDED`
* Terminal: `REJECTED`, `CANCELLED`, `EXPIRED`, `CLOSED`, `SUPERSEDED`.

### 2.4 Evidence Model: Supporting & Contradicting Disagreement
Evidence is explicitly partitioned into:
* **Supporting Evidence** (`SUPPORTING`): Evidence reinforcing the core investment thesis.
* **Contradicting Evidence & Bear Arguments** (`CONTRADICTING`): Counter-theses, multiple compression risks, counterparty concentrations, and competitive threats.
* Disagreements are made visible side-by-side without collapsing them into artificial confidence numbers.

### 2.5 Stale Approval Invalidation
If the underlying portfolio baseline holdings mutate or the decision version is bumped, prior human approvals are automatically flagged as `STALE` and blocked from execution.

### 2.6 Segregation of Duties (SoD)
When SoD policy is enabled on a decision, the decision creator is prohibited from approving their own decision.

---

## 3. Operating Cockpit UI

The frontend provides an institutional decision workbench:
1. **Decision Header**: Status badge, priority, ticker, decision type, version indicator, quick position delta.
2. **Thesis & Evidence Tab**: Core thesis statement, key assumptions, catalysts, invalidation criteria, and side-by-side supporting vs contradicting evidence cards.
3. **Portfolio & Risk Impact Tab**: Concentration shift (HHI, $N_{eff}$), volatility shift, VaR 95 shift, Expected Shortfall shift, and mandate compliance gate.
4. **Alternatives & Scenarios Tab**: Options comparison (Option A, B, C) and Macro regime stress tests (Baseline, Bull, Bear, Macro Shock).
5. **Peer Reviews & Challenges Tab**: Chronological timeline of peer review notes and valuation/macro challenges.
6. **Authorization & Implementation Tab**: Human authorization records, stale warnings, and implementation handoff notes.
7. **Audit & Snapshots Tab**: Point-in-time immutable ledger with SHA-256 integrity hash verification.
