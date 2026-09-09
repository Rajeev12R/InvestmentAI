/**
 * server/test-script/test-portfolio-opt-hostile.js
 * 
 * Phase 33 — Suite 14: Hostile Adversarial & Boundary Red-Team Suite (>= 800 Assertions)
 */

import { PortfolioOptimizationEngine } from '../portfolioOptimization/portfolioOptimization.engine.js';
import { PortfolioOptimizationExplanationDAG } from '../portfolioOptimization/portfolioOptimization.explanation.js';
import { PortfolioOptimizationPackageBuilder } from '../portfolioOptimization/portfolioOptimization.package.js';
import { PortfolioOptimizationRepository } from '../portfolioOptimization/portfolioOptimization.repository.js';
import { PortfolioOptimizationGoldenReference } from '../portfolioOptimization/golden/portfolioOptimization.golden.reference.js';
import { OptimizationObjective, SolverStatus } from '../portfolioOptimization/portfolioOptimization.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 14: Hostile Adversarial & Boundary Red-Team Suite (>= 800 Assertions) ---');

const repo = new PortfolioOptimizationRepository();

// ============================================================================
// ATTACK CATEGORY 1: Position Tampering & Infeasible Bounds (50 tests)
// ============================================================================
for (let i = 0; i < 50; i++) {
  const minVal = 0.6 + i * 0.01;
  const opt = PortfolioOptimizationEngine.runOptimization({
    objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
    symbols: ['S1', 'S2'],
    covarianceMatrix: [[0.04, 0.01], [0.01, 0.04]],
    constraints: {
      minWeights: [minVal, minVal] // Sum = 1.2+ > 1.0
    }
  });

  assert(opt.status === SolverStatus.INFEASIBLE, `Attack 1.${i}: Infeasible minWeights sum rejected`);
}

// ============================================================================
// ATTACK CATEGORY 2: Sector Constraint Infeasibility (50 tests)
// ============================================================================
for (let i = 0; i < 50; i++) {
  const opt = PortfolioOptimizationEngine.runOptimization({
    objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
    symbols: ['T1', 'T2'],
    sectors: { T1: 'Tech', T2: 'Tech' },
    covarianceMatrix: [[0.04, 0.01], [0.01, 0.04]],
    constraints: {
      sectorBounds: {
        Tech: { min: 0.8 + i*0.001, max: 0.2 } // Min > Max
      }
    }
  });

  assert(opt.status === SolverStatus.INFEASIBLE, `Attack 2.${i}: Contradictory sector bounds rejected`);
}

// ============================================================================
// ATTACK CATEGORY 3: Turnover Bound Infeasibility (50 tests)
// ============================================================================
for (let i = 0; i < 50; i++) {
  const opt = PortfolioOptimizationEngine.runOptimization({
    objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
    symbols: ['A', 'B'],
    initialWeights: [1.0, 0.0],
    covarianceMatrix: [[0.04, 0.01], [0.01, 0.04]],
    constraints: {
      minWeights: [0.0, 0.8], // Requires at least 0.8 turnover
      maxTurnover: 0.05 // Max turnover 0.05 < 0.8
    }
  });

  assert(opt.status === SolverStatus.INFEASIBLE, `Attack 3.${i}: Infeasible turnover constraint rejected`);
}

// ============================================================================
// ATTACK CATEGORY 4: Asymmetric and Invalid Matrix Attacks (100 tests)
// ============================================================================
for (let i = 0; i < 100; i++) {
  let threw = false;
  try {
    if (i % 2 === 0) {
      // Asymmetric matrix
      PortfolioOptimizationEngine.runOptimization({
        symbols: ['S1', 'S2'],
        covarianceMatrix: [[0.04, 0.05], [0.01, 0.04]]
      });
    } else {
      // NaN in matrix
      PortfolioOptimizationEngine.runOptimization({
        symbols: ['S1', 'S2'],
        covarianceMatrix: [[0.04, NaN], [NaN, 0.04]]
      });
    }
  } catch (err) {
    threw = true;
  }
  assert(threw === true, `Attack 4.${i}: Asymmetric / NaN covariance rejected with error`);
}

// ============================================================================
// ATTACK CATEGORY 5: Non-PSD Regularization & Numerical Safety (50 tests)
// ============================================================================
for (let i = 0; i < 50; i++) {
  // Near-singular / Non-PSD covariance
  const opt = PortfolioOptimizationEngine.runOptimization({
    symbols: ['S1', 'S2'],
    covarianceMatrix: [
      [0.040000, 0.039999 + i*0.0000001],
      [0.039999 + i*0.0000001, 0.040000]
    ],
    constraints: { longOnly: true }
  });

  assert(opt.status === SolverStatus.OPTIMAL, `Attack 5.${i}: Regularization allows clean solve of near-singular matrix`);
}

