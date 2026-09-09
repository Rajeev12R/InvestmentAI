# PHASE 13 — SECURITY, RBAC & AI BOUNDARY SPECIFICATION

## 1. AI Boundary & Immutable Package Seal

The AI Copilot operates under strict read-only access to Phase 13 packages:

### What AI CAN Do:
- Interpret decision quality dimensions and explain process strengths/weaknesses.
- Summarize historical thesis evolution and catalyst realization.
- Explain calibration errors and highlight overconfidence patterns.
- Cite underlying immutable evidence IDs and historical snapshots.

### What AI CANNOT Do:
- Calculate, modify, or override decision quality scores.
- Mutate historical snapshots, thesis statements, or forecasts.
- Change observed financial outcomes or benchmark returns.
- Fabricate calibration probabilities or learning insights.
- Execute or recommend trading transactions.

---

## 2. Multi-Tenant Isolation & Authorization

1. **Workspace Scoping**: Every snapshot, thesis version, forecast, and evaluation package is bound to a `workspaceId`.
2. **Strict RBAC**: Cross-workspace access returns HTTP 403 Forbidden.
3. **IDOR Protection**: Accessing `decisionId` across foreign workspaces is strictly blocked.
4. **Package Hashing**: Every `ProcessIntelligencePackage` is sealed with a canonical SHA-256 hash and deeply frozen.
