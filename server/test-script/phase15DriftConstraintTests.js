/**
 * Phase 15 Test Suite 2: Portfolio Drift & Constraint Monitoring Tests
 */

import assert from 'assert';
import { ImplementationSnapshotEngine } from '../implementation/implementationSnapshot.engine.js';
import { PortfolioDriftEngine } from '../implementation/portfolioDrift.engine.js';
import { ConstraintMonitoringEngine } from '../implementation/constraintMonitoring.engine.js';
import { DriftStatus, ConstraintStatus, ImplementationStatus } from '../implementation/implementation.types.js';

console.log("Starting Phase 15 Suite 2: Drift & Constraint Monitoring Tests...");

let assertions = 0;

const holdings = [
  { ticker: "AAPL", shares: 2500, price: 200.0, sector: "Technology", geography: "US" }, // 500k = 50%
  { ticker: "MSFT", shares: 750, price: 400.0, sector: "Technology", geography: "US" },  // 300k = 30%
  { ticker: "JPM", shares: 1000, price: 200.0, sector: "Financials", geography: "US" }   // 200k = 20%
]; // Total = 1,000,000

const snapRes = ImplementationSnapshotEngine.buildHoldingsSnapshot({
  workspaceId: "WS-1",
  portfolioId: "P-1",
  asOf: "2026-09-06T12:00:00.000Z",
  holdings
});

// Test 1: Drift evaluation in tolerance
{
  const targetPackage = {
    targetWeights: { AAPL: 0.50, MSFT: 0.30, JPM: 0.20 }
  };
  const driftRes = PortfolioDriftEngine.evaluateDrift({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    targetPackage,
    actualHoldingsSnapshot: snapRes.snapshot
  });
  assert.strictEqual(driftRes.status, ImplementationStatus.RECONCILED);
  assert.strictEqual(driftRes.drift.overallStatus, DriftStatus.IN_TOLERANCE);
  assert.strictEqual(driftRes.drift.maxAbsolutePositionDrift, 0.0);
  assert.strictEqual(driftRes.drift.totalAbsolutePortfolioDrift, 0.0);
  assertions += 4;
}

// Test 2: Drift breach detection
{
  const targetPackage = {
    targetWeights: { AAPL: 0.35, MSFT: 0.35, JPM: 0.30 } // AAPL target 35% vs actual 50% = 15% drift -> BREACH
  };
  const driftRes = PortfolioDriftEngine.evaluateDrift({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    targetPackage,
    actualHoldingsSnapshot: snapRes.snapshot
  });
  assert.strictEqual(driftRes.drift.overallStatus, DriftStatus.BREACH);
  assert.strictEqual(driftRes.drift.maxAbsolutePositionDrift, 0.15);
  assert.strictEqual(driftRes.drift.oneWayDriftTurnover, 0.15);
  assertions += 3;
}

// Test 3: Sector drift evaluation
{
  const targetPackage = {
    targetWeights: { AAPL: 0.35, MSFT: 0.35, JPM: 0.30 } // Tech target: 70% vs actual 80% = 10% drift
  };
  const driftRes = PortfolioDriftEngine.evaluateDrift({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    targetPackage,
    actualHoldingsSnapshot: snapRes.snapshot
  });
  const techSec = driftRes.drift.sectors.find(s => s.sector === 'Technology');
  assert.ok(techSec !== undefined);
  assert.strictEqual(techSec.status, DriftStatus.BREACH);
  assert.strictEqual(techSec.drift, 0.10);
  assertions += 3;
}

// Test 4: Constraint Monitoring - All Pass
{
  const constraints = {
    defaultMaxWeight: 0.60,
    sectorMaxWeights: { Technology: 0.90, Financials: 0.50 },
    defaultMinCash: 0.0,
    defaultMaxCash: 0.20
  };
  const monRes = ConstraintMonitoringEngine.monitorConstraints({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    actualHoldingsSnapshot: snapRes.snapshot,
    constraints
  });
  assert.strictEqual(monRes.status, ImplementationStatus.RECONCILED);
  assert.strictEqual(monRes.constraintReport.overallStatus, ConstraintStatus.PASS);
  assert.strictEqual(monRes.constraintReport.breachCount, 0);
  assertions += 3;
}

// Test 5: Constraint Monitoring - Max Position Breach
{
  const constraints = {
    positionMaxWeights: { AAPL: 0.40 }, // Actual AAPL is 50% -> BREACH
    defaultMaxWeight: 0.60
  };
  const monRes = ConstraintMonitoringEngine.monitorConstraints({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    actualHoldingsSnapshot: snapRes.snapshot,
    constraints
  });
  assert.strictEqual(monRes.constraintReport.overallStatus, ConstraintStatus.BREACH);
  assert.ok(monRes.constraintReport.breachCount >= 1);
  const aaplConst = monRes.constraintReport.constraints.find(c => c.constraintId === 'MAX_POSITION_AAPL');
  assert.strictEqual(aaplConst.status, ConstraintStatus.BREACH);
  assertions += 3;
}

// Test 6: Constraint Monitoring - Sector Cap Breach
{
  const constraints = {
    sectorMaxWeights: { Technology: 0.70 }, // Actual Tech is 80% -> BREACH
    defaultMaxWeight: 0.60
  };
  const monRes = ConstraintMonitoringEngine.monitorConstraints({
    workspaceId: "WS-1",
    portfolioId: "P-1",
    asOf: "2026-09-06T12:00:00.000Z",
    actualHoldingsSnapshot: snapRes.snapshot,
    constraints
  });
  assert.strictEqual(monRes.constraintReport.overallStatus, ConstraintStatus.BREACH);
  const techConst = monRes.constraintReport.constraints.find(c => c.constraintId === 'MAX_SECTOR_Technology');
  assert.strictEqual(techConst.status, ConstraintStatus.BREACH);
  assertions += 2;
}

console.log(`✓ Phase 15 Suite 2 Passed: ${assertions} assertions`);
export { assertions };
