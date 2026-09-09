# Phase 16 — Institutional Compliance, Governance & Audit Intelligence Architecture

## 1. System Overview

Phase 16 establishes a deterministic, immutable institutional compliance, governance, and audit intelligence layer for InvestmentAI. It consumes sealed inputs from Phases 1–15 (Truth Layer, Valuations, Risk, Portfolio Construction, Implementation, and Audit Infrastructure) to evaluate investment mandates and generate verifiable audit evidence.

```text
[Phase 1 Truth / Phase 14 Construction / Phase 15 Implementation / Phase 3 Risk]
                                     ↓
                     Validated Compliance Inputs ($T_0$)
                                     ↓
                  Immutable Policy Statement Versions (V1, V2)
                                     ↓
                       Deterministic Rule Engine
                     (15 Institutional Rule Types)
                                     ↓
                     Compliance Evaluation Engine
                                     ↓
              ┌──────────────────────┴──────────────────────┐
              ↓                                             ↓
        Status: PASS / WARNING                      Status: BREACH / UNAVAILABLE
              ↓                                             ↓
      Sealed Package                               Exception / Waiver Workflow
                                                            ↓
                                               Remediation Proposal Engine
                                                            ↓
                                                Human Approval & Re-eval
```

## 2. Institutional Invariants

1. **Non-Execution Boundary:** Phase 16 is strictly advisory and governance-focused. It never connects to broker APIs, never executes trades, and human approval is not equivalent to broker execution (`isExecuted = false`).
2. **Zero Fabrication Prohibition:** Compliance never fabricates missing prices, holdings, FX, liquidity, or tax. Missing data results in explicit `UNAVAILABLE` or `INSUFFICIENT_DATA`, never coerced to zero or assumed compliant.
3. **Temporal $T_0$ Strictness:** Evaluation at $T_0$ uses only information available up to $T_0$. Future data, restatements, and post-dated approvals are rejected.
4. **Policy Immutability:** Policies are cryptographically hashed ($SHA-256$), versioned ($V1 \to V2$), and immutable once sealed.
5. **No AI Compliance Authority:** AI (Investor Copilot) is strictly read-only and evidence-grounded. AI cannot approve waivers, modify policies, dismiss breaches, or alter compliance statuses.

## 3. Core Engine Components

| Engine | File | Responsibility |
| :--- | :--- | :--- |
| **Types & Crypto** | `compliance.types.js` | Enums, recursive canonical JSON stringifier, deterministic SHA-256 canonical hasher, `deepFreeze`. |
| **Config** | `compliance.config.js` | Versioned numerical tolerances, staleness policies, precedence hierarchy, and default threshold limits. |
| **Policy Types** | `policy.types.js` | 15 institutional rule types, scopes, and schema validators. |
| **Policy Engine** | `policy.engine.js` | Immutable policy creation, versioning ($V1 \to V2$), $T_0$ effective resolution, and multi-policy precedence. |
| **Policy Repository** | `policy.repository.js` | Multi-tenant in-memory workspace-isolated policy repository. |
| **Input Validator** | `inputValidator.js` | Strict boundary validation preventing NaN, Infinity, negative weights, future timestamps, and duplicates. |
| **Rule Engine** | `rule.engine.js` | Deterministic evaluator for all 15 rule types without zero data coercion. |
| **Compliance Engine** | `compliance.engine.js` | Pre-action and post-action evaluation orchestrator, waiver application, and overall status determination. |
| **Breach Engine** | `breach.engine.js` | Deterministic breach lifecycle state machine (`DETECTED` $\to$ `ACKNOWLEDGED` $\to$ `REMEDIATION_REQUIRED` $\to$ `REMEDIATION_IN_PROGRESS` $\to$ `RESOLVED` $\to$ `CLOSED`). |
| **Exception Engine** | `exception.engine.js` | Human approval workflow for policy waivers with cryptographic hash binding, expiry enforcement, and role checks. |
| **Remediation Engine** | `remediation.engine.js` | Deterministic remedial action proposal generator (proposal only, non-executing). |
| **Audit Engine** | `audit.engine.js` | Verifiable audit evidence graph builder and Phase 9 audit trail integration. |
| **Report Engine** | `report.engine.js` | Portfolio compliance summaries, historical breach logs, decision governance reports, and CSV exports. |
| **Explanation Engine** | `explanation.engine.js` | Causal DAG generator and read-only Copilot natural-language insights. |
| **Package Builder** | `compliancePackage.js` | Cryptographically sealed `ComplianceIntelligencePackage` builder. |
| **Compliance Repo** | `compliance.repository.js` | Isolated multi-tenant repository for packages, evaluations, breaches, and exceptions. |
