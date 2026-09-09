/**
 * Phase 15 Test Suite 9: Golden E2E Trace & Cryptographic Lineage Test
 * Traces complete deterministic chain:
 * Phase 14 Target Package -> Holdings Snapshot -> Implementation Plan -> Human PM Approval ->
 * Transaction Execution -> 3-Way Reconciliation -> Drift Audit -> Constraint Monitoring ->
 * Rebalance Trigger -> Transaction Impact -> Rebalance Candidate -> Quality Scoring ->
 * Explanation DAG -> Sealed Package -> Repository Persistence -> Copilot Tool Read-Only Query ->
 * Process Intelligence / Governance Feedback.
 */

import assert from 'assert';
import { ImplementationSnapshotEngine } from '../implementation/implementationSnapshot.engine.js';
import { ImplementationPlanEngine } from '../implementation/implementationPlan.engine.js';
import { HoldingsReconciliationEngine } from '../implementation/holdingsReconciliation.engine.js';
import { PortfolioDriftEngine } from '../implementation/portfolioDrift.engine.js';
import { ConstraintMonitoringEngine } from '../implementation/constraintMonitoring.engine.js';
import { RebalanceTriggerEngine } from '../implementation/rebalanceTrigger.engine.js';
import { TransactionImpactEngine } from '../implementation/transactionImpact.engine.js';
import { RebalanceEngine } from '../implementation/rebalance.engine.js';
import { ImplementationQualityEngine } from '../implementation/implementationQuality.engine.js';
import { ImplementationExplanationEngine } from '../implementation/implementationExplanation.engine.js';
import { ImplementationPackageBuilder } from '../implementation/implementationPackage.js';
import { implementationRepository } from '../implementation/implementation.repository.js';
import { getImplementationPackage, explainHoldingDiscrepancy } from '../copilot/tools/implementation.tool.js';
import { ImplementationStatus, ApprovalStatus, ReconciliationStatus, DriftStatus, ConstraintStatus, RebalanceStatus } from '../implementation/implementation.types.js';
import { IMPLEMENTATION_POLICY_V1 } from '../implementation/implementation.config.js';

