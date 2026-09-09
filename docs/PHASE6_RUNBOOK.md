# InvestmentAI — Phase 6 Operations & Runbook

## Ingestion Pipeline Operations, Monitoring & API Reference

### 1. Ingestion REST Endpoints

Mounted on `/api/ingestion`:

- `POST /api/ingestion/event`: Ingests an external disclosure or raw event payload.
  ```json
  {
    "workspaceId": "WS_DEFAULT",
    "ticker": "AAPL",
    "company": "Apple Inc.",
    "source": "SEC_EDGAR",
    "publishedAt": "2026-09-01T10:00:00Z",
    "rawPayload": {
      "filingType": "10-K",
      "title": "Apple Inc. Form 10-K",
      "revenue": 430000000000,
      "operatingMargin": 0.32
    }
  }
  ```
- `GET /api/ingestion/raw/:ticker`: Retrieves all raw immutable source records with SHA-256 hashes.
- `GET /api/ingestion/timeline/:ticker`: Fetches deduplicated, source-validated investment events.
- `POST /api/ingestion/trigger-job`: Manually triggers periodic polling jobs for market feeds and regulatory disclosures.
- `GET /api/ingestion/status`: Returns scheduler status, tracked tickers, and downstream cache invalidation statistics.

---

### 2. Testing & Verification

1. **Unit & Pipeline Ingestion Tests**:
   ```bash
   export PATH="/Users/ranjan/.nvm/versions/node/v20.19.4/bin:$PATH"
   node server/test-script/phase6IngestionTests.js
   ```

2. **Hostile Red-Team Audit (Categories A–T)**:
   ```bash
   export PATH="/Users/ranjan/.nvm/versions/node/v20.19.4/bin:$PATH"
   node server/test-script/phase6HostileAudit.js
   ```

3. **Master Regression Suite (Phases 1–6)**:
   ```bash
   export PATH="/Users/ranjan/.nvm/versions/node/v20.19.4/bin:$PATH"
   node server/test-script/runAllRegressions.js
   ```

4. **Live Ticker Verification**:
   ```bash
   export PATH="/Users/ranjan/.nvm/versions/node/v20.19.4/bin:$PATH"
   node server/test-script/verifyRealTickers.js
   ```

5. **Client Build**:
   ```bash
   cd client && npm run build
   ```
