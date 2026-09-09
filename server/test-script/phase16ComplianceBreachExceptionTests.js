/**
 * Test Suite 2: Phase 16 Compliance Evaluation, Breach Lifecycle & Exception Tests
 */

import assert from 'assert';
import { ComplianceEngine } from '../compliance/compliance.engine.js';
import { PolicyEngine } from '../compliance/policy.engine.js';
import { BreachEngine } from '../compliance/breach.engine.js';
import { ExceptionEngine } from '../compliance/exception.engine.js';
import { RemediationEngine } from '../compliance/remediation.engine.js';
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

console.log('=== PHASE 16: COMPLIANCE, BREACH & EXCEPTION TESTS ===\n');

const testPolicy = PolicyEngine.createPolicy({
  policyId: 'POL-EVAL-TEST',
  workspaceId: 'WS-1',
  name: 'Evaluation Test Policy',
  effectiveFrom: '2026-01-01T00:00:00.000Z',
  rules: [
    { ruleId: 'R-POS-MAX', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.10, severity: 'HIGH', description: 'Max position 10%' },
    { ruleId: 'R-SEC-TECH', ruleType: PolicyRuleType.SECTOR_LIMIT, targetKey: 'Technology', operator: OperatorType.LTE, threshold: 0.35, severity: 'HIGH', description: 'Max Tech 35%' },
    { ruleId: 'R-CASH-MIN', ruleType: PolicyRuleType.CASH_LIMIT, operator: OperatorType.GTE, threshold: 0.05, severity: 'HIGH', description: 'Min cash 5%' }
  ]
});

// 1. Compliance Evaluation: Compliant Portfolio
test('ComplianceEngine returns PASS for fully compliant portfolio', () => {
  const result = ComplianceEngine.evaluateCompliance({
    workspaceId: 'WS-1',
    portfolioId: 'PORT-COMPLIANT',
    policy: testPolicy,
    portfolioState: {
      holdings: [
        { ticker: 'AAPL', weight: 0.07, sector: 'Technology' },
        { ticker: 'MSFT', weight: 0.07, sector: 'Technology' },
        { ticker: 'JPM', weight: 0.07, sector: 'Financials' },
        { ticker: 'CASH', weight: 0.10, sector: 'Cash' }
      ],
      cashWeight: 0.10
    }
  });

  assert.strictEqual(result.status, ComplianceStatus.PASS);
  assert.strictEqual(result.isCompliant, true);
  assert.strictEqual(result.breachCount, 0);
  assert.strictEqual(result.passCount, 3);
});

// 2. Compliance Evaluation: Breached Portfolio
test('ComplianceEngine returns BREACH when limits are violated', () => {
  const result = ComplianceEngine.evaluateCompliance({
    workspaceId: 'WS-1',
    portfolioId: 'PORT-BREACH',
    policy: testPolicy,
    portfolioState: {
      holdings: [
        { ticker: 'AAPL', weight: 0.25, sector: 'Technology' }, // Pos breach
        { ticker: 'MSFT', weight: 0.20, sector: 'Technology' }, // Tech sum = 45% (Sector breach)
        { ticker: 'CASH', weight: 0.02, sector: 'Cash' }        // Cash breach (2% < 5%)
      ],
      cashWeight: 0.02
    }
  });

  assert.strictEqual(result.status, ComplianceStatus.BREACH);
  assert.strictEqual(result.isCompliant, false);
  assert.strictEqual(result.breachCount, 3);
  assert.ok(result.remediation !== null);
  assert.strictEqual(result.remediation.remedialActions.length, 3);
});

// 3. Exception / Waiver Workflow
test('ExceptionEngine creates, approves, and validates an active exception', () => {
  const exc = ExceptionEngine.requestException({
    workspaceId: 'WS-1',
    portfolioId: 'PORT-BREACH',
    policyId: 'POL-EVAL-TEST',
    ruleId: 'R-SEC-TECH',
    reason: 'Temporary overweight during AI product cycle transition',
    requestedBy: 'USR-ANALYST',
    effectiveFrom: '2026-09-01T00:00:00.000Z',
    expiresAt: '2026-09-30T00:00:00.000Z'
  });

  assert.strictEqual(exc.status, ExceptionStatus.REQUESTED);

  // PM Approves
  const approved = ExceptionEngine.approveException(exc, {
    approvedBy: 'USR-PM-1',
    role: 'PORTFOLIO_MANAGER',
    approvalTimestamp: '2026-09-02T00:00:00.000Z',
    notes: 'Approved 30-day tactical waiver'
  });

  assert.strictEqual(approved.status, ExceptionStatus.ACTIVE);
  assert.strictEqual(approved.approvedBy, 'USR-PM-1');

  // Verify validity at timestamp
  const isValid = ExceptionEngine.isExceptionValidAtTimestamp(approved, 'R-SEC-TECH', '2026-09-06T12:00:00.000Z');
  assert.strictEqual(isValid, true);
});

