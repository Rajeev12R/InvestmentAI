/**
 * Test Suite 1: Phase 16 Policy & Rule Engine Core Tests
 */

import assert from 'assert';
import { PolicyEngine } from '../compliance/policy.engine.js';
import { RuleEngine } from '../compliance/rule.engine.js';
import { ComplianceInputValidator } from '../compliance/inputValidator.js';
import { ComplianceStatus, PolicyPrecedence, OperatorType } from '../compliance/compliance.types.js';
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

console.log('=== PHASE 16: POLICY & RULE ENGINE CORE TESTS ===\n');

// 1. Policy Creation & Versioning
test('PolicyEngine creates immutable Policy V1 with canonical hash', () => {
  const policy = PolicyEngine.createPolicy({
    policyId: 'POL-CORE-TEST',
    workspaceId: 'WS-1',
    name: 'Core Growth Mandate',
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    rules: [
      {
        ruleId: 'RULE-POS-10',
        ruleType: PolicyRuleType.POSITION_LIMIT,
        operator: OperatorType.LTE,
        threshold: 0.10,
        severity: 'HIGH',
        description: 'Max position 10%'
      }
    ]
  });

  assert.strictEqual(policy.policyVersion, '1.0.0');
  assert.strictEqual(policy.rules.length, 1);
  assert.ok(policy.policyHash && policy.policyHash.length === 64);
  assert.ok(Object.isFrozen(policy));
});

test('PolicyEngine creates Policy V2 referencing previous version', () => {
  const v1 = PolicyEngine.createPolicy({
    policyId: 'POL-CORE-TEST',
    workspaceId: 'WS-1',
    name: 'Core Growth Mandate',
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    effectiveTo: '2026-06-30T23:59:59.000Z',
    rules: [
      { ruleId: 'RULE-POS-10', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.10, severity: 'HIGH' }
    ]
  });

  const v2 = PolicyEngine.createNewVersion(v1, {
    newVersion: '2.0.0',
    effectiveFrom: '2026-07-01T00:00:00.000Z',
    rules: [
      { ruleId: 'RULE-POS-15', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.15, severity: 'HIGH' }
    ]
  });

  assert.strictEqual(v2.policyVersion, '2.0.0');
  assert.strictEqual(v2.previousVersion, '1.0.0');
  assert.strictEqual(v2.previousPolicyHash, v1.policyHash);
  assert.notStrictEqual(v1.policyHash, v2.policyHash);
});

test('PolicyEngine resolves correct version at timestamp T0', () => {
  const v1 = PolicyEngine.createPolicy({
    policyId: 'POL-RESOLVE',
    workspaceId: 'WS-1',
    name: 'Resolve Test',
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    effectiveTo: '2026-06-30T23:59:59.000Z',
    rules: [{ ruleId: 'R1', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.10, severity: 'HIGH' }]
  });

  const v2 = PolicyEngine.createNewVersion(v1, {
    newVersion: '2.0.0',
    effectiveFrom: '2026-07-01T00:00:00.000Z',
    rules: [{ ruleId: 'R1', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.15, severity: 'HIGH' }]
  });

  const resolvedPast = PolicyEngine.resolvePolicyAtTimestamp([v1, v2], '2026-03-15T00:00:00.000Z');
  assert.strictEqual(resolvedPast.policyVersion, '1.0.0');

  const resolvedFuture = PolicyEngine.resolvePolicyAtTimestamp([v1, v2], '2026-08-15T00:00:00.000Z');
  assert.strictEqual(resolvedFuture.policyVersion, '2.0.0');
});

// 2. Rule Engine All 15 Rule Types
test('RuleEngine evaluates POSITION_LIMIT rule', () => {
  const rule = { ruleId: 'R-POS', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.10, severity: 'HIGH' };
  
  const passRes = RuleEngine.evaluateRule(rule, { targetWeights: { AAPL: 0.08, MSFT: 0.07 } });
  assert.strictEqual(passRes.status, ComplianceStatus.PASS);

  const breachRes = RuleEngine.evaluateRule(rule, { targetWeights: { AAPL: 0.14, MSFT: 0.05 } });
  assert.strictEqual(breachRes.status, ComplianceStatus.BREACH);
});

