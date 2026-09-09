# Phase 16 — Institutional Exception & Waiver Workflow Specification

## 1. Exception State Machine

Compliance exceptions follow a deterministic, human-gated lifecycle:

```text
       REQUESTED (Created by Analyst/Editor)
           ↓
     UNDER_REVIEW
           ↓
        APPROVED (Approved by Portfolio Manager / Admin)
           ↓
         ACTIVE (Effective between effectiveFrom and expiresAt)
           ↓
        EXPIRED / CLOSED
```

## 2. Invariant Rules for Exceptions

1. **Human Sign-off Mandatory:** AI cannot approve exceptions.
2. **Dual-Role / No Self-Approval:** The requester cannot approve their own exception.
3. **Role Authorization:** Only `PORTFOLIO_MANAGER` and `ADMIN` (or `OWNER`) roles can approve exceptions.
4. **Finite Expiry:** Indefinite waivers are prohibited. Maximum duration is bounded (e.g. $\le 60$ days).
5. **Cryptographic Binding:** The exception is bound to `exceptionHash`. Any modification to reason, ruleId, portfolioId, or dates invalidates the approval.
6. **Temporal Evaluation:** An expired or future exception cannot satisfy a rule breach evaluated at $T_0$.
7. **Scope Limitation:** An exception granted for Rule A cannot waive Rule B; an exception for Portfolio X cannot waive Portfolio Y.
