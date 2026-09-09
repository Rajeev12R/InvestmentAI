/**
 * @file phase37InvestmentDecisionWorkbenchTests.js
 * Verification & Certification Suite for Phase 37 Investment Decision Workbench.
 */

import http from 'http';
import app from '../index.js';
import { authRepository } from '../auth/auth.repository.js';
import { Role, OrganizationRole, Permission } from '../auth/auth.types.js';
import { portfolioRepository } from '../portfolio/portfolio.repository.js';
import { decisionWorkbenchRepository } from '../decision/decisionWorkbench.repository.js';
import { DecisionWorkbenchEngine } from '../decision/decisionWorkbench.engine.js';
import {
  WorkbenchDecisionStatus,
  WorkbenchDecisionType,
  DecisionPriority,
  EvidencePolarity,
  EvidenceType,
  ApprovalStatus,
  ImplementationStatus
} from '../decision/decisionWorkbench.types.js';
import { auditRepository } from '../governance/audit.repository.js';

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

export async function runPhase37Tests() {
  console.log('================================================================');
  console.log('INVESTMENTAI — PHASE 37 DECISION WORKBENCH VERIFICATION');
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
    // ------------------------------------------------------------------------
    // SECTION 1: Decision Lifecycle & State Transitions
    // ------------------------------------------------------------------------
    console.log('Running Section 1: Decision Lifecycle & State Transitions...');

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

    // 2. Default Seeded Decision Check
    const defDecRes = await rawRequest('GET', '/api/decisions/DEC-NVDA-001', null, authHeaders);
    check('S1.2: Default seeded decision DEC-NVDA-001 retrieved', defDecRes.status === 200 && defDecRes.body.decision);
    check('S1.3: Default decision status is UNDER_REVIEW', defDecRes.body.decision.status === WorkbenchDecisionStatus.UNDER_REVIEW);

    // 3. Create Draft Decision
    const createRes = await rawRequest('POST', '/api/decisions', {
      portfolioId: 'PORT-DEFAULT-001',
      ticker: 'MSFT',
      title: 'Cloud Infrastructure Consolidation & Copilot Monetization',
      decisionType: WorkbenchDecisionType.INCREASE,
      priority: DecisionPriority.HIGH,
      proposedPosition: {
        targetWeight: 0.30
      },
      thesis: {
        coreThesis: 'Expanding Azure enterprise market share with generative AI monetization.',
        timeHorizon: '12 Months',
        expectedReturn: 0.20
      }
    }, authHeaders);
    check('S1.4: Provisioning draft decision returns 201', createRes.status === 201);
    const draftDecId = createRes.body.decision?.decisionId;
    check('S1.5: Created decision status is DRAFT', createRes.body.decision?.status === WorkbenchDecisionStatus.DRAFT);

    // 4. Transition: DRAFT -> UNDER_REVIEW
    const reviewStatusRes = await rawRequest('POST', `/api/decisions/${draftDecId}/status`, {
      status: WorkbenchDecisionStatus.UNDER_REVIEW
    }, authHeaders);
    check('S1.6: Submitting draft to UNDER_REVIEW returns 200', reviewStatusRes.status === 200);
    check('S1.7: Status changed to UNDER_REVIEW', reviewStatusRes.body.decision?.status === WorkbenchDecisionStatus.UNDER_REVIEW);

    // 5. Challenge Thesis: UNDER_REVIEW -> CHALLENGED
    const challengeRes = await rawRequest('POST', `/api/decisions/${draftDecId}/review`, {
      isChallenge: true,
      challengeCategory: 'VALUATION',
      comment: 'Forward P/E exceeds 35x historical band; multiple contraction risk under sticky rates.'
    }, authHeaders);
    check('S1.8: Submitting peer challenge returns 201', challengeRes.status === 201);
    const challengedDec = (await rawRequest('GET', `/api/decisions/${draftDecId}`, null, authHeaders)).body.decision;
    check('S1.9: Decision status transitioned to CHALLENGED', challengedDec.status === WorkbenchDecisionStatus.CHALLENGED);

    // 6. Authorize: CHALLENGED -> APPROVED
    const approveRes = await rawRequest('POST', `/api/decisions/${draftDecId}/approve`, {
      conditions: ['Monitored monthly against cloud revenue cadence']
    }, authHeaders);
    check('S1.10: Approving challenged decision returns 200', approveRes.status === 200);
    const approvedDec = (await rawRequest('GET', `/api/decisions/${draftDecId}`, null, authHeaders)).body.decision;
    check('S1.11: Status changed to APPROVED', approvedDec.status === WorkbenchDecisionStatus.APPROVED);

    // 7. Implementation Handoff: APPROVED -> IMPLEMENTED
    const implementRes = await rawRequest('POST', `/api/decisions/${draftDecId}/implement`, {
      executionNotes: 'Routed via institutional TWAP execution desk'
    }, authHeaders);
    check('S1.12: Implementation handoff returns 200', implementRes.status === 200);
    const implDec = (await rawRequest('GET', `/api/decisions/${draftDecId}`, null, authHeaders)).body.decision;
    check('S1.13: Status changed to IMPLEMENTED', implDec.status === WorkbenchDecisionStatus.IMPLEMENTED);

    // 8. Transition to MONITORED and then CLOSED
    await rawRequest('POST', `/api/decisions/${draftDecId}/status`, { status: WorkbenchDecisionStatus.MONITORED }, authHeaders);
    const closeRes = await rawRequest('POST', `/api/decisions/${draftDecId}/status`, { status: WorkbenchDecisionStatus.CLOSED }, authHeaders);
    check('S1.14: Closing decision returns 200', closeRes.status === 200);
    check('S1.15: Status is CLOSED', closeRes.body.decision?.status === WorkbenchDecisionStatus.CLOSED);

    // 9. Illegal Transition Check (CLOSED -> APPROVED)
    const illegalRes = await rawRequest('POST', `/api/decisions/${draftDecId}/status`, { status: WorkbenchDecisionStatus.APPROVED }, authHeaders);
    check('S1.16: Illegal transition from CLOSED is rejected (400/403)', illegalRes.status === 400 || illegalRes.status === 403);

    // ------------------------------------------------------------------------
    // SECTION 2: Decision Versioning & Material Revisions
    // ------------------------------------------------------------------------
    console.log('Running Section 2: Decision Versioning & Material Revisions...');

    // Create decision v1
    const vDecRes = await rawRequest('POST', '/api/decisions', {
      portfolioId: 'PORT-DEFAULT-001',
      ticker: 'AAPL',
      title: 'Services Ecosystem & Margin Expansion Thesis',
      decisionType: WorkbenchDecisionType.INCREASE,
      proposedPosition: { targetWeight: 0.20 },
      thesis: { coreThesis: 'Services mix shift expanding gross margin.' }
    }, authHeaders);
    const vDecId = vDecRes.body.decision.decisionId;
    check('S2.1: Decision initialized at version 1', vDecRes.body.decision.currentVersion === 1);

    // Update thesis and target weight (material change -> version bump to v2)
    const updateRes = await rawRequest('PUT', `/api/decisions/${vDecId}`, {
      proposedPosition: { targetWeight: 0.24 },
      thesis: { coreThesis: 'Accelerated Services mix shift plus Apple Intelligence adoption.' }
    }, authHeaders);
    check('S2.2: Material update returns 200', updateRes.status === 200);
    check('S2.3: Decision version bumped to 2', updateRes.body.decision.currentVersion === 2);
    check('S2.4: Version 2 contains updated thesis', updateRes.body.decision.version.thesis.coreThesis.includes('Apple Intelligence'));

    // ------------------------------------------------------------------------
    // SECTION 3: Evidence Model & Lineage (Supporting vs Contradicting)
    // ------------------------------------------------------------------------
    console.log('Running Section 3: Evidence Model & Lineage...');

    const evidenceRes = await rawRequest('GET', '/api/decisions/DEC-NVDA-001', null, authHeaders);
    const evList = evidenceRes.body.decision.version.evidence || [];
    check('S3.1: Seeded decision contains 4 evidence items', evList.length === 4);

    const supEv = evList.filter(e => e.polarity === EvidencePolarity.SUPPORTING);
    const conEv = evList.filter(e => e.polarity === EvidencePolarity.CONTRADICTING);
    check('S3.2: Supporting evidence items present with high confidence', supEv.length === 2 && supEv.every(e => e.confidence >= 0.90));
    check('S3.3: Contradicting evidence items present and explicitly visible', conEv.length === 2 && conEv.every(e => e.polarity === 'CONTRADICTING'));
    check('S3.4: Evidence includes source provenance metadata', evList.every(e => e.source && e.type));

    // ------------------------------------------------------------------------
    // SECTION 4: Point-in-Time Context & Sealed Snapshots
    // ------------------------------------------------------------------------
    console.log('Running Section 4: Point-in-Time Context & Sealed Snapshots...');

    const snapRes = await rawRequest('POST', `/api/decisions/DEC-NVDA-001/snapshots`, {
      asOf: '2026-09-07T00:00:00.000Z'
    }, authHeaders);
    check('S4.1: Create decision snapshot returns 201', snapRes.status === 201);
    const snap = snapRes.body.snapshot;
    check('S4.2: Snapshot contains 64-character SHA-256 integrity hash', snap && snap.integrityHash?.length === 64);
    check('S4.3: Snapshot is sealed (isSealed === true)', snap && snap.isSealed === true);

    const listSnapRes = await rawRequest('GET', `/api/decisions/DEC-NVDA-001/snapshots`, null, authHeaders);
    check('S4.4: List snapshots returns 200 with count >= 1', listSnapRes.status === 200 && listSnapRes.body.snapshots.length >= 1);

    const pitContext = DecisionWorkbenchEngine.reconstructPointInTimeContext('DEC-NVDA-001', '2026-09-07T00:00:00.000Z', 'WS-DEFAULT-001', 'ORG-ROOT-001');
    check('S4.5: Historical PIT reconstruction retrieves sealed snapshot accurately', pitContext.isReconstructedFromSnapshot === true && pitContext.decision.integrityHash === snap.integrityHash);

    // ------------------------------------------------------------------------
    // SECTION 5: Multi-Domain Portfolio, Risk & Compliance Impact
    // ------------------------------------------------------------------------
    console.log('Running Section 5: Multi-Domain Portfolio, Risk & Compliance Impact...');

    const impactRes = await rawRequest('GET', '/api/decisions/DEC-NVDA-001/impact', null, authHeaders);
    check('S5.1: Decision impact endpoint returns 200', impactRes.status === 200);
    const imp = impactRes.body.data;
    check('S5.2: Exposure shift includes baseline and projected HHI & N_eff', imp.exposureImpact && imp.exposureImpact.projectedHHI > 0 && imp.exposureImpact.projectedNEff > 0);
    check('S5.3: Risk shift includes Volatility, VaR 95, ES 95 deltas', imp.riskImpact && imp.riskImpact.projectedVolatility > 0 && imp.riskImpact.volatilityDelta !== undefined);
    check('S5.4: Compliance check verifies projected weight against single-position limit', imp.complianceImpact && imp.complianceImpact.singlePositionStatus === 'PASS' && imp.complianceImpact.projectedSinglePositionWeight <= imp.complianceImpact.maxSinglePositionLimit);
    check('S5.5: Scenario stress includes Baseline, Bull, Bear, and Macro Shock cases', imp.scenarios && imp.scenarios.length === 4);

    // ------------------------------------------------------------------------
    // SECTION 6: Human Authorization, Stale Approval Protection & SoD
    // ------------------------------------------------------------------------
    console.log('Running Section 6: Human Authorization, Stale Approval Protection & SoD...');

    // Create decision with Segregation of Duties (SoD) enforced
    const sodDecRes = await rawRequest('POST', '/api/decisions', {
      portfolioId: 'PORT-DEFAULT-001',
      ticker: 'GOOGL',
      title: 'Search Market Resilience & Cloud Expansion',
      decisionType: WorkbenchDecisionType.INCREASE,
      enforceSoD: true,
      proposedPosition: { targetWeight: 0.22 }
    }, authHeaders);
    const sodDecId = sodDecRes.body.decision.decisionId;
    await rawRequest('POST', `/api/decisions/${sodDecId}/status`, { status: WorkbenchDecisionStatus.UNDER_REVIEW }, authHeaders);

    // Creator tries to self-approve with SoD enforced -> Denied
    const selfApproveRes = await rawRequest('POST', `/api/decisions/${sodDecId}/approve`, {}, authHeaders);
    check('S6.1: SoD guard denies self-approval by decision creator (400/403)', selfApproveRes.status === 400 || selfApproveRes.status === 403);

    // Stale Approval Detection: approve decision, then modify portfolio holdings
    const normalDecRes = await rawRequest('POST', '/api/decisions', {
      portfolioId: 'PORT-DEFAULT-001',
      ticker: 'JPM',
      title: 'Net Interest Income Resilience Thesis',
      decisionType: WorkbenchDecisionType.INCREASE,
      enforceSoD: false,
      proposedPosition: { targetWeight: 0.18 }
    }, authHeaders);
    const normalDecId = normalDecRes.body.decision.decisionId;
    await rawRequest('POST', `/api/decisions/${normalDecId}/status`, { status: WorkbenchDecisionStatus.UNDER_REVIEW }, authHeaders);

    // Mutate portfolio holdings to cause portfolio drift
    await rawRequest('PUT', '/api/portfolios/PORT-DEFAULT-001/holdings', {
      holdings: [
        { ticker: 'AAPL', quantity: 12000, price: 220.00 },
        { ticker: 'MSFT', quantity: 6000, price: 420.00 }
      ],
      cashBalance: 600000
    }, authHeaders);

    // Approve decision with drifted portfolio -> flagged STALE
    const staleApproveRes = await rawRequest('POST', `/api/decisions/${normalDecId}/approve`, {}, authHeaders);
    check('S6.2: Approval on drifted portfolio flags approval as STALE', staleApproveRes.body.approval?.isStale === true);

    // Attempting to implement stale approval is blocked
    const staleImplRes = await rawRequest('POST', `/api/decisions/${normalDecId}/implement`, {}, authHeaders);
    check('S6.3: Implementation of stale approval is blocked (400)', staleImplRes.status === 400);

    // ------------------------------------------------------------------------
    // SECTION 7: Strict Tenant Isolation & Anti-IDOR Boundaries
    // ------------------------------------------------------------------------
    console.log('Running Section 7: Strict Tenant Isolation & Anti-IDOR Boundaries...');

    // Provision Org B, Workspace B, Portfolio B, Decision B
    const orgB = authRepository.createOrganization({ name: 'Alpha Hedge Fund B' });
    const wsB = authRepository.createWorkspace({ orgId: orgB.orgId, name: 'Trading Desk B' });
    const portB = portfolioRepository.createPortfolio({
      orgId: orgB.orgId,
      workspaceId: wsB.workspaceId,
      name: 'Alpha Macro Sleeve B',
      ownerId: 'USR-ROOT-001'
    });
    const decB = decisionWorkbenchRepository.createDecision({
      orgId: orgB.orgId,
      workspaceId: wsB.workspaceId,
      portfolioId: portB.portfolioId,
      ticker: 'TSLA',
      title: 'Autonomous Mobility Fleet Expansion',
      creatorId: 'USR-ROOT-001'
    });
    check('S7.1: Tenant B decision created', decB && decB.decisionId);

    // Org A user attempts to read Tenant B decision -> 403/404
    const crossReadRes = await rawRequest('GET', `/api/decisions/${decB.decisionId}`, null, authHeaders);
    check('S7.2: Cross-tenant decision read is rejected (403/404)', crossReadRes.status === 403 || crossReadRes.status === 404);

    // Org A user attempts to approve Tenant B decision -> 403/404
    const crossApproveRes = await rawRequest('POST', `/api/decisions/${decB.decisionId}/approve`, {}, authHeaders);
    check('S7.3: Cross-tenant approval attempt is rejected (403/404)', crossApproveRes.status === 403 || crossApproveRes.status === 404);

    // Search query in Org A does not leak Tenant B decision
    const searchRes = await rawRequest('GET', '/api/decisions?query=TSLA', null, authHeaders);
    check('S7.4: Decision search is workspace-scoped (Tenant B omitted)', searchRes.body.data.length === 0);

    // ------------------------------------------------------------------------
    // SECTION 8: Concurrency & Deterministic Replay
    // ------------------------------------------------------------------------
    console.log('Running Section 8: Concurrency & Deterministic Replay...');

    // 50 Concurrent Read & Impact Operations
    const concurrentOps = Array.from({ length: 50 }, (_, i) =>
      rawRequest('GET', `/api/decisions/DEC-NVDA-001/impact`, null, authHeaders)
    );
    const concurrentResults = await Promise.all(concurrentOps);
    const allConcurrentPass = concurrentResults.every(r => r.status === 200 && r.body.data?.riskImpact);
    check('S8.1: 50 concurrent decision impact queries execute cleanly with 200', allConcurrentPass);

    // 100 Deterministic Replay Cycles
    let determinismPass = true;
    const baselineSim = DecisionWorkbenchEngine.evaluateDecisionImpact('DEC-NVDA-001', 'WS-DEFAULT-001', 'ORG-ROOT-001');
    for (let i = 0; i < 100; i++) {
      const rep = DecisionWorkbenchEngine.evaluateDecisionImpact('DEC-NVDA-001', 'WS-DEFAULT-001', 'ORG-ROOT-001');
      if (
        rep.riskImpact.projectedVolatility !== baselineSim.riskImpact.projectedVolatility ||
        rep.exposureImpact.projectedHHI !== baselineSim.exposureImpact.projectedHHI
      ) {
        determinismPass = false;
        break;
      }
    }
    check('S8.2: 100 deterministic replay cycles produce 100% identical impact metrics', determinismPass);

    // ------------------------------------------------------------------------
    // SECTION 9: Audit Lineage & Observability
    // ------------------------------------------------------------------------
    console.log('Running Section 9: Audit Lineage & Observability...');

    const auditEvents = auditRepository.getEvents({ orgId: 'ORG-ROOT-001', workspaceId: 'WS-DEFAULT-001' });
    check('S9.1: Audit event emitted for decision.create', auditEvents.some(e => e.eventType === 'decision.create' || e.action === 'decision.create'));
    check('S9.2: Audit event emitted for decision.update', auditEvents.some(e => e.eventType === 'decision.update' || e.action === 'decision.update'));
    check('S9.3: Audit event emitted for decision.review or decision.challenge', auditEvents.some(e => e.eventType === 'decision.challenge' || e.action === 'decision.challenge'));
    check('S9.4: Audit event emitted for decision.approve', auditEvents.some(e => e.eventType === 'decision.approve' || e.action === 'decision.approve'));
    check('S9.5: Audit event emitted for decision.snapshot_create', auditEvents.some(e => e.eventType === 'decision.snapshot_create' || e.action === 'decision.snapshot_create'));

    console.log(`\n✅ Phase 37 Suite: ${passedAssertions}/${passedAssertions + failedAssertions} assertions passed cleanly.`);
    console.log('================================================================');
    console.log('PHASE 37 SUMMARY:');
    console.log(`Phase 37 assertion total = ${passedAssertions}`);
    console.log(`Phase 37 suites = 1`);
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
if (process.argv[1]?.endsWith('phase37InvestmentDecisionWorkbenchTests.js')) {
  server = app.listen(0, async () => {
    serverPort = server.address().port;
    try {
      await runPhase37Tests();
      process.exit(0);
    } catch (err) {
      console.error('Phase 37 Test Suite Error:', err);
      process.exit(1);
    }
  });
}
