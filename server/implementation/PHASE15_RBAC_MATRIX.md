# PHASE 15 — INSTITUTIONAL RBAC PERMISSION MATRIX

## Governance & Security Architecture

InvestmentAI enforces strict role-based access control (RBAC), multi-tenant workspace isolation, cryptographic action signing, and advisory non-execution boundaries for Phase 15.

---

## 1. Role Definitions

| Role | Description | Execution Capability |
| :--- | :--- | :---: |
| **`VIEWER`** | Read-only auditor/viewer. Can inspect plans, snapshots, reconciliations, drift, and explanations. | **NONE** (Read-Only) |
| **`ANALYST`** | Investment researcher. Can build proposed implementation plans and trigger rebalance simulations. Cannot approve. | **NONE** |
| **`EDITOR`** | Portfolio operations editor. Can curate target allocations, update constraints, and generate trade plans. Cannot approve. | **NONE** |
| **`PORTFOLIO_MANAGER`** | Chief PM / Authorized Fiduciary. Has formal authority to sign off on implementation plans and rebalance candidates. | **NONE** (Approval Only) |
| **`ADMIN`** | Workspace administrator. Manages policies, tenant configuration, and audits. | **NONE** |
| **`AUDITOR`** | Compliance & regulatory officer. Has full immutable read access to all audit trails and cryptographic packages. Cannot mutate state. | **NONE** (Read-Only) |

---

## 2. Granular Action Matrix

| Operation / Action | `VIEWER` | `ANALYST` | `EDITOR` | `PORTFOLIO_MANAGER` | `ADMIN` | `AUDITOR` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **View Implementation Package** | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW |
| **Create Implementation Plan (`generatePlan`)** | ❌ DENY | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ❌ DENY |
| **Modify Implementation Plan** | ❌ DENY | ❌ DENY | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ❌ DENY |
| **Approve Implementation Plan (`approvePlan`)** | ❌ DENY | ❌ DENY | ❌ DENY | ✅ ALLOW | ✅ ALLOW | ❌ DENY |
| **Report Execution / Ingest Actual Holdings** | ❌ DENY | ❌ DENY | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ❌ DENY |
| **Run Holdings Reconciliation** | ✅ VIEW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ VIEW |
| **Run Drift & Constraint Monitoring** | ✅ VIEW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ VIEW |
| **Generate Rebalance Candidate** | ❌ DENY | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ❌ DENY |
| **Modify Institutional Policy (`V1` / `V2`)** | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ✅ ALLOW | ❌ DENY |
| **View Immutable Audit Trail & DAG** | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW |
| **Direct Broker Execution** | 🚫 **UNAVAILABLE** | 🚫 **UNAVAILABLE** | 🚫 **UNAVAILABLE** | 🚫 **UNAVAILABLE** | 🚫 **UNAVAILABLE** | 🚫 **UNAVAILABLE** |

---

## 3. Security & Multi-Tenant Invariants

1. **Advisory Non-Broker Boundary**:
   Under no circumstances can any user role (`VIEWER`, `ANALYST`, `EDITOR`, `PORTFOLIO_MANAGER`, `ADMIN`, `AUDITOR`) or Copilot agent trigger direct broker order routing or electronic execution. Any API call requesting execution returns `status: UNAVAILABLE`, `isExecuted: false`.

2. **Cross-Tenant Isolation**:
   All plans, snapshots, reconciliations, and packages are strictly scoped to `workspaceId`. Any cross-workspace approval attempt or IDOR access attempt is deterministically rejected with `AUTHORIZATION_FAILURE`.

3. **Approval Cryptographic Binding & Tampering Invalidation**:
   When a `PORTFOLIO_MANAGER` signs off on an implementation plan, the resulting `approvedPackageHash` cryptographically seals the plan payload. Any subsequent modification of trade quantities, prices, target weights, or parameters invalidates the approval status (`INVALIDATED`), requiring re-proposal and re-approval.
