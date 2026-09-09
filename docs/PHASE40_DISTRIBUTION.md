# PHASE 40 — DECOUPLED MULTI-CHANNEL DISTRIBUTION

## 1. Architectural Philosophy & Separation of Concerns

Phase 40 strictly decouples report **generation & approval** from report **distribution**.

### Governing Invariant
> **A report can be APPROVED without being DISTRIBUTED. Provider or transport failures must result in explicit FAILED or NOT_CONFIGURED statuses — never fake success, and never silently altering the approved report artifact.**

```text
       [APPROVED REPORT]
              │
              ▼
   ReportDistributionEngine.distribute({ report, channels })
              │
    ┌─────────┼───────────────┬────────────────┐
    ▼         ▼               ▼                ▼
 [IN_APP]  [DOWNLOAD]      [EMAIL]         [WEBHOOK]
    │         │               │                │
    ▼         ▼               ▼                ▼
(Always   (Always        (Explicit        (Explicit
Available Available)   NOT_CONFIGURED   NOT_CONFIGURED
                         if no SMTP)      if no URL)
```

---

## 2. Supported Channels & Status Contracts

| Channel | Availability | Success Status | Unconfigured Status | Error Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `IN_APP` | Always available | `DISTRIBUTED` | N/A | Delivered to institutional report library (`/app/reports`) |
| `DOWNLOAD` | Always available | `DISTRIBUTED` | N/A | Direct streaming download in browser session |
| `EMAIL` | Requires SMTP / SendGrid | `DISTRIBUTED` | `NOT_CONFIGURED` | Returns explicit failure message if credentials absent |
| `WEBHOOK` | Requires Webhook URL | `DISTRIBUTED` | `NOT_CONFIGURED` | Returns explicit failure message if endpoint absent |

---

## 3. Immutability During Distribution

When a report is dispatched across distribution channels:
* The report's quantitative sections, text claims, and evidence references remain 100% immutable.
* The distribution dispatch records:
  - `distributionStatus`: `DISTRIBUTED` | `PARTIALLY_DISTRIBUTED` | `FAILED` | `NOT_CONFIGURED`
  - `distributedAt`: ISO timestamp
  - `distributionChannelResults`: Per-channel execution logs
  - `artifactHash`: SHA-256 fingerprint of the rendered deliverable
* Any distribution failure triggers an action-required attention alert in Phase 39 without destroying the approved report.
