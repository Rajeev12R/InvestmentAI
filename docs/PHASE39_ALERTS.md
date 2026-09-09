# PHASE 39 — INSTITUTIONAL ALERTS & ATTENTION CENTER

## 1. Primary Objective & Architectural Philosophy

Phase 39 establishes the **Institutional Alerts / Notifications / Attention Center** (`/app/attention`, `/app/alerts`) for InvestmentAI.

### Governing Invariant
> **Phase 12 determines material attention. Phase 39 operationalizes that attention into controlled, persistent, auditable alerts and human notifications.**

Phase 39 does **not** recalculate materiality, redefine financial metrics, or execute autonomous trades. Instead, it ingests attention items, compliance events, and operational flags from authoritative upstream engines (Phases 12, 16, 37, 38) and provides a rigorous, multi-tenant, auditable human operational workflow.

```text
Phase 12 / 16 / 37 / 38 (Material Attention & Compliance Events)
    ↓
Phase 39 Alert Engine (Deduplication, Cooldown, Hash Verification)
    ↓
Alert Repository (Tenant Isolation, Optimistic Locking, Immutable Audit)
    ↓
Policy & Notification Router (Routing Roles, Cooldown Throttling, In-App / Dispatch)
    ↓
Institutional Attention Center UI (/app/attention)
```

---

## 2. Core Alert Model & Taxonomy

Every alert in Phase 39 adheres to a strict institutional schema:

```typescript
interface InstitutionalAlert {
  alertId: string;              // Unique identifier (ALT-xxx)
  orgId: string;                // Multi-tenant organization isolation
  workspaceId: string;          // Multi-tenant workspace isolation
  dedupKey: string;             // Deterministic deduplication key
  alertHash: string;            // SHA-256 fingerprint of core payload
  title: string;
  description: string;
  severity: AlertSeverity;      // CRITICAL | HIGH | MEDIUM | LOW | INFORMATIONAL
  status: AlertStatus;          // OPEN | ACKNOWLEDGED | SNOOZED | RESOLVED | REOPENED | DISMISSED | ESCALATED
  materiality: AlertMateriality;// HIGH | MEDIUM | LOW | INFORMATIONAL
  category: AlertCategory;      // DRIFT | COMPLIANCE | RISK | DECISION | FACT | SYSTEM | PORTFOLIO
  sourceEngine: string;         // E.g. 'Phase 12 AttentionEngine', 'Phase 16 PolicyRuleEngine'
  sourceEventId?: string;
  targetRef: {
    type: 'PORTFOLIO' | 'DECISION' | 'HOLDING' | 'FACT' | 'WORKSPACE' | 'SYSTEM';
    id: string;
    name?: string;
  };
  evidenceSummary?: string;
  suggestedAction?: string;
  escalationLevel: number;      // Default 0; incremented on escalation
  assignedTo?: string;          // User ID or Role
  assignedAt?: string;
  snoozedUntil?: string;
  snoozeReason?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionReason?: string;
  version: number;              // Monotonic counter for optimistic locking
  occurrences: number;          // Deduplicated event trigger count
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Deduplication & Cooldown Suppression

To prevent alert fatigue and event storms:
1. **Deterministic Dedup Key**: Computed from `workspaceId:category:targetRef.type:targetRef.id:title`.
2. **Alert Hash**: SHA-256 digest of normalized payload for exact fingerprint matching.
3. **Suppression Window**: Configured per severity (e.g. 5m for CRITICAL, 30m for HIGH, 60m for MEDIUM/LOW). Existing active alerts within the cooldown window increment `occurrences` and update `lastSeenAt` without generating redundant notifications.

---

## 4. No Autonomous Execution Invariant

Institutional alerts are strictly **decision-support and human notification artifacts**. 
* Under no circumstances do alerts trigger autonomous trades, rebalancing orders, or position liquidation.
* Every alert links to upstream evidence, audit packages, and suggested institutional actions for human review and sign-off.
