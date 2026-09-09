import http from 'http';
import assert from 'assert';
import app from '../index.js';
import { authService } from '../auth/auth.service.js';
import { CanonicalMetric } from '../facts/fact.types.js';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 11 PRODUCTION REALITY & HTTP AUDIT');
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
  const baseUrl = `http://127.0.0.1:${port}/api/quality`;
  const factsBaseUrl = `http://127.0.0.1:${port}/api/facts`;

  console.log(`▶ Ephemeral test server running at ${baseUrl}`);

  try {
    // -------------------------------------------------------------
    // SETUP AUTHENTICATED USER SESSION (OWNER ROLE)
    // -------------------------------------------------------------
    const loginRes = authService.login({
      email: 'admin@investmentai.local',
      password: 'Admin123!Secure',
      workspaceId: 'default'
    });
    const token = loginRes.session.token;
    const workspaceId = 'default';

    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'X-Workspace-Id': workspaceId,
      'Content-Type': 'application/json'
    };

    // -------------------------------------------------------------
    // 1. DATA QUALITY SCORECARD & 7 DIMENSIONS ENDPOINTS
    // -------------------------------------------------------------
    console.log('▶ Testing Fundamental Data Quality Scorecard Endpoints...');
    const resQuality = await fetch(`${baseUrl}/overview/AAPL`, { headers: authHeaders });
    checkEqual(resQuality.status, 200, 'HTTP 1: GET /overview/AAPL returns 200 OK');
    const dataQuality = await resQuality.json();
    check(dataQuality.quality !== undefined, 'HTTP 2: Response contains quality object');
    check(dataQuality.quality.overallScore >= 0, 'HTTP 3: Overall quality score is non-negative');
    checkEqual(typeof dataQuality.quality.grade, 'string', 'HTTP 4: Quality grade is string');
    check(dataQuality.quality.dimensions.SOURCE_QUALITY !== undefined, 'HTTP 5: Source Quality dimension present');
    check(dataQuality.quality.dimensions.COVERAGE !== undefined, 'HTTP 6: Coverage dimension present');
    check(dataQuality.quality.dimensions.FRESHNESS !== undefined, 'HTTP 7: Freshness dimension present');
    check(dataQuality.quality.dimensions.PERIOD_INTEGRITY !== undefined, 'HTTP 8: Period Integrity dimension present');
    check(dataQuality.quality.dimensions.ACCOUNTING_CONSISTENCY !== undefined, 'HTTP 9: Accounting Consistency dimension present');
    check(dataQuality.quality.dimensions.CONFLICT_RATE !== undefined, 'HTTP 10: Conflict Rate dimension present');
    check(dataQuality.quality.dimensions.PROVENANCE_COMPLETENESS !== undefined, 'HTTP 11: Provenance Completeness dimension present');

    // -------------------------------------------------------------
    // 2. CANONICAL FACTS MATRIX ENDPOINTS
    // -------------------------------------------------------------
    console.log('▶ Testing Canonical Facts Matrix Endpoints...');
    const resFacts = await fetch(`${baseUrl}/facts/AAPL`, { headers: authHeaders });
    checkEqual(resFacts.status, 200, 'HTTP 12: GET /facts/AAPL returns 200 OK');
    const dataFacts = await resFacts.json();
    checkEqual(dataFacts.ticker, 'AAPL', 'HTTP 13: Ticker is AAPL');
    check(Array.isArray(dataFacts.facts), 'HTTP 14: Facts is an array');
    check(dataFacts.facts.length > 0, 'HTTP 15: Facts list contains records');
    const sampleFact = dataFacts.facts[0];
    check(sampleFact.factId !== undefined, 'HTTP 16: Fact contains factId');
    check(sampleFact.hash !== undefined, 'HTTP 17: Fact contains cryptographic SHA-256 hash');
    checkEqual(sampleFact.hash.length, 64, 'HTTP 18: Hash is exact 64 characters');

    // -------------------------------------------------------------
    // 3. ACCOUNTING CONSISTENCY FORMULA ENDPOINTS
    // -------------------------------------------------------------
    console.log('▶ Testing Accounting Consistency & Identity Endpoints...');
    const resCons = await fetch(`${baseUrl}/consistency/AAPL`, { headers: authHeaders });
    checkEqual(resCons.status, 200, 'HTTP 19: GET /consistency/AAPL returns 200 OK');
    const dataCons = await resCons.json();
    check(dataCons.consistency !== undefined, 'HTTP 20: Consistency object present');
    check(Array.isArray(dataCons.consistency.checks), 'HTTP 21: Consistency checks is an array');
    check(dataCons.consistency.totalChecks >= 3, 'HTTP 22: At least 3 accounting identities evaluated');
    const fcfChk = dataCons.consistency.checks.find(c => c.rule === 'FREE_CASH_FLOW_IDENTITY');
    check(fcfChk !== undefined, 'HTTP 23: FCF identity check present');
    checkEqual(fcfChk.status, 'PASS', 'HTTP 24: AAPL FCF identity PASS');

    // -------------------------------------------------------------
    // 4. RESTATEMENT LEDGER & AUDIT ENDPOINTS
    // -------------------------------------------------------------
    console.log('▶ Testing Restatement Ledger & History Endpoints...');
    const resRestate = await fetch(`${baseUrl}/restatements/AAPL?metric=REVENUE&period=FY2025`, { headers: authHeaders });
    checkEqual(resRestate.status, 200, 'HTTP 25: GET /restatements/AAPL returns 200 OK');
    const dataRestate = await resRestate.json();
    check(Array.isArray(dataRestate.history), 'HTTP 26: History is an array');
    check(dataRestate.versionsCount >= 1, 'HTTP 27: At least 1 version in history');

    // -------------------------------------------------------------
    // 5. REST RESTATEMENT CREATION (POST /api/facts/restatement)
    // -------------------------------------------------------------
    console.log('▶ Testing POST Restatement Execution...');
    const postRestate = await fetch(`${factsBaseUrl}/restatement`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        ticker: 'AAPL',
        metric: 'REVENUE',
        period: 'FY2025',
        newValue: 391500000000,
        filingType: '10-K/A',
        restatementReason: 'HTTP Reality Test Amendment'
      })
    });
    checkEqual(postRestate.status, 201, 'HTTP 28: POST /facts/restatement returns 201 Created');
    const dataPost = await postRestate.json();
    checkEqual(dataPost.isRestatement, true, 'HTTP 29: isRestatement is true');
    checkEqual(dataPost.activeFact.version, 2, 'HTTP 30: activeFact version incremented to 2');
    checkEqual(dataPost.activeFact.value, 391500000000, 'HTTP 31: New restated value active');

    // Verify history now has 2 versions
    const resHistory2 = await fetch(`${baseUrl}/restatements/AAPL?metric=REVENUE&period=FY2025`, { headers: authHeaders });
    const dataHist2 = await resHistory2.json();
    checkEqual(dataHist2.versionsCount, 2, 'HTTP 32: History reflects both V1 and V2');

    // -------------------------------------------------------------
    // 6. RAW FILING DOCUMENT & PARSER ENDPOINTS
    // -------------------------------------------------------------
    console.log('▶ Testing Raw Filing & Parser Endpoints...');
    const resDoc = await fetch(`${baseUrl}/filings/AAPL/document`, { headers: authHeaders });
    checkEqual(resDoc.status, 200, 'HTTP 33: GET /filings/AAPL/document returns 200 OK');
    const dataDoc = await resDoc.json();
    check(dataDoc.document !== undefined, 'HTTP 34: Document record present');

    const postParse = await fetch(`${factsBaseUrl}/parse-filing`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        rawDocumentContent: 'SEC FORM 10-K AAPL CONSOLIDATED FINANCIAL STATEMENTS',
        ticker: 'AAPL',
        accessionNumber: '0000320193-25-000099',
        filingType: '10-K'
      })
    });
    checkEqual(postParse.status, 200, 'HTTP 35: POST /parse-filing returns 200 OK');
    const dataParse = await postParse.json();
    checkEqual(dataParse.parsed.rawDocumentHash.length, 64, 'HTTP 36: Parsed document returns 64-char SHA256');

    // -------------------------------------------------------------
    // 7. MULTI-ASSET PRODUCTION REALITY (JPM, RELIANCE, TMPV, TSM)
    // -------------------------------------------------------------
    console.log('▶ Testing Multi-Asset Ticker Endpoints...');
    const resJPM = await fetch(`${baseUrl}/overview/JPM`, { headers: authHeaders });
    checkEqual(resJPM.status, 200, 'HTTP 37: GET /overview/JPM returns 200 OK');

    const resReliance = await fetch(`${baseUrl}/overview/RELIANCE.NS`, { headers: authHeaders });
    checkEqual(resReliance.status, 200, 'HTTP 38: GET /overview/RELIANCE.NS returns 200 OK');

    const resTMPV = await fetch(`${baseUrl}/overview/TMPV.NS`, { headers: authHeaders });
    checkEqual(resTMPV.status, 200, 'HTTP 39: GET /overview/TMPV.NS returns 200 OK');

    const resTSM = await fetch(`${baseUrl}/overview/TSM`, { headers: authHeaders });
    checkEqual(resTSM.status, 200, 'HTTP 40: GET /overview/TSM returns 200 OK');

    // -------------------------------------------------------------
    // 8. SECURITY, RBAC & ADVERSARIAL VALIDATION
    // -------------------------------------------------------------
    console.log('▶ Testing Security & Error Handling...');
    const resUnauth = await fetch(`${baseUrl}/overview/AAPL`);
    checkEqual(resUnauth.status, 401, 'HTTP 41: Unauthenticated request rejected with 401');

    const postBadRestate = await fetch(`${factsBaseUrl}/restatement`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ ticker: 'AAPL' }) // missing metric & newValue
    });
    checkEqual(postBadRestate.status, 400, 'HTTP 42: Malformed restatement returns 400 Bad Request');

    const postBadParse = await fetch(`${factsBaseUrl}/parse-filing`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ rawDocumentContent: '' })
    });
    checkEqual(postBadParse.status, 400, 'HTTP 43: Empty document content returns 400 Bad Request');

    // -------------------------------------------------------------
    // 9. FACT FILTERING & LINEAGE LOOKUP
    // -------------------------------------------------------------
    console.log('▶ Testing Fact Filtering & Lineage Lookup...');
    const resFiltered = await fetch(`${baseUrl}/facts/AAPL?metric=REVENUE`, { headers: authHeaders });
    checkEqual(resFiltered.status, 200, 'HTTP 44: GET /facts/AAPL?metric=REVENUE returns 200 OK');
    const dataFiltered = await resFiltered.json();
    check(dataFiltered.facts.every(f => f.metric === 'REVENUE'), 'HTTP 45: Fact filter strictly isolates metric');

    const resLineage = await fetch(`${baseUrl}/lineage/FACT-AAPL-REVENUE-FY2025-V1`, { headers: authHeaders });
    checkEqual(resLineage.status, 200, 'HTTP 46: GET /lineage/:id returns 200 OK');

    // -------------------------------------------------------------
    // 10. CONSISTENCY OF BANKING & GLOBAL ASSETS
    // -------------------------------------------------------------
    const resConsJPM = await fetch(`${baseUrl}/consistency/JPM`, { headers: authHeaders });
    checkEqual(resConsJPM.status, 200, 'HTTP 47: GET /consistency/JPM returns 200 OK');

    const resFactsTSM = await fetch(`${baseUrl}/facts/TSM`, { headers: authHeaders });
    checkEqual(resFactsTSM.status, 200, 'HTTP 48: GET /facts/TSM returns 200 OK');

    const resQualityReliance = await fetch(`${baseUrl}/overview/RELIANCE.NS`, { headers: authHeaders });
    const dataQRel = await resQualityReliance.json();
    check(dataQRel.quality.overallScore >= 0, 'HTTP 49: RELIANCE.NS quality score is valid');

    const resQualityTMPV = await fetch(`${baseUrl}/overview/TMPV.NS`, { headers: authHeaders });
    const dataQTMPV = await resQualityTMPV.json();
    check(dataQTMPV.quality.overallScore >= 0, 'HTTP 50: TMPV.NS quality score is valid');

    const resConsTSM = await fetch(`${baseUrl}/consistency/TSM`, { headers: authHeaders });
    checkEqual(resConsTSM.status, 200, 'HTTP 51: GET /consistency/TSM returns 200 OK');

    console.log(`\n================================================================`);
    console.log(`PRODUCTION REALITY AUDIT PASSED: ${httpAssertions} HTTP ASSERTIONS PASSED`);
    console.log(`================================================================\n`);

  } finally {
    server.close();
  }
}

runProductionRealityAudit().catch(err => {
  console.error('Production Reality Audit Failed:', err);
  process.exit(1);
});
