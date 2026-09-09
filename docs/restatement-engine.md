# Restatement Engine & Versioning Architecture

## Invariant: Zero Silent Overwrites

When an amended filing (such as Form 10-K/A, Form 10-Q/A) or reclassification occurs in subsequent financial statements, the system forbids in-place overwrites of previously published historical facts.

### Version Transition Lifecycle

```text
FACT_V1 (Active Truth)
  │
  ├─ Ingestion of Form 10-K/A or Recast Financial Statement
  │
  ▼
[FACT_V1: Status -> RESTATED_HISTORICAL, IsActive -> false]
  │
  ▼
[FACT_V2: Status -> ACTIVE_TRUTH, Version -> 2, PreviousFactId -> FACT_V1]
  │
  ▼
Restatement Audit Log Record Emitted
  │
  ▼
Change Engine & Attention Engine Notification Triggered
```

## Structure of Restatement Audit Record

```json
{
  "restatementId": "RST-2025-AAPL-001",
  "ticker": "AAPL",
  "metric": "REVENUE",
  "period": "FY2024",
  "v1FactId": "FACT-AAPL-FY2024-REV-V1",
  "v1Value": 383285000000,
  "v2FactId": "FACT-AAPL-FY2024-REV-V2",
  "v2Value": 383285000000,
  "delta": 0,
  "reason": "RECLASSIFICATION_IN_FY25_FILING",
  "amendmentAccession": "0000320193-25-000010",
  "timestamp": "2026-09-06T09:00:00.000Z"
}
```
