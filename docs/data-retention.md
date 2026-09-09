# Data Retention & Governance Policies — Phase 9

## 1. Retention Classification

| Category | Default Period | Immutability | Auto-Purge | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **FINANCIAL_TRUTH** | 3,650 Days (10 Years) | **Immutable** | False | Regulatory financial reconstruction & auditability. |
| **AUDIT_LOGS** | 2,555 Days (7 Years) | **Immutable** | False | Compliance security & authorization trail. |
| **RAW_SOURCE_RECORDS** | 365 Days (1 Year) | Mutable | False | Source vendor payloads. |
| **RESEARCH_CONVERSATIONS** | 730 Days (2 Years) | Mutable | False | Historical Copilot and analyst Q&A. |
| **JOB_RECORDS** | 90 Days | Mutable | True | Queue execution logs and diagnostics. |
| **TEMPORARY_ARTIFACTS** | 30 Days | Mutable | True | Transient execution caches. |

## 2. Retention Governance
* **Immutability Protection:** Retention periods for `FINANCIAL_TRUTH` and `AUDIT_LOGS` cannot be reduced below institutional minimums.
* **Audited Execution:** Every policy update or retention purge generates an append-only audit event.
