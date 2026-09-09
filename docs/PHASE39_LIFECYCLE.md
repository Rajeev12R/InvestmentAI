# PHASE 39 — ALERT STATE MACHINE & LIFECYCLE

## 1. Alert Status States

```text
       ┌──────────┐
       │   OPEN   │◄───────────────────────┐
       └────┬─────┘                        │
            │                              │
     ┌──────┴──────┬───────────────┐       │
     ▼             ▼               ▼       │
┌─────────┐   ┌──────────┐   ┌───────────┐ │
│ ACK'D   │   │ SNOOZED  │   │ ESCALATED │ │
└────┬────┘   └────┬─────┘   └─────┬─────┘ │
     │             │               │       │
     └──────┬──────┴───────────────┘       │
            ▼                              │
      ┌───────────┐                        │
      │ RESOLVED  ├────────────────────────┘ (Reopen)
      └─────┬─────┘
            ▼
      ┌───────────┐
      │ DISMISSED │
      └───────────┘
```

---

## 2. Transition Matrix

Phase 39 enforces a deterministic finite state machine (`VALID_ALERT_TRANSITIONS`):

| From State | Allowed Target States | Permitted Roles | Conditions / Requirements |
|:---|:---|:---|:---|
| `OPEN` | `ACKNOWLEDGED`, `SNOOZED`, `RESOLVED`, `DISMISSED`, `ESCALATED` | OWNER, ADMIN, ANALYST | Snooze requires `durationMinutes` & `reason` |
| `ACKNOWLEDGED` | `SNOOZED`, `RESOLVED`, `DISMISSED`, `ESCALATED` | OWNER, ADMIN, ANALYST | Resolution requires `reason` |
| `SNOOZED` | `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `ESCALATED` | OWNER, ADMIN, ANALYST | Auto-reverts to `OPEN` when `snoozedUntil < now` |
| `RESOLVED` | `REOPENED`, `OPEN` | OWNER, ADMIN, ANALYST | Reopen requires justification |
| `REOPENED` | `ACKNOWLEDGED`, `SNOOZED`, `RESOLVED`, `ESCALATED` | OWNER, ADMIN, ANALYST | Same as `OPEN` |
| `ESCALATED` | `ACKNOWLEDGED`, `RESOLVED` | OWNER, ADMIN | Requires senior attention |
| `DISMISSED` | `REOPENED`, `OPEN` | OWNER, ADMIN | Reopen requires justification |

Any attempt to execute an invalid transition throws `400 Bad Request: Invalid status transition from X to Y`.

---

## 3. SLA Escalation Engine

Unacknowledged critical alerts automatically escalate according to SLA policy:
* If an alert of severity `CRITICAL` remains in `OPEN` or `SNOOZED` beyond the threshold (default: 4 hours) without resolution, background SLA sweep executes:
  1. Status set to `ESCALATED`.
  2. `escalationLevel` incremented.
  3. Escalation notification dispatched to senior risk and compliance roles.
  4. Immutable audit entry appended with trigger `SLA_BREACH_ESCALATION`.
