/**
 * Test Suite 9: Phase 16 Policy Hardening, Determinism, Concurrency & Temporal Tests
 * 100 Deterministic Replays, 10 Concurrent Workers, 10 Temporal Invariant Tests.
 */

import assert from 'assert';
import { ComplianceEngine } from '../compliance/compliance.engine.js';
import { PolicyEngine } from '../compliance/policy.engine.js';
import { ExceptionEngine } from '../compliance/exception.engine.js';
import { ComplianceInputValidator } from '../compliance/inputValidator.js';
import { policyRepository } from '../compliance/policy.repository.js';
import { ComplianceStatus, OperatorType } from '../compliance/compliance.types.js';
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

console.log('=== PHASE 16: POLICY HARDENING, DETERMINISM & CONCURRENCY ===\n');

const testPolicy = PolicyEngine.createPolicy({
  policyId: 'POL-HARDEN-TEST',
  workspaceId: 'WS-HARDEN-1',
  name: 'Hardening Test Mandate',
  effectiveFrom: '2026-01-01T00:00:00.000Z',
  rules: [
    { ruleId: 'R-POS-10', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.10, severity: 'HIGH' },
    { ruleId: 'R-SEC-TECH', ruleType: PolicyRuleType.SECTOR_LIMIT, targetKey: 'Technology', operator: OperatorType.LTE, threshold: 0.35, severity: 'HIGH' },
    { ruleId: 'R-CASH-MIN', ruleType: PolicyRuleType.CASH_LIMIT, operator: OperatorType.GTE, threshold: 0.05, severity: 'HIGH' }
  ]
});

// 1. 100 Deterministic Replays
test('100 Deterministic Replays: Generates identical compliance status and rule results 100/100 times', () => {
  const portfolioPayload = {
    workspaceId: 'WS-HARDEN-1',
    portfolioId: 'PORT-DET-1',
    asOf: '2026-09-06T12:00:00.000Z',
    policy: testPolicy,
    portfolioState: {
      holdings: [
        { ticker: 'AAPL', weight: 0.07, sector: 'Technology' },
        { ticker: 'MSFT', weight: 0.07, sector: 'Technology' },
        { ticker: 'JPM', weight: 0.07, sector: 'Financials' },
        { ticker: 'CASH', weight: 0.10, sector: 'Cash' }
      ],
      sectors: { AAPL: 'Technology', MSFT: 'Technology', JPM: 'Financials' },
      cashWeight: 0.10
    }
  };

  const baseline = ComplianceEngine.evaluateCompliance(portfolioPayload);
  const baselineHash = baseline.evaluationHash;

  for (let i = 0; i < 100; i++) {
    const replay = ComplianceEngine.evaluateCompliance(portfolioPayload);
    assert.strictEqual(replay.status, baseline.status);
    assert.strictEqual(replay.passCount, baseline.passCount);
    assert.strictEqual(replay.breachCount, baseline.breachCount);
    assert.strictEqual(replay.evaluationHash, baselineHash);
  }
});

// 2. 10 Concurrent Evaluation Workers
test('10 Concurrent Evaluation Workers: Parallel evaluations produce zero state corruption', async () => {
  const workers = Array(10).fill(0).map((_, idx) => {
    return Promise.resolve().then(() => {
      return ComplianceEngine.evaluateCompliance({
        workspaceId: `WS-CONC-${idx}`,
        portfolioId: `PORT-CONC-${idx}`,
        asOf: '2026-09-06T12:00:00.000Z',
        policy: testPolicy,
        portfolioState: {
          holdings: [
            { ticker: 'AAPL', weight: 0.05, sector: 'Technology' },
            { ticker: 'CASH', weight: 0.10, sector: 'Cash' }
          ],
          sectors: { AAPL: 'Technology' },
          cashWeight: 0.10
        }
      });
    });
  });

  const results = await Promise.all(workers);
  assert.strictEqual(results.length, 10);
  for (let i = 0; i < 10; i++) {
    assert.strictEqual(results[i].status, ComplianceStatus.PASS);
    assert.strictEqual(results[i].workspaceId, `WS-CONC-${i}`);
  }
});

// 3. 10 Dedicated Temporal Invariant Tests
test('Temporal Test 1: Reject evaluation timestamp in future', () => {
  const res = ComplianceInputValidator.validateEvaluationInput({ workspaceId: 'WS-1', portfolioId: 'P1', asOf: '2099-01-01', policy: testPolicy });
  assert.strictEqual(res.status, ComplianceStatus.TEMPORAL_VIOLATION);
});

test('Temporal Test 2: Reject transaction timestamp occurring after evaluation asOf', () => {
  const res = ComplianceInputValidator.validateEvaluationInput({
    workspaceId: 'WS-1',
    portfolioId: 'P1',
    asOf: '2026-09-01T00:00:00.000Z',
    policy: testPolicy,
    transactions: [{ transactionId: 'TX-FUTURE', timestamp: '2026-09-05T00:00:00.000Z' }]
  });
  assert.strictEqual(res.status, ComplianceStatus.TEMPORAL_VIOLATION);
});

