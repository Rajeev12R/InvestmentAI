# Phase 11 — Institutional Fundamental Data Quality & Fact Intelligence

## Overview

The Fundamental Data Quality & Fact Intelligence architecture provides institutional-grade guarantees for financial statements, multi-provider observations, and accounting metrics. It converts unstructured and semi-structured external filings into normalized, period-consistent, sovereign truth facts with a zero-hallucination guarantee.

```
┌───────────────────────────┐
│ SEC / Regulatory Filings  │ (10-K, 10-Q, 10-K/A)
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│  Document Parser Engine   │ (Table extraction, Section tagging, Raw SHA-256)
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ Period Integrity Engine   │ (Boundary checks, FY/Q1-Q4/TTM alignment)
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│   Reconciliation Engine   │ (Tier 1-4 Authority, Strict Anti-Averaging)
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ Accounting Consistency    │ (FCF, Net Debt, Diluted EPS, Market Cap validation)
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│    Restatement Engine     │ (V1 -> V2 Versioning, Historical Audit Log)
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ Data Quality Intelligence │ (7-Vector Scoring, Truth Packages, Copilot Bounds)
└───────────────────────────┘
```

## Quality Dimensions

1. **Source Quality**: Tier 1 Regulatory filings receive highest weighting (100%), followed by verified vendor aggregators.
2. **Fact Coverage**: Percentage of canonical fundamental metrics populated for a given period.
3. **Data Freshness**: Verification that current fiscal periods have up-to-date filing submissions within regulatory deadlines.
4. **Period Integrity**: Strict temporal alignment ensuring point-in-time metrics are never conflated with duration flows.
5. **Accounting Consistency**: Cross-statement mathematical identity verification.
6. **Conflict Rate**: Multi-provider divergence measurement; triggers `UNAVAILABLE` when equal-tier sources conflict.
7. **Provenance Completeness**: Unbroken audit trail linking active facts to accession numbers and raw hashes.
