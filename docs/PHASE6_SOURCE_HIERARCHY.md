# InvestmentAI — Phase 6 Source Hierarchy & Authority Rules

## Deterministic Source Authority & Conflict Resolution

InvestmentAI maintains strict source authority partitioning. External data cannot enter the Truth Layer or mutate financial facts without passing through verified authority checks.

---

### 1. The 4 Authority Tiers

```text
+-------------------------------------------------------------------------+
| TIER 1: REGULATORY & PRIMARY ISSUER DISCLOSURES                        |
| Authority: 0.95 – 1.00 | Can Directly Mutate Truth Facts: YES          |
| Sources: SEC EDGAR (10-K, 10-Q, 8-K), Stock Exchanges, Company IR       |
+-------------------------------------------------------------------------+
                                    ↓
+-------------------------------------------------------------------------+
| TIER 2: PRIMARY MARKET WIRES & INSTITUTIONAL DATA FEEDS                 |
| Authority: 0.85 – 0.92 | Can Directly Mutate Truth Facts: YES          |
| Sources: Yahoo Finance Live, Bloomberg, Reuters, Dow Jones Wire         |
+-------------------------------------------------------------------------+
                                    ↓
+-------------------------------------------------------------------------+
| TIER 3: SECONDARY NEWS & SYNDICATED WIRE AGGREGATORS                    |
| Authority: 0.60 – 0.70 | Can Directly Mutate Truth Facts: NO           |
| Sources: GNews Aggregators, PR Newswire, Analyst Commentary Feeds       |
+-------------------------------------------------------------------------+
                                    ↓
+-------------------------------------------------------------------------+
| TIER 4: UNVERIFIED WEB, SOCIAL FORUMS & RUMORS                          |
| Authority: 0.10 – 0.30 | Can Directly Mutate Truth Facts: STRICTLY NO  |
| Sources: Twitter/X, Reddit, StockTwits, Unofficial Blogs                |
+-------------------------------------------------------------------------+
```

---

### 2. Conflict Resolution Matrix

When multiple data providers report conflicting figures for the same company, metric, and period:

1. **Cross-Tier Discrepancy**:
   - The higher authority tier strictly supersedes the lower tier.
   - *Example*: SEC EDGAR Tier 1 ($95B revenue) overrides Bloomberg Tier 2 ($94B revenue). The fact is updated to $95B, and an auditable override record is attached to the event.

2. **Within-Tier Discrepancy (Different Authority Levels)**:
   - Within Tier 1, SEC EDGAR (Authority: 1.00) supersedes Company Press Releases (Authority: 0.95).
   - Within Tier 2, Bloomberg/Reuters (Authority: 0.88) supersedes basic market feeds (Authority: 0.85).

3. **Same-Tier & Same-Authority Irreconcilable Conflict**:
   - When two equal-authority sources present contradictory quantitative data that cannot be verified against a higher tier, the metric status is set to `UNAVAILABLE`.
   - *Invariant*: The system NEVER averages or invents synthetic reconciliations.

4. **Tier 3 / Tier 4 Restrictions**:
   - Tier 3 and Tier 4 sources can generate **Event Candidates** and **Timeline Items** for analyst review.
   - They can NEVER directly mutate core quantitative facts, valuation models, risk matrices, or the cryptographic Truth Package.
