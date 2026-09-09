# Institutional Role-Based Access Control (RBAC) — Phase 9

## 1. Role Hierarchy & Definitions

| Role | Intended Persona | Key Capabilities | Restricted Operations |
| :--- | :--- | :--- | :--- |
| **OWNER** | Portfolio Managing Director / Founder | Full control over workspace, memberships, API keys, and deletion. | None |
| **ADMIN** | Operations & Compliance Lead | Can manage members, roles, API keys, trigger ingestions, and approve reviews. | Cannot delete workspace |
| **ANALYST** | Institutional Equity Research Analyst | Can edit watchlists, portfolios, theses, trigger research, and review decisions. | Cannot manage members, API keys, or roles |
| **VIEWER** | Institutional Client / Observer | Read-only access to valuations, decisions, snapshots, and Copilot explanations. | Cannot modify state, write notes, or trigger tasks |
| **AUDITOR** | Risk & Compliance Officer | Read-only access to intelligence, with privileged access to Audit Logs and Exports. | Cannot modify investment state |

---

## 2. Granular Permission Mapping Matrix

```text
Permission                      OWNER   ADMIN   ANALYST  VIEWER  AUDITOR
-------------------------------------------------------------------------
workspace.read                    ✓       ✓        ✓       ✓        ✓
workspace.update                  ✓       ✓        ✗       ✗        ✗
workspace.delete                  ✓       ✗        ✗       ✗        ✗
workspace.members.read            ✓       ✓        ✓       ✓        ✓
workspace.members.invite          ✓       ✓        ✗       ✗        ✗
workspace.members.remove          ✓       ✓        ✗       ✗        ✗
workspace.roles.update            ✓       ✓        ✗       ✗        ✗
watchlist.read                    ✓       ✓        ✓       ✓        ✓
watchlist.write                   ✓       ✓        ✓       ✗        ✗
portfolio.read                    ✓       ✓        ✓       ✓        ✓
portfolio.write                   ✓       ✓        ✓       ✗        ✗
research.read                     ✓       ✓        ✓       ✓        ✓
research.write                    ✓       ✓        ✓       ✗        ✗
decision.read                     ✓       ✓        ✓       ✓        ✓
decision.review                   ✓       ✓        ✓       ✗        ✗
decision.approve_action           ✓       ✓        ✗       ✗        ✗
copilot.read                      ✓       ✓        ✓       ✓        ✗
copilot.write                     ✓       ✓        ✓       ✗        ✗
truth.read                        ✓       ✓        ✓       ✓        ✓
ingestion.read                    ✓       ✓        ✓       ✓        ✗
ingestion.trigger                 ✓       ✓        ✓       ✗        ✗
audit.read                        ✓       ✓        ✗       ✗        ✓
api_keys.read                     ✓       ✓        ✗       ✗        ✗
api_keys.create                   ✓       ✓        ✗       ✗        ✗
api_keys.revoke                   ✓       ✓        ✗       ✗        ✗
security.read                     ✓       ✓        ✗       ✗        ✓
export.read                       ✓       ✓        ✓       ✓        ✓
```
