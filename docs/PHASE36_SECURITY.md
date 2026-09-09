# PHASE 36 — SECURITY & MULTI-TENANT ISOLATION

## 1. Multi-Tenant Scoping & Anti-IDOR Guards

Phase 36 implements strict multi-tenant boundary checks:
* **Tenant Isolation**: Every portfolio is indexed by `portfolioId` and scoped to `orgId` and `workspaceId`.
* **Cross-Tenant Prevention**: Requests containing cross-tenant IDs are rejected with `403 Forbidden` or `404 Not Found`.
* **Search Scoping**: Full-text portfolio searches only scan the active workspace and organization.

---

## 2. Deny-by-Default RBAC & Portfolio Permissions

Phase 36 integrates fine-grained portfolio permissions into the institutional RBAC matrix:

| Permission | Role: OWNER | Role: ADMIN | Role: ANALYST | Role: VIEWER |
| :--- | :---: | :---: | :---: | :---: |
| `portfolio.create` | ✅ | ✅ | ❌ | ❌ |
| `portfolio.read` | ✅ | ✅ | ✅ | ✅ |
| `portfolio.update` | ✅ | ✅ | ❌ | ❌ |
| `portfolio.delete` | ✅ | ❌ | ❌ | ❌ |
| `portfolio.status.manage` | ✅ | ✅ | ❌ | ❌ |
| `portfolio.holdings.manage` | ✅ | ✅ | ❌ | ❌ |
| `portfolio.optimize` | ✅ | ✅ | ✅ | ❌ |
| `portfolio.snapshot.create` | ✅ | ✅ | ❌ | ❌ |

---

## 3. Cryptographic Sealing & Immutable Audit Trail

* **Sealed Snapshots**: Every portfolio snapshot is sealed with a canonical SHA-256 integrity hash. Any subsequent tampering with snapshot contents breaks hash verification.
* **Append-Only Audit Logging**: All portfolio operations (`portfolio.create`, `portfolio.update`, `portfolio.status_change`, `portfolio.holdings_update`, `portfolio.snapshot_create`, `portfolio.optimization_proposal`) are permanently appended to the tamper-evident cryptographic hash chain.
