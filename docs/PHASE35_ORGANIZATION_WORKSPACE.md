# PHASE 35: ORGANIZATION & WORKSPACE MANAGEMENT

## 1. Overview & Tenancy Architecture

Phase 35 establishes **Organization** and **Workspace** as first-class multi-tenant security and administrative boundaries within InvestmentAI. It provides institutional asset managers, multi-strategy hedge funds, and family offices with full multi-tenant isolation, hierarchical workspace management, role-based access control, and comprehensive auditability.

```text
                     +---------------------------------------+
                     |         Institutional Platform        |
                     +---------------------------------------+
                                         |
                     +---------------------------------------+
                     |          Organization (Org)           |
                     |  - Domain Isolation & Settings        |
                     |  - Organization Roles (OWNER, ADMIN,  |
                     |    MEMBER, VIEWER)                    |
                     |  - Billing & Compliance Policies      |
                     +---------------------------------------+
                                         |
                     +---------------------------------------+
                     |            Workspaces (WS)            |
                     |  - Scoped to Parent Organization      |
                     |  - Independent Portfolio Allocations  |
                     |  - Workspace Roles & Memberships      |
                     |  - Status: ACTIVE, ARCHIVED, SUSPENDED|
                     +---------------------------------------+
                                         |
        +--------------------------------+--------------------------------+
        |                                |                                |
+---------------+                +---------------+                +---------------+
|  Portfolios   |                |   Research    |                | Optimization  |
|  & Holdings   |                |  Syntheses    |                |  & Decisions  |
+---------------+                +---------------+                +---------------+
```

---

## 2. Core Entities & Lifecycle

### Organization
* **ID Format**: `ORG-<timestamp>-<random>` (e.g., `ORG-1741368900-4819` or seed `ORG-ROOT-001`)
* **Status**: `OrganizationStatus` (`ACTIVE`, `SUSPENDED`, `DEACTIVATED`)
* **Properties**: `id`, `name`, `slug`, `domain`, `status`, `settings` (MFA enforcement, session timeout, IP allowlist), `createdAt`, `updatedAt`

### Workspace
* **ID Format**: `WS-<timestamp>-<random>` (e.g., `WS-1741368900-7214` or seed `WS-DEFAULT-001`)
* **Parent**: `orgId` (Strict foreign key scoping to parent organization)
* **Status**: `WorkspaceStatus` (`ACTIVE`, `ARCHIVED`, `SUSPENDED`)
* **Properties**: `id`, `orgId`, `name`, `description`, `status`, `isDefault`, `createdAt`, `updatedAt`

### Organization & Workspace Memberships
* **Organization Membership**: Links user to Organization with `OrganizationRole` (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
* **Workspace Membership**: Links user to Workspace with `Role` (`OWNER`, `ADMIN`, `PORTFOLIO_MANAGER`, `ANALYST`, `COMPLIANCE_OFFICER`, `AUDITOR`, `VIEWER`).
* **Status**: `ACTIVE`, `REVOKED`, `SUSPENDED`.

---

## 3. Institutional REST API Endpoints

### Organization Management (`/api/organizations`)
| Method | Endpoint | Description | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/organizations` | List all organizations user belongs to | Authenticated |
| `POST` | `/api/organizations` | Provision a new organization | Authenticated |
| `GET` | `/api/organizations/:orgId` | Retrieve organization details & settings | `org.read` |
| `PUT` | `/api/organizations/:orgId` | Update organization profile & settings | `org.update` |
| `GET` | `/api/organizations/:orgId/members` | List members of organization | `org.members.read` |
| `POST` | `/api/organizations/:orgId/members` | Invite/add member to organization | `org.members.manage` |
| `PUT` | `/api/organizations/:orgId/members/:userId` | Update member organization role | `org.members.manage` |
| `DELETE` | `/api/organizations/:orgId/members/:userId` | Remove member from organization | `org.members.manage` |
| `GET` | `/api/organizations/:orgId/workspaces` | List all workspaces in organization | `org.read` |
| `POST` | `/api/organizations/:orgId/workspaces` | Provision new workspace in organization | `org.workspaces.manage` |

### Workspace Management & Memberships (`/api/workspaces`)
| Method | Endpoint | Description | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/workspaces` | List user workspaces (filterable by `orgId`) | Authenticated |
| `POST` | `/api/workspaces` | Create new workspace | `workspace.create` |
| `GET` | `/api/workspaces/:workspaceId` | Retrieve workspace details | `workspace.read` |
| `PUT` | `/api/workspaces/:workspaceId` | Update workspace settings | `workspace.update` |
| `POST` | `/api/workspaces/:workspaceId/archive` | Archive workspace | `workspace.archive` |
| `GET` | `/api/workspaces/:workspaceId/members` | List workspace members | `workspace.read` |
| `POST` | `/api/workspaces/:workspaceId/members` | Add member to workspace | `workspace.members.manage` |
| `PUT` | `/api/workspaces/:workspaceId/members/:userId`| Update workspace member role | `workspace.members.manage` |
| `DELETE` | `/api/workspaces/:workspaceId/members/:userId`| Remove member from workspace | `workspace.members.manage` |

### Administration Control Plane (`/api/admin`)
| Method | Endpoint | Description | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/overview` | Platform health, tenant metrics, system stats | `system.admin` / `org.read` |
| `GET` | `/api/admin/roles` | Role hierarchy & permission definitions | `system.admin` / `org.read` |
| `GET` | `/api/admin/security` | Security posture, MFA policy, session controls | `system.admin` / `org.read` |

---

## 4. Frontend Administration & Multi-Tenant State Machine

1. **Context Management**:
   - `AuthContext`: Maintains active user session, loaded user organizations, and global credentials.
   - `WorkspaceContext`: Manages `activeOrgId` and `activeWorkspaceId`. On context switch, it immediately clears downstream caches and triggers a refreshed fetch of organization workspaces and portfolios to prevent stale-data leakage.
2. **TopBar Tenant Switcher**: Seamless switching between Organizations and child Workspaces.
3. **Admin Suite (`/app/admin/*`)**:
   - **Dashboard**: High-level telemetry, active user counts, workspace distribution, security status.
   - **Organization Settings**: Custom domains, compliance rules, MFA enforcement policies.
   - **Workspaces Administration**: Provisioning, renaming, archiving, and member assignments.
   - **Members Management**: Inviting institutional members, role assignment, and access revocation.
   - **Roles & Permissions**: Interactive matrix visualizing RBAC permissions across all institutional roles.
