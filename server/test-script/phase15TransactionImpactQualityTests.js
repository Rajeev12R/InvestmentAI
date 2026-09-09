/**
 * Phase 15 Test Suite 4: Transaction Impact, Liquidity & Implementation Quality Tests
 */

import assert from 'assert';
import { ImplementationPlanEngine } from '../implementation/implementationPlan.engine.js';
import { HoldingsReconciliationEngine } from '../implementation/holdingsReconciliation.engine.js';
import { TransactionImpactEngine } from '../implementation/transactionImpact.engine.js';
import { ImplementationQualityEngine } from '../implementation/implementationQuality.engine.js';
import { ImplementationQualityStatus, ImplementationStatus } from '../implementation/implementation.types.js';

console.log("Starting Phase 15 Suite 4: Transaction Impact & Implementation Quality Tests...");

let assertions = 0;

const mockPlan = {
  planId: "PLAN-1",
  portfolioValue: 1000000,
  orders: [
    { ticker: "AAPL", action: "SELL", estimatedTradeValue: 100000, shareDelta: -500, currentPrice: 200, costBasis: 150, holdingPeriodDays: 400 },
    { ticker: "MSFT", action: "BUY", estimatedTradeValue: 100000, shareDelta: 250, currentPrice: 400, costBasis: null }
  ]
};

const mockLiquidity = {
  AAPL: { advUsd: 10000000 }, // 10M ADV
  MSFT: { advUsd: 5000000 }   // 5M ADV
};

// Test 1: Transaction cost breakdown & liquidity evaluation
{
  const impactRes = TransactionImpactEngine.evaluateImpact({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    plan: mockPlan,
    liquidityMap: mockLiquidity,
    expectedReturnImprovementBps: 100.0
  });

  assert.strictEqual(impactRes.status, ImplementationStatus.RECONCILED);
  assert.strictEqual(impactRes.impactReport.grossTradeValue, 200000);
  assert.ok(impactRes.impactReport.totalLinearCost > 0);
  assert.ok(impactRes.impactReport.totalSpreadCost > 0);
  assert.ok(impactRes.impactReport.totalMarketImpactCost > 0);
  assert.ok(impactRes.impactReport.totalEstimatedTaxImpact > 0); // 500 * (200 - 150) * 0.20 = 5,000
  assert.strictEqual(impactRes.impactReport.totalEstimatedTaxImpact, 5000);
  assert.strictEqual(impactRes.impactReport.isEconomicallyJustified, true);
  assertions += 8;
}

// Test 2: Net benefit UNAVAILABLE when expected return model omitted
{
  const impactRes = TransactionImpactEngine.evaluateImpact({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    plan: mockPlan,
    liquidityMap: mockLiquidity,
    expectedReturnImprovementBps: null
  });

  assert.strictEqual(impactRes.impactReport.netExpectedBenefitBps, null);
  assertions += 1;
}

// Test 3: Implementation Quality - Excellent fidelity
{
  const mockRecon = {
    completenessRatio: 1.0,
    missingCount: 0,
    unexpectedCount: 0,
    positions: [
      { ticker: "AAPL", weightDifference: 0.005, shareDifference: 2, valueDifference: 400 },
      { ticker: "MSFT", weightDifference: -0.004, shareDifference: -1, valueDifference: -400 }
    ]
  };

  const qualRes = ImplementationQualityEngine.evaluateQuality({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    reconciliation: mockRecon
  });

  assert.strictEqual(qualRes.status, ImplementationStatus.RECONCILED);
  assert.strictEqual(qualRes.qualityReport.qualityScore, ImplementationQualityStatus.EXCELLENT);
  assert.ok(qualRes.qualityReport.rmsWeightTrackingError < 0.01);
  assertions += 3;
}

// Test 4: Implementation Quality - Failed fidelity on missing position / large error
{
  const mockRecon = {
    completenessRatio: 0.5,
    missingCount: 2,
    unexpectedCount: 1,
    positions: [
      { ticker: "AAPL", weightDifference: 0.15, shareDifference: 500, valueDifference: 100000 },
      { ticker: "MSFT", weightDifference: -0.15, shareDifference: -375, valueDifference: -150000 }
    ]
  };

  const qualRes = ImplementationQualityEngine.evaluateQuality({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    reconciliation: mockRecon
  });

  assert.strictEqual(qualRes.qualityReport.qualityScore, ImplementationQualityStatus.FAILED);
  assert.strictEqual(qualRes.qualityReport.missingPositionCount, 2);
  assert.strictEqual(qualRes.qualityReport.unexpectedPositionCount, 1);
  assertions += 3;
}

console.log(`✓ Phase 15 Suite 4 Passed: ${assertions} assertions`);
export { assertions };