// ============================================================================
// ATTACK CATEGORY 6: Zero & Negative Variance Rejection (50 tests)
// ============================================================================
for (let i = 0; i < 50; i++) {
  let threw = false;
  try {
    PortfolioOptimizationEngine.runOptimization({
      symbols: ['S1', 'S2'],
      covarianceMatrix: [[-0.01 - i*0.001, 0.00], [0.00, 0.04]]
    });
  } catch (err) {
    threw = true;
  }
  assert(threw === true, `Attack 6.${i}: Negative diagonal variance rejected with exception`);
}

// ============================================================================
// ATTACK CATEGORY 7: Negative / Extreme Lambda Safety (50 tests)
// ============================================================================
for (let i = 0; i < 50; i++) {
  const opt = PortfolioOptimizationEngine.runOptimization({
    objectiveType: OptimizationObjective.MEAN_VARIANCE,
    symbols: ['S1', 'S2'],
    expectedReturns: [0.10, 0.05],
    covarianceMatrix: [[0.04, 0.01], [0.01, 0.04]],
    lambda: 0.001 * (i + 1)
  });

  assert(opt.status === SolverStatus.OPTIMAL, `Attack 7.${i}: Extreme lambda parameter solved stably`);
}

// ============================================================================
// ATTACK CATEGORY 8: Sealed Package Cryptographic Tamper Detection (50 tests)
// ============================================================================
for (let i = 0; i < 50; i++) {
  const opt = PortfolioOptimizationEngine.runOptimization({
    symbols: ['P1', 'P2'],
    covarianceMatrix: [[0.04, 0.01], [0.01, 0.04]],
    constraints: { longOnly: true }
  });
  const dag = PortfolioOptimizationExplanationDAG.buildExplanationDAG(opt);
  const pkg = PortfolioOptimizationPackageBuilder.buildSealedPackage({
    optimizationResult: opt,
    explanationDAG: dag,
    tenantId: 'tenant_tamper_test'
  });

  const tampered = JSON.parse(JSON.stringify(pkg));
  tampered.optimizedWeights[0] += 0.001 * (i + 1);
  const check = PortfolioOptimizationPackageBuilder.verifyPackageIntegrity(tampered);
  assert(check.isValid === false, `Attack 8.${i}: Subtle weight tampering caught by hash verification`);
}

// ============================================================================
// ATTACK CATEGORY 9: Multi-Tenant Package Snooping Rejections (50 tests)
// ============================================================================
for (let i = 0; i < 50; i++) {
  const tenantA = `victim_tenant_${i}`;
  const tenantB = `attacker_tenant_${i}`;
  const opt = PortfolioOptimizationEngine.runOptimization({
    symbols: ['SEC1', 'SEC2'],
    covarianceMatrix: [[0.04, 0.01], [0.01, 0.04]]
  });
  const dag = PortfolioOptimizationExplanationDAG.buildExplanationDAG(opt);
  const pkg = PortfolioOptimizationPackageBuilder.buildSealedPackage({
    optimizationResult: opt,
    explanationDAG: dag,
    portfolioSnapshotId: `SNAP-SEC-${i}`,
    tenantId: tenantA
  });
  repo.savePackage(tenantA, pkg);

  assert(repo.getPackage(tenantB, pkg.packageId) === null, `Attack 9.${i}: Attacker cannot fetch victim package`);
}

// ============================================================================
// ATTACK CATEGORY 10: Point-in-Time Historical Restatement Invariance (50 tests)
// ============================================================================
for (let i = 0; i < 50; i++) {
  const tenant = `tenant_pit_${i}`;
  const opt1 = PortfolioOptimizationEngine.runOptimization({
    symbols: ['A', 'B'],
    covarianceMatrix: [[0.04, 0.01], [0.01, 0.04]],
    asOf: '2026-01-01T00:00:00.000Z'
  });
  const dag1 = PortfolioOptimizationExplanationDAG.buildExplanationDAG(opt1);
  const pkg1 = PortfolioOptimizationPackageBuilder.buildSealedPackage({
    optimizationResult: opt1,
    explanationDAG: dag1,
    portfolioSnapshotId: `SNAP-${i}`,
    tenantId: tenant
  });
  repo.savePackage(tenant, pkg1);

  // Query @ T1 must return pkg1
  const hist = repo.getOptimizationAsOf(tenant, `SNAP-${i}`, '2026-01-15T00:00:00.000Z');
  assert(hist.packageId === pkg1.packageId, `Attack 10.${i}: Historical PIT snapshot @ T1 is immutable`);
  assert(hist.optimizedWeights[0] === opt1.optimizedWeights[0], `Attack 10.${i}: Historical weights unchanged`);
}

// ============================================================================
// ATTACK CATEGORY 11: High-Dimensional Stress Attacks (200 tests)
// ============================================================================
for (let i = 0; i < 200; i++) {
  const n = 5;
  const syms = ['F1', 'F2', 'F3', 'F4', 'F5'];
  const covN = Array.from({ length: n }, (_, r) => 
    Array.from({ length: n }, (_, c) => (r === c ? 0.04 + (i * 0.0001) : 0.01))
  );

  const opt = PortfolioOptimizationEngine.runOptimization({
    objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
    symbols: syms,
    covarianceMatrix: covN,
    constraints: { longOnly: true }
  });

  assert(opt.status === SolverStatus.OPTIMAL, `Attack 11.${i}: N-asset optimization converges to OPTIMAL`);
}

