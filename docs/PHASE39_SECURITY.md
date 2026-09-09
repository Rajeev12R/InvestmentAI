# PHASE 39 — SECURITY, RBAC & MULTI-TENANT ISOLATION

## 1. Multi-Tenant Boundary Enforcement

All alert operations strictly enforce organization (`orgId`) and workspace (`workspaceId`) tenancy.
* Cross-tenant access is prohibited at the repository, engine, and controller levels.
* Attempts to access, query, or mutate an alert belonging to another organization or workspace fail with `404 Not Found` or `403 Forbidden` IDOR protection.

---

## 2. Role-Based Access Control (RBAC)

Phase 39 introduces dedicated granular permissions:

| Permission | Description | Assigned Roles |
|:---|:---|:---|
| `alerts:read` | View alerts, notifications, summary metrics, and channels | OWNER, ADMIN, ANALYST, VIEWER, AUDITOR |
| `alerts:acknowledge` | Acknowledge active or escalated alerts | OWNER, ADMIN, ANALYST |
| `alerts:snooze` | Snooze non-critical alerts with a specified duration and reason | OWNER, ADMIN, ANALYST |
| `alerts:resolve` | Resolve alerts with mandatory resolution documentation | OWNER, ADMIN, ANALYST |
| `alerts:configure` | Update alert rules, notification channels, and preferences | OWNER, ADMIN |
| `alerts:admin` | SLA sweeps, manual test alerts, bulk operations, channel deletion | OWNER, ADMIN |

*Note: `VIEWER` and `AUDITOR` are strictly read-only.*

---

## 3. Optimistic Concurrency Control (OCC)

To prevent race conditions and blind overwrites in multi-user institutional environments:
* Every alert record contains a monotonically increasing `version` integer.
* All state mutations (`acknowledge`, `snooze`, `resolve`, `reopen`, `assign`, `escalate`) require the caller to submit the expected `version`.
* If the submitted version differs from the current version in storage, the mutation fails with `409 Conflict: Version conflict: expected X, found Y`.

---

## 4. Immutable Audit Trail

Every lifecycle transition, assignment change, snooze expiration, and policy modification is recorded in the platform's tamper-evident audit repository via `auditRepository.appendEvent()`.

Logged metadata includes:
* `alertId`, `orgId`, `workspaceId`
* Acting `userId` and `role`
* Old state and new state (`fromStatus` → `toStatus`)
* Justification / Reason text
* Timestamp (ISO 8601 UTC)
