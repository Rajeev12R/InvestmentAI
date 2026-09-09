/**
 * server/test-script/test-portfolio-opt-constraints-feasibility.js
 * 
 * Phase 33 — Suite 4: Constraints & Feasibility Diagnostics
 */

import { FeasibilityStatus, ConstraintStatus } from '../portfolioOptimization/portfolioOptimization.types.js';
import { PortfolioOptimizationConstraints } from '../portfolioOptimization/portfolioOptimization.constraints.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 4: Constraints & Feasibility Diagnostics ---');

const symbols = ['AAPL', 'MSFT', 'GOOGL'];
const cov = [
  [0.04, 0.01, 0.01],
  [0.01, 0.05, 0.01],
  [0.01, 0.01, 0.06]
];

// 1. Feasible Box Bounds
const feas1 = PortfolioOptimizationConstraints.checkFeasibility({
  symbols,
  constraints: {
    minWeights: [0.1, 0.1, 0.1],
    maxWeights: [0.6, 0.6, 0.6]
  }
});
assert(feas1.isFeasible === true, 'Valid box bounds are feasible');
assert(feas1.status === FeasibilityStatus.FEASIBLE, 'Feasibility status is FEASIBLE');
assert(feas1.issues.length === 0, 'No issues reported for feasible bounds');

// 2. Infeasible Contradictory Box Bounds (min > max)
const feas2 = PortfolioOptimizationConstraints.checkFeasibility({
  symbols,
  constraints: {
    minWeights: [0.7, 0.1, 0.1],
    maxWeights: [0.5, 0.6, 0.6] // min 0.7 > max 0.5
  }
});
assert(feas2.isFeasible === false, 'Contradictory bounds detected as infeasible');
assert(feas2.status === FeasibilityStatus.INFEASIBLE, 'Status is INFEASIBLE');
assert(feas2.issues.some(i => i.includes('contradictory bounds')), 'Issue documents contradictory bounds');

// 3. Infeasible Full-Investment Bounds (sum(minWeights) > 1.0)
const feas3 = PortfolioOptimizationConstraints.checkFeasibility({
  symbols,
  constraints: {
    minWeights: [0.5, 0.4, 0.3], // sum = 1.2 > 1.0
    maxWeights: [0.8, 0.8, 0.8]
  }
});
assert(feas3.isFeasible === false, 'Sum of minimum weights > 1.0 is infeasible');
assert(feas3.issues.some(i => i.includes('exceeds 1.0')), 'Issue documents min weight sum overflow');

// 4. Infeasible Maximum Turnover
const feas4 = PortfolioOptimizationConstraints.checkFeasibility({
  symbols,
  initialWeights: [1.0, 0.0, 0.0],
  constraints: {
    minWeights: [0.0, 0.4, 0.4], // Must sell at least 0.80 of asset 1
    maxTurnover: 0.10 // Max turnover 0.10 < required 0.80
  }
});
assert(feas4.isFeasible === false, 'Turnover violation detected as infeasible');
assert(feas4.issues.some(i => i.includes('Infeasible turnover')), 'Issue documents turnover deficit');

// 5. Evaluate Constraints against Compliant Weights
const eval1 = PortfolioOptimizationConstraints.evaluateConstraints({
  weights: [0.5, 0.3, 0.2],
  symbols,
  covarianceMatrix: cov,
  constraints: {
    longOnly: true,
    maxTurnover: 0.5,
    maxHHI: 0.5
  },
  initialWeights: [0.4, 0.4, 0.2]
});
assert(eval1.allHardPassed === true, 'Compliant weights pass all hard constraints');
assert(eval1.records.length >= 3, 'Multiple constraint records generated');
assert(eval1.totalPenalty === 0, 'No soft penalty for compliant portfolio');

// 6. Evaluate Constraints with Long-Only Violation
const eval2 = PortfolioOptimizationConstraints.evaluateConstraints({
  weights: [1.2, -0.2, 0.0],
  symbols,
  covarianceMatrix: cov,
  constraints: { longOnly: true }
});
assert(eval2.allHardPassed === false, 'Negative weight fails long-only constraint');

// 7. Simplex Projection Operator
const unprojected = [1.5, -0.3, 0.8];
const projected = PortfolioOptimizationConstraints.projectOntoConstraints(
  unprojected,
  [0, 0, 0],
  [1, 1, 1],
  true
);
const sumProj = projected.reduce((s, w) => s + w, 0);
assert(Math.abs(sumProj - 1.0) < 1e-6, 'Projected weights sum to 1.0');
assert(projected.every(w => w >= -1e-6 && w <= 1.0 + 1e-6), 'Projected weights satisfy box bounds [0, 1]');

console.log(`PASSED: ${passed}`);
