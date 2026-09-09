# PHASE 35: MULTI-TENANT SECURITY & TENANT ISOLATION ARCHITECTURE

## 1. Security Invariants & Tenancy Isolation Principles

Phase 35 enforces strict zero-trust tenancy boundaries throughout the entire API and persistence stack:

1. **Deny-by-Default Execution**: Every route and operation defaults to `DENY` (`403 FORBIDDEN` or `401 UNAUTHORIZED`) unless explicit tenant membership and granular permissions are proven.
2. **Anti-IDOR (Insecure Direct Object Reference) Protection**:
   - Every workspace operation verifies that the workspace belongs to the user's active organization (`workspace.orgId === activeOrgId`).
   - Requests targeting an entity outside the authenticated user's organization are rejected immediately at the authorization boundary.
3. **Workspace State Lifecycle Enforcement**:
   - Archived or Suspended workspaces reject all mutative and analytical actions (`DENY`), ensuring point-in-time compliance and freeze invariants.
4. **Privilege Escalation Prevention (`canAssignRole`)**:
   - Strict hierarchical role assignment prevents any user from assigning a role higher than or equal to their own level.
   - For example, a `PORTFOLIO_MANAGER` or `ANALYST` cannot assign `ADMIN` or `OWNER` privileges.
5. **Multi-Tenant Context Propagation**:
   - Client requests pass active tenancy headers (`x-org-id`, `x-workspace-id`) which are extracted, cryptographically verified against session memberships in `auth.middleware.js`, and bound to request context.
6. **Immutable Audit Lineage**:
   - All administrative actions (`organization.create`, `organization.update`, `workspace.create`, `workspace.archive`, `member.add`, `member.role_change`, `member.remove`) emit structured, immutable audit events with timestamp, actor, organization ID, and IP address.