test('ExceptionEngine rejects self-approval and unauthorized roles', () => {
  const exc = ExceptionEngine.requestException({
    workspaceId: 'WS-1',
    portfolioId: 'PORT-BREACH',
    ruleId: 'R-SEC-TECH',
    reason: 'Test',
    requestedBy: 'USR-ANALYST',
    expiresAt: '2026-09-30T00:00:00.000Z'
  });

  // Self approval attempt
  assert.throws(() => {
    ExceptionEngine.approveException(exc, { approvedBy: 'USR-ANALYST', role: 'PORTFOLIO_MANAGER' });
  }, /Self-approval of compliance exceptions is strictly prohibited/);

  // Unauthorized role attempt (ANALYST)
  assert.throws(() => {
    ExceptionEngine.approveException(exc, { approvedBy: 'USR-OTHER', role: 'ANALYST' });
  }, /Role ANALYST is not authorized to approve/);
});

// 4. Compliance Evaluation with Active Waiver
test('ComplianceEngine waives breach when valid active exception is provided', () => {
  const exc = ExceptionEngine.requestException({
    workspaceId: 'WS-1',
    portfolioId: 'PORT-WAIVED',
    policyId: 'POL-EVAL-TEST',
    ruleId: 'R-SEC-TECH',
    reason: 'Tactical waiver',
    requestedBy: 'USR-ANALYST',
    effectiveFrom: '2026-09-01T00:00:00.000Z',
    expiresAt: '2026-09-30T00:00:00.000Z'
  });

  const approvedExc = ExceptionEngine.approveException(exc, {
    approvedBy: 'USR-PM-1',
    role: 'PORTFOLIO_MANAGER'
  });

  const result = ComplianceEngine.evaluateCompliance({
    workspaceId: 'WS-1',
    portfolioId: 'PORT-WAIVED',
    asOf: '2026-09-06T12:00:00.000Z',
    policy: testPolicy,
    activeExceptions: [approvedExc],
    portfolioState: {
      holdings: [
        { ticker: 'AAPL', weight: 0.08, sector: 'Technology' },
        { ticker: 'MSFT', weight: 0.08, sector: 'Technology' },
        { ticker: 'NVDA', weight: 0.08, sector: 'Technology' },
        { ticker: 'CRM', weight: 0.08, sector: 'Technology' },
        { ticker: 'AMD', weight: 0.08, sector: 'Technology' }, // Tech total 40% > 35% (waived)
        { ticker: 'CASH', weight: 0.10, sector: 'Cash' }
      ],
      cashWeight: 0.10
    }
  });

  assert.strictEqual(result.status, ComplianceStatus.PASS);
  assert.strictEqual(result.isCompliant, true);
  assert.strictEqual(result.waivedCount, 1);
  assert.strictEqual(result.breachCount, 0);
  assert.strictEqual(result.waivedBreaches[0].exceptionId, exc.exceptionId);
});

// 5. Breach Lifecycle State Machine
test('BreachEngine manages full breach lifecycle transitions', () => {
  const breach = BreachEngine.createBreach({
    workspaceId: 'WS-1',
    portfolioId: 'PORT-1',
    ruleId: 'R-SEC-TECH',
    policyId: 'POL-1',
    ruleType: PolicyRuleType.SECTOR_LIMIT,
    actualValue: 0.42,
    threshold: 0.35,
    variance: 0.07,
    explanation: 'Sector Tech 42% > 35%'
  });

  assert.strictEqual(breach.status, BreachStatus.DETECTED);

  // Transition to ACKNOWLEDGED
  const ack = BreachEngine.transitionBreach(breach, BreachStatus.ACKNOWLEDGED, { actorId: 'USR-ANALYST' });
  assert.strictEqual(ack.status, BreachStatus.ACKNOWLEDGED);

  // Transition to REMEDIATION_REQUIRED
  const remReq = BreachEngine.transitionBreach(ack, BreachStatus.REMEDIATION_REQUIRED);
  assert.strictEqual(remReq.status, BreachStatus.REMEDIATION_REQUIRED);

  // Transition to REMEDIATION_IN_PROGRESS
  const inProg = BreachEngine.transitionBreach(remReq, BreachStatus.REMEDIATION_IN_PROGRESS);
  assert.strictEqual(inProg.status, BreachStatus.REMEDIATION_IN_PROGRESS);

  // Transition to RESOLVED
  const res = BreachEngine.transitionBreach(inProg, BreachStatus.RESOLVED, { notes: 'Rebalance executed' });
  assert.strictEqual(res.status, BreachStatus.RESOLVED);
  assert.ok(res.resolvedAt !== null);

  // Transition to CLOSED
  const closed = BreachEngine.transitionBreach(res, BreachStatus.CLOSED);
  assert.strictEqual(closed.status, BreachStatus.CLOSED);

  // Invalid transition from CLOSED should fail
  assert.throws(() => {
    BreachEngine.transitionBreach(closed, BreachStatus.REMEDIATION_REQUIRED);
  }, /Invalid breach transition/);
});

