# Phase 15 — Security, RBAC & Execution Boundary Specifications

## 1. Multi-Tenant Isolation & IDOR Protection

* Every snapshot, trade plan, reconciliation, review, and intelligence package is partitioned strictly by `workspaceId`.
* Direct object lookups (`getPackageById`, `getPlanById`, `getSnapshotById`) verify that the requesting workspace matches the resource owner, returning `null` or `404/403` on cross-tenant attempts.

---

## 2. Strict RBAC Permission Matrix

| Role | View Monitoring & Reports | Generate Plans | Submit Human Approval | Mutate Policies / Repository |
| :--- | :---: | :---: | :---: | :---: |
| **VIEWER** | Yes | No (403) | No (403) | No (403) |
| **ANALYST** | Yes | Yes | No (403) | No (403) |
| **PORTFOLIO_MANAGER** | Yes | Yes | Yes (200) | No (403) |
| **ADMIN / OWNER** | Yes | Yes | Yes (200) | Yes (200) |
| **AUDITOR** | Yes (Read-Only) | No (403) | No (403) | No (403) |

---

## 3. Cryptographic Tamper Protection

* Every package is sealed with a SHA-256 canonical hash.
* Plans and packages are recursively frozen with `deepFreeze()`. Attempted mutations in strict mode throw errors; objects remain permanently immutable.
* Approval records store `approvedPackageHash`, linking signoffs immutably to the exact approved plan state.
