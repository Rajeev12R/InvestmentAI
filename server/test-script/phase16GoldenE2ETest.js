/**
 * Test Suite 8: Phase 16 Golden End-to-End Trace & Audit Lifecycle Hardening
 * Comprehensive lifecycle trace from policy definition to evaluation, breach, waiver,
 * remediation, rebalance, audit graph, package sealing, and non-execution invariant.
 */

import assert from 'assert';
import { ComplianceEngine } from '../compliance/compliance.engine.js';
import { PolicyEngine } from '../compliance/policy.engine.js';
import { BreachEngine } from '../compliance/breach.engine.js';
import { ExceptionEngine } from '../compliance/exception.engine.js';
import { RemediationEngine } from '../compliance/remediation.engine.js';
import { ComplianceAuditEngine } from '../compliance/audit.engine.js';
import { CompliancePackageBuilder } from '../compliance/compliancePackage.js';
import { ComplianceReportEngine } from '../compliance/report.engine.js';
import { ComplianceExplanationEngine } from '../compliance/explanation.engine.js';
import { policyRepository } from '../compliance/policy.repository.js';
import { complianceRepository } from '../compliance/compliance.repository.js';
import { ComplianceStatus, BreachStatus, ExceptionStatus, OperatorType, EvaluationPhase } from '../compliance/compliance.types.js';
import { PolicyRuleType } from '../compliance/policy.types.js';

