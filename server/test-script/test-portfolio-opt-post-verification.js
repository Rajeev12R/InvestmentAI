/**
 * server/test-script/test-portfolio-opt-post-verification.js
 * 
 * Phase 33 — Suite 6: Independent Post-Optimization Recomputation & Verification
 */

import { PortfolioOptimizationEngine } from '../portfolioOptimization/portfolioOptimization.engine.js';
import { OptimizationObjective } from '../portfolioOptimization/portfolioOptimization.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 6: Post-Optimization Recomputation & Verification ---');

const symbols = ['STOCK_1', 'STOCK_2', 'STOCK_3'];
const cov = [
  [0.04, 0.01, 0.01],
  [0.01, 0.06, 0.01],
  [0.01, 0.01, 0.08]
];

// 1. Certified Optimal Result
const result = PortfolioOptimizationEngine.runOptimization({
  objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
  symbols,
  covarianceMatrix: cov,
  constraints: {
    longOnly: true,
    maxWeights: [0.60, 0.60, 0.60]
  },
  periodsPerYear: 252
});

assert(result.certificationStatus === 'CERTIFIED_OPTIMAL', 'Valid optimization is marked CERTIFIED_OPTIMAL');
assert(result.postOptimizationVerification.isHardConstraintsSatisfied === true, 'All hard constraints verified post-optimization');

// 2. Independently verify recomputed portfolio metrics
const w = result.optimizedWeights;
let manualVar = 0;
for (let i = 0; i < 3; i++) {
  let rowSum = 0;
  for (let j = 0; j < 3; j++) {
    rowSum += cov[i][j] * w[j];
  }
  manualVar += w[i] * rowSum;
}
const manualAnnVar = manualVar * 252;
const manualAnnVol = Math.sqrt(manualAnnVar);

assert(Math.abs(result.portfolioMetrics.portfolioVariance - manualAnnVar) < 1e-6, 'Post-recomputed variance matches independent calculation');
assert(Math.abs(result.portfolioMetrics.portfolioVolatility - manualAnnVol) < 1e-6, 'Post-recomputed volatility matches independent calculation');

// 3. Herfindahl Index and ENC Verification
const manualHHI = w[0]*w[0] + w[1]*w[1] + w[2]*w[2];
const manualENC = 1.0 / manualHHI;
assert(Math.abs(result.portfolioMetrics.herfindahlIndex - manualHHI) < 1e-6, 'HHI matches exact calculation');
assert(Math.abs(result.portfolioMetrics.effectiveConstituents - manualENC) < 1e-6, 'ENC matches exact calculation');

// 4. Decision Actions and Total Turnover
assert(result.positionDecisions.length === 3, 'All 3 positions have structured decision records');
assert(result.totalTurnover >= 0, 'Total turnover is non-negative');

console.log(`PASSED: ${passed}`);
