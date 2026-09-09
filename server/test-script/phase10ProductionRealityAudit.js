/**
 * @file phase10ProductionRealityAudit.js
 * 40+ Production HTTP Reality & Connectivity Test Suite for Phase 10.
 * Executes live HTTP requests against ephemeral Express server running connectivity routes with authenticated sessions.
 */

import http from 'http';
import assert from 'assert';
import app from '../index.js';
import { authService } from '../auth/auth.service.js';
import { authRepository } from '../auth/auth.repository.js';
import { dataLineageEngine } from '../connectivity/dataLineage.engine.js';
import { sourceRegistry } from '../connectivity/sourceRegistry.js';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 10 PRODUCTION REALITY & HTTP AUDIT');
console.log('================================================================\n');

let passCount = 0;
let httpAssertions = 0;

function check(cond, msg) {
  assert.ok(cond, msg);
  passCount++;
  httpAssertions++;
}
function checkEqual(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg);
  passCount++;
  httpAssertions++;
}

async function runProductionRealityAudit() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/connectivity`;

  console.log(`▶ Ephemeral test server running at ${baseUrl}`);

  try {
    // -------------------------------------------------------------
    // SETUP AUTHENTICATED USER SESSION WITH DEFAULT ADMIN (OWNER ROLE)
    // -------------------------------------------------------------
    const loginRes = authService.login({ email: 'admin@investmentai.local', password: 'Admin123!Secure', workspaceId: 'default' });
    const token = loginRes.session.token;
    const workspaceId = 'default';

    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'X-Workspace-Id': workspaceId,
      'Content-Type': 'application/json'
    };

    // -------------------------------------------------------------
    // 1. SOURCE REGISTRY & CAPABILITIES ENDPOINTS
    // -------------------------------------------------------------
    console.log('▶ Testing Sources & Capability Matrix Endpoints...');
    const resSources = await fetch(`${baseUrl}/sources`, { headers: authHeaders });
    checkEqual(resSources.status, 200, 'HTTP 1: GET /sources returns 200 OK');
    const dataSources = await resSources.json();
    check(Array.isArray(dataSources.sources), 'HTTP 2: GET /sources returns sources array');
    check(dataSources.count >= 6, 'HTTP 3: At least 6 institutional sources registered');

    const resSingleSource = await fetch(`${baseUrl}/sources/SRC-SEC-EDGAR`, { headers: authHeaders });
    checkEqual(resSingleSource.status, 200, 'HTTP 4: GET /sources/SRC-SEC-EDGAR returns 200 OK');
    const dataSingle = await resSingleSource.json();
    checkEqual(dataSingle.source.tier, 'TIER_1_PRIMARY', 'HTTP 5: SEC EDGAR is Tier 1');

    const resMissingSource = await fetch(`${baseUrl}/sources/SRC-NON-EXISTENT`, { headers: authHeaders });
    checkEqual(resMissingSource.status, 404, 'HTTP 6: GET /sources/SRC-NON-EXISTENT returns 404');

    const resCaps = await fetch(`${baseUrl}/capabilities`, { headers: authHeaders });
    checkEqual(resCaps.status, 200, 'HTTP 7: GET /capabilities returns 200 OK');
    const dataCaps = await resCaps.json();
    check(Array.isArray(dataCaps.capabilities), 'HTTP 8: GET /capabilities returns matrix');

    const resHealth = await fetch(`${baseUrl}/health`, { headers: authHeaders });
    checkEqual(resHealth.status, 200, 'HTTP 9: GET /health returns 200 OK');
    const dataHealth = await resHealth.json();
    check(dataHealth.healthySources >= 6, 'HTTP 10: System health reports all healthy sources');

    // -------------------------------------------------------------
    // 2. REAL TICKER QUOTES & MARKET DATA ENDPOINTS
    // -------------------------------------------------------------
    console.log('▶ Testing Real Ticker Market Data Endpoints (AAPL, JPM, RELIANCE.NS, TMPV.NS, TSM)...');
    
    // Ticker: AAPL (US Equity - NASDAQ)
    const resAAPL = await fetch(`${baseUrl}/quotes?ticker=AAPL`, { headers: authHeaders });
    checkEqual(resAAPL.status, 200, 'HTTP 11: GET /quotes?ticker=AAPL returns 200');
    const dataAAPL = await resAAPL.json();
    checkEqual(dataAAPL.quote.ticker, 'AAPL', 'HTTP 12: Quote ticker matches AAPL');
    check(dataAAPL.quote.price > 0, 'HTTP 13: AAPL price is positive numeric');
    checkEqual(dataAAPL.quote.currency, 'USD', 'HTTP 14: AAPL currency is USD');

    // Ticker: JPM (US Financial - NYSE)
    const resJPM = await fetch(`${baseUrl}/quotes?ticker=JPM`, { headers: authHeaders });
    checkEqual(resJPM.status, 200, 'HTTP 15: GET /quotes?ticker=JPM returns 200');
    const dataJPM = await resJPM.json();
    checkEqual(dataJPM.quote.exchange, 'NYSE', 'HTTP 16: JPM exchange is NYSE');

    // Ticker: RELIANCE.NS (India - NSE)
    const resREL = await fetch(`${baseUrl}/quotes?ticker=RELIANCE.NS`, { headers: authHeaders });
    checkEqual(resREL.status, 200, 'HTTP 17: GET /quotes?ticker=RELIANCE.NS returns 200');
    const dataREL = await resREL.json();
    checkEqual(dataREL.quote.currency, 'INR', 'HTTP 18: RELIANCE.NS currency is INR');
    checkEqual(dataREL.quote.exchange, 'NSE', 'HTTP 19: RELIANCE.NS exchange is NSE');

    // Ticker: TMPV.NS (India - NSE)
    const resTMPV = await fetch(`${baseUrl}/quotes?ticker=TMPV.NS`, { headers: authHeaders });
    checkEqual(resTMPV.status, 200, 'HTTP 20: GET /quotes?ticker=TMPV.NS returns 200');
    const dataTMPV = await resTMPV.json();
    checkEqual(dataTMPV.quote.currency, 'INR', 'HTTP 21: TMPV.NS currency is INR');

    // Ticker: TSM (Global Semiconductor - NYSE)
    const resTSM = await fetch(`${baseUrl}/quotes?ticker=TSM`, { headers: authHeaders });
    checkEqual(resTSM.status, 200, 'HTTP 22: GET /quotes?ticker=TSM returns 200');

    // Historical bars
    const resHist = await fetch(`${baseUrl}/quotes/history?ticker=AAPL&limit=10`, { headers: authHeaders });
    checkEqual(resHist.status, 200, 'HTTP 23: GET /quotes/history returns 200');
    const dataHist = await resHist.json();
    checkEqual(dataHist.history.bars.length, 10, 'HTTP 24: Historical bars count is 10');

    // -------------------------------------------------------------
    // 3. FUNDAMENTALS, FILINGS & CORPORATE ACTIONS ENDPOINTS
    // -------------------------------------------------------------
    console.log('▶ Testing Fundamentals, Filings & Corporate Actions...');
    const resFundAAPL = await fetch(`${baseUrl}/fundamentals?ticker=AAPL&period=FY2025`, { headers: authHeaders });
    checkEqual(resFundAAPL.status, 200, 'HTTP 25: GET /fundamentals?ticker=AAPL returns 200');
    const dataFundAAPL = await resFundAAPL.json();
    check(dataFundAAPL.fundamentals.contentHash.length === 64, 'HTTP 26: Fundamentals contentHash is SHA-256');

    const resFundREL = await fetch(`${baseUrl}/fundamentals?ticker=RELIANCE.NS`, { headers: authHeaders });
    checkEqual(resFundREL.status, 200, 'HTTP 27: GET /fundamentals?ticker=RELIANCE.NS returns 200');
    const dataFundREL = await resFundREL.json();
    checkEqual(dataFundREL.fundamentals.metrics.currency, 'INR', 'HTTP 28: RELIANCE fundamentals in INR');

    const resFilings = await fetch(`${baseUrl}/filings?ticker=AAPL`, { headers: authHeaders });
    checkEqual(resFilings.status, 200, 'HTTP 29: GET /filings?ticker=AAPL returns 200');
    const dataFilings = await resFilings.json();
    check(dataFilings.filings.document.id.startsWith('DOC-AAPL'), 'HTTP 30: Document ID prefixed DOC-AAPL');

    const resCA = await fetch(`${baseUrl}/corporate-actions?ticker=AAPL`, { headers: authHeaders });
    checkEqual(resCA.status, 200, 'HTTP 31: GET /corporate-actions?ticker=AAPL returns 200');
    const dataCA = await resCA.json();
    check(dataCA.corporateActions.actions.length > 0, 'HTTP 32: Corporate actions list is populated');

    // -------------------------------------------------------------
    // 4. FX, MACRO & NEWS ENDPOINTS
    // -------------------------------------------------------------
    console.log('▶ Testing FX, Macro & News Endpoints...');
    const resFX = await fetch(`${baseUrl}/fx/rate?base=EUR&quote=USD`, { headers: authHeaders });
    checkEqual(resFX.status, 200, 'HTTP 33: GET /fx/rate EUR/USD returns 200');
    const dataFX = await resFX.json();
    check(dataFX.rate > 0, 'HTTP 34: FX rate is positive');

    const resFXMissing = await fetch(`${baseUrl}/fx/rate?base=USD&quote=UNKNOWN_PAIR`, { headers: authHeaders });
    checkEqual(resFXMissing.status, 200, 'HTTP 35: GET /fx/rate for missing pair returns 200 with UNAVAILABLE');
    const dataFXMissing = await resFXMissing.json();
    checkEqual(dataFXMissing.status, 'UNAVAILABLE', 'HTTP 36: Missing FX pair marked UNAVAILABLE');
    checkEqual(dataFXMissing.rate, null, 'HTTP 37: Missing FX rate is strictly null');

    const resMacro = await fetch(`${baseUrl}/macro?seriesId=US_10Y_TREASURY`, { headers: authHeaders });
    checkEqual(resMacro.status, 200, 'HTTP 38: GET /macro returns 200');
    const dataMacro = await resMacro.json();
    checkEqual(dataMacro.macro.value, 4.25, 'HTTP 39: US 10Y yield matches expected value');

    const resNews = await fetch(`${baseUrl}/news?ticker=AAPL`, { headers: authHeaders });
    checkEqual(resNews.status, 200, 'HTTP 40: GET /news?ticker=AAPL returns 200');
    const dataNews = await resNews.json();
    check(dataNews.news.articles.length > 0, 'HTTP 41: News feed returned items');

    // -------------------------------------------------------------
    // 5. STREAMING STATUS & LINEAGE ENDPOINTS
    // -------------------------------------------------------------
    console.log('▶ Testing Streaming & Data Lineage Endpoints...');
    const resStream = await fetch(`${baseUrl}/stream/status`, { headers: authHeaders });
    checkEqual(resStream.status, 200, 'HTTP 42: GET /stream/status returns 200');
    const dataStream = await resStream.json();
    checkEqual(dataStream.status.activeMode, 'HTTP_POLLING', 'HTTP 43: Active streaming mode is HTTP_POLLING');
    checkEqual(dataStream.status.isStreamConnected, false, 'HTTP 44: Stream connected is false');

    // Pre-record a sample lineage trace
    dataLineageEngine.recordLineage({
      ticker: 'AAPL',
      metric: 'REVENUE',
      period: 'FY2025',
      displayedValue: 391035000000,
      truthFactId: 'FACT-AAPL-REV-2025',
      snapshotId: 'SNAP-AAPL-2026',
      candidateId: 'CAND-AAPL-REV',
      eventId: 'EVT-AAPL-10K',
      rawRecordId: 'RAW-AAPL-10K',
      providerId: 'SRC-SEC-EDGAR',
      packageHash: 'a'.repeat(64)
    });

    const resLineage = await fetch(`${baseUrl}/lineage?ticker=AAPL&metric=REVENUE&period=FY2025`, { headers: authHeaders });
    checkEqual(resLineage.status, 200, 'HTTP 45: GET /lineage returns 200');
    const dataLineage = await resLineage.json();
    checkEqual(dataLineage.status, 'VERIFIED', 'HTTP 46: Data lineage verified');
    checkEqual(dataLineage.chain.length, 6, 'HTTP 47: 6-stage provenance chain complete');

    // -------------------------------------------------------------
    // 6. CIRCUIT BREAKER DRILL VIA API
    // -------------------------------------------------------------
    console.log('▶ Running Circuit Breaker Status Drill...');
    const resCB = await fetch(`${baseUrl}/sources/SRC-SEC-EDGAR/circuit`, { headers: authHeaders });
    checkEqual(resCB.status, 200, 'HTTP 48: GET /sources/SRC-SEC-EDGAR/circuit returns 200');
    const dataCB = await resCB.json();
    checkEqual(dataCB.circuitBreaker.state, 'CLOSED', 'HTTP 49: Circuit breaker is CLOSED');

    // -------------------------------------------------------------
    // 7. INGESTION JOB DISPATCH VIA API
    // -------------------------------------------------------------
    console.log('▶ Running Ingestion Job Dispatch Drill...');
    const resJob = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ jobType: 'MARKET_REFRESH', ticker: 'AAPL', priority: 'HIGH' })
    });
    checkEqual(resJob.status, 202, 'HTTP 50: POST /ingest returns 202 Accepted');
    const dataJob = await resJob.json();
    check(dataJob.jobId !== undefined, 'HTTP 51: Ingestion job returns jobId');

    console.log('\n================================================================');
    console.log(`PHASE 10 PRODUCTION REALITY AUDIT COMPLETE: ${httpAssertions} HTTP ASSERTIONS PASSED`);
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runProductionRealityAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
