/**
 * Phase 15 Test Suite 1: Holdings Snapshot, Plan Generation & Reconciliation Tests
 */

import assert from 'assert';
import { ImplementationSnapshotEngine } from '../implementation/implementationSnapshot.engine.js';
import { ImplementationPlanEngine } from '../implementation/implementationPlan.engine.js';
import { HoldingsReconciliationEngine } from '../implementation/holdingsReconciliation.engine.js';
import { ImplementationStatus, ApprovalStatus, ReconciliationStatus } from '../implementation/implementation.types.js';

console.log("Starting Phase 15 Suite 1: Holdings Snapshot, Plan Generation & Reconciliation Tests...");

let assertions = 0;

const baseHoldings = [
  { ticker: "AAPL", shares: 2500, price: 200.0, sector: "Technology", geography: "US" },
  { ticker: "MSFT", shares: 1000, price: 400.0, sector: "Technology", geography: "US" },
  { ticker: "JPM", shares: 1000, price: 200.0, sector: "Financials", geography: "US" }
]; // Total value: 500k + 400k + 200k + 100k cash = 1,200,000

// Test 1: Build valid holdings snapshot
{
  const res = ImplementationSnapshotEngine.buildHoldingsSnapshot({
    workspaceId: "WS-1",
    portfolioId: "P-MAIN",
    asOf: "2026-09-06T12:00:00.000Z",
    holdings: baseHoldings,
    cash: 100000.0
  });
  assert.strictEqual(res.status, ImplementationStatus.RECONCILED);
  assert.ok(res.snapshot !== null);
  assert.strictEqual(res.snapshot.totalValue, 1200000);
  assert.strictEqual(res.snapshot.cashWeight, Number((100000 / 1200000).toFixed(6)));
  assert.strictEqual(res.snapshot.positionCount, 3);
  assert.ok(res.snapshot.snapshotHash.length === 64);
  assertions += 6;
}

// Test 2: Reject empty holdings array
{
  const res = ImplementationSnapshotEngine.buildHoldingsSnapshot({
    workspaceId: "WS-1",
    portfolioId: "P-MAIN",
    asOf: "2026-09-06T12:00:00.000Z",
    holdings: []
  });
  assert.strictEqual(res.status, ImplementationStatus.INSUFFICIENT_DATA);
  assert.strictEqual(res.snapshot, null);
  assertions += 2;
}

// Test 3: Reject negative shares
{
  const res = ImplementationSnapshotEngine.buildHoldingsSnapshot({
    workspaceId: "WS-1",
    portfolioId: "P-MAIN",
    asOf: "2026-09-06T12:00:00.000Z",
    holdings: [{ ticker: "AAPL", shares: -50, price: 200 }]
  });
  assert.strictEqual(res.status, ImplementationStatus.INVALID_INPUT);
  assert.strictEqual(res.snapshot, null);
  assertions += 2;
}

// Test 4: Build valid transaction snapshot
{
  const res = ImplementationSnapshotEngine.buildTransactionSnapshot({
    workspaceId: "WS-1",
    portfolioId: "P-MAIN",
    asOf: "2026-09-06T12:00:00.000Z",
    transactions: [
      { transactionId: "TX-1", ticker: "AAPL", side: "BUY", quantity: 100, price: 200.0, timestamp: "2026-09-06T11:00:00.000Z", fees: 10 }
    ]
  });
  assert.strictEqual(res.status, ImplementationStatus.RECONCILED);
  assert.strictEqual(res.snapshot.transactionCount, 1);
  assert.strictEqual(res.snapshot.transactions[0].netValue, 20010);
  assertions += 3;
}

