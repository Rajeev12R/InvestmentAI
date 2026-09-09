/**
 * @file phase36PortfolioOSTests.js
 * Comprehensive Verification & Automated Assertion Suite for Phase 36:
 * Institutional Portfolio Operating System.
 */

import http from 'http';
import assert from 'assert';
import app from '../index.js';
import { portfolioRepository } from '../portfolio/portfolio.repository.js';
import { PortfolioOperatingEngine } from '../portfolio/portfolioOperating.engine.js';
import { PortfolioStatus, PortfolioType, StrategyType, DataFreshness } from '../portfolio/portfolio.types.js';
import { auditRepository } from '../governance/audit.repository.js';
import { authRepository } from '../auth/auth.repository.js';
import { Role, OrganizationRole } from '../auth/auth.types.js';

let server;
let serverPort = 3000;
let passedAssertions = 0;
let failedAssertions = 0;

function check(desc, condition) {
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ [PASS] ${desc}`);
  } else {
    failedAssertions++;
    console.error(`  ✗ [FAIL] ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  }
}

function rawRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataStr = body ? JSON.stringify(body) : '';
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (body) {
      reqHeaders['Content-Length'] = Buffer.byteLength(dataStr);
    }

    const req = http.request(
      {
        host: '127.0.0.1',
        port: serverPort,
        method,
        path,
        headers: reqHeaders
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed = {};
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { text: raw };
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

export async function runPhase36Tests() {
  console.log('================================================================');
  console.log('INVESTMENTAI — PHASE 36 PORTFOLIO OPERATING SYSTEM VERIFICATION');
  console.log('================================================================\n');

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: Portfolio Lifecycle & State Transitions
    // ------------------------------------------------------------------------
    console.log('Running Section 1: Portfolio Lifecycle & State Transitions...');

    // 1. Root Login
    const rootLogin = await rawRequest('POST', '/api/auth/login', {
      email: 'admin@investmentai.local',
      password: 'Admin123!Secure'
    });
    check('S1.1: Root Admin login succeeds with token', rootLogin.status === 200 && (rootLogin.body.token || rootLogin.body.session?.token));
    const rootToken = rootLogin.body.token || rootLogin.body.session?.token;
    const authHeaders = {
      Authorization: `Bearer ${rootToken}`,
      'x-org-id': 'ORG-ROOT-001',
      'x-workspace-id': 'WS-DEFAULT-001'
    };

    // 2. Default Portfolio Check
    const defPortRes = await rawRequest('GET', '/api/portfolios/PORT-DEFAULT-001', null, authHeaders);
    check('S1.2: Default portfolio PORT-DEFAULT-001 retrieved', defPortRes.status === 200 && defPortRes.body.portfolio);
    check('S1.3: Default portfolio status is ACTIVE', defPortRes.body.portfolio.status === PortfolioStatus.ACTIVE);

    // 3. Provision Draft Portfolio
    const createDraftRes = await rawRequest('POST', '/api/portfolios', {
      name: 'Alpha Quant Dynamic Sleeve',
      description: 'Systematic statistical arbitrage sleeve',
      strategy: StrategyType.MARKET_NEUTRAL,
      type: PortfolioType.QUANTITATIVE,
      status: PortfolioStatus.DRAFT,
      cashBalance: 1000000
    }, authHeaders);
    check('S1.4: Provisioning draft portfolio returns 201', createDraftRes.status === 201);
    const draftPortId = createDraftRes.body.portfolio?.portfolioId;
    check('S1.5: Created portfolio status is DRAFT', createDraftRes.body.portfolio?.status === PortfolioStatus.DRAFT);

    // 4. Activate Portfolio
    const activateRes = await rawRequest('POST', `/api/portfolios/${draftPortId}/status`, { status: PortfolioStatus.ACTIVE }, authHeaders);
    check('S1.6: Activating draft portfolio returns 200', activateRes.status === 200);
    check('S1.7: Status changed to ACTIVE', activateRes.body.portfolio?.status === PortfolioStatus.ACTIVE);

    // 5. Pause Portfolio
    const pauseRes = await rawRequest('POST', `/api/portfolios/${draftPortId}/status`, { status: PortfolioStatus.PAUSED }, authHeaders);
    check('S1.8: Pausing active portfolio returns 200', pauseRes.status === 200);
    check('S1.9: Status changed to PAUSED', pauseRes.body.portfolio?.status === PortfolioStatus.PAUSED);

    // 6. Paused Portfolio Denies Holdings Modification
    const pausedModRes = await rawRequest('PUT', `/api/portfolios/${draftPortId}/holdings`, {
      holdings: [{ ticker: 'AAPL', quantity: 100, price: 220 }]
    }, authHeaders);
    check('S1.10: Paused portfolio denies holdings modification (400/403)', pausedModRes.status === 400 || pausedModRes.status === 403);

    // 7. Resume to ACTIVE and then CLOSE
    await rawRequest('POST', `/api/portfolios/${draftPortId}/status`, { status: PortfolioStatus.ACTIVE }, authHeaders);
    const closeRes = await rawRequest('POST', `/api/portfolios/${draftPortId}/status`, { status: PortfolioStatus.CLOSED }, authHeaders);
    check('S1.11: Closing portfolio returns 200', closeRes.status === 200);
    check('S1.12: Status is CLOSED', closeRes.body.portfolio?.status === PortfolioStatus.CLOSED);

    // 8. Archive Portfolio
    const archiveRes = await rawRequest('POST', `/api/portfolios/${draftPortId}/status`, { status: PortfolioStatus.ARCHIVED }, authHeaders);
    check('S1.13: Archiving closed portfolio returns 200', archiveRes.status === 200);
    check('S1.14: Status is ARCHIVED', archiveRes.body.portfolio?.status === PortfolioStatus.ARCHIVED);

    // 9. Illegal Transition (ARCHIVED -> ACTIVE)
    const illegalTransRes = await rawRequest('POST', `/api/portfolios/${draftPortId}/status`, { status: PortfolioStatus.ACTIVE }, authHeaders);
    check('S1.15: Illegal status transition from ARCHIVED is rejected (400)', illegalTransRes.status === 400);

    // ------------------------------------------------------------------------
    // SECTION 2: Mandate & Strategy Scoping & Configuration
    // ------------------------------------------------------------------------
    console.log('Running Section 2: Mandate & Strategy Scoping & Configuration...');

    // 1. Mandate Updates
    const updateMandateRes = await rawRequest('PUT', '/api/portfolios/PORT-DEFAULT-001', {
      mandate: {
        targetReturn: 0.15,
        maxSinglePositionWeight: 0.20,
        maxSectorWeight: 0.35
      }
    }, authHeaders);
    check('S2.1: Mandate update returns 200', updateMandateRes.status === 200);
    check('S2.2: Mandate target return updated to 15%', updateMandateRes.body.portfolio.mandate.targetReturn === 0.15);

    // 2. Compliance Limit Breach Check
    const compliance = PortfolioOperatingEngine.evaluateCompliance(updateMandateRes.body.portfolio);
    check('S2.3: Compliance engine detects top position AAPL exceeding 20% limit', compliance.breaches.some(b => b.rule === 'MAX_SINGLE_POSITION_WEIGHT'));
    check('S2.4: Compliance engine detects Technology sector exceeding 35% limit', compliance.breaches.some(b => b.rule === 'MAX_SECTOR_WEIGHT'));

    // ------------------------------------------------------------------------
    // SECTION 3: Authoritative Holdings & Position Freshness Model
    // ------------------------------------------------------------------------
    console.log('Running Section 3: Authoritative Holdings & Position Freshness Model...');

    const holdingsRes = await rawRequest('GET', '/api/portfolios/PORT-DEFAULT-001/holdings', null, authHeaders);
    check('S3.1: Holdings fetch returns 200', holdingsRes.status === 200);
    check('S3.2: Total holdings count is 5', holdingsRes.body.holdings.length === 5);

    const aapl = holdingsRes.body.holdings.find(h => h.ticker === 'AAPL');
    check('S3.3: Position AAPL has accurate price, quantity, and costBasis', aapl && aapl.price === 220 && aapl.quantity === 11363 && aapl.costBasis === 195);
    check('S3.4: Position AAPL unrealized P&L is positive', aapl.unrealizedPnL > 0);
    check('S3.5: Position AAPL freshness is explicitly FRESH', aapl.freshness === DataFreshness.FRESH);

    // Update holdings with new reconciliation
    const updateHoldingsRes = await rawRequest('PUT', '/api/portfolios/PORT-DEFAULT-001/holdings', {
      holdings: [
        { ticker: 'AAPL', quantity: 10000, price: 220, costBasis: 195, sector: 'Technology', marketValue: 2200000 },
        { ticker: 'MSFT', quantity: 5000, price: 420, costBasis: 380, sector: 'Technology', marketValue: 2100000 },
        { ticker: 'NVDA', quantity: 10000, price: 125, costBasis: 100, sector: 'Technology', marketValue: 1250000 }
      ],
      cashBalance: 500000
    }, authHeaders);
    check('S3.6: Holdings reconciliation update returns 200', updateHoldingsRes.status === 200);
    check('S3.7: New AUM is $6,050,000', updateHoldingsRes.body.portfolio.aum === 6050000);
    check('S3.8: Weights recalculated accurately against new AUM', Number((updateHoldingsRes.body.portfolio.holdings[0].weight).toFixed(2)) === 0.36);

    // ------------------------------------------------------------------------
    // SECTION 4: Point-in-Time Sealed Snapshots & Historical Reconstruction
    // ------------------------------------------------------------------------
    console.log('Running Section 4: Point-in-Time Sealed Snapshots & Historical Reconstruction...');

    const snapshotRes = await rawRequest('POST', '/api/portfolios/PORT-DEFAULT-001/snapshots', {
      asOf: '2026-09-07T12:00:00.000Z'
    }, authHeaders);
    check('S4.1: Create snapshot returns 201', snapshotRes.status === 201);
    const snap = snapshotRes.body.snapshot;
    check('S4.2: Snapshot has generated snapshotId', snap && snap.snapshotId.startsWith('SNAP-'));
    check('S4.3: Snapshot contains 64-char SHA-256 integrityHash', snap && snap.integrityHash.length === 64);
    check('S4.4: Snapshot marked isSealed === true', snap && snap.isSealed === true);

    const listSnapsRes = await rawRequest('GET', '/api/portfolios/PORT-DEFAULT-001/snapshots', null, authHeaders);
    check('S4.5: List snapshots returns 200 with count >= 1', listSnapsRes.status === 200 && listSnapsRes.body.count >= 1);

    const getSnapRes = await rawRequest('GET', `/api/portfolios/PORT-DEFAULT-001/snapshots/${snap.snapshotId}`, null, authHeaders);
    check('S4.6: Get snapshot by ID returns byte-identical integrityHash', getSnapRes.status === 200 && getSnapRes.body.snapshot.integrityHash === snap.integrityHash);

    const pitSnap = portfolioRepository.getSnapshotAsOf('PORT-DEFAULT-001', '2026-09-07T13:00:00.000Z', 'WS-DEFAULT-001', 'ORG-ROOT-001');
    check('S4.7: Historical PIT reconstruction retrieves correct sealed snapshot', pitSnap && pitSnap.snapshotId === snap.snapshotId);

    // ------------------------------------------------------------------------
    // SECTION 5: Multi-Domain Operating Integrations
    // ------------------------------------------------------------------------
    console.log('Running Section 5: Multi-Domain Operating Integrations...');

    const summaryRes = await rawRequest('GET', '/api/portfolios/PORT-DEFAULT-001/summary', null, authHeaders);
    check('S5.1: Operating summary returns 200', summaryRes.status === 200);
    const sumData = summaryRes.body.data;
    check('S5.2: Summary contains exposure metrics (HHI, N_eff)', sumData.exposure && sumData.exposure.hhi > 0 && sumData.exposure.nEff > 0);
    check('S5.3: Summary contains risk metrics (Annualized Vol, VaR 95, ES 95)', sumData.risk && sumData.risk.annualizedVolatility > 0 && sumData.risk.parametricVaR95 > 0);
    check('S5.4: Summary contains MRC/CRC risk contributions for all assets', sumData.risk.riskContributions.length === sumData.holdingsCount);
    check('S5.5: Sum of percentage risk contributions equals 100% (+/- 1%)', Math.abs(sumData.risk.riskContributions.reduce((s, r) => s + r.prc, 0) - 100) < 1.0);

    // Phase 33 Optimization Proposal
    const optPropRes = await rawRequest('POST', '/api/portfolios/PORT-DEFAULT-001/optimize', {
      objective: 'MAX_SHARPE'
    }, authHeaders);
    check('S5.6: Optimization proposal returns 200', optPropRes.status === 200);
    const prop = optPropRes.body.proposal;
    check('S5.7: Proposal status is PROPOSAL_PENDING_REVIEW', prop && prop.status === 'PROPOSAL_PENDING_REVIEW');
    check('S5.8: Proposal contains sealed integrity hash', prop && prop.integrityHash.length === 64);
    check('S5.9: Proposal contains Phase 33 Explanation DAG', prop && prop.explanationDAG && prop.explanationDAG.dagId);
    check('S5.10: Portfolio active holdings remain unchanged after proposal', (await rawRequest('GET', '/api/portfolios/PORT-DEFAULT-001/holdings', null, authHeaders)).body.holdings.length === 3);

    // ------------------------------------------------------------------------
    // SECTION 6: Strict Tenant Isolation & Anti-IDOR Boundaries
    // ------------------------------------------------------------------------
    console.log('Running Section 6: Strict Tenant Isolation & Anti-IDOR Boundaries...');

    // Provision Org B & Workspace B & Portfolio B
    const orgB = authRepository.createOrganization({ name: 'Hedge Fund Beta' });
    const wsB = authRepository.createWorkspace({ orgId: orgB.orgId, name: 'Beta Trading Desk' });
    const portB = portfolioRepository.createPortfolio({
      orgId: orgB.orgId,
      workspaceId: wsB.workspaceId,
      name: 'Beta Global Macro Fund',
      ownerId: 'USR-ROOT-001'
    });
    check('S6.1: Tenant B (Org B, Workspace B, Portfolio B) created', portB && portB.portfolioId);

    // Org A user attempts to read Portfolio B (belonging to Org B / Workspace B)
    const crossReadRes = await rawRequest('GET', `/api/portfolios/${portB.portfolioId}`, null, authHeaders);
    check('S6.2: Cross-tenant portfolio read rejected with 403 / 404', crossReadRes.status === 403 || crossReadRes.status === 404);

    // Org A user attempts to modify Portfolio B
    const crossUpdateRes = await rawRequest('PUT', `/api/portfolios/${portB.portfolioId}`, { name: 'Compromised Fund' }, authHeaders);
    check('S6.3: Cross-tenant portfolio update rejected with 403 / 404', crossUpdateRes.status === 403 || crossUpdateRes.status === 404);

    // Org A user attempts to update holdings of Portfolio B
    const crossHoldingsRes = await rawRequest('PUT', `/api/portfolios/${portB.portfolioId}/holdings`, {
      holdings: [{ ticker: 'XYZ', quantity: 100, price: 10 }]
    }, authHeaders);
    check('S6.4: Cross-tenant holdings update rejected with 403 / 404', crossHoldingsRes.status === 403 || crossHoldingsRes.status === 404);

    // Search query in Org A does not leak Portfolio B
    const searchRes = await rawRequest('GET', '/api/portfolios?query=Beta', null, authHeaders);
    check('S6.5: Portfolio search is strictly workspace-scoped (Portfolio B omitted)', searchRes.body.data.length === 0);

    // ------------------------------------------------------------------------
    // SECTION 7: RBAC & Privilege Escalation Defenses
    // ------------------------------------------------------------------------
    console.log('Running Section 7: RBAC & Privilege Escalation Defenses...');

    // Register Junior Analyst in Org A
    const analystReg = await rawRequest('POST', '/api/auth/register', {
      email: `analyst_p36_${Date.now()}@investmentai.local`,
      password: 'AnalystPassword!2026',
      name: 'Junior Quant'
    });
    authRepository.addOrganizationMember('ORG-ROOT-001', analystReg.body.userId, OrganizationRole.MEMBER);
    authRepository.addMembership('WS-DEFAULT-001', analystReg.body.userId, Role.ANALYST);

    const analystLogin = await rawRequest('POST', '/api/auth/login', {
      email: analystReg.body.email,
      password: 'AnalystPassword!2026'
    });
    const analystToken = analystLogin.body.token || analystLogin.body.session?.token;
    const analystHeaders = {
      Authorization: `Bearer ${analystToken}`,
      'x-org-id': 'ORG-ROOT-001',
      'x-workspace-id': 'WS-DEFAULT-001'
    };

    // Analyst can read summary
    const analystReadRes = await rawRequest('GET', '/api/portfolios/PORT-DEFAULT-001/summary', null, analystHeaders);
    check('S7.1: Analyst can read portfolio summary (200)', analystReadRes.status === 200);

    // Analyst can run optimization proposal
    const analystOptRes = await rawRequest('POST', '/api/portfolios/PORT-DEFAULT-001/optimize', { objective: 'MAX_SHARPE' }, analystHeaders);
    check('S7.2: Analyst can request optimization proposal (200)', analystOptRes.status === 200);

    // Analyst cannot close or archive portfolio (Permission.PORTFOLIO_STATUS_MANAGE requires ADMIN/OWNER)
    const analystStatusRes = await rawRequest('POST', '/api/portfolios/PORT-DEFAULT-001/status', { status: PortfolioStatus.CLOSED }, analystHeaders);
    check('S7.3: Analyst cannot manage portfolio lifecycle status (403)', analystStatusRes.status === 403);

    // Unauthenticated request
    const unauthRes = await rawRequest('GET', '/api/portfolios/PORT-DEFAULT-001');
    check('S7.4: Unauthenticated request rejected with 401', unauthRes.status === 401);

    // ------------------------------------------------------------------------
    // SECTION 8: Concurrency & Deterministic Replay
    // ------------------------------------------------------------------------
    console.log('Running Section 8: Concurrency & Deterministic Replay...');

    // 50 concurrent summary reads
    const concurrentReads = await Promise.all(
      Array.from({ length: 50 }, () =>
        rawRequest('GET', '/api/portfolios/PORT-DEFAULT-001/summary', null, authHeaders)
      )
    );
    const all200 = concurrentReads.every(r => r.status === 200);
    check('S8.1: 50 concurrent portfolio summary reads execute cleanly with 200', all200);

    // 100 deterministic replay cycles
    let determinismPass = true;
    const firstEval = PortfolioOperatingEngine.evaluateRisk(portfolioRepository.getPortfolioById('PORT-DEFAULT-001'));
    for (let i = 0; i < 100; i++) {
      const nextEval = PortfolioOperatingEngine.evaluateRisk(portfolioRepository.getPortfolioById('PORT-DEFAULT-001'));
      if (nextEval.annualizedVolatility !== firstEval.annualizedVolatility || nextEval.parametricVaR95 !== firstEval.parametricVaR95) {
        determinismPass = false;
        break;
      }
    }
    check('S8.2: 100 deterministic replay cycles produce 100% identical risk metrics', determinismPass);

    // ------------------------------------------------------------------------
    // SECTION 9: Audit Lineage & Observability
    // ------------------------------------------------------------------------
    console.log('Running Section 9: Audit Lineage & Observability...');

    const auditEvents = auditRepository.getEvents({ orgId: 'ORG-ROOT-001', workspaceId: 'WS-DEFAULT-001' });
    check('S9.1: Audit event emitted for portfolio.create', auditEvents.some(e => e.eventType === 'portfolio.create'));
    check('S9.2: Audit event emitted for portfolio.status_change', auditEvents.some(e => e.eventType === 'portfolio.status_change'));
    check('S9.3: Audit event emitted for portfolio.holdings_update', auditEvents.some(e => e.eventType === 'portfolio.holdings_update'));
    check('S9.4: Audit event emitted for portfolio.snapshot_create', auditEvents.some(e => e.eventType === 'portfolio.snapshot_create'));
    check('S9.5: Audit event emitted for portfolio.optimization_proposal', auditEvents.some(e => e.eventType === 'portfolio.optimization_proposal'));

    console.log(`\n✅ Phase 36 Suite: ${passedAssertions}/${passedAssertions + failedAssertions} assertions passed cleanly.`);
    console.log('================================================================');
    console.log('PHASE 36 SUMMARY:');
    console.log(`Phase 36 assertion total = ${passedAssertions}`);
    console.log(`Phase 36 suites = 1`);
    console.log(`Failures = ${failedAssertions}`);
    console.log('================================================================\n');

    return { passedAssertions, failedAssertions };
  } finally {
    if (server) {
      server.close();
    }
  }
}

// Direct Execution
if (process.argv[1]?.endsWith('phase36PortfolioOSTests.js')) {
  server = app.listen(0, async () => {
    serverPort = server.address().port;
    try {
      await runPhase36Tests();
      process.exit(0);
    } catch (err) {
      console.error('Phase 36 Test Suite Error:', err);
      process.exit(1);
    }
  });
}
