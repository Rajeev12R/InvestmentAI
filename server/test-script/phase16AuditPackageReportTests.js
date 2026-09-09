/**
 * Test Suite 3: Phase 16 Audit Evidence Graph, Package Sealing & Report Tests
 */

import assert from 'assert';
import { ComplianceEngine } from '../compliance/compliance.engine.js';
import { PolicyEngine } from '../compliance/policy.engine.js';
import { ComplianceAuditEngine } from '../compliance/audit.engine.js';
import { CompliancePackageBuilder } from '../compliance/compliancePackage.js';
import { ComplianceReportEngine } from '../compliance/report.engine.js';
import { ComplianceExplanationEngine } from '../compliance/explanation.engine.js';
import { OperatorType } from '../compliance/compliance.types.js';
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

console.log('=== PHASE 16: AUDIT GRAPH, PACKAGE SEALING & REPORTS ===\n');

const testPolicy = PolicyEngine.createPolicy({
  policyId: 'POL-PKG-TEST',
  workspaceId: 'WS-AUDIT-1',
  name: 'Package Test Policy',
  effectiveFrom: '2026-01-01T00:00:00.000Z',
  rules: [
    { ruleId: 'R-POS-10', ruleType: PolicyRuleType.POSITION_LIMIT, operator: OperatorType.LTE, threshold: 0.10, severity: 'HIGH' },
    { ruleId: 'R-SEC-FIN', ruleType: PolicyRuleType.SECTOR_LIMIT, targetKey: 'Financials', operator: OperatorType.LTE, threshold: 0.30, severity: 'HIGH' }
  ]
});

const evaluation = ComplianceEngine.evaluateCompliance({
  workspaceId: 'WS-AUDIT-1',
  portfolioId: 'PORT-AUDIT-1',
  policy: testPolicy,
  portfolioState: {
    holdings: [
      { ticker: 'JPM', weight: 0.08, sector: 'Financials' },
      { ticker: 'BAC', weight: 0.08, sector: 'Financials' },
      { ticker: 'AAPL', weight: 0.08, sector: 'Technology' }
    ]
  }
});

// 1. Audit Evidence Graph
test('ComplianceAuditEngine builds traceable evidence DAG with nodes and edges', () => {
  const graph = ComplianceAuditEngine.buildEvidenceGraph({
    evaluation,
    policy: testPolicy,
    portfolioState: { holdings: [{ ticker: 'JPM' }, { ticker: 'BAC' }] }
  });

  assert.ok(graph.graphId.startsWith('EVD-GRAPH-'));
  assert.ok(graph.nodes.length >= 4); // Eval, Policy, 2 Rules, Input
  assert.ok(graph.edges.length >= 3);
  assert.ok(graph.graphHash && graph.graphHash.length === 64);
  assert.ok(Object.isFrozen(graph));
});

// 2. Sealed Compliance Intelligence Package
test('CompliancePackageBuilder builds and seals package with SHA-256 hash', () => {
  const pkgResult = CompliancePackageBuilder.buildPackage({
    workspaceId: 'WS-AUDIT-1',
    portfolioId: 'PORT-AUDIT-1',
    evaluation,
    policy: testPolicy
  });

  assert.ok(pkgResult.packageId.startsWith('PKG-CMP-'));
  assert.strictEqual(pkgResult.package.complianceStatus, 'PASS');
  assert.strictEqual(pkgResult.package.isCompliant, true);
  assert.ok(pkgResult.packageHash.length === 64);

  // Verification succeeds on untampered package
  const verifyRes = CompliancePackageBuilder.verifyPackageIntegrity(pkgResult.package);
  assert.strictEqual(verifyRes.verified, true);
});

test('CompliancePackageBuilder detects tampering in package rule results', () => {
  const pkgResult = CompliancePackageBuilder.buildPackage({
    workspaceId: 'WS-AUDIT-1',
    portfolioId: 'PORT-AUDIT-1',
    evaluation,
    policy: testPolicy
  });

  // Create a tampered copy
  const tampered = {
    ...pkgResult.package,
    complianceStatus: 'BREACH' // Mutated
  };

  const verifyRes = CompliancePackageBuilder.verifyPackageIntegrity(tampered);
  assert.strictEqual(verifyRes.verified, false);
  assert.ok(verifyRes.error.includes('mismatch'));
});

