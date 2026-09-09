/**
 * server/test-script/test-earnings-determinism-concurrency-http.js
 * 
 * Phase 21: Determinism (100-Run), Concurrency (50-Job), Express HTTP & RBAC Suite
 */

import assert from 'assert';
import http from 'http';
import app from '../index.js';
import { CorporateEventStore } from '../earnings/earnings.eventStore.js';
import { computeEarningsSurprise } from '../earnings/earnings.surprise.engine.js';
import { defaultGuidanceEngine } from '../earnings/earnings.guidance.engine.js';
import { evaluateEarningsQuality } from '../earnings/earnings.quality.engine.js';
import { defaultEventDrivenForecastRevisionEngine } from '../earnings/earnings.forecastRevision.engine.js';
import { sealEventIntelligencePackage, verifyEventIntelligencePackage } from '../earnings/earnings.package.js';
import { canonicalHash } from '../earnings/earnings.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 21 DETERMINISM, CONCURRENCY & HTTP/RBAC TESTS ---');

// =========================================================================
// SECTION 1: 100-RUN REPRODUCIBLE DETERMINISM TEST
// =========================================================================
console.log('Executing 100-Run Reproducible Determinism Test...');

const fixedEvent = {
  eventId: 'EVNT-DET-100',
  securityId: 'AAPL',
  reportingPeriod: '2025Q4',
  sourceId: 'SRC-NASDAQ-DIRECT',
  rawDocumentHash: 'abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890dead'
};

const fixedSurprise = {
  surprises: {
    REVENUE: { absoluteSurprise: 2500000000, percentageSurprise: 0.025, isBeat: true },
    DILUTED_EPS: { absoluteSurprise: 0.08, percentageSurprise: 0.05, isBeat: true }
  }
};

let baselinePackageHash = null;

for (let r = 0; r < 100; r++) {
  const sampleCandidate = defaultEventDrivenForecastRevisionEngine.generateRevisionCandidate(
    { forecastId: 'FCST-DET-01', ticker: 'AAPL', metric: 'REVENUE', value: 400000, assumptions: { revenueGrowthRate: 0.08, operatingMargin: 0.30 } },
    { revenueSurprisePct: 0.025, actualRevenue: 102500 }
  );

  const hash = canonicalHash({
    ticker: sampleCandidate.ticker,
    metric: sampleCandidate.metric,
    previousForecastId: sampleCandidate.previousForecastId,
    revisedValue: sampleCandidate.revisedValue,
    deltaValue: sampleCandidate.deltaValue,
    createdAt: '2026-01-01T00:00:00.000Z'
  });

  if (baselinePackageHash === null) {
    baselinePackageHash = hash;
  } else {
    testAssert(hash === baselinePackageHash, `Run ${r} output hash exactly matches baseline (bit-for-bit determinism)`);
  }
}
testAssert(baselinePackageHash !== null, 'Determinism 100-run baseline confirmed');

// =========================================================================
// SECTION 2: 50-JOB CONCURRENT INGESTION & EVALUATION
// =========================================================================
console.log('Executing 50-Job Concurrent Ingestion & Evaluation...');

const concurrentStore = new CorporateEventStore();
const concurrentJobs = [];

for (let j = 0; j < 50; j++) {
  concurrentJobs.push(new Promise((resolve) => {
    const tenantId = `TENANT-CONC-${j % 5}`;
    const ev = {
      eventId: `EVNT-CONC-${j}`,
      securityId: `TICKER${j % 10}`,
      reportingPeriod: '2025Q4',
      sourceId: 'SRC-SEC-EDGAR',
      eventType: 'QUARTERLY_EARNINGS',
      eventTimestamp: '2025-10-30T16:00:00.000Z',
      publicationTimestamp: '2025-10-30T20:00:00.000Z',
      payload: { revenue: 50000 + j * 100, netIncome: 10000 + j * 20 }
    };
    const res = concurrentStore.ingestEvent(tenantId, ev);
    resolve(res);
  }));
}

const jobResults = await Promise.all(concurrentJobs);
testAssert(jobResults.length === 50, 'All 50 concurrent jobs finished successfully');
testAssert(jobResults.every(r => r.isDuplicate === false), 'All 50 unique events ingested cleanly without race condition duplicate flags');

// =========================================================================
// SECTION 3: EXPRESS REST API & RBAC HTTP TESTS
// =========================================================================
console.log('Executing Express REST API & RBAC Security Tests...');

