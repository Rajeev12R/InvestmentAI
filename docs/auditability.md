# Auditability, Compliance & Decision Trail — Phase 9

## 1. Immutable Audit Ledger
* **Cryptographic Chaining:** Each audit event references the SHA-256 hash of the preceding event (`prevHash`).
* **Tamper Evident:** Any modification, insertion, or deletion of historical events invalidates the cryptographic hash chain.

## 2. Institutional Decision Audit Trail
The system maintains an unbroken chain of custody for all investment actions:
```text
Truth Snapshot (SHA-256)
       ↓
Change & Valuation Drift
       ↓
Attention Alert & Severity
       ↓
Deterministic Decision
       ↓
Human Review Queue
       ↓
Investor Copilot Explanation
       ↓
Human Action Approval
       ↓
Append-Only Audit Event
```

## 3. Compliance-Ready Export
Generates verifiable JSON export archives containing complete audit trails, decision reviews, snapshot states, and cryptographic verification checksums.
