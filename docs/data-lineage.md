# Financial Data Lineage & Provenance — Phase 10

## 1. End-to-End Lineage Chain
Every material financial metric displayed to investors is linked across 6 distinct verified stages:

```text
[Stage 1: Displayed Value]
       ↓
[Stage 2: Truth Fact ID]
       ↓
[Stage 3: Truth Snapshot (SHA-256 Package Hash)]
       ↓
[Stage 4: Fact Candidate ID]
       ↓
[Stage 5: Normalized Event ID]
       ↓
[Stage 6: Raw Provider Record (Source ID + Canonical URI + Retrieval Timestamp)]
```

If any link in the lineage chain cannot be verified, the metric is classified as `UNAVAILABLE`.
