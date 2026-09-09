# Phase 16 — Institutional Role-Based Access Control (RBAC) Matrix

## 1. Role / Action Permission Matrix

| Role | View Compliance | Create Policy | New Policy Version | Evaluate Compliance | Request Exception | Approve Exception | Generate Remediation | View Audit Trail | Export Audit Data |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **VIEWER** | ✓ | ✗ | ✗ | ✓ (Read) | ✗ | ✗ | ✗ | ✓ | ✓ |
| **AUDITOR** | ✓ | ✗ | ✗ | ✓ (Read) | ✗ | ✗ | ✗ | ✓ | ✓ |
| **ANALYST** | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| **EDITOR** | ✓ | ✓ (Draft) | ✓ (Draft) | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| **PORTFOLIO_MANAGER**| ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **ADMIN** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **OWNER** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## 2. Invariants

- **Read-Only Roles:** `VIEWER` and `AUDITOR` can inspect compliance state, historical logs, and audit trails, but cannot mutate policy, approve waivers, or request exceptions.
- **Waiver Approval Boundary:** Only `PORTFOLIO_MANAGER` and `ADMIN`/`OWNER` can approve exceptions.
- **Separation of Duties:** Requesters of exceptions cannot approve their own requests (no self-approval).
- **Workspace Isolation:** All permissions and evaluations are strictly scoped by `workspaceId`. Cross-workspace requests are denied with `401 Unauthorized` or `403 Forbidden` / `404 Not Found`.
