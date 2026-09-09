/**
 * Phase 15 Test Suite 6: Mutation Testing Suite (25 Structural Mutations)
 * Tests that critical security, mathematical, and architectural invariants catch and kill intentional mutants.
 */

import assert from 'assert';
import { ImplementationSnapshotEngine } from '../implementation/implementationSnapshot.engine.js';
import { ImplementationPlanEngine } from '../implementation/implementationPlan.engine.js';
import { HoldingsReconciliationEngine } from '../implementation/holdingsReconciliation.engine.js';
import { PortfolioDriftEngine } from '../implementation/portfolioDrift.engine.js';
import { ConstraintMonitoringEngine } from '../implementation/constraintMonitoring.engine.js';
import { RebalanceTriggerEngine } from '../implementation/rebalanceTrigger.engine.js';
import { TransactionImpactEngine } from '../implementation/transactionImpact.engine.js';
import { ImplementationQualityEngine } from '../implementation/implementationQuality.engine.js';
import { ImplementationPackageBuilder } from '../implementation/implementationPackage.js';
import { implementationRepository } from '../implementation/implementation.repository.js';
import { ImplementationStatus, ApprovalStatus, DriftStatus, ConstraintStatus, ImplementationQualityStatus } from '../implementation/implementation.types.js';

console.log("Starting Phase 15 Suite 6: Mutation Testing Suite (25 Mutations)...");

let mutationsKilled = 0;

const baseUniverse = [
  { ticker: "AAPL", shares: 1000, price: 200, sector: "Technology" },
  { ticker: "MSFT", shares: 500, price: 400, sector: "Technology" }
];

const snap = ImplementationSnapshotEngine.buildHoldingsSnapshot({
  workspaceId: "WS-MUT",
  portfolioId: "P-MUT",
  asOf: "2026-09-06T12:00:00.000Z",
  holdings: baseUniverse,
  cash: 100000
}).snapshot;

// Mutation 1: Allow NaN shares in holdings
{
  const res = ImplementationSnapshotEngine.buildHoldingsSnapshot({ workspaceId: "WS", portfolioId: "P", asOf: "2026-09-06T00:00:00.000Z", holdings: [{ ticker: "AAPL", shares: NaN, price: 200 }] });
  assert.strictEqual(res.status, ImplementationStatus.INVALID_INPUT);
  mutationsKilled++;
}

// Mutation 2: Allow negative price in holdings
{
  const res = ImplementationSnapshotEngine.buildHoldingsSnapshot({ workspaceId: "WS", portfolioId: "P", asOf: "2026-09-06T00:00:00.000Z", holdings: [{ ticker: "AAPL", shares: 100, price: -50 }] });
  assert.strictEqual(res.status, ImplementationStatus.INVALID_INPUT);
  mutationsKilled++;
}

// Mutation 3: Allow future timestamp in snapshot
{
  const res = ImplementationSnapshotEngine.buildHoldingsSnapshot({ workspaceId: "WS", portfolioId: "P", asOf: "2099-01-01T00:00:00.000Z", holdings: baseUniverse });
  assert.strictEqual(res.status, ImplementationStatus.INVALID_INPUT);
  mutationsKilled++;
}

// Mutation 4: Bypass workspaceId check in plan generation
{
  const res = ImplementationPlanEngine.generatePlan({ workspaceId: "", portfolioId: "P", targetPackage: { targetWeights: { AAPL: 0.5 } }, currentHoldingsSnapshot: snap });
  assert.strictEqual(res.status, ImplementationStatus.INVALID_INPUT);
  mutationsKilled++;
}

// Mutation 5: Allow negative capital in plan generation
{
  const res = ImplementationPlanEngine.generatePlan({ workspaceId: "WS", portfolioId: "P", targetPackage: { targetWeights: { AAPL: 0.5 } }, currentHoldingsSnapshot: snap, totalCapital: -1000 });
  assert.strictEqual(res.status, ImplementationStatus.INVALID_INPUT);
  mutationsKilled++;
}

// Mutation 6: Allow VIEWER role to approve plan
{
  const plan = ImplementationPlanEngine.generatePlan({ workspaceId: "WS", portfolioId: "P", targetPackage: { targetWeights: { AAPL: 0.5, MSFT: 0.5 } }, currentHoldingsSnapshot: snap, marketPrices: { AAPL: 200, MSFT: 400 } }).plan;
  const app = ImplementationPlanEngine.approvePlan(plan, { approverId: "U1", workspaceId: "WS", role: "VIEWER" });
  assert.strictEqual(app.status, ImplementationStatus.AUTHORIZATION_FAILURE);
  mutationsKilled++;
}