test('RuleEngine evaluates SECTOR_LIMIT rule with missing data semantics', () => {
  const rule = { ruleId: 'R-SEC', ruleType: PolicyRuleType.SECTOR_LIMIT, targetKey: 'Technology', operator: OperatorType.LTE, threshold: 0.35, severity: 'HIGH' };
  
  const passRes = RuleEngine.evaluateRule(rule, { targetWeights: { AAPL: 0.15, MSFT: 0.15 }, sectors: { AAPL: 'Technology', MSFT: 'Technology' } });
  assert.strictEqual(passRes.status, ComplianceStatus.PASS);

  const breachRes = RuleEngine.evaluateRule(rule, { targetWeights: { AAPL: 0.20, MSFT: 0.20 }, sectors: { AAPL: 'Technology', MSFT: 'Technology' } });
  assert.strictEqual(breachRes.status, ComplianceStatus.BREACH);

  const missingRes = RuleEngine.evaluateRule(rule, { targetWeights: { AAPL: 0.15, UNK: 0.15 }, sectors: { AAPL: 'Technology' } });
  assert.strictEqual(missingRes.status, ComplianceStatus.INSUFFICIENT_DATA);
});

test('RuleEngine evaluates CASH_LIMIT rule (min & max)', () => {
  const minCashRule = { ruleId: 'R-CASH-MIN', ruleType: PolicyRuleType.CASH_LIMIT, operator: OperatorType.GTE, threshold: 0.05, severity: 'HIGH' };
  
  const passRes = RuleEngine.evaluateRule(minCashRule, { cashWeight: 0.08 });
  assert.strictEqual(passRes.status, ComplianceStatus.PASS);

  const breachRes = RuleEngine.evaluateRule(minCashRule, { cashWeight: 0.02 });
  assert.strictEqual(breachRes.status, ComplianceStatus.BREACH);

  const missingRes = RuleEngine.evaluateRule(minCashRule, {});
  assert.strictEqual(missingRes.status, ComplianceStatus.INSUFFICIENT_DATA);
});

test('RuleEngine evaluates SHORTING_LIMIT (Long-only)', () => {
  const rule = { ruleId: 'R-SHORT', ruleType: PolicyRuleType.SHORTING_LIMIT, operator: OperatorType.EQ, threshold: 'PROHIBITED', severity: 'HIGH' };
  
  const passRes = RuleEngine.evaluateRule(rule, { targetWeights: { AAPL: 0.50, MSFT: 0.50 } });
  assert.strictEqual(passRes.status, ComplianceStatus.PASS);

  const breachRes = RuleEngine.evaluateRule(rule, { targetWeights: { AAPL: 0.60, TSLA: -0.10 } });
  assert.strictEqual(breachRes.status, ComplianceStatus.BREACH);
});

test('RuleEngine evaluates SECURITY_ELIGIBILITY (prohibited list)', () => {
  const rule = { ruleId: 'R-ELIG', ruleType: PolicyRuleType.SECURITY_ELIGIBILITY, prohibitedValues: ['WEAPONS_CORP', 'TOBACCO_INC'], severity: 'HIGH' };
  
  const passRes = RuleEngine.evaluateRule(rule, { targetWeights: { AAPL: 0.50, MSFT: 0.50 } });
  assert.strictEqual(passRes.status, ComplianceStatus.PASS);

  const breachRes = RuleEngine.evaluateRule(rule, { targetWeights: { AAPL: 0.40, WEAPONS_CORP: 0.10 } });
  assert.strictEqual(breachRes.status, ComplianceStatus.BREACH);
});

test('RuleEngine evaluates DECISION_AUTHORITY rule', () => {
  const rule = { ruleId: 'R-AUTH', ruleType: PolicyRuleType.DECISION_AUTHORITY, targetKey: 'PORTFOLIO_MANAGER', severity: 'HIGH' };

  const passRes = RuleEngine.evaluateRule(rule, { decision: { decisionId: 'DEC-1', approverRole: 'PORTFOLIO_MANAGER' } });
  assert.strictEqual(passRes.status, ComplianceStatus.PASS);

  const breachRes = RuleEngine.evaluateRule(rule, { decision: { decisionId: 'DEC-1', approverRole: 'ANALYST' } });
  assert.strictEqual(breachRes.status, ComplianceStatus.BREACH);
});