// Test 5: Generate trade plan from approved target weights
{
  const snapRes = ImplementationSnapshotEngine.buildHoldingsSnapshot({
    workspaceId: "WS-1",
    portfolioId: "P-MAIN",
    asOf: "2026-09-06T12:00:00.000Z",
    holdings: baseHoldings,
    cash: 100000.0
  });

  const targetPackage = {
    packageHash: "PKG-TARGET-HASH-123",
    targetWeights: { AAPL: 0.30, MSFT: 0.40, JPM: 0.20, GOOGL: 0.10 }
  };

  const planRes = ImplementationPlanEngine.generatePlan({
    workspaceId: "WS-1",
    portfolioId: "P-MAIN",
    targetPackage,
    currentHoldingsSnapshot: snapRes.snapshot,
    marketPrices: { AAPL: 200.0, MSFT: 400.0, JPM: 200.0, GOOGL: 150.0 },
    asOf: "2026-09-06T12:00:00.000Z"
  });

  assert.strictEqual(planRes.status, ImplementationStatus.PLAN_GENERATED);
  assert.strictEqual(planRes.plan.orders.length, 4);
  assert.ok(planRes.plan.grossTradeValue > 0);
  assert.ok(planRes.plan.oneWayTurnover > 0);
  assert.strictEqual(planRes.plan.approvalStatus, ApprovalStatus.PROPOSED);
  assertions += 5;
}

// Test 6: Human approval gate
{
  const snapRes = ImplementationSnapshotEngine.buildHoldingsSnapshot({
    workspaceId: "WS-1",
    portfolioId: "P-MAIN",
    asOf: "2026-09-06T12:00:00.000Z",
    holdings: baseHoldings,
    cash: 100000.0
  });

  const planRes = ImplementationPlanEngine.generatePlan({
    workspaceId: "WS-1",
    portfolioId: "P-MAIN",
    targetPackage: { targetWeights: { AAPL: 0.50, MSFT: 0.50 } },
    currentHoldingsSnapshot: snapRes.snapshot,
    marketPrices: { AAPL: 200.0, MSFT: 400.0, JPM: 200.0 }
  });

  // Approver with VIEWER role rejected
  const viewerApprove = ImplementationPlanEngine.approvePlan(planRes.plan, {
    approverId: "USR-VIEWER",
    workspaceId: "WS-1",
    role: "VIEWER"
  });
  assert.strictEqual(viewerApprove.status, ImplementationStatus.AUTHORIZATION_FAILURE);

  // Approver with PORTFOLIO_MANAGER approved
  const pmApprove = ImplementationPlanEngine.approvePlan(planRes.plan, {
    approverId: "USR-PM-1",
    workspaceId: "WS-1",
    role: "PORTFOLIO_MANAGER"
  });
  assert.strictEqual(pmApprove.status, ImplementationStatus.HUMAN_APPROVED);
  assert.strictEqual(pmApprove.approvedPlan.approvalStatus, ApprovalStatus.APPROVED);
  assert.strictEqual(pmApprove.approvedPlan.approverId, "USR-PM-1");
  assertions += 4;
}

// Test 7: 3-Way Reconciliation
{
  const snapRes = ImplementationSnapshotEngine.buildHoldingsSnapshot({
    workspaceId: "WS-1",
    portfolioId: "P-MAIN",
    asOf: "2026-09-06T12:00:00.000Z",
    holdings: baseHoldings,
    cash: 100000.0
  });

  const targetPackage = {
    packageHash: "PKG-123",
    targetWeights: { AAPL: 0.40, MSFT: 0.35, JPM: 0.25 }
  };

  const recon = HoldingsReconciliationEngine.reconcile({
    workspaceId: "WS-1",
    portfolioId: "P-MAIN",
    asOf: "2026-09-06T12:00:00.000Z",
    targetPackage,
    actualHoldingsSnapshot: snapRes.snapshot
  });

  assert.strictEqual(recon.status, ImplementationStatus.DRIFTED);
  assert.strictEqual(recon.reconciliation.totalPositionsAudited, 3);
  assert.ok(recon.reconciliation.totalWeightError > 0);
  assert.ok(recon.reconciliation.positions.every(p => p.ticker && typeof p.weightDifference === 'number'));
  assertions += 4;
}

console.log(`✓ Phase 15 Suite 1 Passed: ${assertions} assertions`);
export { assertions };