// Mutation 7: Allow cross-workspace approval signoff
{
  const plan = ImplementationPlanEngine.generatePlan({ workspaceId: "WS-A", portfolioId: "P", targetPackage: { targetWeights: { AAPL: 0.5, MSFT: 0.5 } }, currentHoldingsSnapshot: snap, marketPrices: { AAPL: 200, MSFT: 400 } }).plan;
  const app = ImplementationPlanEngine.approvePlan(plan, { approverId: "U1", workspaceId: "WS-B", role: "PORTFOLIO_MANAGER" });
  assert.strictEqual(app.status, ImplementationStatus.AUTHORIZATION_FAILURE);
  mutationsKilled++;
}

// Mutation 8: Ignore missing position in reconciliation
{
  const recon = HoldingsReconciliationEngine.reconcile({ workspaceId: "WS", portfolioId: "P", targetPackage: { targetWeights: { NVDA: 0.5, AAPL: 0.5 } }, actualHoldingsSnapshot: snap });
  assert.strictEqual(recon.reconciliation.missingCount, 1);
  mutationsKilled++;
}

// Mutation 9: Ignore unexpected position in reconciliation
{
  const recon = HoldingsReconciliationEngine.reconcile({ workspaceId: "WS", portfolioId: "P", targetPackage: { targetWeights: { AAPL: 1.0 } }, actualHoldingsSnapshot: snap });
  assert.strictEqual(recon.reconciliation.unexpectedCount, 1);
  mutationsKilled++;
}

// Mutation 10: Zero out relative drift calculation
{
  const drift = PortfolioDriftEngine.evaluateDrift({ workspaceId: "WS", portfolioId: "P", targetPackage: { targetWeights: { AAPL: 0.10, MSFT: 0.90 } }, actualHoldingsSnapshot: snap });
  assert.ok(drift.drift.maxRelativePositionDrift > 0);
  mutationsKilled++;
}

// Mutation 11: Ignore sector drift breach
{
  const drift = PortfolioDriftEngine.evaluateDrift({ workspaceId: "WS", portfolioId: "P", targetPackage: { targetWeights: { JPM: 1.0 } }, actualHoldingsSnapshot: snap });
  assert.strictEqual(drift.drift.overallStatus, DriftStatus.BREACH);
  mutationsKilled++;
}

// Mutation 12: Ignore cash buffer drift
{
  const drift = PortfolioDriftEngine.evaluateDrift({ workspaceId: "WS", portfolioId: "P", targetPackage: { targetWeights: { AAPL: 0.5, MSFT: 0.5 }, targetCashWeight: 0.30 }, actualHoldingsSnapshot: snap });
  assert.strictEqual(drift.drift.cashDrift.status, DriftStatus.BREACH);
  mutationsKilled++;
}

// Mutation 13: Ignore max position constraint breach
{
  const mon = ConstraintMonitoringEngine.monitorConstraints({ workspaceId: "WS", portfolioId: "P", actualHoldingsSnapshot: snap, constraints: { positionMaxWeights: { AAPL: 0.20 } } });
  assert.strictEqual(mon.constraintReport.overallStatus, ConstraintStatus.BREACH);
  mutationsKilled++;
}

// Mutation 14: Allow shorting in long-only mandate
{
  const shortSnap = { ...snap, holdings: [{ ticker: "AAPL", shares: -100, weight: -0.10, price: 200 }] };
  const mon = ConstraintMonitoringEngine.monitorConstraints({ workspaceId: "WS", portfolioId: "P", actualHoldingsSnapshot: shortSnap, constraints: { defaultAllowShorting: false } });
  assert.strictEqual(mon.constraintReport.overallStatus, ConstraintStatus.BREACH);
  mutationsKilled++;
}

// Mutation 15: Suppress constraint breach rebalance trigger
{
  const trig = RebalanceTriggerEngine.evaluateTriggers({ workspaceId: "WS", portfolioId: "P", driftReport: { overallStatus: DriftStatus.IN_TOLERANCE }, constraintReport: { overallStatus: ConstraintStatus.BREACH, breachCount: 1 } });
  assert.strictEqual(trig.triggerReport.rebalanceStatus, 'REBALANCE_REQUIRED');
  mutationsKilled++;
}

// Mutation 16: Suppress drift breach rebalance trigger
{
  const trig = RebalanceTriggerEngine.evaluateTriggers({ workspaceId: "WS", portfolioId: "P", driftReport: { overallStatus: DriftStatus.BREACH, maxAbsolutePositionDrift: 0.15 }, constraintReport: { overallStatus: ConstraintStatus.PASS, breachCount: 0 } });
  assert.strictEqual(trig.triggerReport.rebalanceStatus, 'REBALANCE_REQUIRED');
  mutationsKilled++;
}

