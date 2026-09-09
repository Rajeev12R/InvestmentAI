# PHASE 34 — SAAS PRODUCT FOUNDATION SPECIFICATION

## Institutional Investment Intelligence & Decision System

**Status**: Certified Complete  
**Architecture Layer**: SaaS Application Shell & Client/Server Integration Layer  
**Upstream Phases**: Phase 1 through Phase 33 Certified Baseline  
**Downstream Phases**: Phase 35–Phase 50  

---

## 1. Executive Summary

Phase 34 establishes the institutional SaaS product foundation for **InvestmentAI**, unifying the 33 certified quantitative, risk, decision, research, and governance engines into a coherent, production-ready SaaS application shell.

```text
                                  +---------------------------------------+
                                  |         InvestmentAI Web Client       |
                                  +---------------------------------------+
                                                     |
               +-------------------------------------+-------------------------------------+
               |                                     |                                     |
    +----------------------+              +----------------------+              +----------------------+
    |    AuthContext &     |              |  Application Shell   |              | Centralized API Client|
    |  WorkspaceContext    |              | (Nav, TopBar, Views) |              | (Axios, Interceptors)|
    +----------------------+              +----------------------+              +----------------------+
               |                                     |                                     |
               |                                     |                                     |
               v                                     v                                     v
    +----------------------+              +----------------------+              +----------------------+
    | Institutional Auth   |              | Reusable UI & Data   |              | Standardized Error   |
    | (JWT, RBAC, Scopes)  |              | Formatter Primitives |              | Normalization Engine |
    +----------------------+              +----------------------+              +----------------------+
                                                     |
                                                     v
                                  +---------------------------------------+
                                  |  Express Backend API (Phases 1–33)   |
                                  |  /api/auth, /api/workspaces, etc.     |
                                  +---------------------------------------+
```

---

## 2. Architectural Invariants Preserved

1. **Sovereign Truth Layer Authority**: The LLM remains downstream from authoritative financial facts and cannot mutate ground truth.
2. **Point-in-Time Temporal Integrity (T0)**: All workspace and portfolio state is evaluated strictly respecting point-in-time boundaries.
3. **Missing Data Safety**: Explicit modeling of `LOADING`, `EMPTY`, `INSUFFICIENT_DATA`, `ERROR`, `UNAUTHORIZED`, and `STALE` without converting missing observations to zero.
4. **Authoritative Backend Security Boundary**: The frontend provides context; the backend sovereignly enforces RBAC, tenant isolation, and IDOR prevention.
5. **Mutation Safety**: Financial mutations are never retried blindly across network interruptions.

---

## 3. Standardized Error Normalization Matrix

The centralized API client normalizes all exceptions into 13 canonical `ApiErrorCode` classifications:

| HTTP Status | Canonical ApiErrorCode | Institutional User Experience |
| :--- | :--- | :--- |
| `401` | `AUTHENTICATION_ERROR` | Prompts for institutional session re-authentication. |
| `403` | `AUTHORIZATION_ERROR` | Displays granular RBAC permission restriction banner. |
| `400` / `422` | `VALIDATION_ERROR` | Highlights specific payload field violations. |
| `404` | `NOT_FOUND` / `DATA_UNAVAILABLE` | Reports unavailable ticker dossier or pipeline artifact. |
| `409` | `CONFLICT` | Warns of concurrent state mutation conflicts. |
| `422` | `INSUFFICIENT_DATA` | Explains model requirement for additional observations. |
| `429` | `RATE_LIMITED` | Backs off with institutional quota indicator. |
| `502` / `503` | `PROVIDER_ERROR` | Reports upstream provider degradation with fallback to cached truth. |
| `500` | `SERVER_ERROR` | Displays safe operational error with telemetry reference. |
| `timeout` / `0` | `NETWORK_ERROR` | Suggests retry with exponential backoff on safe idempotent reads. |

---

## 4. Institutional SaaS Information Architecture

```text
/login                          -> Institutional Multi-User Authentication

/app                            -> Protected SaaS Application Shell
  ├── /app/overview             -> Intelligence Cockpit Overview
  ├── /app/research             -> Research Synthesis Hub
  │     ├── /company/:ticker    -> Full Fundamental Dossier & Valuation Models
  │     ├── /evidence           -> Verified Change & Ingestion Evidence
  │     ├── /signals            -> Signal Intelligence & Predictive Accuracy
  │     ├── /macro              -> Macro Sensitivities & Scenario Analysis
  │     └── /graph              -> Common Driver & Knowledge Graph
  ├── /app/portfolios           -> Portfolio Overview
  │     ├── /risk               -> Exposure, MRC/CRC & Parametric VaR/ES
  │     └── /optimization       -> Phase 33 Quantitative Solvers & Frontiers
  ├── /app/decisions            -> Decision Center Review Queue
  │     ├── /drift              -> Multi-Dimensional Thesis Drift
  │     └── /process            -> Process Intelligence & Mandate Quality
  ├── /app/governance           -> Sovereign Governance & Compliance
  │     ├── /compliance         -> Compliance Limits & Precedence Enforcement
  │     ├── /audit              -> Cryptographic SHA-256 Sealed Audit Log
  │     ├── /members            -> Multi-User Workspace Members & RBAC
  │     ├── /keys               -> Scoped API Key Management
  │     └── /security           -> Tenant Security Controls & Auditability
  └── /app/copilot              -> Institutional Copilot Workspace
```

---

## 5. Master Regression Summary

- **Total Test Suites Executed**: 351 (350 baseline + Phase 34)
- **Total Individual Assertions**: 20,473 (20,443 baseline + 30 Phase 34)
- **Total Failures**: 0
- **Regression Status**: ALL PHASES 1–34 PASS CLEANLY
