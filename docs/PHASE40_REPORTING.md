# PHASE 40 — INSTITUTIONAL REPORTING & DELIVERABLES

## 1. Primary Objective & Architectural Philosophy

Phase 40 introduces the **Institutional Reporting & Deliverables Layer** (`/app/reports`, `/api/reports`) for InvestmentAI.

### Core Governing Invariant
> **Reports are rendered from authoritative, point-in-time, permission-controlled data snapshots — never from ad-hoc frontend calculations, uncontrolled LLM output, or mutable live state.**

The reporting architecture strictly adheres to:
```text
Authoritative Truth / Intelligence (Phases 1–39)
    ↓
Point-in-Time Sealed Snapshot (SHA-256 Digest)
    ↓
Report Specification & Template Selection (Versioned & Immutable)
    ↓
Deterministic Data Assembly (Zero Ad-hoc Recalculation)
    ↓
Deterministic Validation (Reconciliation, Risk Ordering, Integrity)
    ↓
Human Review & Separation of Duties Approval
    ↓
Multi-Format Generation (JSON, High-Fidelity HTML, PDF Artifact, CSV)
    ↓
Cryptographic Sealing (SHA-256 Artifact Hash)
    ↓
Decoupled Multi-Channel Distribution (IN_APP, DOWNLOAD, EMAIL, WEBHOOK)
    ↓
Immutable Audit Logging (Append-Only Governance Ledger)
```

Never:
`Live UI → LLM → PDF`

---

## 2. Institutional Deliverables Taxonomy

Phase 40 standardizes 21 institutional deliverable types across 4 core families:

### A. Portfolio Reports
* **Portfolio Overview**: Executive overview of portfolio mandate, asset allocation, AUM, cash, holdings, and risk summary.
* **Portfolio Performance**: TWR, benchmark excess return, annualized Sharpe, and drawdown metrics.
* **Holdings Report**: Granular position-level schedule of assets, valuations, unrealized PnL, cost basis, and sector breakdowns.
* **Exposure & Risk Report**: Multi-factor decomposition, Euler CRC top risk contributors, VaR, Expected Shortfall, and HHI concentration analysis.
* **Attribution Report**: Brinson allocation/selection analysis, factor active return decomposition, and alpha thesis attribution.
* **Liquidity Report**: Portfolio cash balances, market depth, days-to-liquidate distributions, and redemption buffer analysis.
* **Tax & Implementation Report**: Realized/unrealized capital gains, tax lot efficiency, turnover costs, and implementation slippage.

### B. Investment Decision Reports
* **Investment Decision Memo**: Detailed investment committee decision memo with thesis claims, supporting evidence graph, challenger arguments, and compliance authorization.
* **Decision Review Package**: Retrospective review of past investment decisions, thesis drift, and outcome attribution.
* **Thesis & Evidence Package**: Deep factual graph of claims, research sources, catalyst tracking, and counter-arguments.
* **Scenario & Stress Package**: Multi-factor macro shock simulations, historical crisis replays, and tail-loss estimates.
* **Optimization Proposal Package**: Target frontier allocations, turnover constraints, transaction cost optimization, and trade proposals.

### C. Governance Reports
* **Compliance Report**: Rigorous investment guidelines compliance report detailing hard limits, active breaches, warnings, and exception lifecycle.
* **Mandate Monitoring Report**: Periodic audit of investment mandate guidelines, hard restrictions, and soft guideline compliance.
* **Decision Authorization Report**: Formal sign-off log for consequential capital allocations, SoD adherence, and approver identity verification.
* **Audit & Lineage Report**: Complete append-only governance log of all operational events, actors, and cryptographic seals.
* **Exception Report**: Log of temporary mandate waivers, risk breaches, remedial action plans, and resolution timelines.

### D. Institutional Periodic Reports
* **Daily Brief**: Daily operational digest summarizing overnight market changes, material drift, active alerts, and pending investment decisions.
* **Weekly Investment Review**: Weekly operational deliverable summarizing weekly drift, attention items, risk shifts, and trades.
* **Monthly Portfolio Review**: Complete institutional monthly deliverable unifying performance, holdings, risk, decisions, and governance.
* **Quarterly Investment Committee Package**: Master institutional committee package with macro backdrop, cross-portfolio risk, strategic decisions, and full audit lineage.

---

## 3. Report Lifecycle State Machine

A report is governed by a strict, finite state machine (`VALID_REPORT_TRANSITIONS`). Arbitrary or out-of-order state mutations fail deterministically with HTTP 400.

```text
       [DRAFT]
          │
          ▼
    [GENERATING] ──(failure)──► [DRAFT]
          │
          ▼
     [GENERATED] ──(validation failed)──► [VALIDATION_FAILED]
          │                                      │
          │ (validation passed)                  │ (re-generate)
          ▼                                      ▼
   [READY_FOR_REVIEW]                     [GENERATING]
          │
          │ (human approval subject to SoD)
          ▼
      [APPROVED]
          │
          │ (distribution dispatch)
          ▼
    [DISTRIBUTED]
          │
          │ (superseded by Report vN+1)
          ▼
     [SUPERSEDED]
          │
          ▼
      [ARCHIVED]
```

---

## 4. Separation of Duties (SoD) & Governance

Under institutional governance policy:
* A report creator cannot self-approve their own report (`enforceSoD: true`).
* Attempted self-approval is rejected with `HTTP 403 Forbidden` (`Separation of Duties violation: report creator cannot self-approve`).
* Approval requires an independent authorized reviewer with `reports.approve` permission.
* All approvals record `approvedBy`, `approvedAt`, and an immutable event in the audit ledger.

---

## 5. Multi-Format Output Contract

Every format consumes the **single authoritative report data model**:
1. **JSON**: Structured API model for programmatic consumption and verification.
2. **HTML**: High-fidelity institutional document with print styles, header metadata, watermark support (`DRAFT — NOT APPROVED`), freshness disclosures, and cryptographic seal block.
3. **PDF**: Standardized UTF-8 binary stream wrapped with SHA-256 artifact hash.
4. **CSV**: Granular position-level schedule of portfolio holdings and valuations.