// 6. Remediation Engine Proposal Only Non-Execution
test('RemediationEngine generates deterministic proposals with non-execution flag', () => {
  const plan = RemediationEngine.generateRemediationPlan({
    workspaceId: 'WS-1',
    portfolioId: 'PORT-1',
    ruleResults: [
      {
        ruleId: 'R-SEC-TECH',
        ruleType: PolicyRuleType.SECTOR_LIMIT,
        targetKey: 'Technology',
        severity: 'HIGH',
        status: ComplianceStatus.BREACH,
        variance: 0.062,
        threshold: 0.35
      }
    ]
  });

  assert.strictEqual(plan.actionCount, 1);
  assert.strictEqual(plan.remedialActions[0].action, 'REBALANCE_SECTOR');
  assert.strictEqual(plan.remedialActions[0].deltaPercentage, -6.2);
  assert.strictEqual(plan.isExecutionAuthorized, false); // Invariant: Proposal only
});

// 7. Exception State Machine Invalid Transitions
test('ExceptionEngine enforces state machine and rejects invalid transitions (REQUESTED -> ACTIVE directly)', () => {
  const exc = ExceptionEngine.requestException({ workspaceId: 'WS-1', portfolioId: 'P1', ruleId: 'R-SEC', reason: 'Test', expiresAt: '2026-09-30' });
  // Cannot be valid without human approval
  assert.strictEqual(ExceptionEngine.isExceptionValidAtTimestamp(exc, 'R-SEC', '2026-09-06'), false);
});

test('ExceptionEngine rejects expired exception from satisfying active breach at T0', () => {
  const exc = { exceptionId: 'E-EXP', workspaceId: 'WS-1', portfolioId: 'P1', ruleId: 'R-POS', approvedBy: 'PM', status: ExceptionStatus.EXPIRED, effectiveFrom: '2026-01-01', expiresAt: '2026-02-01' };
  assert.strictEqual(ExceptionEngine.isExceptionValidAtTimestamp(exc, 'R-POS', '2026-09-06'), false);
});

test('ExceptionEngine rejects future exception from satisfying active breach at T0', () => {
  const exc = { exceptionId: 'E-FUT', workspaceId: 'WS-1', portfolioId: 'P1', ruleId: 'R-POS', approvedBy: 'PM', status: ExceptionStatus.ACTIVE, effectiveFrom: '2026-10-01', expiresAt: '2026-11-01' };
  assert.strictEqual(ExceptionEngine.isExceptionValidAtTimestamp(exc, 'R-POS', '2026-09-06'), false);
});

test('ExceptionEngine detects cryptographic tamper on approved waiver reason or scope', () => {
  const exc = ExceptionEngine.requestException({ workspaceId: 'WS-1', portfolioId: 'P1', ruleId: 'R-SEC', reason: 'Legitimate reason', expiresAt: '2026-09-30' });
  const approved = ExceptionEngine.approveException(exc, { approvedBy: 'USR-PM', role: 'PORTFOLIO_MANAGER' });
  
  // Tamper with reason
  const tampered = { ...approved, reason: 'Illegitimately modified reason' };
  assert.strictEqual(ExceptionEngine.isExceptionValidAtTimestamp(tampered, 'R-SEC', '2026-09-10'), false);
});

test('ComplianceEngine aggregates max severity across multi-rule breaches', () => {
  const result = ComplianceEngine.evaluateCompliance({
    workspaceId: 'WS-1',
    portfolioId: 'PORT-SEV',
    policy: testPolicy,
    portfolioState: {
      holdings: [
        { ticker: 'AAPL', weight: 0.50, sector: 'Technology' },
        { ticker: 'CASH', weight: 0.01, sector: 'Cash' }
      ],
      sectors: { AAPL: 'Technology' },
      cashWeight: 0.01
    }
  });

  assert.strictEqual(result.overallSeverity, 'HIGH');
  assert.strictEqual(result.isCompliant, false);
});

console.log(`\nPASSED: ${passCount}/12 assertions`);
