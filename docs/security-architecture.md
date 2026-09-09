# Institutional Security Architecture — Phase 9

## 1. Overview & Core Philosophy
Phase 9 elevates InvestmentAI from a single-workspace deterministic analytical system into an auditable, multi-user institutional platform. The foundational security invariant remains immutable:

> **The AI is strictly a conversational and explanatory interface over deterministic financial intelligence. Truth, valuation, risk, attention, decisions, and trades are permanently isolated from AI mutation.**

---

## 2. Multi-Layer Security Architecture

```text
                     ┌───────────────────────────────┐
                     │           INVESTOR            │
                     └───────────────┬───────────────┘
                                     │
                             HTTPS / TLS 1.3
                                     │
                     ┌───────────────▼───────────────┐
                     │       GATEWAY & RATE LIMIT     │
                     │    Multi-tier DDoS & Throttling│
                     └───────────────┬───────────────┘
                                     │
                     ┌───────────────▼───────────────┐
                     │   AUTHENTICATION & SESSIONS   │
                     │  PBKDF2 Hashes / Scoped Keys  │
                     └───────────────┬───────────────┘
                                     │
                     ┌───────────────▼───────────────┐
                     │   CENTRALIZED AUTHORIZATION   │
                     │      RBAC + Workspace Scope   │
                     └───────────────┬───────────────┘
                                     │
             ┌───────────────────────┼───────────────────────┐
             │                       │                       │
             ▼                       ▼                       ▼
    Deterministic Layer          Investor Copilot         Operations & Admin
    - Absolute Valuation         - Sealed Context Router - Decision Reviews
    - Relative Valuation         - Claim Validator       - API Key Management
    - Risk Intelligence          - Response Validator    - Governance Export
    - Attention Engine           - AI Constitution (7)   - Audit Trail
             │                       │                       │
             └───────────────────────┼───────────────────────┘
                                     │
                     ┌───────────────▼───────────────┐
                     │     IMMUTABLE AUDIT TRAIL     │
                     │   SHA-256 Chained Event Log   │
                     └───────────────┬───────────────┘
                                     │
                     ┌───────────────▼───────────────┐
                     │     PERSISTENCE & QUEUES      │
                     │   Idempotent Jobs & Workers   │
                     └───────────────────────────────┘
```

---

## 3. Strict Tenant & Workspace Isolation
* **Zero Cross-Tenant Leakage:** Every database or repository lookup is strictly parameterized with `workspaceId`.
* **IDOR Prevention:** Accessing resources across workspace boundaries is denied server-side without disclosing resource existence.
* **Deny-by-Default:** Missing memberships, unknown roles, expired sessions, or unauthorized scopes immediately return 401 Unauthorized or 403 Forbidden.
