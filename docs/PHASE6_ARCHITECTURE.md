# InvestmentAI — Phase 6 Architecture

## Automated Intelligence Ingestion & Event Detection

### 1. Architectural Philosophy & Invariants

Phase 6 evolves InvestmentAI from an ad-hoc snapshot comparison workspace into a continuous, event-driven intelligence system. External events (SEC filings, earnings disclosures, guidance revisions, management changes, and market shocks) are automatically detected, source-validated, normalized into canonical representations, deduplicated, evaluated for deterministic impact, and applied to generate resealed Truth Packages.

```text
External Disclosures / Feeds (SEC, PR, Yahoo, Bloomberg, GNews)
                              ↓
                [1. Source Validation & Authority]
                - Authority Tiers (Tier 1–4)
                - Timestamp & Ticker Integrity
                - Malicious Payload / Script Filtering
                              ↓
                [2. Raw Event Storage (Immutable)]
                - SHA-256 contentHash
                - Idempotent Append-Only Store
                              ↓
             [3. Classification & Canonical Normalization]
                - 30+ Canonical Event Types
                - Extracted Financial Facts
                - Cryptographic Deduplication Fingerprint
                              ↓
             [4. Deduplication & Conflict Resolution]
                - Primary Event vs Confirming Sources
                - Deterministic Hierarchy Override (T1 > T2 > T3 > T4)
                - Same-tier Unresolvable Conflicts -> UNAVAILABLE
                              ↓
                 [5. Deterministic Impact Engine]
                - Materiality Scoring (LOW, MEDIUM, HIGH, CRITICAL)
                - Affected Valuation Models, Risk Categories, Thesis
                              ↓
                 [6. Deterministic Fact Update Engine]
                - Candidate Extraction
                - Chronological Period Protection
                - Derived Metric Recalculation (Net Debt, Margins)
                - Reseal Truth Package (SHA-256)
                              ↓
                 [7. Workspace Persistence & Snapshots]
                - Snapshot Minting (Tn)
                - Phase 5 Change Detection & Drift Engine
                - Alert Evaluation & Interactive Timeline
                              ↓
                 [8. Downstream Cache Invalidation]
                - Purges Stale Valuation & Research Caches
```

---

### 2. Core Subsystems

1. **Source Validator (`server/ingestion/sourceValidator.js`)**:
   - Validates entity identity, publication timestamps (rejecting clock-skewed future dates), and payload integrity.
   - Enforces authority boundaries: Tier 4 sources are strictly prohibited from mutating core quantitative facts.

2. **Raw Event Store (`server/ingestion/rawEventStore.js`)**:
   - Immutable persistence of raw source payloads with SHA-256 `contentHash`.
   - Guaranteed idempotency: identical payloads return existing records without duplicating storage.

3. **Event Normalizer & Classifier (`server/ingestion/eventClassifier.engine.js`, `server/ingestion/eventNormalizer.js`)**:
   - Canonical taxonomy categorization across financial filings, corporate actions, governance, and regulatory events.
   - Strict prompt-injection stripping: neutralizes system prompt overrides, instructions, and script tags in external texts.

4. **Event Deduplicator & Conflict Resolver (`server/ingestion/eventDeduplicator.js`)**:
   - Manages `PRIMARY_EVENT`, `CONFIRMING_SOURCE`, and `DUPLICATE`.
   - Deterministic conflict resolution: Tier 1 (SEC/IR) supersedes Tier 2/3. Same-tier irreconcilable differences are flagged as `UNAVAILABLE` without fabricated compromises.

5. **Event Impact Engine (`server/ingestion/eventImpact.engine.js`)**:
   - Deterministic rule matrix mapping incoming event types and extracted metrics to valuation models (DCF, Relative Valuation), risk dimensions (earnings quality, leverage, governance), and thesis breakers.

6. **Fact Update Engine (`server/ingestion/factUpdate.engine.js`)**:
   - Computes `TruthUpdateCandidate` items and updates financial facts.
   - Chronological protection ensures older reporting periods (e.g., FY2024) cannot overwrite active modern facts (e.g., FY2025).
   - Recalculates mathematical metrics (e.g. Net Debt) and reseals the package with SHA-256.

7. **Ingestion Pipeline Coordinator (`server/ingestion/ingestion.engine.js`)**:
   - Orchestrates the full end-to-end flow, linking raw event storage, deduplication, impact analysis, workspace snapshot minting, and cache invalidation.
