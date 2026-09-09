# Real-Time News Ingestion & Deduplication — Phase 10

## 1. News Ingestion Boundary
* **Event Driver:** News feeds generate raw events, Attention alerts, and qualitative research inputs.
* **Accounting Separation Invariant:** News articles can **NEVER** directly create or modify financial accounting facts (Revenue, Net Income, Net Debt, Cash, etc.) in the Truth Layer.

## 2. Deterministic Deduplication
* **Deduplication Key:**
  $$\text{dedupKey} = \text{SHA-256}(\text{ticker} + \text{publisher} + \text{title} + \text{publishedAt} + \text{url})$$
* Syndicated news wire stories with identical headlines or URLs are flagged as duplicate and do not trigger redundant attention spikes.