export async function runPhase15GoldenE2ETest() {
  console.log("Starting Phase 15 Suite 9: Golden E2E Trace...");

  let assertions = 0;
  const workspaceId = "WS-GOLDEN-IMPL-01";
  const portfolioId = "PORT-GOLDEN-INSTITUTIONAL-01";
  const asOf = "2026-09-06T12:00:00.000Z";

  // Step 1: Upstream Approved Phase 14 Target Portfolio Package
  const targetPackage = {
    packageId: "PKG-OPT-GOLDEN-100",
    packageHash: "hash-opt-golden-sha256-verified",
    portfolioId,
    targetWeights: {
      AAPL: 0.40,
      MSFT: 0.35,
      JPM: 0.25
    },
    cashWeight: 0.0,
    expectedReturn: 0.145,
    portfolioRisk: 0.168
  };
  assert.strictEqual(targetPackage.targetWeights.AAPL, 0.40);
  assertions += 1;

  // Step 2: Ingest Current Reported Holdings Snapshot
  const initialHoldings = [
    { ticker: 'AAPL', shares: 1000, price: 200.0, sector: 'Technology', geography: 'US', currency: 'USD', costBasis: 180.0 },
    { ticker: 'MSFT', shares: 500, price: 400.0, sector: 'Technology', geography: 'US', currency: 'USD', costBasis: 350.0 },
    { ticker: 'JPM', shares: 500, price: 200.0, sector: 'Financials', geography: 'US', currency: 'USD', costBasis: 190.0 }
  ];
  // Total Value = 200k + 200k + 100k = 500k. Weights: AAPL 40%, MSFT 40%, JPM 20%.

  const initialSnapRes = ImplementationSnapshotEngine.buildHoldingsSnapshot({
    workspaceId,
    portfolioId,
    asOf,
    holdings: initialHoldings,
    cash: 0.0,
    currency: 'USD'
  });
  assert.strictEqual(initialSnapRes.status, ImplementationStatus.RECONCILED);
  const initialHoldingsSnap = initialSnapRes.snapshot;
  assert.strictEqual(initialHoldingsSnap.totalValue, 500000);
  assert.strictEqual(typeof initialHoldingsSnap.snapshotHash, 'string');
  assertions += 3;

  // Step 3: Generate Deterministic Implementation Trade Plan
  const marketPrices = { AAPL: 200.0, MSFT: 400.0, JPM: 200.0 };
  const planResult = ImplementationPlanEngine.generatePlan({
    workspaceId,
    portfolioId,
    targetPackage,
    currentHoldingsSnapshot: initialHoldingsSnap,
    marketPrices,
    asOf
  });
  assert.strictEqual(planResult.status, ImplementationStatus.PLAN_GENERATED);
  const generatedPlan = planResult.plan;
  assert.strictEqual(generatedPlan.approvalStatus, ApprovalStatus.PROPOSED);
  assert.strictEqual(generatedPlan.orders.length, 3);
  assert.ok(generatedPlan.oneWayTurnover > 0);
  assert.strictEqual(typeof generatedPlan.planHash, 'string');
  assertions += 5;

  // Step 4: Human Portfolio Manager Signoff Gate
  const approveRes = ImplementationPlanEngine.approvePlan(generatedPlan, {
    approverId: 'USR-PM-CHIEF-01',
    workspaceId,
    role: 'PORTFOLIO_MANAGER',
    timestamp: asOf
  });
  assert.strictEqual(approveRes.status, ImplementationStatus.HUMAN_APPROVED);
  const approvedPlan = approveRes.approvedPlan;
  assert.strictEqual(approvedPlan.approvalStatus, ApprovalStatus.APPROVED);
  assert.strictEqual(approvedPlan.approverId, 'USR-PM-CHIEF-01');
  assert.strictEqual(approvedPlan.approvedPackageHash, generatedPlan.planHash);
  assertions += 4;

  // Step 5: Ingest Actual Execution Reports & Updated Holdings Snapshot
  const settledHoldings = [
    { ticker: 'AAPL', shares: 1000, price: 200.0, sector: 'Technology', geography: 'US', currency: 'USD' }, // 200k (40%)
    { ticker: 'MSFT', shares: 437.5, price: 400.0, sector: 'Technology', geography: 'US', currency: 'USD' }, // 175k (35%)
    { ticker: 'JPM', shares: 625, price: 200.0, sector: 'Financials', geography: 'US', currency: 'USD' } // 125k (25%)
  ];
  const settledSnapRes = ImplementationSnapshotEngine.buildHoldingsSnapshot({
    workspaceId,
    portfolioId,
    asOf,
    holdings: settledHoldings,
    cash: 0.0,
    currency: 'USD'
  });
  const settledHoldingsSnap = settledSnapRes.snapshot;
  assert.strictEqual(settledHoldingsSnap.totalValue, 500000);
  assertions += 1;

  // Step 6: 3-Way Holdings Reconciliation (Target vs Plan vs Actual)
  const reconRes = HoldingsReconciliationEngine.reconcile({
    workspaceId,
    portfolioId,
    asOf,
    targetPackage,
    implementationPlan: approvedPlan,
    actualHoldingsSnapshot: settledHoldingsSnap,
    toleranceBps: 20
  });
  assert.strictEqual(reconRes.status, ImplementationStatus.RECONCILED);
  assert.strictEqual(reconRes.reconciliation.overallStatus, ImplementationStatus.RECONCILED);
  assert.strictEqual(reconRes.reconciliation.matchedCount, 3);
  assert.strictEqual(reconRes.reconciliation.driftedCount, 0);
  assert.strictEqual(reconRes.reconciliation.missingCount, 0);
  assert.strictEqual(typeof reconRes.reconciliation.reconciliationHash, 'string');
  assertions += 6;

  // Step 7: Evaluate Real-Time Drift Audit
  const driftRes = PortfolioDriftEngine.evaluateDrift({
    workspaceId,
    portfolioId,
    asOf,
    targetPackage,
    actualHoldingsSnapshot: settledHoldingsSnap,
    policy: IMPLEMENTATION_POLICY_V1
  });
  assert.strictEqual(driftRes.status, ImplementationStatus.RECONCILED);
  assert.strictEqual(driftRes.drift.overallStatus, DriftStatus.IN_TOLERANCE);
  assert.strictEqual(driftRes.drift.totalAbsolutePortfolioDrift, 0.0);
  assert.strictEqual(typeof driftRes.drift.driftHash, 'string');
  assertions += 4;

  // Step 8: Mandate Constraint Monitoring
  const mandateConstraints = {
    defaultMaxWeight: 0.45,
    sectorCaps: { Technology: 0.80, Financials: 0.30 },
    minCashWeight: 0.0,
    maxCashWeight: 0.10
  };
  const constraintRes = ConstraintMonitoringEngine.monitorConstraints({
    workspaceId,
    portfolioId,
    asOf,
    actualHoldingsSnapshot: settledHoldingsSnap,
    constraints: mandateConstraints,
    policy: IMPLEMENTATION_POLICY_V1
  });
  assert.strictEqual(constraintRes.status, ImplementationStatus.RECONCILED);
  assert.strictEqual(constraintRes.constraintReport.overallStatus, ConstraintStatus.PASS);
  assert.strictEqual(constraintRes.constraintReport.breachCount, 0);
  assert.strictEqual(typeof constraintRes.constraintReport.reportHash, 'string');
  assertions += 4;

  // Step 9: Rebalance Trigger Audit
  const triggerRes = RebalanceTriggerEngine.evaluateTriggers({
    workspaceId,
    portfolioId,
    asOf,
    driftReport: driftRes.drift,
    constraintReport: constraintRes.constraintReport,
    policy: IMPLEMENTATION_POLICY_V1
  });
  assert.strictEqual(triggerRes.status, ImplementationStatus.RECONCILED);
  assert.strictEqual(triggerRes.triggerReport.rebalanceStatus, RebalanceStatus.NO_REBALANCE);
  assert.strictEqual(triggerRes.triggerReport.activeTriggers.length, 0);
  assertions += 3;

  // Step 10: Transaction Impact & Cost Analysis
  const liquidityMap = {
    AAPL: { advUsd: 10000000000 },
    MSFT: { advUsd: 8000000000 },
    JPM: { advUsd: 4000000000 }
  };
  const impactRes = TransactionImpactEngine.evaluateImpact({
    workspaceId,
    portfolioId,
    asOf,
    plan: approvedPlan,
    liquidityMap,
    expectedReturnImprovementBps: 80,
    policy: IMPLEMENTATION_POLICY_V1
  });
  assert.strictEqual(impactRes.status, ImplementationStatus.RECONCILED);
  assert.ok(impactRes.impactReport.totalImplementationCost > 0);
  assert.strictEqual(impactRes.impactReport.isEconomicallyJustified, true);
  assert.strictEqual(typeof impactRes.impactReport.impactHash, 'string');
  assertions += 4;

  // Step 11: Implementation Quality Scoring
  const qualityRes = ImplementationQualityEngine.evaluateQuality({
    workspaceId,
    portfolioId,
    asOf,
    reconciliation: reconRes.reconciliation,
    policy: IMPLEMENTATION_POLICY_V1,
    constraintReport: constraintRes.constraintReport
  });
  assert.strictEqual(qualityRes.status, ImplementationStatus.RECONCILED);
  assert.strictEqual(qualityRes.qualityReport.qualityScore, 'EXCELLENT');
  assert.strictEqual(qualityRes.qualityReport.rmsWeightTrackingError, 0.0);
  assert.strictEqual(typeof qualityRes.qualityReport.qualityHash, 'string');
  assertions += 4;

  // Step 12: Complete Explanation DAG Graph Construction
  const dagRes = ImplementationExplanationEngine.buildExplanationGraph({
    workspaceId,
    portfolioId,
    asOf,
    targetPackage,
    plan: approvedPlan,
    holdingsSnapshot: settledHoldingsSnap,
    reconciliation: reconRes.reconciliation,
    driftReport: driftRes.drift,
    constraintReport: constraintRes.constraintReport,
    triggerReport: triggerRes.triggerReport,
    impactReport: impactRes.impactReport,
    qualityReport: qualityRes.qualityReport
  });
  assert.strictEqual(dagRes.status, ImplementationStatus.RECONCILED);
  assert.ok(dagRes.explanationGraph.nodes.length >= 6);
  assert.ok(dagRes.explanationGraph.edges.length >= 5);
  assert.strictEqual(typeof dagRes.explanationGraph.graphHash, 'string');
  assertions += 4;

  // Step 13: Package Sealing & Repository Storage
  const packageBuildRes = ImplementationPackageBuilder.buildPackage({
    packageId: `PKG-IMPL-GOLDEN-01`,
    workspaceId,
    portfolioId,
    asOf,
    targetPackage,
    plan: approvedPlan,
    holdingsSnapshot: settledHoldingsSnap,
    reconciliation: reconRes.reconciliation,
    driftReport: driftRes.drift,
    constraintReport: constraintRes.constraintReport,
    triggerReport: triggerRes.triggerReport,
    impactReport: impactRes.impactReport,
    qualityReport: qualityRes.qualityReport
  });
  assert.strictEqual(packageBuildRes.status, ImplementationStatus.PLAN_GENERATED);
  const sealedPkg = packageBuildRes.package;
  assert.strictEqual(typeof sealedPkg.packageHash, 'string');
  assert.strictEqual(sealedPkg.status, ImplementationStatus.HUMAN_APPROVED);

  implementationRepository.savePackage(sealedPkg);
  implementationRepository.savePlan(approvedPlan);
  assertions += 3;

  // Step 14: Copilot Tool Read-Only Querying
  const copilotPkgRes = await getImplementationPackage({ portfolioId, workspaceId });
  assert.strictEqual(copilotPkgRes.status, 'SUCCESS');
  assert.strictEqual(copilotPkgRes.package.portfolioId, portfolioId);

  const copilotExplainRes = await explainHoldingDiscrepancy({ portfolioId, ticker: 'AAPL', workspaceId });
  assert.strictEqual(copilotExplainRes.status, 'SUCCESS');
  assert.strictEqual(copilotExplainRes.ticker, 'AAPL');
  assert.strictEqual(copilotExplainRes.reconciliationStatus, 'MATCHED');
  assertions += 5;

  // Step 15: Non-Execution Boundary Verification
  const execAttempt = ImplementationPlanEngine.executePlan();
  assert.strictEqual(execAttempt.status, ImplementationStatus.UNAVAILABLE);
  assert.strictEqual(execAttempt.isExecuted, false);
  assert.strictEqual(execAttempt.brokerExecution, 'UNAVAILABLE');
  assert.strictEqual(sealedPkg.isExecuted, undefined);
  assertions += 4;

  console.log("No broker execution occurred.");
  console.log("No broker execution API was invoked.");
  console.log("Human approval is not equivalent to broker execution.");

  console.log(`Phase 15 Suite 9: Golden E2E Trace Completed with ${assertions} assertions.`);
  return { suite: 'Phase 15 Golden E2E Trace', passed: assertions, failed: 0, total: assertions };
}

if (process.argv[1]?.endsWith('phase15GoldenE2ETest.js')) {
  runPhase15GoldenE2ETest().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
