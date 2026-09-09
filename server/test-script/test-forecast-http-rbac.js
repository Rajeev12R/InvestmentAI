/**
 * server/test-script/test-forecast-http-rbac.js
 * 
 * Phase 20: Express HTTP Endpoints & RBAC Security Tests
 */

import assert from 'assert';
import app from '../index.js';
import http from 'http';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 20 HTTP & RBAC SECURITY TESTS ---');

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
        resolve({ statusCode: res.statusCode, body: parsed, headers: res.headers });
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

server.listen(0, async () => {
  try {
    // 1. 401 Unauthorized without x-workspace-id
    const res1 = await makeRequest(server, {
      path: '/api/forecast/generate',
      method: 'POST'
    }, { ticker: 'AAPL', metric: 'REVENUE' });
    testAssert(res1.statusCode === 401, 'Missing workspace header returns 401');

    // 2. RBAC: VIEWER forbidden from generating forecast (403)
    const res2_viewer = await makeRequest(server, {
      path: '/api/forecast/generate',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-ALPHA', 'x-user-role': 'VIEWER' }
    }, {
      ticker: 'AAPL',
      metric: 'REVENUE',
      method: 'HISTORICAL_CAGR',
      horizon: '1Y',
      historicalSeries: [100, 110]
    });
    testAssert(res2_viewer.statusCode === 403, 'VIEWER role forbidden from generating forecasts (403)');

    // 3. RBAC: ANALYST allowed to generate forecast (201)
    const res2_analyst = await makeRequest(server, {
      path: '/api/forecast/generate',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-ALPHA', 'x-user-role': 'ANALYST' }
    }, {
      ticker: 'AAPL',
      metric: 'REVENUE',
      method: 'HISTORICAL_CAGR',
      horizon: '1Y',
      historicalSeries: [100, 110, 121]
    });
    testAssert(res2_analyst.statusCode === 201, 'ANALYST role generates forecast successfully (201)');
    testAssert(res2_analyst.body.forecast !== undefined, 'Forecast record returned in response');
    const createdForecast = res2_analyst.body.forecast;

    // 4. POST /api/forecast/multi-case
    const res4 = await makeRequest(server, {
      path: '/api/forecast/multi-case',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-ALPHA', 'x-user-role': 'ANALYST' }
    }, {
      baseFinancials: { baseRevenue: 10000, baseShares: 100 },
      caseDrivers: {
        base: { revenueGrowthRate: 0.10, operatingMargin: 0.20 },
        bull: { revenueGrowthRate: 0.20, operatingMargin: 0.25 },
        bear: { revenueGrowthRate: 0.00, operatingMargin: 0.15 }
      }
    });
    testAssert(res4.statusCode === 200, 'POST /api/forecast/multi-case returns 200');

    // 5. POST /api/forecast/valuation-link
    const res5 = await makeRequest(server, {
      path: '/api/forecast/valuation-link',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-ALPHA', 'x-user-role': 'ANALYST' }
    }, {
      fundamentalForecastResult: {
        periods: [{ year: 1, fcf: 100, ebitda: 150 }],
        summary: { finalYearEPS: 5.0 }
      },
      valuationParams: { wacc: 0.10, terminalGrowthRate: 0.02, shares: 10, targetPE: 15 }
    });
    testAssert(res5.statusCode === 200, 'POST /api/forecast/valuation-link returns 200');

    // 6. POST /api/forecast/portfolio
    const res6 = await makeRequest(server, {
      path: '/api/forecast/portfolio',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-ALPHA', 'x-user-role': 'PORTFOLIO_MANAGER' }
    }, {
      portfolio: {
        id: 'PORT-01',
        cash: 10000,
        positions: [{ ticker: 'AAPL', marketValue: 50000, forecast: { expectedReturn: 0.10 } }]
      }
    });
    testAssert(res6.statusCode === 200, 'POST /api/forecast/portfolio returns 200');

    // 7. POST /api/forecast/assumptions & GET
    const res7 = await makeRequest(server, {
      path: '/api/forecast/assumptions',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-ALPHA', 'x-user-role': 'ANALYST' }
    }, {
      assumptionId: 'ASSUMP-HTTP-01',
      metric: 'REVENUE_GROWTH',
      value: 0.15,
      rationale: 'New product line launch momentum'
    });
    testAssert(res7.statusCode === 201, 'POST /api/forecast/assumptions returns 201');

    const res7_get = await makeRequest(server, {
      path: '/api/forecast/assumptions',
      method: 'GET',
      headers: { 'x-workspace-id': 'WS-ALPHA', 'x-user-role': 'VIEWER' }
    });
    testAssert(res7_get.statusCode === 200, 'GET /api/forecast/assumptions returns 200');
    testAssert(res7_get.body.assumptions.length >= 1, 'Lists registered assumptions');

    // 8. POST /api/forecast/consensus & GET
    const res8 = await makeRequest(server, {
      path: '/api/forecast/consensus',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-ALPHA', 'x-user-role': 'ANALYST' }
    }, {
      ticker: 'AAPL',
      metric: 'REVENUE',
      period: 'FY2027',
      meanEstimate: 450000,
      sourceProvider: 'SRC-IBES'
    });
    testAssert(res8.statusCode === 201, 'POST /api/forecast/consensus returns 201');

    const res8_get = await makeRequest(server, {
      path: '/api/forecast/consensus/AAPL/REVENUE?period=FY2027',
      method: 'GET',
      headers: { 'x-workspace-id': 'WS-ALPHA', 'x-user-role': 'VIEWER' }
    });
    testAssert(res8_get.statusCode === 200, 'GET /api/forecast/consensus returns 200');

    // 9. POST /api/forecast/evaluate-accuracy
    const res9 = await makeRequest(server, {
      path: '/api/forecast/evaluate-accuracy',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-ALPHA', 'x-user-role': 'ANALYST' }
    }, {
      forecast: { value: 100 },
      realizedFact: { value: 105, classification: 'REAL_DATA' }
    });
    testAssert(res9.statusCode === 200, 'POST /api/forecast/evaluate-accuracy returns 200');
    testAssert(res9.body.accuracy.signedError === 5, 'Accuracy error evaluated');

    // 10. Package Sealing RBAC: VIEWER blocked (403), ANALYST allowed (201)
    const res10_viewer = await makeRequest(server, {
      path: '/api/forecast/seal-package',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-ALPHA', 'x-user-role': 'VIEWER' }
    }, { forecastRecord: createdForecast });
    testAssert(res10_viewer.statusCode === 403, 'VIEWER forbidden from sealing forecast package (403)');

    const res10_analyst = await makeRequest(server, {
      path: '/api/forecast/seal-package',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-ALPHA', 'x-user-role': 'ANALYST' }
    }, { forecastRecord: createdForecast });
    testAssert(res10_analyst.statusCode === 201, 'ANALYST allowed to seal forecast package (201)');
    const sealedPkg = res10_analyst.body.sealedPackage;

    // 11. POST /api/forecast/verify-package
    const res11 = await makeRequest(server, {
      path: '/api/forecast/verify-package',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-ALPHA', 'x-user-role': 'VIEWER' }
    }, { sealedPackage: sealedPkg });
    testAssert(res11.statusCode === 200, 'POST /api/forecast/verify-package returns 200');
    testAssert(res11.body.verification.valid === true, 'Sealed package verifies as authentic');

    console.log(`[PASS] Phase 20 HTTP & RBAC tests passed: ${assertionCount} assertions`);
    server.close();
  } catch (err) {
    server.close();
    console.error('HTTP Test Failure:', err);
    process.exit(1);
  }
});

export default { assertionCount };