let passCount = 0;
function test(name, fn) {
  try {
    fn();
    passCount++;
    console.log(`✓ [PASS] ${name}`);
  } catch (err) {
    console.error(`✗ [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

console.log('=== PHASE 16: GOLDEN END-TO-END TRACE ===\n');

policyRepository.clear();
complianceRepository.clear();

const workspaceId = 'WS-GOLDEN-INST-01';
const portfolioId = 'PORT-GOLDEN-ALPHA';

// 1. Define Mandate Policy V1
let policyV1 = null;
test('Step 1: Create and register immutable Mandate Policy V1', () => {
  policyV1 = PolicyEngine.createPolicy({
    policyId: 'POL-GOLDEN-GROWTH',
    workspaceId,
    name: 'Institutional Global Growth Mandate',
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    rules: [
      { ruleId: 'R-POS-10', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.10, severity: 'HIGH', description: 'Max position 10%' },
      { ruleId: 'R-SEC-TECH', ruleType: PolicyRuleType.SECTOR_LIMIT, targetKey: 'Technology', operator: OperatorType.LTE, threshold: 0.35, severity: 'HIGH', description: 'Max Technology sector 35%' },
      { ruleId: 'R-CASH-MIN', ruleType: PolicyRuleType.CASH_LIMIT, operator: OperatorType.GTE, threshold: 0.05, severity: 'HIGH', description: 'Min cash buffer 5%' },
      { ruleId: 'R-SHORT', ruleType: PolicyRuleType.SHORTING_LIMIT, operator: OperatorType.EQ, threshold: 'PROHIBITED', severity: 'HIGH', description: 'Long-only mandate' }
    ]
  });

  policyRepository.savePolicy(policyV1);
  assert.strictEqual(policyV1.policyVersion, '1.0.0');
  assert.ok(policyV1.policyHash && policyV1.policyHash.length === 64);
});

// 2. Initial Proposal Pre-Action Evaluation
let initialEval = null;
test('Step 2: Pre-action compliance evaluation on proposed portfolio (PASS)', () => {
  initialEval = ComplianceEngine.evaluateCompliance({
    workspaceId,
    portfolioId,
    asOf: '2026-09-01T10:00:00.000Z',
    phase: EvaluationPhase.PRE_ACTION,
    policy: policyV1,
    portfolioState: {
      holdings: [
        { ticker: 'AAPL', weight: 0.08, sector: 'Technology' },
        { ticker: 'MSFT', weight: 0.08, sector: 'Technology' },
        { ticker: 'NVDA', weight: 0.08, sector: 'Technology' }, // Tech sum = 24% <= 35%
        { ticker: 'JPM', weight: 0.08, sector: 'Financials' },
        { ticker: 'CASH', weight: 0.10, sector: 'Cash' }
      ],
      sectors: { AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology', JPM: 'Financials' },
      cashWeight: 0.10
    }
  });

  assert.strictEqual(initialEval.status, ComplianceStatus.PASS);
  assert.strictEqual(initialEval.isCompliant, true);
  assert.strictEqual(initialEval.breachCount, 0);
  complianceRepository.saveEvaluation(initialEval);
});

// 3. Portfolio Drift Injection & Post-Action Detection
let driftEval = null;
test('Step 3: Market price drift causes Tech sector breach to 45% (BREACH)', () => {
  driftEval = ComplianceEngine.evaluateCompliance({
    workspaceId,
    portfolioId,
    asOf: '2026-09-03T12:00:00.000Z',
    phase: EvaluationPhase.POST_ACTION,
    policy: policyV1,
    portfolioState: {
      holdings: [
        { ticker: 'AAPL', weight: 0.15, sector: 'Technology' }, // Pos breach (15% > 10%)
        { ticker: 'MSFT', weight: 0.15, sector: 'Technology' }, // Pos breach (15% > 10%)
        { ticker: 'NVDA', weight: 0.15, sector: 'Technology' }, // Pos breach (15% > 10%) -> Tech sum = 45% > 35%
        { ticker: 'CASH', weight: 0.05, sector: 'Cash' }
      ],
      sectors: { AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology' },
      cashWeight: 0.05
    }
  });

  assert.strictEqual(driftEval.status, ComplianceStatus.BREACH);
  assert.strictEqual(driftEval.isCompliant, false);
  assert.strictEqual(driftEval.breachCount, 2); // 1 max pos breach + 1 sector breach
  complianceRepository.saveEvaluation(driftEval);
});

// 4. Breach Lifecycle Recording
let recordedBreach = null;
test('Step 4: Record and transition detected breach in Breach Lifecycle', () => {
  recordedBreach = BreachEngine.createBreach({
    workspaceId,
    portfolioId,
    ruleId: 'R-SEC-TECH',
    policyId: policyV1.policyId,
    policyVersion: policyV1.policyVersion,
    ruleType: PolicyRuleType.SECTOR_LIMIT,
    actualValue: 0.45,
    threshold: 0.35,
    variance: 0.10,
    explanation: 'Tech sector 45% > 35%'
  });

  assert.strictEqual(recordedBreach.status, BreachStatus.DETECTED);
  complianceRepository.saveBreach(recordedBreach);

  // Acknowledge breach
  recordedBreach = BreachEngine.transitionBreach(recordedBreach, BreachStatus.ACKNOWLEDGED, { actorId: 'USR-ANALYST-1' });
  assert.strictEqual(recordedBreach.status, BreachStatus.ACKNOWLEDGED);
  complianceRepository.saveBreach(recordedBreach);
});

// 5. Analyst Requests Exception & PM Approves
let activeWaiver = null;
test('Step 5: Analyst requests tactical waiver and PM approves', () => {
  const reqWaiver = ExceptionEngine.requestException({
    workspaceId,
    portfolioId,
    policyId: policyV1.policyId,
    policyVersion: policyV1.policyVersion,
    ruleId: 'R-SEC-TECH',
    reason: 'Tactical waiver granted for semiconductor product launch cycle',
    requestedBy: 'USR-ANALYST-1',
    effectiveFrom: '2026-09-03T00:00:00.000Z',
    expiresAt: '2026-09-30T00:00:00.000Z'
  });

  assert.strictEqual(reqWaiver.status, ExceptionStatus.REQUESTED);

  activeWaiver = ExceptionEngine.approveException(reqWaiver, {
    approvedBy: 'USR-PM-CHIEF',
    role: 'PORTFOLIO_MANAGER',
    approvalTimestamp: '2026-09-03T14:00:00.000Z',
    notes: 'Approved 27-day tactical waiver'
  });

  assert.strictEqual(activeWaiver.status, ExceptionStatus.ACTIVE);
  assert.strictEqual(activeWaiver.approvedBy, 'USR-PM-CHIEF');
  complianceRepository.saveException(activeWaiver);
});

// 6. Remediation Proposal Generation
let remediationPlan = null;
test('Step 6: Remediation Engine generates deterministic proposal (Non-Executing)', () => {
  remediationPlan = RemediationEngine.generateRemediationPlan({
    workspaceId,
    portfolioId,
    ruleResults: driftEval.ruleResults,
    asOf: '2026-09-04T09:00:00.000Z'
  });

  assert.ok(remediationPlan.remedialActions.length > 0);
  assert.strictEqual(remediationPlan.isExecutionAuthorized, false); // Invariant
  assert.ok(remediationPlan.planHash && remediationPlan.planHash.length === 64);
});

// 7. Re-Evaluation Post-Remediation (PASS)
let curedEval = null;
test('Step 7: Re-evaluate portfolio post-remediation rebalance (PASS)', () => {
  curedEval = ComplianceEngine.evaluateCompliance({
    workspaceId,
    portfolioId,
    asOf: '2026-09-05T10:00:00.000Z',
    phase: EvaluationPhase.POST_ACTION,
    policy: policyV1,
    portfolioState: {
      holdings: [
        { ticker: 'AAPL', weight: 0.08, sector: 'Technology' },
        { ticker: 'MSFT', weight: 0.08, sector: 'Technology' },
        { ticker: 'NVDA', weight: 0.08, sector: 'Technology' }, // Tech = 24% <= 35%
        { ticker: 'JPM', weight: 0.08, sector: 'Financials' },
        { ticker: 'CASH', weight: 0.10, sector: 'Cash' }
      ],
      sectors: { AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology', JPM: 'Financials' },
      cashWeight: 0.10
    }
  });

  assert.strictEqual(curedEval.status, ComplianceStatus.PASS);
  assert.strictEqual(curedEval.isCompliant, true);
  assert.strictEqual(curedEval.breachCount, 0);

  // Close breach in lifecycle
  recordedBreach = BreachEngine.transitionBreach(recordedBreach, BreachStatus.RESOLVED, { notes: 'Portfolio rebalanced' });
  recordedBreach = BreachEngine.transitionBreach(recordedBreach, BreachStatus.CLOSED);
  assert.strictEqual(recordedBreach.status, BreachStatus.CLOSED);
});

// 8. Build Evidence Graph & Seal Package
let goldenPackage = null;
test('Step 8: Construct audit evidence DAG and seal ComplianceIntelligencePackage', () => {
  const evidenceGraph = ComplianceAuditEngine.buildEvidenceGraph({
    evaluation: curedEval,
    policy: policyV1
  });

  assert.ok(evidenceGraph.graphHash);

  const pkgRes = CompliancePackageBuilder.buildPackage({
    workspaceId,
    portfolioId,
    asOf: curedEval.asOf,
    evaluation: curedEval,
    policy: policyV1,
    evidenceGraph
  });

  goldenPackage = pkgRes.package;
  assert.strictEqual(goldenPackage.complianceStatus, ComplianceStatus.PASS);
  assert.strictEqual(goldenPackage.isCompliant, true);
  assert.ok(goldenPackage.packageHash && goldenPackage.packageHash.length === 64);

  const verify = CompliancePackageBuilder.verifyPackageIntegrity(goldenPackage);
  assert.strictEqual(verify.verified, true);
  complianceRepository.savePackage(goldenPackage);
});

// 9. Read-Only Copilot Inquiry
test('Step 9: Investor Copilot queries sealed package in read-only mode', () => {
  const answer = ComplianceExplanationEngine.answerComplianceQuery(curedEval, 'WHY_NON_COMPLIANT');
  assert.ok(answer.answer.includes('fully compliant'));
  assert.ok(answer.evidenceIds.length > 0);
});

// 10. Audit Logging and Invariant Verification
test('Step 10: Verify Phase 9 audit integration and non-execution invariant', () => {
  const auditEvent = ComplianceAuditEngine.logComplianceEvent({
    workspaceId,
    portfolioId,
    action: 'GOLDEN_E2E_COMPLIANCE_SEALED',
    evaluationId: curedEval.complianceId,
    metadata: { packageHash: goldenPackage.packageHash }
  });

  assert.ok(auditEvent.id || auditEvent.eventId);
  assert.strictEqual(auditEvent.metadata.isTradeExecuted, false);
});

console.log(`\nPASSED: ${passCount}/10 assertions in Golden E2E Trace`);