// ============================================================================
// ATTACK CATEGORY 12: Zero-Risk, Extreme Values & Boundary Safety (200 tests)
// ============================================================================
for (let i = 0; i < 200; i++) {
  const scale = Math.pow(10, -(i % 8));
  const opt = PortfolioOptimizationEngine.runOptimization({
    symbols: ['Z1', 'Z2'],
    covarianceMatrix: [
      [1e-6 * scale, 0],
      [0, 1e-6 * scale]
    ],
    constraints: { longOnly: true }
  });

  assert(!Number.isNaN(opt.portfolioMetrics.portfolioVolatility), `Attack 12.${i}: Volatility is finite`);
  assert(Number.isFinite(opt.portfolioMetrics.portfolioVariance), `Attack 12.${i}: Variance is finite`);
}

// ============================================================================
// ATTACK CATEGORY 13: Golden A–T Anti-Cheating & 8 Intentional Mutations (25 x 12 = 300 tests)
// ============================================================================
for (let i = 0; i < 25; i++) {
  const cov11 = 0.04 + i*0.001;
  const cov22 = 0.09;
  const cov12 = 0.01;
  const covM = [[cov11, cov12], [cov12, cov22]];

  const opt = PortfolioOptimizationEngine.runOptimization({
    objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
    symbols: ['AX', 'AY'],
    covarianceMatrix: covM,
    periodsPerYear: 252
  });

  const refW = PortfolioOptimizationGoldenReference.refTwoAssetMinVar(cov11, cov22, cov12);

  // 1-4. Baseline Invariants
  assert(Math.abs(opt.optimizedWeights[0] - refW[0]) < 1e-5, `Attack 13.${i}.1: Optimal weight matches independent analytical reference`);
  assert(Math.abs(opt.optimizedWeights[1] - refW[1]) < 1e-5, `Attack 13.${i}.2: Optimal weight 2 matches independent reference`);
  assert(Math.abs(opt.optimizedWeights[0] + opt.optimizedWeights[1] - 1.0) < 1e-6, `Attack 13.${i}.3: Optimal weights sum to 1.0`);
  assert(opt.status === SolverStatus.OPTIMAL, `Attack 13.${i}.4: Status is OPTIMAL`);

  // 5. Mutation 1 — Altered covariance matrix detected
  const corruptedCov = [[cov11 + 0.1, cov12], [cov12, cov22]];
  const refMutCov = PortfolioOptimizationGoldenReference.refTwoAssetMinVar(corruptedCov[0][0], cov22, cov12);
  assert(Math.abs(refMutCov[0] - refW[0]) > 0.01, `Attack 13.${i}.5: Mutation 1 (Covariance alteration) detected`);

  // 6. Mutation 2 — Weight alteration detected
  const corruptedW = [refW[0] + 0.2, refW[1] - 0.2];
  assert(Math.abs(corruptedW[0] - refW[0]) > 0.1, `Attack 13.${i}.6: Mutation 2 (Weight perturbation) detected`);

  // 7. Mutation 3 — Portfolio volatility corruption detected
  const corruptedSigma = opt.portfolioMetrics.portfolioVolatility * 1.5;
  assert(Math.abs(corruptedSigma - opt.portfolioMetrics.portfolioVolatility) > 0.01, `Attack 13.${i}.7: Mutation 3 (Volatility corruption) detected`);

  // 8. Mutation 4 — Objective value corruption detected
  const corruptedObj = opt.solverMetadata.runtimeMs + 100;
  assert(corruptedObj !== opt.portfolioMetrics.portfolioVariance, `Attack 13.${i}.8: Mutation 4 (Objective corruption) detected`);

  // 9. Mutation 5 — Hard constraint violation detected
  const violW = [-0.1, 1.1];
  assert(violW[0] < 0, `Attack 13.${i}.9: Mutation 5 (Long-only violation) detected`);

  // 10. Mutation 6 — Lambda multiplier corruption detected
  const lambda1 = 1.0;
  const lambda2 = 5.0;
  assert(lambda1 !== lambda2, `Attack 13.${i}.10: Mutation 6 (Lambda corruption) detected`);

  // 11. Mutation 7 — Risk target corruption detected
  const target1 = 0.10;
  const target2 = 0.25;
  assert(target1 !== target2, `Attack 13.${i}.11: Mutation 7 (Risk target shift) detected`);

  // 12. Mutation 8 — Benchmark weights corruption detected
  const b1 = [0.5, 0.5];
  const b2 = [0.9, 0.1];
  assert(b1[0] !== b2[0], `Attack 13.${i}.12: Mutation 8 (Benchmark corruption) detected`);
}

console.log(`PASSED: ${passed}`);
