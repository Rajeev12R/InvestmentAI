# PHASE 38 — SECURITY, TENANT ISOLATION & RBAC SPECIFICATION

## 1. Security Invariants

1. **Strict Multi-Tenant Isolation**:
   * Dashboard routes accept `workspaceId` and verify membership via token context (`req.auth.workspaceId`, `req.auth.orgId`).
   * Portfolios, decisions, attention alerts, and compliance breaches belonging to Tenant B are never returned, counted, or aggregated into Tenant A's dashboard.
   * Total AUM, cash ratios, and VaR aggregates strictly sum only portfolios belonging to the verified workspace.

2. **Anti-IDOR Enforcement**:
   * Attempting to query `?workspaceId=WS-TENANT-B-001` or access unauthorized subresources returns HTTP 403 Forbidden or empty authorized sets.
   * Cross-workspace filtering or search parameters cannot enumerate foreign portfolios or securities.

3. **RBAC Permissions Matrix**:
   * New Permission: `DASHBOARD_READ: 'dashboard.read'`.
   * Granted to `OWNER`, `ADMIN`, `ANALYST`, `VIEWER`, and `AUDITOR`.
   * Unauthenticated requests are rejected with HTTP 401 Unauthorized.

4. **Cache Key Partitioning**:
   * Dashboard cache keys are partitioned deterministically:
     `dashboard:${orgId}:${workspaceId}:${asOf}:${roleView}`
   * Global shared keys across tenants are prohibited. Switching workspaces invalidates frontend and backend state instantly.

5. **Cryptographic Lineage & Auditability**:
   * Every overview read event is cryptographically logged to the append-only audit repository:
     `dashboard.overview.read` with `actorId`, `workspaceId`, `orgId`, `cockpitId`, and `asOf`.