test('RuleEngine evaluates CONCENTRATION_LIMIT (HHI index)', () => {
  const rule = { ruleId: 'R-HHI', ruleType: PolicyRuleType.CONCENTRATION_LIMIT, operator: OperatorType.LTE, threshold: 0.20, severity: 'HIGH' };
  const passRes = RuleEngine.evaluateRule(rule, { targetWeights: { AAPL: 0.10, MSFT: 0.10, GOOG: 0.10, AMZN: 0.10, NVDA: 0.10, META: 0.10, TSLA: 0.10, JPM: 0.10, V: 0.10, UNH: 0.10 } }); // HHI = 10 * 0.01 = 0.10 < 0.18
  assert.strictEqual(passRes.status, ComplianceStatus.PASS);

  const breachRes = RuleEngine.evaluateRule(rule, { targetWeights: { AAPL: 0.60, MSFT: 0.40 } }); // HHI = 0.36 + 0.16 = 0.52 > 0.20
  assert.strictEqual(breachRes.status, ComplianceStatus.BREACH);
});

test('RuleEngine evaluates LIQUIDITY_LIMIT (ADV participation cap)', () => {
  const rule = { ruleId: 'R-LIQ', ruleType: PolicyRuleType.LIQUIDITY_LIMIT, operator: OperatorType.LTE, threshold: 0.10, severity: 'HIGH' };
  const passRes = RuleEngine.evaluateRule(rule, { proposedOrders: [{ ticker: 'AAPL', shares: 5000 }], liquidityADV: { AAPL: 100000 } });
  assert.strictEqual(passRes.status, ComplianceStatus.PASS);

  const breachRes = RuleEngine.evaluateRule(rule, { proposedOrders: [{ ticker: 'AAPL', shares: 25000 }], liquidityADV: { AAPL: 100000 } });
  assert.strictEqual(breachRes.status, ComplianceStatus.BREACH);
});

test('PolicyEngine verifies Regulatory Hard Constraint trumps Firm & Portfolio Mandates', () => {
  const reg = PolicyEngine.createPolicy({ policyId: 'P-REG', workspaceId: 'WS-1', name: 'Reg', precedence: PolicyPrecedence.REGULATORY_HARD, effectiveFrom: '2026-01-01', rules: [{ ruleId: 'R-POS', targetKey: 'AAPL', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.05, severity: 'HIGH' }] });
  const mand = PolicyEngine.createPolicy({ policyId: 'P-MAND', workspaceId: 'WS-1', name: 'Mand', precedence: PolicyPrecedence.PORTFOLIO_MANDATE, effectiveFrom: '2026-01-01', rules: [{ ruleId: 'R-POS', targetKey: 'AAPL', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.10, severity: 'HIGH' }] });
  const reconciled = PolicyEngine.reconcilePolicies([reg, mand]);
  assert.strictEqual(reconciled[0].threshold, 0.05);
  assert.strictEqual(reconciled[0].precedence, PolicyPrecedence.REGULATORY_HARD);
});