// 3. Compliance Reports
test('ComplianceReportEngine generates portfolio summary and historical reports', () => {
  const summaryReport = ComplianceReportEngine.generatePortfolioReport(evaluation);
  assert.strictEqual(summaryReport.reportType, 'PORTFOLIO_COMPLIANCE_SUMMARY');
  assert.strictEqual(summaryReport.summaryMetrics.totalRules, 2);
  assert.strictEqual(summaryReport.summaryMetrics.passedRules, 2);
  assert.ok(summaryReport.reportHash.length === 64);

  const histReport = ComplianceReportEngine.generateHistoricalBreachReport('PORT-AUDIT-1', 'WS-AUDIT-1', [
    { breachId: 'B-1', ruleId: 'R-POS-10', ruleType: 'POSITION_LIMIT', status: 'RESOLVED', firstDetectedAt: '2026-09-01' }
  ]);
  assert.strictEqual(histReport.totalBreachesRecorded, 1);
  assert.strictEqual(histReport.resolvedBreachesCount, 1);
});

test('ComplianceReportEngine exports evaluation rule results to valid CSV', () => {
  const csv = ComplianceReportEngine.exportRuleResultsToCSV(evaluation);
  assert.ok(csv.includes('RuleId,RuleType,TargetKey,Operator,Threshold,ActualValue,Variance,Status,Severity,Explanation'));
  assert.ok(csv.includes('R-POS-10'));
  assert.ok(csv.includes('R-SEC-FIN'));
});

// 4. Explanation DAG & Copilot Read-Only Queries
test('ComplianceExplanationEngine generates causal DAG and answers Copilot queries', () => {
  const dag = ComplianceExplanationEngine.generateExplanationDAG(evaluation);
  assert.strictEqual(dag.overallStatus, 'PASS');
  assert.ok(dag.summaryText.includes('COMPLIANT'));
  assert.strictEqual(dag.explanations.length, 2);

  const copilotAnswer = ComplianceExplanationEngine.answerComplianceQuery(evaluation, 'WHY_NON_COMPLIANT');
  assert.ok(copilotAnswer.answer.includes('fully compliant'));
  assert.ok(copilotAnswer.evidenceIds.length > 0);
});

// 5. Sealed Package Immutability & Linkage Hardening
test('Sealed ComplianceIntelligencePackage is deeply frozen and immutable', () => {
  const pkgRes = CompliancePackageBuilder.buildPackage({
    workspaceId: 'WS-AUDIT-1',
    portfolioId: 'PORT-AUDIT-1',
    evaluation,
    policy: testPolicy
  });

  assert.ok(Object.isFrozen(pkgRes.package));
  assert.ok(Object.isFrozen(pkgRes.package.evaluationSummary));
  assert.ok(Object.isFrozen(pkgRes.package.ruleResults));
  
  // Attempting mutation throws in strict mode or is prevented
  assert.throws(() => {
    'use strict';
    pkgRes.package.complianceStatus = 'BREACH';
  }, TypeError);
});

test('Sealed package cryptographically links policyHash, evaluationHash and ruleResults', () => {
  const pkgRes = CompliancePackageBuilder.buildPackage({
    workspaceId: 'WS-AUDIT-1',
    portfolioId: 'PORT-AUDIT-1',
    evaluation,
    policy: testPolicy
  });

  assert.strictEqual(pkgRes.package.policy.policyHash, testPolicy.policyHash);
  assert.strictEqual(pkgRes.package.evaluationSummary.evaluationHash, evaluation.evaluationHash);
  assert.strictEqual(pkgRes.package.ruleResults.length, evaluation.ruleResults.length);
});

test('ComplianceAuditEngine verifies all required relationship edges in evidence DAG', () => {
  const graph = ComplianceAuditEngine.buildEvidenceGraph({
    evaluation,
    policy: testPolicy,
    portfolioState: { holdings: [{ ticker: 'JPM' }, { ticker: 'BAC' }] }
  });

  const relationTypes = graph.edges.map(e => e.relation);
  assert.ok(relationTypes.includes('GOVERNED_BY'));
  assert.ok(relationTypes.includes('CONTAINS_RULE'));
  assert.ok(relationTypes.includes('EVALUATED_RULE'));
  assert.ok(relationTypes.includes('CONSUMED_INPUT'));
});

test('ComplianceExplanationEngine produces deterministic causal DAG hash', () => {
  const dag1 = ComplianceExplanationEngine.generateExplanationDAG(evaluation);
  const dag2 = ComplianceExplanationEngine.generateExplanationDAG(evaluation);
  assert.strictEqual(dag1.dagHash, dag2.dagHash);
});

test('ComplianceReportEngine creates Decision Governance Report linking approvals', () => {
  const decReport = ComplianceReportEngine.generateDecisionGovernanceReport(
    { decisionId: 'DEC-GOV-1', ticker: 'AAPL', approverRole: 'PORTFOLIO_MANAGER' },
    evaluation
  );
  assert.strictEqual(decReport.reportType, 'DECISION_GOVERNANCE_REPORT');
  assert.strictEqual(decReport.decisionId, 'DEC-GOV-1');
  assert.strictEqual(decReport.isCompliant, true);
  assert.ok(decReport.reportHash && decReport.reportHash.length === 64);
});

console.log(`\nPASSED: ${passCount}/11 assertions`);
