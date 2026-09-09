# Job Infrastructure & Ingestion Workers — Phase 9

## 1. Job Queue Architecture
* **Decoupled Asynchronous Processing:** Ingestion and heavy computational sweeps are queued rather than executed synchronously inside HTTP request cycles.
* **State Machine:** `QUEUED` $\rightarrow$ `RUNNING` $\rightarrow$ `SUCCEEDED` / `FAILED` / `RETRYING` $\rightarrow$ `DEAD_LETTER`.
* **Retries & Exponential Backoff:** Configurable retry limits per job type with automatic failure history recording.

## 2. Distributed-Safe Idempotency
* **Idempotency Key:** Computed from `SHA-256(workspaceId + sourceId + sourceRecordHash + eventType + period)`.
* **Deduplication Guarantee:** Redundant triggers return the prior successful result without regenerating duplicate Truth records or snapshots.
