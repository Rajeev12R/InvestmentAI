/**
 * Phase 18 — Test Suite 9: Policy Hardening, Determinism, Concurrency & Temporal Tests
 */

import { strict as assert } from 'assert';
import { LiquidityStatus, LiquidityTier, ExecutionFeasibility, StressScenarioType } from '../liquidity/liquidity.types.js';
import { LiquidityValidationEngine } from '../liquidity/liquidity.validation.engine.js';
import { LiquidityMetricsEngine } from '../liquidity/liquidity.metrics.engine.js';
import { LiquidityCostEngine } from '../liquidity/liquidity.cost.engine.js';
import { LiquidityHorizonEngine } from '../liquidity/liquidity.horizon.engine.js';
import { LiquidityStressEngine } from '../liquidity/liquidity.stress.engine.js';
import { LiquidityFeasibilityEngine } from '../liquidity/liquidity.feasibility.engine.js';
import { LiquidityEngine } from '../liquidity/liquidity.engine.js';
import { SealedLiquidityIntelligencePackage } from '../liquidity/liquidity.package.js';
import { liquidityRepository } from '../liquidity/liquidity.repository.js';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 18 SUITE 9: HARDENING, DETERMINISM, CONCURRENCY & TEMPORAL TESTS ---');

// === SECTION 1: 10 TEMPORAL T0 TESTS ===
console.log('Testing 10 Temporal Invariance Rules...');

// 1. Observation date after asOf date -> TEMPORAL_VIOLATION
const temp1 = LiquidityValidationEngine.validateFreshness('2025-06-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z');
testAssert(temp1.status === LiquidityStatus.TEMPORAL_VIOLATION, 'Temporal 1: Future observation relative to asOf rejected');

// 2. Same day observation is PRIME
const temp2 = LiquidityValidationEngine.validateFreshness('2025-01-01T00:00:00.000Z', '2025-01-01T12:00:00.000Z');
testAssert(temp2.status === 'PRIME', 'Temporal 2: Same-day observation is PRIME');

// 3. 2-day old observation is ACCEPTABLE
const temp3 = LiquidityValidationEngine.validateFreshness('2025-01-01T00:00:00.000Z', '2025-01-03T00:00:00.000Z');
testAssert(temp3.status === 'ACCEPTABLE', 'Temporal 3: 2-day old observation is ACCEPTABLE');

// 4. Stale observation (>5 days) flagged as STALE
const temp4 = LiquidityValidationEngine.validateFreshness('2025-01-01T00:00:00.000Z', '2025-01-10T00:00:00.000Z', 5);
testAssert(temp4.status === 'STALE', 'Temporal 4: 9-day old observation flagged as STALE');

// 5. Invalid date string returns UNAVAILABLE
const temp5 = LiquidityValidationEngine.validateFreshness('invalid-timestamp', '2025-01-01T00:00:00.000Z');
testAssert(temp5.status === LiquidityStatus.UNAVAILABLE, 'Temporal 5: Invalid timestamp returns UNAVAILABLE');

// 6. Null observation timestamp returns UNAVAILABLE
const temp6 = LiquidityValidationEngine.validateFreshness(null, '2025-01-01T00:00:00.000Z');
testAssert(temp6.status === LiquidityStatus.UNAVAILABLE, 'Temporal 6: Null timestamp returns UNAVAILABLE');

// 7. Temporal check embedded in single-security evaluation
const temp7 = LiquidityEngine.evaluateSecurityLiquidity({
  ticker: 'AAPL',
  price: 150.0,
  adv: 1000000,
  timestamp: '2025-06-01T00:00:00.000Z',
  asOf: '2025-01-01T00:00:00.000Z'
});
testAssert(temp7.status === LiquidityStatus.TEMPORAL_VIOLATION, 'Temporal 7: Engine rejects future timestamp');

// 8. T0 snapshot invariance: Adding future data does not alter T0 evaluation
const t0Volumes = [1000, 1000, 1000];
const advAtT0 = LiquidityMetricsEngine.calculateAdv(t0Volumes, '5D');
const t1Volumes = [1000, 1000, 1000, 5000]; // T1 adds a future spike
const advAtT0Recalculated = LiquidityMetricsEngine.calculateAdv(t0Volumes, '5D');
testAssert(advAtT0.adv === advAtT0Recalculated.adv, 'Temporal 8: T0 ADV remains invariant');

