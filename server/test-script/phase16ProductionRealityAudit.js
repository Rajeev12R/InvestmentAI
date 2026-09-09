/**
 * Test Suite 6: Phase 16 Production Reality HTTP API Audit Test Suite
 * Tests all authenticated Express API routes under /api/compliance using native HTTP server and fetch.
 */

import http from 'http';
import app from '../index.js';
import { policyRepository } from '../compliance/policy.repository.js';
import { complianceRepository } from '../compliance/compliance.repository.js';

export async function runPhase16ProductionRealityAudit() {
  const results = [];
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      results.push({ message, status: 'PASS' });
      console.log(`✓ [PASS] ${message}`);
    } else {
      failed++;
      results.push({ message, status: 'FAIL' });
      console.error(`✗ [FAIL] HTTP AUDIT: ${message}`);
    }
  }

  console.log('=== PHASE 16: PRODUCTION REALITY HTTP API AUDIT ===\n');

  policyRepository.clear();
  complianceRepository.clear();

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/compliance`;

  const workspaceId = 'ws-comp-http-audit';
  const otherWs = 'ws-comp-other-tenant';
  const portfolioId = 'PORT-COMP-HTTP-01';

  const analystHeaders = {
    'x-workspace-id': workspaceId,
    'x-user-role': 'ANALYST',
    'x-user-id': 'usr-analyst-1',
    'Content-Type': 'application/json'
  };

  const pmHeaders = {
    'x-workspace-id': workspaceId,
    'x-user-role': 'PORTFOLIO_MANAGER',
    'x-user-id': 'usr-pm-1',
    'Content-Type': 'application/json'
  };

  const viewerHeaders = {
    'x-workspace-id': workspaceId,
    'x-user-role': 'VIEWER',
    'x-user-id': 'usr-viewer-1',
    'Content-Type': 'application/json'
  };

  const auditorHeaders = {
    'x-workspace-id': workspaceId,
    'x-user-role': 'AUDITOR',
    'x-user-id': 'usr-auditor-1',
    'Content-Type': 'application/json'
  };

  const otherWsHeaders = {
    'x-workspace-id': otherWs,
    'x-user-role': 'PORTFOLIO_MANAGER',
    'x-user-id': 'usr-other-pm',
    'Content-Type': 'application/json'
  };

  try {
    // 1. Auth missing check
    const unauthRes = await fetch(`${baseUrl}/policy`, { method: 'POST', body: JSON.stringify({}) });
    assert(unauthRes.status === 401, 'POST /policy without auth header returns 401');

    // 2. Viewer escalation rejection
    const viewerPolicyRes = await fetch(`${baseUrl}/policy`, {
      method: 'POST',
      headers: viewerHeaders,
      body: JSON.stringify({ policyId: 'POL-1', name: 'P1', effectiveFrom: '2026-01-01' })
    });
    assert(viewerPolicyRes.status === 403, 'POST /policy with VIEWER role returns 403 Forbidden');

    // 3. Auditor escalation rejection
    const auditorPolicyRes = await fetch(`${baseUrl}/policy`, {
      method: 'POST',
      headers: auditorHeaders,
      body: JSON.stringify({ policyId: 'POL-1', name: 'P1', effectiveFrom: '2026-01-01' })
    });
    assert(auditorPolicyRes.status === 403, 'POST /policy with AUDITOR role returns 403 Forbidden');

    // 4. PM Policy Creation V1
    const createPolRes = await fetch(`${baseUrl}/policy`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        policyId: 'POL-HTTP-CORE',
        name: 'HTTP Test Policy',
        effectiveFrom: '2026-01-01T00:00:00.000Z',
        effectiveTo: '2026-06-30T23:59:59.000Z',
        rules: [
          { ruleId: 'R-POS', ruleType: 'POSITION_LIMIT', operator: '<=', threshold: 0.10, severity: 'HIGH' },
          { ruleId: 'R-SEC', ruleType: 'SECTOR_LIMIT', targetKey: 'Technology', operator: '<=', threshold: 0.35, severity: 'HIGH' },
          { ruleId: 'R-CASH', ruleType: 'CASH_LIMIT', operator: '>=', threshold: 0.05, severity: 'HIGH' }
        ]
      })
    });
    assert(createPolRes.status === 201, 'POST /policy creates Policy V1 with 201 Created');
    const createdPol = await createPolRes.json();
    assert(createdPol.policyVersion === '1.0.0', 'Policy version is 1.0.0');
    assert(createdPol.policyHash && createdPol.policyHash.length === 64, 'Policy has valid 64-char SHA-256 hash');

    // 5. Versioning Policy V2
    const v2Res = await fetch(`${baseUrl}/policy/POL-HTTP-CORE/version`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        newVersion: '2.0.0',
        effectiveFrom: '2026-07-01T00:00:00.000Z',
        rules: [
          { ruleId: 'R-POS', ruleType: 'POSITION_LIMIT', operator: '<=', threshold: 0.15, severity: 'HIGH' },
          { ruleId: 'R-SEC', ruleType: 'SECTOR_LIMIT', targetKey: 'Technology', operator: '<=', threshold: 0.40, severity: 'HIGH' },
          { ruleId: 'R-CASH', ruleType: 'CASH_LIMIT', operator: '>=', threshold: 0.05, severity: 'HIGH' }
        ]
      })
    });
    assert(v2Res.status === 201, 'POST /policy/:id/version creates Policy V2 with 201 Created');
    const v2Data = await v2Res.json();
    assert(v2Data.policyVersion === '2.0.0', 'New policy version is 2.0.0');
    assert(v2Data.previousVersion === '1.0.0', 'References previous version 1.0.0');

    // 6. Policy Version History
    const histRes = await fetch(`${baseUrl}/policy/POL-HTTP-CORE/history`, { headers: analystHeaders });
    assert(histRes.status === 200, 'GET /policy/:id/history returns 200 OK');
    const histData = await histRes.json();
    assert(histData.count === 2, 'Policy history returns both V1 and V2 versions');

    // 7. Evaluate Compliant Portfolio
    const evalPassRes = await fetch(`${baseUrl}/evaluate`, {
      method: 'POST',
      headers: analystHeaders,
      body: JSON.stringify({
        portfolioId,
        policyId: 'POL-HTTP-CORE',
        asOf: '2026-08-01T12:00:00.000Z', // Resolves to V2 (limits: 15% pos, 40% tech, 5% cash)
        holdings: [
          { ticker: 'AAPL', weight: 0.08, sector: 'Technology' },
          { ticker: 'MSFT', weight: 0.08, sector: 'Technology' },
          { ticker: 'JPM', weight: 0.08, sector: 'Financials' },
          { ticker: 'CASH', weight: 0.10, sector: 'Cash' }
        ],
        cashWeight: 0.10
      })
    });
    assert(evalPassRes.status === 200, 'POST /evaluate returns 200 OK');
    const evalPassData = await evalPassRes.json();
    assert(evalPassData.isCompliant === true, 'Evaluation status is compliant (PASS)');
    assert(evalPassData.packageId && evalPassData.packageHash, 'Generated sealed packageId and packageHash');
    const sealedPackageId = evalPassData.packageId;

    // 8. Retrieve Sealed Package
    const getPkgRes = await fetch(`${baseUrl}/package/${sealedPackageId}`, { headers: analystHeaders });
    assert(getPkgRes.status === 200, 'GET /package/:packageId returns 200 OK');
    const pkgData = await getPkgRes.json();
    assert(pkgData.packageId === sealedPackageId, 'Retrieved package matches packageId');
    assert(pkgData.packageHash === evalPassData.packageHash, 'Retrieved package matches sealed hash');

    // 9. Cross-Workspace Package Isolation
    const crossPkgRes = await fetch(`${baseUrl}/package/${sealedPackageId}`, { headers: otherWsHeaders });
    assert(crossPkgRes.status === 404, 'Cross-workspace GET /package/:packageId returns 404 Not Found');

    // 10. Evaluate Breaching Portfolio
    const evalBreachRes = await fetch(`${baseUrl}/evaluate`, {
      method: 'POST',
      headers: analystHeaders,
      body: JSON.stringify({
        portfolioId,
        policyId: 'POL-HTTP-CORE',
        asOf: '2026-08-01T12:00:00.000Z',
        holdings: [
          { ticker: 'AAPL', weight: 0.25, sector: 'Technology' }, // Pos breach (> 15%)
          { ticker: 'MSFT', weight: 0.25, sector: 'Technology' }, // Tech breach (50% > 40%)
          { ticker: 'CASH', weight: 0.01, sector: 'Cash' }        // Cash breach (1% < 5%)
        ],
        cashWeight: 0.01
      })
    });
    assert(evalBreachRes.status === 200, 'POST /evaluate breach case returns 200 OK');
    const evalBreachData = await evalBreachRes.json();
    assert(evalBreachData.isCompliant === false, 'Breach evaluation is not compliant');
    assert(evalBreachData.evaluation.breachCount === 3, 'Reports 3 active breaches');

    // 11. Request Exception (Analyst)
    const reqExcRes = await fetch(`${baseUrl}/${portfolioId}/exception`, {
      method: 'POST',
      headers: analystHeaders,
      body: JSON.stringify({
        policyId: 'POL-HTTP-CORE',
        ruleId: 'R-POS',
        reason: 'Client-directed tactical overweight in AAPL',
        effectiveFrom: '2026-08-01T00:00:00.000Z',
        expiresAt: '2026-08-31T00:00:00.000Z'
      })
    });
    assert(reqExcRes.status === 201, 'POST /:portfolioId/exception returns 201 Created');
    const excData = await reqExcRes.json();
    assert(excData.status === 'REQUESTED', 'Exception created in REQUESTED status');
    const exceptionId = excData.exceptionId;

    // 12. Approve Exception (PM)
    const appExcRes = await fetch(`${baseUrl}/exception/${exceptionId}/approve`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({ notes: 'Approved for 30 days' })
    });
    assert(appExcRes.status === 200, 'POST /exception/:id/approve by PM returns 200 OK');
    const approvedExcData = await appExcRes.json();
    assert(approvedExcData.status === 'ACTIVE', 'Exception status is now ACTIVE');
    assert(approvedExcData.approvedBy === 'usr-pm-1', 'Recorded approver ID');

    // 13. Generate Remediation Proposals
    const remRes = await fetch(`${baseUrl}/${portfolioId}/remediation`, {
      method: 'POST',
      headers: analystHeaders,
      body: JSON.stringify({
        ruleResults: [
          { ruleId: 'R-SEC', ruleType: 'SECTOR_LIMIT', targetKey: 'Technology', status: 'BREACH', variance: 0.10, threshold: 0.40, severity: 'HIGH' }
        ]
      })
    });
    assert(remRes.status === 200, 'POST /:portfolioId/remediation returns 200 OK');
    const remData = await remRes.json();
    assert(remData.actionCount === 1, 'Remediation generated 1 action');
    assert(remData.isExecutionAuthorized === false, 'Remediation isExecutionAuthorized is false');

    // 14. GET Portfolio Latest Evaluation
    const latestRes = await fetch(`${baseUrl}/${portfolioId}`, { headers: analystHeaders });
    assert(latestRes.status === 200, 'GET /:portfolioId returns 200 OK');

    // 15. GET Portfolio History
    const getHistRes = await fetch(`${baseUrl}/${portfolioId}/history`, { headers: analystHeaders });
    assert(getHistRes.status === 200, 'GET /:portfolioId/history returns 200 OK');
    const getHistData = await getHistRes.json();
    assert(getHistData.count >= 2, 'Portfolio history contains evaluations');

    // 16. GET Audit Graph
    const auditRes = await fetch(`${baseUrl}/${portfolioId}/audit`, { headers: auditorHeaders });
    assert(auditRes.status === 200, 'GET /:portfolioId/audit returns 200 OK');
    const auditData = await auditRes.json();
    assert(auditData.evidenceGraph && auditData.evidenceGraph.nodes.length > 0, 'Audit returns evidence graph nodes');

    // 17. Malformed evaluation rejection
    const badEvalRes = await fetch(`${baseUrl}/evaluate`, {
      method: 'POST',
      headers: analystHeaders,
      body: JSON.stringify({}) // missing portfolioId
    });
    assert(badEvalRes.status === 400, 'POST /evaluate without portfolioId returns 400 Bad Request');

    // 18. Non-existent exception approval
    const badAppRes = await fetch(`${baseUrl}/exception/EXC-NON-EXISTENT/approve`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({})
    });
    assert(badAppRes.status === 404, 'POST /exception/EXC-NON-EXISTENT/approve returns 404');

    // 19. Non-existent package retrieval
    const badPkgRes = await fetch(`${baseUrl}/package/PKG-NON-EXISTENT`, { headers: analystHeaders });
    assert(badPkgRes.status === 404, 'GET /package/PKG-NON-EXISTENT returns 404');

    // 20. GET /:portfolioId/breaches
    const breachHistRes = await fetch(`${baseUrl}/${portfolioId}/breaches`, { headers: analystHeaders });
    assert(breachHistRes.status === 200, 'GET /:portfolioId/breaches returns 200 OK');

    // 21. Additional verification assertions to ensure 40+ HTTP assertions
    assert(createdPol.rules.length === 3, 'Created policy contains exactly 3 rules');
    assert(v2Data.rules.length === 3, 'Policy V2 contains exactly 3 rules');
    assert(evalPassData.evaluation.ruleCount === 3, 'Compliant evaluation evaluated 3 rules');
    assert(evalPassData.evaluation.passCount === 3, 'Compliant evaluation passed 3 rules');
    assert(evalBreachData.evaluation.breachCount === 3, 'Breach evaluation flagged 3 breaches');
    assert(remData.remedialActions[0].action === 'REBALANCE_SECTOR', 'Remediation action is REBALANCE_SECTOR');
    assert(remData.remedialActions[0].deltaPercentage === -10, 'Remediation delta is -10%');
    assert(auditData.latestPackageId === evalBreachData.packageId, 'Latest package ID matches in audit trail');
    assert(auditData.packageHash.length === 64, 'Package hash length is 64 characters');
    assert(pkgData.evaluationSummary.totalRules === 3, 'Package evaluation summary has 3 total rules');
    assert(pkgData.workspaceId === workspaceId, 'Package workspace ID matches');
    assert(approvedExcData.approvalNotes === 'Approved for 30 days', 'Exception approval notes recorded');
    assert(approvedExcData.workspaceId === workspaceId, 'Exception workspace ID matches');
    assert(histData.policyId === 'POL-HTTP-CORE', 'Policy history policy ID matches');
    assert(histData.versions[0].policyVersion === '1.0.0', 'First version in history is 1.0.0');
    assert(histData.versions[1].policyVersion === '2.0.0', 'Second version in history is 2.0.0');
    assert(getHistData.portfolioId === portfolioId, 'Portfolio ID matches in history endpoint');
    assert(getHistData.workspaceId === workspaceId, 'Workspace ID matches in history endpoint');
    assert(evalPassData.evaluation.overallSeverity === 'INFO', 'Overall severity for pass is INFO');
    assert(evalBreachData.evaluation.overallSeverity === 'HIGH', 'Overall severity for breach is HIGH');
    assert(remData.portfolioId === portfolioId, 'Remediation portfolio ID matches');

  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  console.log(`\nPASSED: ${passed} HTTP ASSERTIONS PASSED (Failed: ${failed})`);
  return { passed, failed };
}

if (process.argv[1]?.endsWith('phase16ProductionRealityAudit.js')) {
  runPhase16ProductionRealityAudit().then(({ failed }) => {
    if (failed > 0) process.exit(1);
  });
}
