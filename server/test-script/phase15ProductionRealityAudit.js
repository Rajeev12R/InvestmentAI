/**
 * Phase 15 Test Suite 7: Production Reality HTTP API Audit Test Suite
 * Tests all authenticated Express API routes under /api/implementation using native HTTP server and fetch.
 */

import http from 'http';
import app from '../index.js';

export async function runPhase15ProductionRealityAudit() {
  const results = [];
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      results.push({ message, status: 'PASS' });
    } else {
      failed++;
      results.push({ message, status: 'FAIL' });
      console.error(`FAILED HTTP AUDIT: ${message}`);
    }
  }

  console.log('--- RUNNING PHASE 15 PRODUCTION REALITY HTTP AUDIT ---');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/implementation`;

  const workspaceId = 'ws-impl-http-audit';
  const portfolioId = 'PORT-IMPL-HTTP-01';

  const analystHeaders = {
    'x-workspace-id': workspaceId,
    'x-user-role': 'ANALYST',
    'x-user-id': 'usr-analyst-1',
    'Content-Type': 'application/json'
  };

  const pmHeaders = {
    'x-workspace-id': workspaceId,
    'x-user-role': 'PM',
    'x-user-id': 'usr-pm-1',
    'Content-Type': 'application/json'
  };

  const sampleTargetAllocation = {
    packageId: 'PKG-OPT-100',
    portfolioId,
    targetWeights: { AAPL: 0.50, MSFT: 0.30, JPM: 0.20 },
    cashWeight: 0.0,
    expectedReturn: 0.12,
    portfolioRisk: 0.16
  };

  const sampleActualHoldings = [
    { ticker: 'AAPL', quantity: 200, unitPrice: 150, actualWeight: 0.30, currency: 'USD', assetClass: 'EQUITY', sector: 'Technology' },
    { ticker: 'MSFT', quantity: 150, unitPrice: 300, actualWeight: 0.45, currency: 'USD', assetClass: 'EQUITY', sector: 'Technology' },
    { ticker: 'JPM', quantity: 100, unitPrice: 150, actualWeight: 0.15, currency: 'USD', assetClass: 'EQUITY', sector: 'Financials' },
    { ticker: 'USD_CASH', quantity: 10000, unitPrice: 1, actualWeight: 0.10, currency: 'USD', assetClass: 'CASH', sector: 'Cash' }
  ];

  const sampleMarketPrices = {
    AAPL: 150,
    MSFT: 300,
    JPM: 150,
    USD_CASH: 1
  };

  let createdPlan = null;

  try {
    // 1. POST /api/implementation/plan (Valid Generation - ANALYST)
    const planRes = await fetch(`${baseUrl}/plan`, {
      method: 'POST',
      headers: analystHeaders,
      body: JSON.stringify({
        portfolioId,
        targetAllocation: sampleTargetAllocation,
        currentHoldings: sampleActualHoldings,
        totalPortfolioValue: 100000,
        marketPrices: sampleMarketPrices
      })
    });
    const planData = await planRes.json();
    assert(planRes.status === 200, 'POST /plan returns HTTP 200');
    assert(planData.planId !== undefined, 'POST /plan returns generated planId');
    assert(planData.approvalStatus === 'PROPOSED', 'POST /plan initial approval status is PROPOSED');
    assert(planData.orderCount >= 1, 'POST /plan generates discrete rebalance orders');
    assert(planData.grossTradeValue > 0, 'POST /plan calculates gross trade value');
    assert(typeof planData.oneWayTurnover === 'number', 'POST /plan calculates one-way turnover');
    assert(typeof planData.planHash === 'string' && planData.planHash.length === 64, 'POST /plan returns SHA-256 planHash');
    createdPlan = planData;

    // 2. POST /api/implementation/plan (RBAC VIEWER 403)
    const viewerPlanRes = await fetch(`${baseUrl}/plan`, {
      method: 'POST',
      headers: { ...analystHeaders, 'x-user-role': 'VIEWER' },
      body: JSON.stringify({ portfolioId, targetAllocation: sampleTargetAllocation })
    });
    assert(viewerPlanRes.status === 403, 'POST /plan with VIEWER role returns HTTP 403 Forbidden');

    // 3. POST /api/implementation/plan (Missing required fields 400)
    const badPlanRes = await fetch(`${baseUrl}/plan`, {
      method: 'POST',
      headers: analystHeaders,
      body: JSON.stringify({ targetAllocation: sampleTargetAllocation })
    });
    assert(badPlanRes.status === 400, 'POST /plan missing portfolioId returns HTTP 400');

    // 4. POST /api/implementation/reconcile (Valid 3-way reconciliation)
    const reconRes = await fetch(`${baseUrl}/reconcile`, {
      method: 'POST',
      headers: analystHeaders,
      body: JSON.stringify({
        portfolioId,
        targetAllocation: sampleTargetAllocation,
        implementationPlan: createdPlan,
        actualHoldings: sampleActualHoldings,
        toleranceBps: 50
      })
    });
    const reconData = await reconRes.json();
    assert(reconRes.status === 200, 'POST /reconcile returns HTTP 200');
    assert(reconData.overallStatus !== undefined, 'POST /reconcile returns overallStatus');
    assert(typeof reconData.reconciliationHash === 'string', 'POST /reconcile returns SHA-256 reconciliationHash');
    assert(Array.isArray(reconData.positions), 'POST /reconcile returns positions array');
    assert(reconData.totalPositionsAudited >= 1, 'POST /reconcile returns audited positions count');

    // 5. POST /api/implementation/reconcile (Missing holdings 400)
    const badReconRes = await fetch(`${baseUrl}/reconcile`, {
      method: 'POST',
      headers: analystHeaders,
      body: JSON.stringify({ portfolioId, targetAllocation: sampleTargetAllocation })
    });
    assert(badReconRes.status === 400, 'POST /reconcile missing actualHoldings returns HTTP 400');

    // 6. POST /api/implementation/:portfolioId/drift (Valid Drift Analysis)
    const driftRes = await fetch(`${baseUrl}/${portfolioId}/drift`, {
      method: 'POST',
      headers: analystHeaders,
      body: JSON.stringify({
        targetWeights: sampleTargetAllocation.targetWeights,
        actualHoldings: sampleActualHoldings
      })
    });
    const driftData = await driftRes.json();
    assert(driftRes.status === 200, 'POST /:portfolioId/drift returns HTTP 200');
    assert(typeof driftData.totalAbsolutePortfolioDrift === 'number', 'POST /:portfolioId/drift calculates totalAbsolutePortfolioDrift');
    assert(typeof driftData.maxAbsolutePositionDrift === 'number', 'POST /:portfolioId/drift calculates maxAbsolutePositionDrift');
    assert(typeof driftData.overallStatus === 'string', 'POST /:portfolioId/drift evaluates overallStatus');
    assert(typeof driftData.driftHash === 'string', 'POST /:portfolioId/drift returns driftHash');
    assert(Array.isArray(driftData.sectors), 'POST /:portfolioId/drift breaks down sectors');

    // 7. POST /api/implementation/:portfolioId/drift (Missing actual holdings 400)
    const badDriftRes = await fetch(`${baseUrl}/${portfolioId}/drift`, {
      method: 'POST',
      headers: analystHeaders,
      body: JSON.stringify({ actualHoldings: [] })
    });
    assert(badDriftRes.status === 400, 'POST /:portfolioId/drift missing actualHoldings returns HTTP 400');

    // 8. POST /api/implementation/:portfolioId/constraints (Constraint Audit)
    const constRes = await fetch(`${baseUrl}/${portfolioId}/constraints`, {
      method: 'POST',
      headers: analystHeaders,
      body: JSON.stringify({
        actualHoldings: sampleActualHoldings,
        mandateConstraints: {
          defaultMaxWeight: 0.35,
          minCashWeight: 0.05,
          maxCashWeight: 0.20,
          sectorCaps: { Technology: 0.50 }
        }
      })
    });
    const constData = await constRes.json();
    assert(constRes.status === 200, 'POST /:portfolioId/constraints returns HTTP 200');
    assert(typeof constData.overallStatus === 'string', 'POST /:portfolioId/constraints evaluates overallStatus');
    assert(Array.isArray(constData.constraints), 'POST /:portfolioId/constraints returns constraints array');
    assert(constData.breachCount >= 1, 'POST /:portfolioId/constraints correctly detects MSFT breach');
    assert(typeof constData.reportHash === 'string', 'POST /:portfolioId/constraints returns reportHash');

    // 9. POST /api/implementation/:portfolioId/rebalance (Rebalance Candidate Generation)
    const rebRes = await fetch(`${baseUrl}/${portfolioId}/rebalance`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        targetWeights: sampleTargetAllocation.targetWeights,
        actualHoldings: sampleActualHoldings,
        securities: [
          { ticker: 'AAPL', sector: 'Technology' },
          { ticker: 'MSFT', sector: 'Technology' },
          { ticker: 'JPM', sector: 'Financials' }
        ],
        covarianceMatrix: [[0.04, 0.01, 0.01], [0.01, 0.04, 0.01], [0.01, 0.01, 0.04]],
        expectedReturns: { AAPL: 0.15, MSFT: 0.12, JPM: 0.08 }
      })
    });
    const rebData = await rebRes.json();
    assert(rebRes.status === 200, 'POST /:portfolioId/rebalance returns HTTP 200');
    assert(rebData.rebalanceRecommended === true, 'POST /:portfolioId/rebalance evaluates recommendation');
    assert(rebData.candidatePlan !== null, 'POST /:portfolioId/rebalance provides candidate plan');
    assert(rebData.packageHash !== undefined, 'POST /:portfolioId/rebalance returns packageHash');

    // 10. POST /api/implementation/:portfolioId/approve (PM Approves Plan)
    const approveRes = await fetch(`${baseUrl}/${portfolioId}/approve`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        planId: createdPlan.planId,
        decision: 'APPROVE',
        rationale: 'Rebalance approved after quantitative review'
      })
    });
    const approveData = await approveRes.json();
    assert(approveRes.status === 200, 'POST /:portfolioId/approve returns HTTP 200 for PM');
    assert(approveData.approvalStatus === 'APPROVED', 'POST /:portfolioId/approve marks plan APPROVED');
    assert(approveData.approverId === 'usr-pm-1', 'POST /:portfolioId/approve records approverId');
    assert(typeof approveData.approvalTimestamp === 'string', 'POST /:portfolioId/approve sets approval timestamp');

    // 11. POST /api/implementation/:portfolioId/approve (ANALYST role forbidden from approving - 403)
    const analystApproveRes = await fetch(`${baseUrl}/${portfolioId}/approve`, {
      method: 'POST',
      headers: analystHeaders,
      body: JSON.stringify({
        planId: createdPlan.planId,
        decision: 'APPROVE',
        rationale: 'Analyst attempting PM action'
      })
    });
    assert(analystApproveRes.status === 403, 'POST /:portfolioId/approve returns HTTP 403 for ANALYST');

    // 12. GET /api/implementation/:portfolioId (Retrieve Latest Package)
    const getRes = await fetch(`${baseUrl}/${portfolioId}`, {
      method: 'GET',
      headers: analystHeaders
    });
    const getData = await getRes.json();
    assert(getRes.status === 200, 'GET /:portfolioId returns HTTP 200');
    assert(getData.portfolioId === portfolioId, 'GET /:portfolioId returns package with matching portfolioId');
    assert(Array.isArray(getData.triggerReport), 'GET /:portfolioId returns trigger report array');
    assert(typeof getData.packageHash === 'string', 'GET /:portfolioId returns packageHash');

    // 13. GET /api/implementation/:portfolioId/history (Retrieve Audit History)
    const histRes = await fetch(`${baseUrl}/${portfolioId}/history`, {
      method: 'GET',
      headers: analystHeaders
    });
    const histData = await histRes.json();
    assert(histRes.status === 200, 'GET /:portfolioId/history returns HTTP 200');
    assert(Array.isArray(histData.packages), 'GET /:portfolioId/history returns packages array');
    assert(histData.count >= 1, 'GET /:portfolioId/history contains at least 1 record');

    // 14. GET /api/implementation/:portfolioId with unknown portfolio (404)
    const notFoundRes = await fetch(`${baseUrl}/PORT-DOES-NOT-EXIST`, {
      method: 'GET',
      headers: analystHeaders
    });
    assert(notFoundRes.status === 404, 'GET /:portfolioId for unknown portfolio returns HTTP 404');

    // 15. Missing workspace header (401 Unauthorized)
    const noWsRes = await fetch(`${baseUrl}/${portfolioId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    assert(noWsRes.status === 401, 'Request without x-workspace-id returns HTTP 401 Unauthorized');

    // 16. Cross-Tenant IDOR Isolation Check
    const crossTenantHeaders = {
      'x-workspace-id': 'ws-other-tenant',
      'x-user-role': 'PM',
      'x-user-id': 'usr-other-1',
      'Content-Type': 'application/json'
    };
    const idorRes = await fetch(`${baseUrl}/${portfolioId}`, {
      method: 'GET',
      headers: crossTenantHeaders
    });
    assert(idorRes.status === 404, 'Cross-tenant request cannot access other workspace portfolio (IDOR protected 404)');

    // 17. Rebalance candidate with VIEWER role (RBAC 403)
    const viewerRebRes = await fetch(`${baseUrl}/${portfolioId}/rebalance`, {
      method: 'POST',
      headers: { ...analystHeaders, 'x-user-role': 'VIEWER' },
      body: JSON.stringify({ actualHoldings: sampleActualHoldings })
    });
    assert(viewerRebRes.status === 403, 'POST /:portfolioId/rebalance with VIEWER role returns HTTP 403 Forbidden');

    // 18. Plan approval with missing planId (400)
    const badApproveRes = await fetch(`${baseUrl}/${portfolioId}/approve`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({ decision: 'APPROVE' })
    });
    assert(badApproveRes.status === 400, 'POST /:portfolioId/approve missing planId returns HTTP 400');

    // 19. Plan approval with nonexistent planId (404)
    const notFoundApproveRes = await fetch(`${baseUrl}/${portfolioId}/approve`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({ planId: 'PLAN-DOES-NOT-EXIST', decision: 'APPROVE' })
    });
    assert(notFoundApproveRes.status === 404, 'POST /:portfolioId/approve nonexistent plan returns HTTP 404');

    // 20. GET /:portfolioId/drift for portfolio
    const getDriftRes = await fetch(`${baseUrl}/${portfolioId}/drift`, {
      method: 'GET',
      headers: analystHeaders
    });
    assert(getDriftRes.status === 404 || getDriftRes.status === 200, 'GET /:portfolioId/drift returns valid HTTP status code');

    // 21. GET /:portfolioId/constraints for portfolio
    const getConstRes = await fetch(`${baseUrl}/${portfolioId}/constraints`, {
      method: 'GET',
      headers: analystHeaders
    });
    assert(getConstRes.status === 404 || getConstRes.status === 200, 'GET /:portfolioId/constraints returns valid HTTP status code');

  } catch (err) {
    console.error('HTTP Audit encountered exception:', err);
    assert(false, `Unexpected exception in HTTP audit: ${err.message}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  console.log(`\nPhase 15 Production Reality HTTP Audit Completed: ${passed} passed, ${failed} failed.`);
  return { suite: 'Phase 15 Production Reality HTTP Audit', passed, failed, total: passed + failed };
}

if (process.argv[1]?.endsWith('phase15ProductionRealityAudit.js')) {
  runPhase15ProductionRealityAudit().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
