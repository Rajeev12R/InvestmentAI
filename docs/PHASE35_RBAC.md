# PHASE 35: ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSION MATRIX

## 1. Organization & Workspace Roles

Phase 35 introduces explicit separation between **Organization Roles** (cross-workspace administrative authority) and **Workspace Roles** (functional domain authority within a specific workspace).

### Organization Roles
| Role | Level | Description |
| :--- | :--- | :--- |
| `OWNER` | 100 | Full administrative authority over the entire organization, billing, workspaces, and member governance. |
| `ADMIN` | 90 | Authority to manage organization settings, create workspaces, invite members, and assign workspace roles. |
| `MEMBER` | 50 | Standard organization member with default read privileges and workspace-specific access. |
| `VIEWER` | 10 | Read-only access across assigned organization resources. |

### Workspace Roles
| Role | Level | Description |
| :--- | :--- | :--- |
| `OWNER` | 100 | Workspace creator/lead with full management over workspace settings and member memberships. |
| `ADMIN` | 90 | Workspace manager with permission to manage workspace members and configurations. |
| `PORTFOLIO_MANAGER` | 70 | Can execute portfolio optimizations, approve rebalances, create models, and view allocations. |
| `ANALYST` | 50 | Can conduct research, propose decision candidates, run stress tests, and inspect factor models. |
| `COMPLIANCE_OFFICER` | 60 | Can view compliance packages, manage breaches, audit rules, and review legal constraints. |
| `AUDITOR` | 40 | Read-only inspection of point-in-time snapshots, logs, cryptographically sealed packages. |
| `VIEWER` | 10 | General read-only access to workspace dashboards and published reports. |

---

## 2. Organization Permission Mapping

```javascript
[OrganizationRole.OWNER]: [
  'org.read',
  'org.update',
  'org.delete',
  'org.members.read',
  'org.members.manage',
  'org.workspaces.manage',
  'org.billing.manage',
  'workspace.create',
  'workspace.archive',
  'workspace.members.manage'
],
[OrganizationRole.ADMIN]: [
  'org.read',
  'org.update',
  'org.members.read',
  'org.members.manage',
  'org.workspaces.manage',
  'workspace.create',
  'workspace.archive',
  'workspace.members.manage'
],
[OrganizationRole.MEMBER]: [
  'org.read',
  'org.members.read'
],
[OrganizationRole.VIEWER]: [
  'org.read'
]
```