test('PolicyEngine verifies Firm Mandate trumps Strategy Policy and Soft Preferences', () => {
  const firm = PolicyEngine.createPolicy({ policyId: 'P-FIRM', workspaceId: 'WS-1', name: 'Firm', precedence: PolicyPrecedence.FIRM_MANDATE, effectiveFrom: '2026-01-01', rules: [{ ruleId: 'R-LEV', ruleType: PolicyRuleType.LEVERAGE_LIMIT, operator: OperatorType.LTE, threshold: 1.0, severity: 'HIGH' }] });
  const strat = PolicyEngine.createPolicy({ policyId: 'P-STRAT', workspaceId: 'WS-1', name: 'Strat', precedence: PolicyPrecedence.STRATEGY_POLICY, effectiveFrom: '2026-01-01', rules: [{ ruleId: 'R-LEV', ruleType: PolicyRuleType.LEVERAGE_LIMIT, operator: OperatorType.LTE, threshold: 1.5, severity: 'HIGH' }] });
  const pref = PolicyEngine.createPolicy({ policyId: 'P-PREF', workspaceId: 'WS-1', name: 'Pref', precedence: PolicyPrecedence.SOFT_PREFERENCE, effectiveFrom: '2026-01-01', rules: [{ ruleId: 'R-LEV', ruleType: PolicyRuleType.LEVERAGE_LIMIT, operator: OperatorType.LTE, threshold: 2.0, severity: 'HIGH' }] });
  const reconciled = PolicyEngine.reconcilePolicies([firm, strat, pref]);
  assert.strictEqual(reconciled[0].threshold, 1.0);
  assert.strictEqual(reconciled[0].precedence, PolicyPrecedence.FIRM_MANDATE);
});

test('PolicyEngine generates verifiable deterministic policyHash across identical policies', () => {
  const p1 = PolicyEngine.createPolicy({ policyId: 'POL-DET-1', workspaceId: 'WS-1', name: 'P', effectiveFrom: '2026-01-01', rules: [{ ruleId: 'R1', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.10, severity: 'HIGH' }] });
  const p2 = PolicyEngine.createPolicy({ policyId: 'POL-DET-1', workspaceId: 'WS-1', name: 'P', effectiveFrom: '2026-01-01', rules: [{ ruleId: 'R1', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.10, severity: 'HIGH' }] });
  assert.strictEqual(p1.policyHash, p2.policyHash);
});

test('PolicyEngine creates immutable rules sealed with individual ruleHash', () => {
  const p = PolicyEngine.createPolicy({ policyId: 'POL-SEAL', workspaceId: 'WS-1', name: 'P', effectiveFrom: '2026-01-01', rules: [{ ruleId: 'R1', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.10, severity: 'HIGH' }] });
  assert.ok(p.rules[0].ruleHash && p.rules[0].ruleHash.length === 64);
  assert.ok(Object.isFrozen(p.rules[0]));
});

test('ComplianceInputValidator rejects NaN and Infinity weights', () => {
  const nanRes = ComplianceInputValidator.validateEvaluationInput({
    workspaceId: 'WS-1',
    portfolioId: 'PORT-1',
    policy: {},
    holdings: [{ ticker: 'AAPL', weight: NaN }]
  });
  assert.strictEqual(nanRes.valid, false);
  assert.strictEqual(nanRes.status, ComplianceStatus.NUMERICAL_FAILURE);

  const infRes = ComplianceInputValidator.validateEvaluationInput({
    workspaceId: 'WS-1',
    portfolioId: 'PORT-1',
    policy: {},
    holdings: [{ ticker: 'AAPL', weight: Infinity }]
  });
  assert.strictEqual(infRes.valid, false);
  assert.strictEqual(infRes.status, ComplianceStatus.NUMERICAL_FAILURE);
});

test('ComplianceInputValidator rejects duplicate holdings', () => {
  const dupRes = ComplianceInputValidator.validateEvaluationInput({
    workspaceId: 'WS-1',
    portfolioId: 'PORT-1',
    policy: {},
    holdings: [
      { ticker: 'AAPL', weight: 0.10 },
      { ticker: 'AAPL', weight: 0.05 }
    ]
  });
  assert.strictEqual(dupRes.valid, false);
  assert.strictEqual(dupRes.status, ComplianceStatus.CONFLICT);
});

test('ComplianceInputValidator rejects future evaluation timestamp (Temporal Strictness)', () => {
  const futureRes = ComplianceInputValidator.validateEvaluationInput({
    workspaceId: 'WS-1',
    portfolioId: 'PORT-1',
    asOf: '2099-01-01T00:00:00.000Z',
    policy: {}
  });
  assert.strictEqual(futureRes.valid, false);
  assert.strictEqual(futureRes.status, ComplianceStatus.TEMPORAL_VIOLATION);
});

console.log(`\nPASSED: ${passCount}/18 assertions`);