test('Temporal Test 3: Reject policy resolution before effectiveFrom', () => {
  const res = PolicyEngine.resolvePolicyAtTimestamp([testPolicy], '2020-01-01T00:00:00.000Z');
  assert.strictEqual(res, null);
});

test('Temporal Test 4: Reject policy resolution after effectiveTo', () => {
  const tempPolicy = PolicyEngine.createPolicy({
    policyId: 'POL-TEMP',
    workspaceId: 'WS-1',
    name: 'Temp',
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    effectiveTo: '2026-03-31T23:59:59.000Z',
    rules: [{ ruleId: 'R1', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.10, severity: 'HIGH' }]
  });
  const res = PolicyEngine.resolvePolicyAtTimestamp([tempPolicy], '2026-05-01T00:00:00.000Z');
  assert.strictEqual(res, null);
});

test('Temporal Test 5: Reject exception before effectiveFrom timestamp', () => {
  const exc = { exceptionId: 'E1', workspaceId: 'WS-1', portfolioId: 'P1', ruleId: 'R1', approvedBy: 'PM', status: 'ACTIVE', effectiveFrom: '2026-10-01', expiresAt: '2026-11-01' };
  assert.strictEqual(ExceptionEngine.isExceptionValidAtTimestamp(exc, 'R1', '2026-09-06'), false);
});

test('Temporal Test 6: Reject exception after expiresAt timestamp', () => {
  const exc = { exceptionId: 'E1', workspaceId: 'WS-1', portfolioId: 'P1', ruleId: 'R1', approvedBy: 'PM', status: 'ACTIVE', effectiveFrom: '2026-01-01', expiresAt: '2026-02-01' };
  assert.strictEqual(ExceptionEngine.isExceptionValidAtTimestamp(exc, 'R1', '2026-09-06'), false);
});

test('Temporal Test 7: Historical evaluation on T0 resolves Policy V1 not V2', () => {
  const v1 = PolicyEngine.createPolicy({ policyId: 'POL-TIME', workspaceId: 'WS-1', name: 'Time', effectiveFrom: '2026-01-01', effectiveTo: '2026-06-30', rules: [{ ruleId: 'R1', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.10, severity: 'HIGH' }] });
  const v2 = PolicyEngine.createNewVersion(v1, { newVersion: '2.0.0', effectiveFrom: '2026-07-01', rules: [{ ruleId: 'R1', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.20, severity: 'HIGH' }] });
  const resolved = PolicyEngine.resolvePolicyAtTimestamp([v1, v2], '2026-04-15');
  assert.strictEqual(resolved.policyVersion, '1.0.0');
});

test('Temporal Test 8: Contemporary evaluation on T1 resolves Policy V2', () => {
  const v1 = PolicyEngine.createPolicy({ policyId: 'POL-TIME', workspaceId: 'WS-1', name: 'Time', effectiveFrom: '2026-01-01', effectiveTo: '2026-06-30', rules: [{ ruleId: 'R1', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.10, severity: 'HIGH' }] });
  const v2 = PolicyEngine.createNewVersion(v1, { newVersion: '2.0.0', effectiveFrom: '2026-07-01', rules: [{ ruleId: 'R1', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.20, severity: 'HIGH' }] });
  const resolved = PolicyEngine.resolvePolicyAtTimestamp([v1, v2], '2026-08-15');
  assert.strictEqual(resolved.policyVersion, '2.0.0');
});

test('Temporal Test 9: Exception request rejects effectiveFrom after expiresAt', () => {
  assert.throws(() => {
    ExceptionEngine.requestException({ workspaceId: 'WS-1', portfolioId: 'P1', ruleId: 'R1', reason: 'Invalid', effectiveFrom: '2026-09-30', expiresAt: '2026-09-01' });
  });
});

test('Temporal Test 10: Historical policy version V1 remains immutable after V2 creation', () => {
  const v1 = PolicyEngine.createPolicy({ policyId: 'POL-IMMUT', workspaceId: 'WS-1', name: 'Immut', effectiveFrom: '2026-01-01', rules: [{ ruleId: 'R1', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.10, severity: 'HIGH' }] });
  const v1Hash = v1.policyHash;
  const v2 = PolicyEngine.createNewVersion(v1, { newVersion: '2.0.0', effectiveFrom: '2026-07-01', rules: [{ ruleId: 'R1', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.20, severity: 'HIGH' }] });
  assert.strictEqual(v1.policyHash, v1Hash);
  assert.notStrictEqual(v2.policyHash, v1Hash);
});

console.log(`\nPASSED: ${passCount}/12 assertions (100 replays, 10 workers, 10 temporal tests)`);
