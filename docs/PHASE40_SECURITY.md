# PHASE 40 — SECURITY, TENANT ISOLATION & ACCESS CONTROL

## 1. Threat Model & Security Objectives

Institutional deliverables convey sensitive financial metrics, holdings schedules, and compliance evaluations. The reporting system enforces strict security invariants:

1. **Strict Multi-Tenancy**: Organization A must never view, generate, approve, distribute, verify, or infer reports belonging to Organization B.
2. **Workspace Isolation**: Cross-workspace leakage within the same organization is strictly prevented.
3. **Anti-IDOR Protection**: Predictable or guessed `reportId` or `snapshotId` parameters across tenant boundaries are rejected with `HTTP 404 Not Found` (or `403 Forbidden`).
4. **Separation of Duties (SoD)**: The report creator cannot self-approve their own report.
5. **Artifact Access Security**: Downloads require authentication, valid workspace scope, and appropriate RBAC permissions.
6. **Optimistic Concurrency Control (OCC)**: Stale or conflicting writes trigger `HTTP 409 Conflict` to prevent version corruption.

---

## 2. Granular RBAC Permissions

The following granular permissions govern Phase 40 endpoints:

| Permission | Description | Assigned Roles |
| :--- | :--- | :--- |
| `reports.read` | View report library, report details, templates, verification, and audit logs | OWNER, ADMIN, ANALYST, VIEWER, AUDITOR |
| `reports.create` | Create new report drafts | OWNER, ADMIN, ANALYST |
| `reports.generate` | Trigger snapshot capture and data assembly | OWNER, ADMIN, ANALYST |
| `reports.validate` | Execute deterministic reconciliation and validation | OWNER, ADMIN, ANALYST, AUDITOR |
| `reports.review` | Submit reports for review | OWNER, ADMIN, ANALYST |
| `reports.approve` | Provide human sign-off on reports (subject to SoD) | OWNER, ADMIN |
| `reports.distribute` | Dispatch approved reports across distribution channels | OWNER, ADMIN |
| `reports.supersede` | Create newer revisions superseding existing reports | OWNER, ADMIN |
| `reports.admin` | Full administrative control over report configuration | OWNER, ADMIN |

*Note: `ANALYST` can create and generate reports but cannot approve or distribute them. `VIEWER` and `AUDITOR` have strictly non-mutating access.*

---

## 3. Anti-IDOR & Tenant Scoping Matrix

All report repository and controller operations enforce two-dimensional tenant scoping:
```javascript
getReportById(reportId, workspaceId, orgId) {
  const report = this.reports.get(reportId);
  if (!report) return null;
  if (orgId && report.orgId !== orgId) return null;
  if (workspaceId && report.workspaceId !== workspaceId) return null;
  return JSON.parse(JSON.stringify(report));
}
```

If a malicious or unauthorized actor from `ORG-TENANT-B` attempts to query `/api/reports/RPT-ROOT-001`, the repository returns `null` and the API responds with:
```json
{
  "success": false,
  "error": "Report not found"
}
```
This guarantees zero information leakage regarding the existence or count of reports in other tenants.

---

## 4. Cryptographic Lineage & Sealing

Every report artifact is linked to a cryptographic audit chain:
* **Snapshot Hash**: SHA-256 digest of the underlying point-in-time state (`snapshot.snapshotHash`).
* **Report Data Hash**: SHA-256 digest of normalized assembled sections (`report.reportHash`).
* **Artifact Hash**: SHA-256 digest of the rendered document buffer (`report.artifactHash`).

Tampering with either the underlying snapshot or the rendered document breaks verification lineage and is immediately detected during verification.
