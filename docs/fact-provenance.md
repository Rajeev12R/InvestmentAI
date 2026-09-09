# 6-Stage Fact Provenance Architecture

## Architectural Flow

Every financial fact stored in the sovereign Truth Layer must undergo 6-stage provenance tracing before becoming active:

```text
STAGE 1: SEC EDGAR / Source Document
  └─ Direct regulatory or provider document endpoint
STAGE 2: Raw Document Storage & Cryptographic Hashing
  └─ SHA-256 hash computed directly on raw response bytes
STAGE 3: Document Parser & Table Extraction
  └─ Table section tagging (e.g. CONSOLIDATED_STATEMENTS_OF_OPERATIONS)
STAGE 4: Fact Normalization & Canonical Mapping
  └─ Conversion to standardized CanonicalMetric with currency & units
STAGE 5: Multi-Source Reconciliation & Anti-Averaging
  └─ Tier Authority (Tier 1 Regulatory > Tier 2 Exchange > Tier 3 Vendor > Tier 4 News)
STAGE 6: Sovereign Truth Fact & Immutable Sealed Digest
  └─ Versioned fact ledger accessible to valuation and copilot engines
```

## Guarantees

1. **Unbroken Chain of Custody**: A query for any fact returns the exact SEC accession number, document URL, table section, and raw SHA-256 hash.
2. **Untrusted Evidence Principle**: Text in filings is treated strictly as untrusted observation data. It is never executed as prompt instructions or permitted to alter system rules.
3. **Reproducibility**: Fact hashes can be recomputed from cached raw documents to detect any post-ingestion tampering.