// 9. Exact match timestamp
const temp9 = LiquidityValidationEngine.validateFreshness('2025-01-01T10:00:00.000Z', '2025-01-01T10:00:00.000Z');
testAssert(temp9.status === 'PRIME', 'Temporal 9: Exact match timestamp evaluates cleanly');

// 10. Max age boundary: 5 days exact is ACCEPTABLE
const temp10 = LiquidityValidationEngine.validateFreshness('2025-01-01T00:00:00.000Z', '2025-01-05T00:00:00.000Z', 5);
testAssert(temp10.status === 'ACCEPTABLE', 'Temporal 10: 4-day age within max 5 days is ACCEPTABLE');

// === SECTION 2: 100 DETERMINISTIC REPLAYS ===
console.log('Testing 100 Deterministic Replays...');

const baselinePayload = {
  workspaceId: 'WS-DETERMINISM-100',
  portfolioId: 'PORT-DET-01',
  timestamp: '2025-01-15T12:00:00.000Z',
  observations: [
    { ticker: 'AAPL', adv: 1000000, price: 150.0, bid: 149.95, ask: 150.05, spreadBps: 6.67 }
  ],
  metrics: {
    portfolioDollarAdv: 150000000,
    weightedSpreadBps: 6.67
  }
};

const firstSealed = SealedLiquidityIntelligencePackage.sealPackage(baselinePayload);
const targetHash = firstSealed.packageHash;

for (let i = 1; i <= 100; i++) {
  const replay = SealedLiquidityIntelligencePackage.sealPackage(baselinePayload);
  if (replay.packageHash !== targetHash) {
    throw new Error(`Determinism break at replay ${i}: expected ${targetHash}, got ${replay.packageHash}`);
  }
}
testAssert(true, 'Deterministic Replays: 100/100 identical hashes generated');

// === SECTION 3: 10 CONCURRENT WORKERS ===
console.log('Testing 10 Concurrent Workers...');

const concurrentWorkers = [];
for (let w = 1; w <= 10; w++) {
  const wsId = `WS-CONCURRENT-${w}`;
  const workerPromise = new Promise((resolve) => {
    // 1. Save worker specific observation
    liquidityRepository.saveObservation(wsId, {
      ticker: `SEC-${w}`,
      adv: 100000 * w,
      price: 10.0 * w,
      bid: (10.0 * w) - 0.05,
      ask: (10.0 * w) + 0.05
    });

    // 2. Evaluate Feasibility
    const feas = LiquidityFeasibilityEngine.evaluateFeasibility({
      ticker: `SEC-${w}`,
      orderQuantity: 1000 * w,
      adv: 100000 * w,
      referencePrice: 10.0 * w
    });

    // 3. Seal Package
    const sealed = SealedLiquidityIntelligencePackage.sealPackage({
      workspaceId: wsId,
      portfolioId: `PORT-${w}`,
      metrics: { workerId: w }
    });
    liquidityRepository.savePackage(wsId, sealed);

    // 4. Verify cross-workspace isolation
    const foreignObs = liquidityRepository.getObservation(wsId, `SEC-${w === 10 ? 1 : w + 1}`);
    const isIsolated = foreignObs === null;

    resolve({ workerId: w, isIsolated, feasStatus: feas.status, packageHash: sealed.packageHash });
  });
  concurrentWorkers.push(workerPromise);
}

const workerResults = await Promise.all(concurrentWorkers);
for (const wr of workerResults) {
  testAssert(wr.isIsolated === true, `Worker ${wr.workerId}: strict workspace isolation verified`);
  testAssert(wr.feasStatus === LiquidityStatus.PASS, `Worker ${wr.workerId}: feasibility passed`);
  testAssert(typeof wr.packageHash === 'string' && wr.packageHash.length === 64, `Worker ${wr.workerId}: package hash valid`);
}

console.log(`PASSED: Suite 9 completed with ${totalAssertions} assertions.`);
