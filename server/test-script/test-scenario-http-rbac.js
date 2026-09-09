/**
 * server/test-script/test-scenario-http-rbac.js
 * 
 * Phase 19: Express HTTP Endpoints & RBAC Security Tests
 */

import assert from 'assert';
import app from '../index.js';
import http from 'http';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 19 HTTP & RBAC SECURITY TESTS ---');

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
    // 1. GET /api/scenario/canonical-list (No workspace required for metadata)
    const res1 = await makeRequest(server, {
      path: '/api/scenario/canonical-list',
      method: 'GET'
    });
    testAssert(res1.statusCode === 200, 'GET /api/scenario/canonical-list returns 200');
    testAssert(res1.body.status === 'PASS', 'Status is PASS');
    testAssert(Array.isArray(res1.body.scenarios) && res1.body.scenarios.length >= 4, 'Returns canonical scenarios');

    // 2. 401 Unauthorized without x-workspace-id
    const res2 = await makeRequest(server, {
      path: '/api/scenario/evaluate-security',
      method: 'POST'
    }, { security: { ticker: 'AAPL', price: 100 } });
    testAssert(res2.statusCode === 401, 'Missing workspace header returns 401');

    // 3. POST /api/scenario/evaluate-security
    const res3 = await makeRequest(server, {
      path: '/api/scenario/evaluate-security',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-INST-001', 'x-user-role': 'ANALYST' }
    }, {
      security: { ticker: 'AAPL', price: 150, shares: 100, beta: 1.2, assetClass: 'EQUITY' },
      scenarioDefinition: {
        id: 'SCEN-TEST',
        name: 'Test Scenario',
        scenarioType: 'HYPOTHETICAL_STRESS',
        shocks: [{ targetType: 'INDEX', target: 'SPX', shockUnit: 'PERCENT', shockValue: -0.10, betaAdjusted: true }]
      }
    });
    testAssert(res3.statusCode === 200, 'POST /api/scenario/evaluate-security returns 200');
    testAssert(res3.body.result.stressed.price === 132, 'Evaluated price matches');

    // 4. POST /api/scenario/evaluate-portfolio
    const samplePortfolio = {
      id: 'PORT-01',
      cash: 10000,
      positions: [
        { ticker: 'AAPL', price: 100, shares: 100, marketValue: 10000, beta: 1.0, assetClass: 'EQUITY' }
      ]
    };
    const res4 = await makeRequest(server, {
      path: '/api/scenario/evaluate-portfolio',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-INST-001', 'x-user-role': 'PORTFOLIO_MANAGER' }
    }, {
      portfolio: samplePortfolio,
      scenarioDefinition: {
        id: 'SCEN-PORT-TEST',
        name: 'Portfolio Test',
        scenarioType: 'HYPOTHETICAL_STRESS',
        shocks: [{ targetType: 'INDEX', target: 'SPX', shockUnit: 'PERCENT', shockValue: -0.20, betaAdjusted: true }]
      }
    });
    testAssert(res4.statusCode === 200, 'POST /api/scenario/evaluate-portfolio returns 200');
    testAssert(res4.body.explanation !== undefined, 'Explanation included in portfolio evaluation');

    // 5. POST /api/scenario/canonical/CANONICAL_2008_GFC
    const res5 = await makeRequest(server, {
      path: '/api/scenario/canonical/CANONICAL_2008_GFC',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-INST-001', 'x-user-role': 'PORTFOLIO_MANAGER' }
    }, { portfolio: samplePortfolio });
    testAssert(res5.statusCode === 200, 'POST canonical 2008 GFC returns 200');
    testAssert(res5.body.result.scenarioId === 'CANONICAL_2008_GFC', 'ScenarioId matches canonical GFC');

    // 6. POST /api/scenario/reverse-solver
    const res6 = await makeRequest(server, {
      path: '/api/scenario/reverse-solver',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-INST-001', 'x-user-role': 'ANALYST' }
    }, {
      portfolio: samplePortfolio,
      reverseRequest: {
        targetMetric: 'NAV_CHANGE_PERCENT',
        targetValue: -0.05,
        variableParameter: { targetType: 'INDEX', target: 'SPX', shockUnit: 'PERCENT' },
        minBound: -0.50,
        maxBound: 0.50
      }
    });
    testAssert(res6.statusCode === 200, 'POST /api/scenario/reverse-solver returns 200');
    testAssert(res6.body.result.converged === true, 'Solver converged');

    // 7. POST /api/scenario/compare
    const res7 = await makeRequest(server, {
      path: '/api/scenario/compare',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-INST-001', 'x-user-role': 'ANALYST' }
    }, {
      portfolio: samplePortfolio,
      scenarioDefinitions: [
        { id: 'S1', name: 'S1', scenarioType: 'HYPOTHETICAL_STRESS', shocks: [{ targetType: 'INDEX', target: 'SPX', shockUnit: 'PERCENT', shockValue: -0.1 }] },
        { id: 'S2', name: 'S2', scenarioType: 'HYPOTHETICAL_STRESS', shocks: [{ targetType: 'INDEX', target: 'SPX', shockUnit: 'PERCENT', shockValue: -0.2 }] }
      ]
    });
    testAssert(res7.statusCode === 200, 'POST /api/scenario/compare returns 200');
    testAssert(res7.body.result.scenarioCount === 2, 'Compared 2 scenarios');

    // 8. Package Sealing RBAC: VIEWER blocked (403), ANALYST allowed (201)
    const res8_viewer = await makeRequest(server, {
      path: '/api/scenario/seal-package',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-INST-001', 'x-user-role': 'VIEWER' }
    }, {
      scenarioResult: { pnl: -100 },
      scenarioDefinition: { id: 'S1', name: 'S1' }
    });
    testAssert(res8_viewer.statusCode === 403, 'VIEWER role forbidden from sealing packages (403)');

    const res8_analyst = await makeRequest(server, {
      path: '/api/scenario/seal-package',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-INST-001', 'x-user-role': 'ANALYST' }
    }, {
      scenarioResult: { pnl: -100 },
      scenarioDefinition: { id: 'S1', name: 'S1' }
    });
    testAssert(res8_analyst.statusCode === 201, 'ANALYST role allowed to seal package (201)');
    const sealedPkg = res8_analyst.body.sealedPackage;

    // 9. POST /api/scenario/verify-package
    const res9 = await makeRequest(server, {
      path: '/api/scenario/verify-package',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-INST-001', 'x-user-role': 'VIEWER' }
    }, { sealedPackage: sealedPkg });
    testAssert(res9.statusCode === 200, 'POST /api/scenario/verify-package returns 200');
    testAssert(res9.body.verification.valid === true, 'Sealed package verified valid');

    // 10. Scenario Template Management RBAC: VIEWER blocked (403), PM allowed (201)
    const res10_viewer = await makeRequest(server, {
      path: '/api/scenario/templates',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-INST-001', 'x-user-role': 'VIEWER' }
    }, { id: 'TMPL-01', name: 'My Template' });
    testAssert(res10_viewer.statusCode === 403, 'VIEWER role forbidden from saving templates (403)');

    const res10_pm = await makeRequest(server, {
      path: '/api/scenario/templates',
      method: 'POST',
      headers: { 'x-workspace-id': 'WS-INST-001', 'x-user-role': 'PORTFOLIO_MANAGER' }
    }, { id: 'TMPL-01', name: 'My Template', scenarioType: 'HYPOTHETICAL_STRESS' });
    testAssert(res10_pm.statusCode === 201, 'PORTFOLIO_MANAGER allowed to save template (201)');

    const res10_list = await makeRequest(server, {
      path: '/api/scenario/templates',
      method: 'GET',
      headers: { 'x-workspace-id': 'WS-INST-001', 'x-user-role': 'VIEWER' }
    });
    testAssert(res10_list.statusCode === 200, 'GET /api/scenario/templates returns 200');
    testAssert(res10_list.body.templates.length === 1, 'Lists saved template for workspace');

    console.log(`[PASS] Phase 19 HTTP & RBAC tests passed: ${assertionCount} assertions`);
    server.close();
  } catch (err) {
    server.close();
    console.error('HTTP Test Failure:', err);
    process.exit(1);
  }
});

export default { assertionCount };
