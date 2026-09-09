# PHASE 37 — SECURITY, RBAC & TENANT ISOLATION

## 1. Multi-Tenant Tenancy Boundaries

Phase 37 enforces strict 4-level hierarchical tenancy:
$$\text{Organization} \longrightarrow \text{Workspace} \longrightarrow \text{Portfolio} \longrightarrow \text{Decision}$$

* **Tenant Isolation**: Every decision is bound to `orgId` and `workspaceId`.
* **Anti-IDOR Protection**: Attempting to read, update, review, or approve a decision belonging to another organization or workspace is rejected immediately with `403 Forbidden` or `404 Not Found`.
* **Workspace Scoping**: Full-text decision searches only return decisions belonging to the active workspace.

---

## 2. Deny-by-Default RBAC Matrix

| Permission | Role: OWNER | Role: ADMIN | Role: ANALYST | Role: VIEWER |
| :--- | :---: | :---: | :---: | :---: |
| `decision.create` | ✅ | ✅ | ✅ | ❌ |
| `decision.read` | ✅ | ✅ | ✅ | ✅ |
| `decision.update` | ✅ | ✅ | ✅ (draft) | ❌ |
| `decision.review` | ✅ | ✅ | ✅ | ❌ |
| `decision.challenge` | ✅ | ✅ | ✅ | ❌ |
| `decision.approve` | ✅ | ✅ | ❌ | ❌ |
| `decision.reject` | ✅ | ✅ | ❌ | ❌ |
| `decision.implement` | ✅ | ✅ | ❌ | ❌ |
| `decision.close` | ✅ | ✅ | ❌ | ❌ |

---

## 3. Segregation of Duties (SoD) & Stale Approval Protection

1. **Segregation of Duties**: When `enforceSoD` is set, `authorization.engine.js` blocks decision creators from approving their own decisions (`creatorId !== actorId`).
2. **Stale Approval Invalidation**: If the underlying portfolio baseline holdings mutate or decision version is updated after authorization, the approval state transitions to `STALE` and blocks implementation handoff.
3. **Cryptographic Sealing**: All point-in-time snapshots are sealed with SHA-256 hashes computed across canonical sorted JSON keys.
