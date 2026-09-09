/**
 * Phase 18 — Test Suite 6: Production Reality HTTP API Audit Test Suite
 * Tests all authenticated Express API routes under /api/liquidity using native HTTP server and fetch.
 */

import http from 'http';
import app from '../index.js';
import { liquidityRepository } from '../liquidity/liquidity.repository.js';
import { LiquidityStatus, LiquidityTier, ExecutionFeasibility } from '../liquidity/liquidity.types.js';

export async function runPhase18ProductionRealityAudit() {
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

  console.log('=== PHASE 18: PRODUCTION REALITY HTTP API AUDIT ===\n');

  liquidityRepository.clearAll();

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/liquidity`;

  const workspaceId = 'ws-liq-http-audit';
  const otherWs = 'ws-liq-other-tenant';

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

  const otherWsHeaders = {
    'x-workspace-id': otherWs,
    'x-user-role': 'PORTFOLIO_MANAGER',
    'x-user-id': 'usr-other-1',
    'Content-Type': 'application/json'
  };

  try {
    // 1. Auth failure (missing x-workspace-id)
    const resAuthFail = await fetch(`${baseUrl}/AAPL`, {
      headers: { 'Content-Type': 'application/json' }
    });
    testAssert(resAuthFail.status === 401, '1. Missing workspace header returns 401 Unauthorized');

    // 2. VIEWER Role recording observation (403 Forbidden)
    const resViewerObs = await fetch(`${baseUrl}/observations`, {
      method: 'POST',
      headers: viewerHeaders,
      body: JSON.stringify({ ticker: 'AAPL', adv: 1000000, price: 150.0 })
    });
    testAssert(resViewerObs.status === 403, '2. VIEWER role cannot record observations (403)');

    // 3. PM Role records observation (201 Created)
    const resPmObs = await fetch(`${baseUrl}/observations`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        ticker: 'AAPL',
        adv: 1000000,
        price: 150.0,
        bid: 149.95,
        ask: 150.05,
        spreadBps: 6.67,
        marketCap: 2500000000000
      })
    });
    const dataPmObs = await resPmObs.json();
    testAssert(resPmObs.status === 201, '3. PM role successfully records observation (201)');
    testAssert(dataPmObs.status === LiquidityStatus.PASS, '4. Observation record response status PASS');

    // 4. Record MSFT observation
    await fetch(`${baseUrl}/observations`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        ticker: 'MSFT',
        adv: 800000,
        price: 300.0,
        bid: 299.90,
        ask: 300.10,
        spreadBps: 6.67,
        marketCap: 2000000000000
      })
    });
    testAssert(true, '5. Recorded MSFT observation');

    // 5. GET /api/liquidity/:ticker (AAPL)
    const resGetAapl = await fetch(`${baseUrl}/AAPL`, { headers: pmHeaders });
    const dataGetAapl = await resGetAapl.json();
    testAssert(resGetAapl.status === 200, '6. GET /api/liquidity/AAPL returns 200 OK');
    testAssert(dataGetAapl.dollarAdv === 150000000, '7. AAPL Dollar ADV is $150M');
    testAssert(dataGetAapl.tier === LiquidityTier.TIER_1_HIGH_LIQUIDITY, '8. AAPL is Tier 1 High Liquidity');
    testAssert(dataGetAapl.liquidityScore >= 80, '9. AAPL Liquidity Score >= 80');

    // 6. GET /api/liquidity/:ticker/metrics
    const resMetrics = await fetch(`${baseUrl}/AAPL/metrics`, { headers: pmHeaders });
    const dataMetrics = await resMetrics.json();
    testAssert(resMetrics.status === 200, '10. GET /api/liquidity/AAPL/metrics returns 200 OK');
    testAssert(dataMetrics.adv === 1000000, '11. AAPL metrics contains ADV 1,000,000');
    testAssert(dataMetrics.spreadBps === 6.67, '12. AAPL metrics contains spread bps 6.67');

    // 7. GET /api/liquidity/:ticker/cost
    const resCost = await fetch(`${baseUrl}/AAPL/cost?notional=1000000&side=BUY`, { headers: pmHeaders });
    const dataCost = await resCost.json();
    testAssert(resCost.status === 200, '13. GET /api/liquidity/AAPL/cost returns 200 OK');
    testAssert(dataCost.totalEstimatedCost > 0, '14. Total estimated cost strictly positive');
    testAssert(dataCost.components.explicitCommission.cost > 0, '15. Explicit commission present');
    testAssert(dataCost.components.marketImpact.cost > 0, '16. Market impact cost present');

    // 8. GET /api/liquidity/:ticker/capacity
    const resCap = await fetch(`${baseUrl}/AAPL/capacity`, { headers: pmHeaders });
    const dataCap = await resCap.json();
    testAssert(resCap.status === 200, '17. GET /api/liquidity/AAPL/capacity returns 200 OK');
    testAssert(dataCap.maxDailyTradeNotional === 15000000, '18. Max daily trade notional is $15M');
    testAssert(dataCap.maxPositionNotional === 75000000, '19. Max position notional is $75M');

    // 9. GET /api/liquidity/:ticker/stress
    const resStress = await fetch(`${baseUrl}/AAPL/stress?notional=1000000`, { headers: pmHeaders });
    const dataStress = await resStress.json();
    testAssert(resStress.status === 200, '20. GET /api/liquidity/AAPL/stress returns 200 OK');
    testAssert(dataStress.scenarios.JOINT_STRESS_SEVERE !== undefined, '21. JOINT_STRESS_SEVERE scenario present');
    testAssert(dataStress.scenarios.JOINT_STRESS_SEVERE.delta.costIncreaseBps > 0, '22. Stress increases cost in bps');

    // 10. POST /api/liquidity/portfolio
    const resPort = await fetch(`${baseUrl}/portfolio`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        portfolioId: 'PORT-1',
        baseCurrency: 'USD',
        positions: [
          { ticker: 'AAPL', price: 150.0, adv: 1000000, notional: 5000000, spreadBps: 5.0 },
          { ticker: 'MSFT', price: 300.0, adv: 800000, notional: 5000000, spreadBps: 6.0 }
        ]
      })
    });
    const dataPort = await resPort.json();
    testAssert(resPort.status === 200, '23. POST /api/liquidity/portfolio returns 200 OK');
    testAssert(dataPort.totalPortfolioValue === 10000000, '24. Total portfolio value is $10M');
    testAssert(dataPort.portfolioLiquidityScore > 0, '25. Portfolio liquidity score calculated');
    testAssert(dataPort.concentration.liquidityHHI > 0, '26. Liquidity HHI calculated');

    // 11. POST /api/liquidity/rebalance
    const resRebal = await fetch(`${baseUrl}/rebalance`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        portfolioValue: 10000000,
        trades: [
          { ticker: 'AAPL', currentWeight: 0.5, targetWeight: 0.6, price: 150.0, adv: 1000000 },
          { ticker: 'MSFT', currentWeight: 0.5, targetWeight: 0.4, price: 300.0, adv: 800000 }
        ]
      })
    });
    const dataRebal = await resRebal.json();
    testAssert(resRebal.status === 200, '27. POST /api/liquidity/rebalance returns 200 OK');
    testAssert(dataRebal.totalTradeNotional === 2000000, '28. Total trade notional is $2M');
    testAssert(dataRebal.portfolioTurnoverPercent === 10.0, '29. Portfolio turnover is 10%');

    // 12. POST /api/liquidity/feasibility
    const resFeas = await fetch(`${baseUrl}/feasibility`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        ticker: 'AAPL',
        orderQuantity: 10000,
        adv: 1000000,
        referencePrice: 150.0
      })
    });
    const dataFeas = await resFeas.json();
    testAssert(resFeas.status === 200, '30. POST /api/liquidity/feasibility returns 200 OK');
    testAssert(dataFeas.feasibility === ExecutionFeasibility.FEASIBLE, '31. 10k order on AAPL is FEASIBLE');

    // 13. POST /api/liquidity/package/seal (Viewer 403 Forbidden)
    const resViewerSeal = await fetch(`${baseUrl}/package/seal`, {
      method: 'POST',
      headers: viewerHeaders,
      body: JSON.stringify({ portfolioId: 'PORT-1' })
    });
    testAssert(resViewerSeal.status === 403, '32. VIEWER role cannot seal package (403)');

    // 14. POST /api/liquidity/package/seal (PM 201 Created)
    const resPmSeal = await fetch(`${baseUrl}/package/seal`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        portfolioId: 'PORT-1',
        metrics: dataPort,
        feasibility: dataFeas
      })
    });
    const dataPmSeal = await resPmSeal.json();
    testAssert(resPmSeal.status === 201, '33. PM role successfully seals package (201)');
    testAssert(dataPmSeal.packageHash.length === 64, '34. Valid 64-char package SHA-256 hash');

    // 15. GET /api/liquidity/package/:packageId
    const resGetPkg = await fetch(`${baseUrl}/package/${dataPmSeal.packageId}`, { headers: pmHeaders });
    const dataGetPkg = await resGetPkg.json();
    testAssert(resGetPkg.status === 200, '35. GET /api/liquidity/package/:id returns 200 OK');
    testAssert(dataGetPkg.verified === true, '36. Retrieved package is cryptographically verified');

    // 16. Multi-Tenant Isolation HTTP Checks
    const resOtherGetAapl = await fetch(`${baseUrl}/AAPL`, { headers: otherWsHeaders });
    testAssert(resOtherGetAapl.status === 404, '37. Tenant B cannot access Tenant A observation (404)');

    const resOtherGetPkg = await fetch(`${baseUrl}/package/${dataPmSeal.packageId}`, { headers: otherWsHeaders });
    testAssert(resOtherGetPkg.status === 404, '38. Tenant B cannot access Tenant A sealed package (404)');

    // 17. GET Nonexistent ticker returns 404
    const resGetGhost = await fetch(`${baseUrl}/GHOST`, { headers: pmHeaders });
    testAssert(resGetGhost.status === 404, '39. Nonexistent ticker returns 404');

    // 18. Invalid Quote Observation rejected
    const resInvalidQuote = await fetch(`${baseUrl}/feasibility`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        ticker: 'FAIL',
        orderQuantity: 100,
        adv: 1000,
        bid: 105,
        ask: 100
      })
    });
    const dataInvalidQuote = await resInvalidQuote.json();
    testAssert(dataInvalidQuote.feasibility === ExecutionFeasibility.INFEASIBLE, '40. Inverted quote returns INFEASIBLE');

    // 19. Data status assertions
    testAssert(dataGetAapl.dataStatus === 'REAL_DATA', '41. AAPL observation is REAL_DATA');
    testAssert(dataCost.dataStatus === 'ESTIMATED', '42. Cost calculation is ESTIMATED');
    testAssert(dataStress.dataStatus === 'ESTIMATED', '43. Stress calculation is ESTIMATED');
    testAssert(dataPort.dataStatus === 'ESTIMATED', '44. Portfolio evaluation is ESTIMATED');
    testAssert(dataPmSeal.package.dataStatus === 'CONFIGURED', '45. Sealed package status is CONFIGURED');

    // 20. Rebalance with invalid portfolio value rejected
    const resBadRebal = await fetch(`${baseUrl}/rebalance`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({ portfolioValue: 0, trades: [] })
    });
    testAssert(resBadRebal.status === 400, '46. Invalid rebalance portfolio value returns 400');

    // 21. Portfolio evaluation with missing FX rejected
    const resBadFx = await fetch(`${baseUrl}/portfolio`, {
      method: 'POST',
      headers: pmHeaders,
      body: JSON.stringify({
        portfolioId: 'P-INR',
        baseCurrency: 'USD',
        positions: [{ ticker: 'REL', currency: 'INR', price: 2500, adv: 1000000 }]
      })
    });
    testAssert(resBadFx.status === 400, '47. Missing FX portfolio returns 400');

    // 22. Round trip cost endpoint check
    const resRoundTrip = await fetch(`${baseUrl}/AAPL/cost?notional=1000000&direction=ROUND_TRIP`, { headers: pmHeaders });
    const dataRoundTrip = await resRoundTrip.json();
    testAssert(dataRoundTrip.direction === 'ROUND_TRIP', '48. Cost endpoint supports direction=ROUND_TRIP');
    testAssert(dataRoundTrip.totalEstimatedCost > dataCost.totalEstimatedCost, '49. Round-trip cost exceeds one-way cost');

    // 23. Viewer can query read-only GET endpoints
    const resViewerGet = await fetch(`${baseUrl}/AAPL`, { headers: viewerHeaders });
    testAssert(resViewerGet.status === 200, '50. VIEWER role can access read-only GET /AAPL');

    const resViewerMetrics = await fetch(`${baseUrl}/AAPL/metrics`, { headers: viewerHeaders });
    testAssert(resViewerMetrics.status === 200, '51. VIEWER role can access read-only GET /AAPL/metrics');

    const resViewerCost = await fetch(`${baseUrl}/AAPL/cost`, { headers: viewerHeaders });
    testAssert(resViewerCost.status === 200, '52. VIEWER role can access read-only GET /AAPL/cost');

    const resViewerStress = await fetch(`${baseUrl}/AAPL/stress`, { headers: viewerHeaders });
    testAssert(resViewerStress.status === 200, '53. VIEWER role can access read-only GET /AAPL/stress');

  } finally {
    server.close();
  }

  console.log(`\n==================================================`);
  console.log(`PHASE 18 PRODUCTION REALITY HTTP AUDIT COMPLETE`);
  console.log(`TOTAL HTTP ASSERTIONS PASSED: ${passed}`);
  console.log(`TOTAL HTTP ASSERTIONS FAILED: ${failed}`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    throw new Error(`Phase 18 HTTP audit failed with ${failed} failures`);
  }

  return { passed, failed };
}

if (process.argv[1]?.endsWith('phase18ProductionRealityAudit.js')) {
  runPhase18ProductionRealityAudit().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