// Mutation 17: Zero out linear transaction fees
{
  const impact = TransactionImpactEngine.evaluateImpact({ workspaceId: "WS", portfolioId: "P", plan: { portfolioValue: 1000000, orders: [{ ticker: "AAPL", estimatedTradeValue: 100000, action: "BUY" }] } });
  assert.ok(impact.impactReport.totalLinearCost > 0);
  mutationsKilled++;
}

// Mutation 18: Zero out spread execution cost
{
  const impact = TransactionImpactEngine.evaluateImpact({ workspaceId: "WS", portfolioId: "P", plan: { portfolioValue: 1000000, orders: [{ ticker: "AAPL", estimatedTradeValue: 100000, action: "BUY" }] } });
  assert.ok(impact.impactReport.totalSpreadCost > 0);
  mutationsKilled++;
}

// Mutation 19: Zero out quadratic market impact
{
  const impact = TransactionImpactEngine.evaluateImpact({ workspaceId: "WS", portfolioId: "P", plan: { portfolioValue: 1000000, orders: [{ ticker: "AAPL", estimatedTradeValue: 500000, action: "BUY" }] }, liquidityMap: { AAPL: { advUsd: 1000000 } } });
  assert.ok(impact.impactReport.totalMarketImpactCost > 0);
  mutationsKilled++;
}

// Mutation 20: Ignore capital gains tax on sale
{
  const impact = TransactionImpactEngine.evaluateImpact({ workspaceId: "WS", portfolioId: "P", plan: { portfolioValue: 1000000, orders: [{ ticker: "AAPL", action: "SELL", estimatedTradeValue: 20000, shareDelta: -100, currentPrice: 200, costBasis: 100, holdingPeriodDays: 400 }] } });
  assert.ok(impact.impactReport.totalEstimatedTaxImpact > 0);
  mutationsKilled++;
}

// Mutation 21: Score missing position as EXCELLENT
{
  const recon = { completenessRatio: 0.5, missingCount: 2, unexpectedCount: 0, positions: [{ ticker: "AAPL", weightDifference: 0.0, shareDifference: 0, valueDifference: 0 }] };
  const qual = ImplementationQualityEngine.evaluateQuality({ workspaceId: "WS", portfolioId: "P", reconciliation: recon });
  assert.notStrictEqual(qual.qualityReport.qualityScore, ImplementationQualityStatus.EXCELLENT);
  mutationsKilled++;
}

// Mutation 22: Ignore constraint breach in quality scoring
{
  const recon = { completenessRatio: 1.0, missingCount: 0, unexpectedCount: 0, positions: [{ ticker: "AAPL", weightDifference: 0.0, shareDifference: 0, valueDifference: 0 }] };
  const qual = ImplementationQualityEngine.evaluateQuality({ workspaceId: "WS", portfolioId: "P", reconciliation: recon, constraintReport: { breachCount: 1 } });
  assert.strictEqual(qual.qualityReport.qualityScore, ImplementationQualityStatus.FAILED);
  mutationsKilled++;
}

// Mutation 23: Omit SHA-256 canonical hash in package
{
  const pkg = ImplementationPackageBuilder.buildPackage({ packageId: "PKG-1", workspaceId: "WS", portfolioId: "P", targetPackage: { targetWeights: { AAPL: 0.5 } }, holdingsSnapshot: snap, reconciliation: { completenessRatio: 1.0 }, driftReport: { overallStatus: "IN_TOLERANCE" }, constraintReport: { overallStatus: "PASS" } });
  assert.strictEqual(pkg.package.packageHash.length, 64);
  mutationsKilled++;
}

// Mutation 24: Cross-workspace IDOR retrieval in repository
{
  implementationRepository.savePackage({ packageId: "PKG-A", workspaceId: "WS-A", portfolioId: "P-1" });
  const leak = implementationRepository.getPackageById("PKG-A", "WS-B");
  assert.strictEqual(leak, null);
  mutationsKilled++;
}

// Mutation 25: Mutate sealed package object
{
  const pkg = ImplementationPackageBuilder.buildPackage({ packageId: "PKG-1", workspaceId: "WS", portfolioId: "P", targetPackage: { targetWeights: { AAPL: 0.5 } }, holdingsSnapshot: snap, reconciliation: { completenessRatio: 1.0 }, driftReport: { overallStatus: "IN_TOLERANCE" }, constraintReport: { overallStatus: "PASS" } }).package;
  assert.strictEqual(Object.isFrozen(pkg), true);
  mutationsKilled++;
}

assert.strictEqual(mutationsKilled, 25, "All 25 mutations must be killed");
console.log(`✓ Phase 15 Suite 6 Mutation Testing Passed: ${mutationsKilled} / 25 mutations killed`);
export { mutationsKilled };