async function makeRequest(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ statusCode: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

const server = http.createServer(app);

await new Promise((resolve) => {
  server.listen(0, async () => {
    try {
      const authHeaders = {
        'x-user-id': 'USER-HTTP-ADMIN',
        'x-tenant-id': 'TENANT-HTTP-01',
        'x-workspace-id': 'WS-HTTP-01',
        'x-user-role': 'ADMIN'
      };

      // 1. Ingest Event via HTTP
      const postEventRes = await makeRequest(server, {
        path: '/api/earnings/events',
        method: 'POST',
        headers: authHeaders
      }, {
        eventId: 'EVNT-HTTP-001',
        securityId: 'AAPL',
        reportingPeriod: '2025Q4',
        sourceId: 'SRC-NASDAQ-DIRECT',
        eventType: 'QUARTERLY_EARNINGS',
        eventTimestamp: '2025-10-30T16:00:00.000Z',
        publicationTimestamp: '2025-10-30T20:00:00.000Z',
        payload: { revenue: 102500000000, dilutedEps: 1.64 }
      });
      testAssert(postEventRes.statusCode === 201, `Event created via HTTP (Status 201, got ${postEventRes.statusCode})`);
      testAssert(postEventRes.body.success === true, 'HTTP response success true');

      // 2. Get Event via HTTP
      const getEventRes = await makeRequest(server, {
        path: '/api/earnings/events/EVNT-HTTP-001',
        method: 'GET',
        headers: authHeaders
      });
      testAssert(getEventRes.statusCode === 200, 'GET event succeeded (Status 200)');
      testAssert(getEventRes.body.event.eventId === 'EVNT-HTTP-001', 'Retrieved event ID verified');

      // 3. Compute Surprise via HTTP
      const surpriseRes = await makeRequest(server, {
        path: '/api/earnings/surprise',
        method: 'POST',
        headers: authHeaders
      }, {
        actualFact: { value: 1.64, metric: 'DILUTED_EPS', ticker: 'AAPL' },
        consensus: { meanEstimate: 1.60 }
      });
      testAssert(surpriseRes.statusCode === 200, 'Surprise computed via HTTP (Status 200)');
      testAssert(surpriseRes.body.surprise.isBeat === true, 'Surprise isBeat confirmed via HTTP');

      // 4. Record Guidance via HTTP
      const guideRes = await makeRequest(server, {
        path: '/api/earnings/guidance',
        method: 'POST',
        headers: authHeaders
      }, {
        ticker: 'AAPL',
        guidanceData: { metric: 'REVENUE', period: '2026Q1', low: 120000, high: 126000 }
      });
      testAssert(guideRes.statusCode === 201, 'Guidance recorded via HTTP (Status 201)');
      testAssert(guideRes.body.guidanceRecord.midpoint === 123000, 'Guidance midpoint verified via HTTP');

      // 5. Evaluate Quality via HTTP
      const qualRes = await makeRequest(server, {
        path: '/api/earnings/quality',
        method: 'POST',
        headers: authHeaders
      }, {
        financials: { netIncome: 100, cfo: 120, totalAssets: 1000 }
      });
      testAssert(qualRes.statusCode === 200, 'Quality evaluated via HTTP (Status 200)');
      testAssert(qualRes.body.quality.isHighQuality === true, 'Quality evaluated as high');

      // 6. Seal and Verify Package via HTTP
      const sealRes = await makeRequest(server, {
        path: '/api/earnings/package/seal',
        method: 'POST',
        headers: authHeaders
      }, {
        eventRecord: { eventId: 'EVNT-HTTP-001', securityId: 'AAPL', reportingPeriod: '2025Q4', rawDocumentHash: '1234' },
        surpriseReport: { surprises: { EPS: { absoluteSurprise: 0.04 } } }
      });
      testAssert(sealRes.statusCode === 201, 'Package sealed via HTTP (Status 201)');
      const sealedPkg = sealRes.body.package;

      const verifyRes = await makeRequest(server, {
        path: '/api/earnings/package/verify',
        method: 'POST',
        headers: authHeaders
      }, {
        pkg: sealedPkg
      });
      testAssert(verifyRes.statusCode === 200, 'Package verified via HTTP (Status 200)');
      testAssert(verifyRes.body.verification.valid === true, 'Verification valid is true');

      // 7. RBAC Unauthorized Role Check (GUEST cannot ingest event)
      const guestHeaders = {
        'x-user-id': 'USER-GUEST',
        'x-tenant-id': 'TENANT-HTTP-01',
        'x-workspace-id': 'WS-HTTP-01',
        'x-user-role': 'GUEST'
      };
      const guestPostRes = await makeRequest(server, {
        path: '/api/earnings/events',
        method: 'POST',
        headers: guestHeaders
      }, {
        eventId: 'EVNT-GUEST-FAIL',
        securityId: 'AAPL'
      });
      testAssert(guestPostRes.statusCode === 403, `GUEST blocked with 403 Forbidden (got ${guestPostRes.statusCode})`);

      server.close(resolve);
    } catch (err) {
      server.close(() => { throw err; });
    }
  });
});

console.log(`\n================================================================`);
console.log(`PASSED: ${assertionCount} assertions (Determinism, Concurrency & HTTP)`);
console.log(`================================================================\n`);

export { assertionCount };
