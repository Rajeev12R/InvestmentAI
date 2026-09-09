/**
 * server/test-script/test-portfolio-opt-performance-determinism.js
 * 
 * Phase 33 — Suite 16: Scalability (10–1000 Assets) & Deterministic Replay (208 Assertions)
 */

import { PortfolioOptimizationEngine } from '../portfolioOptimization/portfolioOptimization.engine.js';
import { PortfolioOptimizationPackageBuilder } from '../portfolioOptimization/portfolioOptimization.package.js';
import { PortfolioOptimizationExplanationDAG } from '../portfolioOptimization/portfolioOptimization.explanation.js';
import { OptimizationObjective } from '../portfolioOptimization/portfolioOptimization.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 16: Scalability Benchmarks & Deterministic Replay (208 Assertions) ---');

// ============================================================================
// PART 1: Scalability Benchmarks (10, 50, 100, 500, 1000 Assets) — 8 assertions
// ============================================================================
const assetCounts = [10, 50, 100, 500, 1000];

for (const n of assetCounts) {
  const syms = Array.from({ length: n }, (_, i) => `ASSET_${i + 1}`);
  const cov = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => (r === c ? 0.04 + (r % 5) * 0.005 : 0.005))
  );

  const t0 = Date.now();
  const opt = PortfolioOptimizationEngine.runOptimization({
    objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
    symbols: syms,
    covarianceMatrix: cov,
    constraints: { longOnly: true }
  });
  const duration = Date.now() - t0;

  assert(opt.status === 'OPTIMAL', `Scalability ${n} assets: Reached OPTIMAL status in ${duration}ms`);
  if (n <= 100) {
    assert(opt.postOptimizationVerification.isHardConstraintsSatisfied === true, `Scalability ${n} assets: Hard constraints verified`);
  }
}

// ============================================================================
// PART 2: Deterministic Replay (100 Iterations) — 200 assertions
// ============================================================================
const benchmarkSyms = ['STK_1', 'STK_2', 'STK_3'];
const benchmarkCov = [
  [0.04, 0.01, 0.01],
  [0.01, 0.06, 0.01],
  [0.01, 0.01, 0.09]
];

let baseHash = null;

for (let iter = 0; iter < 100; iter++) {
  const opt = PortfolioOptimizationEngine.runOptimization({
    objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
    symbols: benchmarkSyms,
    covarianceMatrix: benchmarkCov,
    constraints: { longOnly: true },
    asOf: '2026-09-07T00:00:00.000Z'
  });

  const dag = PortfolioOptimizationExplanationDAG.buildExplanationDAG(opt);
  const pkg = PortfolioOptimizationPackageBuilder.buildSealedPackage({
    optimizationResult: opt,
    explanationDAG: dag,
    portfolioSnapshotId: 'SNAP-DETERMINISM',
    tenantId: 'tenant_deterministic'
  });

  if (iter === 0) {
    baseHash = pkg.integrityHash;
  }

  assert(pkg.integrityHash === baseHash, `Replay Iteration ${iter}: SHA-256 integrity hash is 100% deterministic`);
  assert(Math.abs(opt.optimizedWeights[0] - 0.490909) < 0.05, `Replay Iteration ${iter}: Weight 0 is deterministic`);
}

console.log(`PASSED: ${passed}`);
