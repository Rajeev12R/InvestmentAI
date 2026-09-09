/**
 * Phase 17 — Test Suite 6: Production Reality HTTP API Audit Test Suite
 * Tests all authenticated Express API routes under /api/tax using native HTTP server and fetch.
 */

import http from 'http';
import app from '../index.js';
import { taxRepository } from '../tax/tax.repository.js';
import { CostBasisMethod, DividendClassification } from '../tax/tax.types.js';

export async function runPhase17ProductionRealityAudit() {
  const results = [];
  let passed = 0;
  let failed = 0;

  function testAssert(condition, message) {
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

  console.log('=== PHASE 17: PRODUCTION REALITY HTTP API AUDIT ===\n');

  taxRepository.clear();

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/tax`;

  const workspaceId = 'ws-tax-http-audit';
  const otherWs = 'ws-tax-other-tenant';
  const portfolioId = 'PORT-TAX-HTTP-01';

  const pmHeaders = {
    'x-workspace-id': workspaceId,
    'x-user-role': 'PORTFOLIO_MANAGER',
    'x-user-id': 'usr-pm-1',
    'Content-Type': 'application/json'
  };

  const adminHeaders = {
    'x-workspace-id': workspaceId,
    'x-user-role': 'ADMIN',
    'x-user-id': 'usr-admin-1',
    'Content-Type': 'application/json'
  };

  const viewerHeaders = {
    'x-workspace-id': workspaceId,
    'x-user-role': 'VIEWER',
    'x-user-id': 'usr-viewer-1',
    'Content-Type': 'application/json'
  };

  try {
    // 1. Unauthenticated request rejection (401)
    const unauthRes = await fetch(`${baseUrl}/lots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ securityId: 'AAPL' })
    });
    testAssert(unauthRes.status === 401, 'POST /lots rejects unauthenticated request with 401');

    // 2. Unauthorized mutation by VIEWER (403)
    const viewerLotRes = await fetch(`${baseUrl}/lots`, {
      method: 'POST',
      headers: viewerHeaders,
      body: JSON.stringify({
        lotId: 'LOT-VIEWER-TEST',
        securityId: 'AAPL',
        accountId: portfolioId,
        acquisitionDate: '2024-01-01T00:00:00.000Z',
        acquisitionPrice: 100,
        quantity: 10,
        costBasis: 1000,
        currency: 'USD',
        source: 'BROKER',
        sourceEvidenceId: 'E1'
      })
    });
    testAssert(viewerLotRes.status === 403, 'POST /lots rejects VIEWER mutation with 403');

    // 3. Valid Tax Lot creation by PORTFOLIO_MANAGER (201)
    const createLotRes1 = await fetch(`${baseUrl}/lots`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        lotId: 'LOT-HTTP-AAPL-01',
        securityId: 'AAPL',
        accountId: portfolioId,
        acquisitionDate: '2024-01-15T00:00:00.000Z',
        acquisitionPrice: 150.0,
        quantity: 100,
        costBasis: 15000.0,
        currency: 'USD',
        source: 'BROKER_FEED',
        sourceEvidenceId: 'EVID-HTTP-01'
      })
    });
    testAssert(createLotRes1.status === 201, 'POST /lots creates valid tax lot with 201');
    const lot1Json = await createLotRes1.json();
    testAssert(lot1Json.lot && lot1Json.lot.lotHash, 'Created tax lot includes canonical lotHash');

    // 4. Create second lot
    const createLotRes2 = await fetch(`${baseUrl}/lots`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        lotId: 'LOT-HTTP-MSFT-01',
        securityId: 'MSFT',
        accountId: portfolioId,
        acquisitionDate: '2024-02-15T00:00:00.000Z',
        acquisitionPrice: 400.0,
        quantity: 50,
        costBasis: 20000.0,
        currency: 'USD',
        source: 'BROKER_FEED',
        sourceEvidenceId: 'EVID-HTTP-02'
      })
    });
    testAssert(createLotRes2.status === 201, 'POST /lots creates second tax lot with 201');

    // 5. Retrieve active lots for portfolio (200)
    const getLotsRes = await fetch(`${baseUrl}/lots/${portfolioId}`, {
      method: 'GET',
      headers: viewerHeaders
    });
    testAssert(getLotsRes.status === 200, 'GET /lots/:portfolioId returns 200 for VIEWER');
    const lotsJson = await getLotsRes.json();
    testAssert(lotsJson.count === 2, 'GET /lots/:portfolioId returns count of 2 lots');
    testAssert(lotsJson.lots.some(l => l.lotId === 'LOT-HTTP-AAPL-01'), 'Lot AAPL found in retrieval');
    testAssert(lotsJson.lots.some(l => l.lotId === 'LOT-HTTP-MSFT-01'), 'Lot MSFT found in retrieval');

    // 6. Tenant isolation: Other workspace cannot see lots (IDOR defense)
    const otherWsLots = await fetch(`${baseUrl}/lots/${portfolioId}`, {
      method: 'GET',
      headers: { ...viewerHeaders, 'x-workspace-id': otherWs }
    });
    const otherLotsJson = await otherWsLots.json();
    testAssert(otherLotsJson.count === 0, 'Cross-workspace lot isolation verified (0 lots)');

    // 7. Calculate endpoint: Missing portfolioId (400)
    const calcMissingPort = await fetch(`${baseUrl}/calculate`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({ asOf: '2024-06-01T00:00:00.000Z' })
    });
    testAssert(calcMissingPort.status === 400, 'POST /calculate rejects missing portfolioId with 400');

    // 8. Calculate endpoint: Full valid evaluation (200)
    const calcRes = await fetch(`${baseUrl}/calculate`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        portfolioId,
        asOf: '2024-06-01T00:00:00.000Z',
        jurisdiction: 'US',
        accountType: 'TAXABLE',
        currentPrices: { AAPL: 180.0, MSFT: 450.0 },
        portfolioValue: 100000,
        preTaxTwr: 0.12,
        preTaxMwr: 0.11,
        currentWeights: { AAPL: 0.45, MSFT: 0.55 },
        targetWeights: { AAPL: 0.30, MSFT: 0.70 },
        expectedReturns: { AAPL: 0.09, MSFT: 0.11 },
        volatilities: { AAPL: 0.20, MSFT: 0.18 }
      })
    });
    testAssert(calcRes.status === 200, 'POST /calculate returns sealed package with 200');
    const calcJson = await calcRes.json();
    testAssert(calcJson.packageHash !== undefined, 'Package contains SHA-256 packageHash');
    testAssert(calcJson.isExecuted === false, 'Package maintains invariant isExecuted=false');
    testAssert(calcJson.unrealizedGains !== null, 'Package contains unrealized gains');
    testAssert(calcJson.taxDrag !== null, 'Package contains tax drag calculation');
    const packageId = calcJson.packageId;

    // 9. Retrieve sealed package by ID (200)
    const getPkgRes = await fetch(`${baseUrl}/package/${packageId}`, {
      method: 'GET',
      headers: viewerHeaders
    });
    testAssert(getPkgRes.status === 200, 'GET /package/:packageId returns 200');
    const pkgJson = await getPkgRes.json();
    testAssert(pkgJson.packageHash === calcJson.packageHash, 'Retrieved package hash matches sealed hash');

    // 10. Retrieve latest package by portfolioId (200)
    const getPortPkgRes = await fetch(`${baseUrl}/${portfolioId}`, {
      method: 'GET',
      headers: viewerHeaders
    });
    testAssert(getPortPkgRes.status === 200, 'GET /:portfolioId returns latest package with 200');

    // 11. Retrieve after-tax performance breakdown (200)
    const getAfterTaxRes = await fetch(`${baseUrl}/${portfolioId}/after-tax`, {
      method: 'GET',
      headers: viewerHeaders
    });
    testAssert(getAfterTaxRes.status === 200, 'GET /:portfolioId/after-tax returns 200');
    const afterTaxJson = await getAfterTaxRes.json();
    testAssert(afterTaxJson.afterTaxTwr !== undefined, 'After-tax TWR present in breakdown');

    // 12. Retrieve tax drag breakdown (200)
    const getTaxDragRes = await fetch(`${baseUrl}/${portfolioId}/tax-drag`, {
      method: 'GET',
      headers: viewerHeaders
    });
    testAssert(getTaxDragRes.status === 200, 'GET /:portfolioId/tax-drag returns 200');
    const taxDragJson = await getTaxDragRes.json();
    testAssert(taxDragJson.taxDrag !== undefined, 'Tax drag scalar present in breakdown');

    // 13. Evaluate harvesting candidates via POST /harvesting (200)
    const harvestRes = await fetch(`${baseUrl}/harvesting`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        openLots: [{ lotId: 'LOT-L1', securityId: 'TSLA', acquisitionDate: '2023-01-01T00:00:00.000Z', acquisitionPrice: 300, quantity: 100, costBasis: 30000 }],
        currentPrices: { TSLA: 150 },
        asOf: '2024-06-01T00:00:00.000Z',
        jurisdiction: 'US',
        accountType: 'TAXABLE'
      })
    });
    testAssert(harvestRes.status === 200, 'POST /harvesting returns 200');
    const harvestJson = await harvestRes.json();
    testAssert(harvestJson.candidateCount === 1, 'Harvesting finds 1 loss candidate');

    // 14. Evaluate tax-aware rebalancing via POST /rebalance (200)
    const rebRes = await fetch(`${baseUrl}/rebalance`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        portfolioId,
        currentWeights: { AAPL: 0.15, MSFT: 0.85 },
        targetWeights: { AAPL: 0.05, MSFT: 0.95 },
        currentPrices: { AAPL: 180, MSFT: 450 },
        portfolioValue: 50000,
        constraints: { maxPositionWeight: 0.98 },
        openLotsBySecurity: {
          AAPL: [{ lotId: 'LOT-HTTP-AAPL-01', securityId: 'AAPL', acquisitionDate: '2024-01-15T00:00:00.000Z', acquisitionPrice: 150, quantity: 100, costBasis: 15000 }]
        },
        expectedReturns: { AAPL: 0.09, MSFT: 0.11 },
        volatilities: { AAPL: 0.20, MSFT: 0.18 },
        asOf: '2024-06-01T00:00:00.000Z',
        jurisdiction: 'US',
        accountType: 'TAXABLE'
      })
    });
    testAssert(rebRes.status === 200, 'POST /rebalance returns 200');
    const rebJson = await rebRes.json();
    testAssert(rebJson.decision !== undefined, 'Rebalance decision emitted');
    testAssert(rebJson.taxSavings !== undefined, 'Rebalance tax savings emitted');

    // 15. Evaluate scenarios via POST /scenario (200)
    const scenRes = await fetch(`${baseUrl}/scenario`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        portfolioId,
        currentWeights: { AAPL: 0.15, MSFT: 0.85 },
        targetWeights: { AAPL: 0.05, MSFT: 0.95 },
        currentPrices: { AAPL: 180, MSFT: 450 },
        portfolioValue: 50000,
        constraints: { maxPositionWeight: 0.98 },
        expectedReturns: { AAPL: 0.09, MSFT: 0.11 },
        volatilities: { AAPL: 0.20, MSFT: 0.18 },
        asOf: '2024-06-01T00:00:00.000Z',
        jurisdiction: 'US',
        accountType: 'TAXABLE'
      })
    });
    testAssert(scenRes.status === 200, 'POST /scenario returns 200');
    const scenJson = await scenRes.json();
    testAssert(scenJson.scenarios && scenJson.scenarios.length === 5, 'Scenario response contains Scenarios A–E');

    // 16. Create policy by ADMIN (201)
    const createPolRes = await fetch(`${baseUrl}/policy`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        policyId: 'TAX_POLICY_CUSTOM_01',
        name: 'Custom Institutional Tax Policy',
        effectiveFrom: '2024-01-01T00:00:00.000Z'
      })
    });
    testAssert(createPolRes.status === 201, 'POST /policy creates policy with 201 for ADMIN');

    // 17. Retrieve policy by ID (200)
    const getPolRes = await fetch(`${baseUrl}/policy/TAX_POLICY_CUSTOM_01`, {
      method: 'GET',
      headers: viewerHeaders
    });
    testAssert(getPolRes.status === 200, 'GET /policy/:policyId returns 200');

    // 18. Retrieve policy history (200)
    const getPolHistRes = await fetch(`${baseUrl}/policy/TAX_POLICY_CUSTOM_01/history`, {
      method: 'GET',
      headers: viewerHeaders
    });
    testAssert(getPolHistRes.status === 200, 'GET /policy/:policyId/history returns 200');

    // 19. Retrieve audit logs for portfolio (200)
    const getAuditRes = await fetch(`${baseUrl}/${portfolioId}/audit`, {
      method: 'GET',
      headers: viewerHeaders
    });
    testAssert(getAuditRes.status === 200, 'GET /:portfolioId/audit returns 200');
    const auditJson = await getAuditRes.json();
    testAssert(auditJson.count > 0, 'Audit records returned');

    // 20. Copilot read-only explanation (200)
    const explainRes = await fetch(`${baseUrl}/explain`, {
      method: 'POST',
      headers: viewerHeaders,
      body: JSON.stringify({
        portfolioId,
        query: 'What is my tax drag?'
      })
    });
    testAssert(explainRes.status === 200, 'POST /explain returns 200');
    const expJson = await explainRes.json();
    testAssert(expJson.explanation.includes('tax drag'), 'Copilot explanation contains tax drag analysis');
    testAssert(expJson.disclaimer.includes('does not provide tax or legal advice'), 'Copilot explanation contains disclaimer');

    // 21. Non-existent package lookup (404)
    const notFoundPkg = await fetch(`${baseUrl}/package/PKG-NONEXISTENT`, {
      method: 'GET',
      headers: viewerHeaders
    });
    testAssert(notFoundPkg.status === 404, 'GET /package/PKG-NONEXISTENT returns 404');

    // 22. Non-existent policy lookup (404)
    const notFoundPol = await fetch(`${baseUrl}/policy/POL-NONEXISTENT`, {
      method: 'GET',
      headers: viewerHeaders
    });
    testAssert(notFoundPol.status === 404, 'GET /policy/POL-NONEXISTENT returns 404');

    // 23. Cross-workspace package access (404 / IDOR defense)
    const otherWsPkg = await fetch(`${baseUrl}/package/${packageId}`, {
      method: 'GET',
      headers: { ...viewerHeaders, 'x-workspace-id': otherWs }
    });
    testAssert(otherWsPkg.status === 404, 'Cross-workspace package retrieval rejected with 404');

    // 24. Rebalance with invalid side / bad price (400)
    const badRebRes = await fetch(`${baseUrl}/rebalance`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        portfolioId,
        currentWeights: { AAPL: 0.50 },
        targetWeights: { AAPL: 0.00 },
        currentPrices: { AAPL: -50 }, // Invalid price
        portfolioValue: 100000,
        asOf: '2024-06-01T00:00:00.000Z'
      })
    });
    testAssert(badRebRes.status === 400, 'POST /rebalance with invalid price returns 400');

    // 25. Policy creation by VIEWER (403)
    const viewerPolRes = await fetch(`${baseUrl}/policy`, {
      method: 'POST',
      headers: viewerHeaders,
      body: JSON.stringify({ policyId: 'P_VIEWER', name: 'Viewer Pol', effectiveFrom: '2024-01-01T00:00:00.000Z' })
    });
    testAssert(viewerPolRes.status === 403, 'POST /policy rejects VIEWER with 403');

    // 26. Explain without package or portfolio (404)
    const noPkgExplain = await fetch(`${baseUrl}/explain`, {
      method: 'POST',
      headers: viewerHeaders,
      body: JSON.stringify({ query: 'Explain' })
    });
    testAssert(noPkgExplain.status === 404, 'POST /explain without target package returns 404');

    // 27. Missing parameters in POST /lots (400)
    const badLotRes = await fetch(`${baseUrl}/lots`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({ securityId: 'AAPL' })
    });
    testAssert(badLotRes.status === 400, 'POST /lots with missing required fields returns 400');

    // 28. Scenario route with empty portfolioId (400)
    const badScenRes = await fetch(`${baseUrl}/scenario`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({})
    });
    testAssert(badScenRes.status === 400, 'POST /scenario without portfolioId returns 400');

    // 29. After-tax query for non-existent portfolio (404)
    const nonExistentAfterTax = await fetch(`${baseUrl}/PORT-NONEXISTENT/after-tax`, {
      method: 'GET',
      headers: viewerHeaders
    });
    testAssert(nonExistentAfterTax.status === 404, 'GET /:nonExistent/after-tax returns 404');

    // 30. Tax drag query for non-existent portfolio (404)
    const nonExistentTaxDrag = await fetch(`${baseUrl}/PORT-NONEXISTENT/tax-drag`, {
      method: 'GET',
      headers: viewerHeaders
    });
    testAssert(nonExistentTaxDrag.status === 404, 'GET /:nonExistent/tax-drag returns 404');

    // 31. Harvesting with missing prices (400)
    const badHarvestRes = await fetch(`${baseUrl}/harvesting`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        openLots: [{ lotId: 'L1', securityId: 'AAPL', quantity: 10, acquisitionPrice: 100, costBasis: 1000, acquisitionDate: '2024-01-01T00:00:00.000Z' }],
        currentPrices: null,
        asOf: '2024-06-01T00:00:00.000Z'
      })
    });
    testAssert(badHarvestRes.status === 400, 'POST /harvesting with missing prices returns 400');

    // 32. Additional HTTP assertion: Check package proof
    testAssert(calcJson.evidenceGraph && calcJson.evidenceGraph.nodes.length > 0, 'Package includes valid explanation DAG');

    // 33. Additional HTTP assertion: Check scenario ranking
    testAssert(scenJson.preferredScenario !== undefined, 'Scenario includes preferred scenario classification');

    // 34. Additional HTTP assertion: Audit log portfolio match
    testAssert(auditJson.auditLogs.every(l => l.portfolioId === portfolioId), 'All audit logs belong to requested portfolio');

    // 35. Additional HTTP assertion: Policy version history
    const polHistJson = await getPolHistRes.json();
    testAssert(polHistJson.versions.length >= 2, 'Policy history returns version chain');

    // 36. Additional HTTP assertion: Check lot count in calculate response
    testAssert(calcJson.taxLots.length === 2, 'Package taxLots contains 2 registered lots');

    // 37. Additional HTTP assertion: Check account type preservation
    testAssert(calcJson.taxAccountContext.accountType === 'TAXABLE', 'Account type preserved in package');

    // 38. Additional HTTP assertion: Check jurisdiction in package
    testAssert(calcJson.jurisdiction === 'US', 'Jurisdiction preserved in package');

    // 39. Additional HTTP assertion: Explain rebalance query
    const rebExpRes = await fetch(`${baseUrl}/explain`, {
      method: 'POST',
      headers: viewerHeaders,
      body: JSON.stringify({ portfolioId, query: 'rebalance strategy' })
    });
    const rebExpJson = await rebExpRes.json();
    testAssert(rebExpJson.explanation.includes('rebalance'), 'Copilot explanation addresses rebalancing');

    // 40. Additional HTTP assertion: Explain harvest query
    const hrvExpRes = await fetch(`${baseUrl}/explain`, {
      method: 'POST',
      headers: viewerHeaders,
      body: JSON.stringify({ portfolioId, query: 'harvest candidates' })
    });
    const hrvExpJson = await hrvExpRes.json();
    testAssert(hrvExpJson.explanation.includes('harvesting'), 'Copilot explanation addresses harvesting');

    // 41. Additional HTTP assertion: IDOR defense on audit trail
    const otherAuditRes = await fetch(`${baseUrl}/${portfolioId}/audit`, {
      method: 'GET',
      headers: { ...viewerHeaders, 'x-workspace-id': otherWs }
    });
    const otherAuditJson = await otherAuditRes.json();
    testAssert(otherAuditJson.count === 0, 'Other workspace cannot view audit trail (IDOR defense)');

  } finally {
    server.close();
  }

  console.log(`\n=== PHASE 17 HTTP AUDIT COMPLETED: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) throw new Error(`${failed} HTTP assertions failed`);
  return { passed, failed, results };
}

// Run if executed directly
if (process.argv[1]?.endsWith('phase17ProductionRealityAudit.js')) {
  runPhase17ProductionRealityAudit().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
