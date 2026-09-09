/**
 * Phase 15 Test Suite 3: Rebalance Triggers & Candidate Rebalancing Tests
 */

import assert from 'assert';
import { ImplementationSnapshotEngine } from '../implementation/implementationSnapshot.engine.js';
import { PortfolioDriftEngine } from '../implementation/portfolioDrift.engine.js';
import { ConstraintMonitoringEngine } from '../implementation/constraintMonitoring.engine.js';
import { RebalanceTriggerEngine } from '../implementation/rebalanceTrigger.engine.js';
import { RebalanceEngine } from '../implementation/rebalance.engine.js';
import { RebalanceStatus, RebalanceTrigger, ImplementationStatus } from '../implementation/implementation.types.js';

console.log("Starting Phase 15 Suite 3: Rebalance Triggers & Candidate Rebalancing...");

let assertions = 0;

const holdings = [
  { ticker: "AAPL", shares: 2500, price: 200.0, sector: "Technology", geography: "US" },
  { ticker: "MSFT", shares: 750, price: 400.0, sector: "Technology", geography: "US" },
  { ticker: "JPM", shares: 1000, price: 200.0, sector: "Financials", geography: "US" }
];

const snapRes = ImplementationSnapshotEngine.buildHoldingsSnapshot({
  workspaceId: "WS-1",
  portfolioId: "P-1",
  asOf: "2026-09-06T12:00:00.000Z",
  holdings
});

// Test 1: No rebalance when within tolerances
{
  const targetPackage = { targetWeights: { AAPL: 0.50, MSFT: 0.30, JPM: 0.20 } };
  const driftRes = PortfolioDriftEngine.evaluateDrift({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    targetPackage,
    actualHoldingsSnapshot: snapRes.snapshot
  });
  const monRes = ConstraintMonitoringEngine.monitorConstraints({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    actualHoldingsSnapshot: snapRes.snapshot,
    constraints: { defaultMaxWeight: 0.60 }
  });

  const trigRes = RebalanceTriggerEngine.evaluateTriggers({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    driftReport: driftRes.drift,
    constraintReport: monRes.constraintReport
  });

  assert.strictEqual(trigRes.triggerReport.rebalanceStatus, RebalanceStatus.NO_REBALANCE);
  assert.strictEqual(trigRes.triggerReport.activeTriggerCount, 0);
  assertions += 2;
}

// Test 2: Constraint breach trigger -> REBALANCE_REQUIRED
{
  const targetPackage = { targetWeights: { AAPL: 0.50, MSFT: 0.30, JPM: 0.20 } };
  const driftRes = PortfolioDriftEngine.evaluateDrift({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    targetPackage,
    actualHoldingsSnapshot: snapRes.snapshot
  });
  const monRes = ConstraintMonitoringEngine.monitorConstraints({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    actualHoldingsSnapshot: snapRes.snapshot,
    constraints: { positionMaxWeights: { AAPL: 0.40 } } // AAPL 50% breaches 40%
  });

  const trigRes = RebalanceTriggerEngine.evaluateTriggers({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    driftReport: driftRes.drift,
    constraintReport: monRes.constraintReport
  });

  assert.strictEqual(trigRes.triggerReport.rebalanceStatus, RebalanceStatus.REBALANCE_REQUIRED);
  assert.strictEqual(trigRes.triggerReport.primaryTrigger, RebalanceTrigger.CONSTRAINT_BREACH);
  assertions += 2;
}

// Test 3: Decision & Thesis triggers -> REBALANCE_RECOMMENDED
{
  const targetPackage = { targetWeights: { AAPL: 0.50, MSFT: 0.30, JPM: 0.20 } };
  const driftRes = PortfolioDriftEngine.evaluateDrift({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    targetPackage,
    actualHoldingsSnapshot: snapRes.snapshot
  });
  const monRes = ConstraintMonitoringEngine.monitorConstraints({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    actualHoldingsSnapshot: snapRes.snapshot,
    constraints: { defaultMaxWeight: 0.60 }
  });

  const trigRes = RebalanceTriggerEngine.evaluateTriggers({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    driftReport: driftRes.drift,
    constraintReport: monRes.constraintReport,
    decisionChanged: true,
    thesisChanged: true
  });

  assert.strictEqual(trigRes.triggerReport.rebalanceStatus, RebalanceStatus.REBALANCE_RECOMMENDED);
  assert.strictEqual(trigRes.triggerReport.activeTriggerCount, 2);
  assertions += 2;
}

// Test 4: Generate candidate rebalance package
{
  const covMatrix = [
    [0.04, 0.01, 0.005],
    [0.01, 0.05, 0.008],
    [0.005, 0.008, 0.06]
  ];
  const expReturns = { AAPL: 0.15, MSFT: 0.12, JPM: 0.08 };

  const rebalRes = RebalanceEngine.generateRebalanceCandidate({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    currentHoldingsSnapshot: snapRes.snapshot,
    expectedReturns: expReturns,
    covarianceMatrix: covMatrix,
    marketPrices: { AAPL: 200.0, MSFT: 400.0, JPM: 200.0 }
  });

  assert.strictEqual(rebalRes.status, ImplementationStatus.REBALANCE_RECOMMENDED);
  assert.ok(rebalRes.rebalanceCandidate !== null);
  assert.ok(rebalRes.rebalanceCandidate.plan.orders.length === 3);
  assert.ok(rebalRes.rebalanceCandidate.targetWeights.AAPL > 0);
  assertions += 4;
}

console.log(`✓ Phase 15 Suite 3 Passed: ${assertions} assertions`);
export { assertions };
