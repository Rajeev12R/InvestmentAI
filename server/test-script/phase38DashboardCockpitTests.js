/**
 * @file phase38DashboardCockpitTests.js
 * Test Suite for Phase 38 Institutional Dashboard & Intelligence Cockpit.
 */

import http from 'http';
import app from '../index.js';
import { portfolioRepository } from '../portfolio/portfolio.repository.js';
import { decisionWorkbenchRepository } from '../decision/decisionWorkbench.repository.js';
import { DashboardEngine } from '../dashboard/dashboard.engine.js';
import { computeDashboardHash, MetricFreshness, MetricStatus, AttentionSeverity, DomainStatus } from '../dashboard/dashboard.types.js';

let server;
let serverPort;

function rawRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: serverPort,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

export async function runPhase38DashboardCockpitTests() {
  console.log('================================================================');
  console.log('INVESTMENTAI — PHASE 38 DASHBOARD & COCKPIT VERIFICATION');
  console.log('================================================================\n');

  let passedAssertions = 0;
  let failedAssertions = 0;

  function check(label, condition) {
    if (condition) {
      console.log(`  ✓ [PASS] ${label}`);
      passedAssertions++;
    } else {
      console.error(`  ✗ [FAIL] ${label}`);
      failedAssertions++;
      throw new Error(`Assertion failed: ${label}`);
    }
  }

  try {
    // 1. Obtain Auth Token for Root Admin
    console.log('Running Section 1: Dashboard Overview Aggregation & Data Contracts...');
    const loginRes = await rawRequest('POST', '/api/auth/login', {
      email: 'admin@investmentai.local',
      password: 'Admin123!Secure'
    });

    check('S1.1: Root Admin login succeeds with token', loginRes.status === 200 && (loginRes.body.token || loginRes.body.session?.token));
    const token = loginRes.body.token || loginRes.body.session?.token;
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'x-org-id': 'ORG-ROOT-001',
      'x-workspace-id': 'WS-DEFAULT-001'
    };

    const overviewRes = await rawRequest('GET', '/api/dashboard/overview?workspaceId=WS-DEFAULT-001', null, authHeaders);

    check('S1.2: GET /api/dashboard/overview returns 200', overviewRes.status === 200);
    const overview = overviewRes.body.data;
    check('S1.3: Overview contains correct workspaceId', overview && overview.workspaceId === 'WS-DEFAULT-001');
    check('S1.4: Overview freshness is FRESH', overview.freshness === MetricFreshness.FRESH);

    // Verify Data Contracts for Top Metrics
    const tm = overview.topMetrics;
    check('S1.5: totalAum adheres to metric contract', tm.totalAum && tm.totalAum.value > 0 && tm.totalAum.asOf && tm.totalAum.freshness);
    check('S1.6: annualizedVolatility adheres to metric contract', tm.annualizedVolatility && tm.annualizedVolatility.value > 0 && tm.annualizedVolatility.source);
    check('S1.7: parametricVaR95 adheres to metric contract', tm.parametricVaR95 && tm.parametricVaR95.value > 0 && tm.parametricVaR95.unit === 'USD');
    check('S1.8: complianceStatus adheres to metric contract', tm.complianceStatus && tm.complianceStatus.value && tm.complianceStatus.status);
    check('S1.9: attentionCount adheres to metric contract', tm.attentionCount && typeof tm.attentionCount.value === 'number');

    // 2. Portfolio Universe Summary & Comparison
    console.log('Running Section 2: Portfolio Universe Aggregation & Comparison...');
    const portRes = await rawRequest('GET', '/api/dashboard/portfolios?workspaceId=WS-DEFAULT-001', null, authHeaders);

    check('S2.1: GET /api/dashboard/portfolios returns 200', portRes.status === 200);
    const universe = portRes.body.data;
    check('S2.2: Portfolio universe domain status is HEALTHY', universe.domainStatus === DomainStatus.HEALTHY);
    check('S2.3: Universe contains at least 1 portfolio', Array.isArray(universe.portfolios) && universe.portfolios.length >= 1);
    
    const port0 = universe.portfolios[0];
    check('S2.4: Default portfolio retrieved correctly', port0.portfolioId === 'PORT-DEFAULT-001');
    check('S2.5: Portfolio AUM is $10M', port0.aum && port0.aum.value === 10000000);
    check('S2.6: Portfolio YTD return metric present', port0.returnYTD && port0.returnYTD.value > 0);
    check('S2.7: Portfolio volatility metric present', port0.annualizedVolatility && port0.annualizedVolatility.value > 0);
    check('S2.8: Portfolio includes pending decisions count', typeof port0.pendingDecisionsCount === 'number');

    // 3. Risk & Exposure Aggregation
    console.log('Running Section 3: Risk & Exposure Aggregation...');
    const riskRes = await rawRequest('GET', '/api/dashboard/risk?workspaceId=WS-DEFAULT-001', null, authHeaders);

    check('S3.1: GET /api/dashboard/risk returns 200', riskRes.status === 200);
    const riskExp = riskRes.body.data;
    check('S3.2: Risk metrics include Volatility and VaR 95', riskExp.risk && riskExp.risk.annualizedVolatility && riskExp.risk.parametricVaR95);
    check('S3.3: Risk metrics include VaR 99 and ES 95', riskExp.risk.parametricVaR99 && riskExp.risk.expectedShortfall95);
    check('S3.4: Top risk contributors array present', Array.isArray(riskExp.risk.topRiskContributors) && riskExp.risk.topRiskContributors.length >= 1);
    check('S3.5: Exposure contains HHI and N_eff metrics', riskExp.exposure && riskExp.exposure.hhi && riskExp.exposure.nEff);
    check('S3.6: Sector breakdown present', riskExp.exposure.sectorBreakdown && Object.keys(riskExp.exposure.sectorBreakdown).length >= 1);

    // 4. Material Attention Engine
    console.log('Running Section 4: Material Attention Engine & Action Cards...');
    const attnRes = await rawRequest('GET', '/api/dashboard/attention?workspaceId=WS-DEFAULT-001', null, authHeaders);

    check('S4.1: GET /api/dashboard/attention returns 200', attnRes.status === 200);
    const attn = attnRes.body.data;
    check('S4.2: Attention items array populated', Array.isArray(attn.items) && attn.items.length >= 1);
    const attn0 = attn.items[0];
    check('S4.3: Attention item contains what and why explanations', attn0.id && attn0.what && attn0.why);
    check('S4.4: Attention item has valid severity', attn0.severity && [AttentionSeverity.CRITICAL, AttentionSeverity.ACTION_REQUIRED, AttentionSeverity.ATTENTION, AttentionSeverity.INFORMATION].includes(attn0.severity));
    check('S4.5: Attention item provides recommended next action and action URL', attn0.recommendedNextAction && attn0.actionUrl);

    // 5. Decision Queue Integration
    console.log('Running Section 5: Decision Queue Integration (Phase 37)...');
    const decRes = await rawRequest('GET', '/api/dashboard/decisions?workspaceId=WS-DEFAULT-001', null, authHeaders);

    check('S5.1: GET /api/dashboard/decisions returns 200', decRes.status === 200);
    const decData = decRes.body.data;
    check('S5.2: Decision queue is an array', Array.isArray(decData.queue));
    check('S5.3: Decision counts breakdown present', decData.counts && typeof decData.counts.totalActive === 'number');
    check('S5.4: Pending review count present', typeof decData.counts.pendingReview === 'number');

    // 6. Governance & Compliance Semantics
    console.log('Running Section 6: Governance & Compliance Semantics...');
    const compRes = await rawRequest('GET', '/api/dashboard/compliance?workspaceId=WS-DEFAULT-001', null, authHeaders);

    check('S6.1: GET /api/dashboard/compliance returns 200', compRes.status === 200);
    const compData = compRes.body.data;
    check('S6.2: Compliance status is strict valid state', ['COMPLIANT', 'WARNING', 'BREACHED'].includes(compData.status));
    check('S6.3: Evaluated at least 18 hard mandate rules', compData.rulesEvaluatedCount >= 18);

    // 7. "What Changed?" Intelligence Feed
    console.log('Running Section 7: "What Changed?" Delta Feed...');
    const chgRes = await rawRequest('GET', '/api/dashboard/changes?workspaceId=WS-DEFAULT-001', null, authHeaders);

    check('S7.1: GET /api/dashboard/changes returns 200', chgRes.status === 200);
    const chgData = chgRes.body.data;
    check('S7.2: Changes feed contains synthesized delta events', Array.isArray(chgData.changes) && chgData.changes.length >= 1);
    check('S7.3: Change event has headline and domain', chgData.changes[0].headline && chgData.changes[0].domain);

    // 8. Strict Multi-Tenant Isolation & Anti-IDOR
    console.log('Running Section 8: Strict Multi-Tenant Isolation & Anti-IDOR...');
    // Seed a Tenant B portfolio
    portfolioRepository.createPortfolio({
      portfolioId: 'PORT-TENANT-B-999',
      orgId: 'ORG-TENANT-B',
      workspaceId: 'WS-TENANT-B-001',
      name: 'Tenant B Private Fund',
      strategy: 'ARBITRAGE',
      type: 'MULTI_ASSET',
      ownerId: 'USR-TENANT-B-001',
      aum: 50000000,
      holdings: [{ ticker: 'TSLA', weight: 1.0, marketValue: 50000000 }]
    });

    const tenantAOverview = await rawRequest('GET', '/api/dashboard/overview?workspaceId=WS-DEFAULT-001', null, authHeaders);

    const tenantAPorts = tenantAOverview.body.data.universe.portfolios;
    const leakedPort = tenantAPorts.find(p => p.portfolioId === 'PORT-TENANT-B-999');
    check('S8.1: Tenant A dashboard never includes Tenant B portfolio', !leakedPort);
    check('S8.2: Tenant A total AUM never aggregates Tenant B AUM ($50M excluded)', tenantAOverview.body.data.topMetrics.totalAum.value === 15000000);

    // 9. Concurrency & Deterministic Replay
    console.log('Running Section 9: Concurrency & Deterministic Replay...');
    const concurrentCalls = Array.from({ length: 50 }, () =>
      rawRequest('GET', '/api/dashboard/overview?workspaceId=WS-DEFAULT-001', null, authHeaders)
    );

    const results = await Promise.all(concurrentCalls);
    const all200 = results.every(r => r.status === 200 && r.body.success === true);
    check('S9.1: 50 concurrent dashboard overview requests execute cleanly with 200 OK', all200);

    // 100 deterministic replay cycles
    const firstHash = computeDashboardHash({
      aum: overview.topMetrics.totalAum.value,
      vol: overview.topMetrics.annualizedVolatility.value,
      hhi: overview.riskExposure.exposure.hhi.value,
      portfolioCount: overview.universe.portfolios.length
    });

    let replayMatch = true;
    for (let i = 0; i < 100; i++) {
      const replaySummary = DashboardEngine.getPortfolioUniverseSummary({
        orgId: 'ORG-ROOT-001',
        workspaceId: 'WS-DEFAULT-001',
        asOf: overview.asOf
      });
      const riskSummary = DashboardEngine.getRiskAndExposureSummary({
        orgId: 'ORG-ROOT-001',
        workspaceId: 'WS-DEFAULT-001',
        asOf: overview.asOf
      });

      const hash = computeDashboardHash({
        aum: replaySummary.metrics.totalAum.value,
        vol: riskSummary.risk.annualizedVolatility.value,
        hhi: riskSummary.exposure.hhi.value,
        portfolioCount: replaySummary.portfolios.length
      });

      if (hash !== firstHash) {
        replayMatch = false;
        break;
      }
    }
    check('S9.2: 100 deterministic replay cycles produce 100% identical state hash', replayMatch);

    // 10. Role-Aware Views & Temporal As-Of Context
    console.log('Running Section 10: Role-Aware Views & Temporal As-Of Context...');
    const riskViewRes = await rawRequest('GET', '/api/dashboard/overview?workspaceId=WS-DEFAULT-001&roleView=RISK_OFFICER', null, authHeaders);
    check('S10.1: Risk Officer view returns 200 OK', riskViewRes.status === 200 && riskViewRes.body.data.roleView === 'RISK_OFFICER');

    const auditorViewRes = await rawRequest('GET', '/api/dashboard/overview?workspaceId=WS-DEFAULT-001&roleView=COMPLIANCE_AUDITOR', null, authHeaders);
    check('S10.2: Compliance Auditor view returns 200 OK', auditorViewRes.status === 200 && auditorViewRes.body.data.roleView === 'COMPLIANCE_AUDITOR');

    const historicalDate = '2026-09-01T12:00:00.000Z';
    const temporalRes = await rawRequest('GET', `/api/dashboard/overview?workspaceId=WS-DEFAULT-001&asOf=${encodeURIComponent(historicalDate)}`, null, authHeaders);
    check('S10.3: Temporal As-Of parameter preserved accurately', temporalRes.status === 200 && temporalRes.body.data.asOf === historicalDate);

    // 11. Domain Failure Isolation & Observability
    console.log('Running Section 11: Domain Failure Isolation & Observability...');
    // Directly test DashboardEngine failure isolation when one sub-function throws
    const origGetRisk = DashboardEngine.getRiskAndExposureSummary;
    DashboardEngine.getRiskAndExposureSummary = () => { throw new Error('Simulated Risk Service Outage'); };

    try {
      const isolatedRes = await DashboardEngine.getDashboardOverview({
        orgId: 'ORG-ROOT-001',
        workspaceId: 'WS-DEFAULT-001'
      });
      check('S11.1: Outage in Risk domain does not crash overall dashboard', !!isolatedRes);
      check('S11.2: Failed domain marked UNAVAILABLE honestly', isolatedRes.riskExposure.domainStatus === DomainStatus.UNAVAILABLE);
      check('S11.3: Other domains remain HEALTHY despite risk outage', isolatedRes.universe.domainStatus === DomainStatus.HEALTHY);
      check('S11.4: Overall cockpit freshness reflects PARTIAL state', isolatedRes.freshness === MetricFreshness.PARTIAL);
    } finally {
      DashboardEngine.getRiskAndExposureSummary = origGetRisk;
    }

    console.log(`\n✅ Phase 38 Suite: ${passedAssertions}/${passedAssertions + failedAssertions} assertions passed cleanly.`);
    console.log('================================================================');
    console.log('PHASE 38 SUMMARY:');
    console.log(`Phase 38 assertion total = ${passedAssertions}`);
    console.log(`Phase 38 suites = 1`);
    console.log(`Failures = ${failedAssertions}`);
    console.log('================================================================\n');

    return { totalAssertions: passedAssertions, passed: true };
  } finally {
    if (server) {
      server.close();
    }
  }
}

// Direct Execution
if (process.argv[1]?.endsWith('phase38DashboardCockpitTests.js')) {
  server = app.listen(0, async () => {
    serverPort = server.address().port;
    try {
      await runPhase38DashboardCockpitTests();
      process.exit(0);
    } catch (err) {
      console.error('Phase 38 Test Suite Error:', err);
      process.exit(1);
    }
  });
}
