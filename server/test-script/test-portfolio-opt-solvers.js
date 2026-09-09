/**
 * server/test-script/test-portfolio-opt-solvers.js
 * 
 * Phase 33 — Suite 5: Solvers Abstraction & Algorithmic Convergence
 */

import { SolverStatus, OptimizationObjective } from '../portfolioOptimization/portfolioOptimization.types.js';
import { PortfolioOptimizationSolvers } from '../portfolioOptimization/portfolioOptimization.solvers.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 5: Solvers Abstraction & Convergence ---');

const symbols = ['EQ1', 'EQ2', 'EQ3'];
const cov = [
  [0.04, 0.01, 0.00],
  [0.01, 0.09, 0.01],
  [0.00, 0.01, 0.16]
];
const expReturns = [0.08, 0.12, 0.16];

// 1. Matrix Inversion
const inv = PortfolioOptimizationSolvers.invertMatrix(cov);
assert(inv !== null, 'Invertible matrix inverted');
assert(inv.length === 3, 'Inverted matrix dimension matches original');

// Inversion of Singular Matrix returns null
const singularMatrix = [
  [1, 2],
  [2, 4]
];
const invSingular = PortfolioOptimizationSolvers.invertMatrix(singularMatrix);
assert(invSingular === null, 'Singular matrix inversion returns null');

// 2. Analytical KKT Minimum Variance
const kktMinVar = PortfolioOptimizationSolvers.solveAnalyticalKKT({
  objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
  symbols,
  expectedReturns: expReturns,
  covarianceMatrix: cov,
  periodsPerYear: 252
});
assert(kktMinVar.status === SolverStatus.OPTIMAL, 'KKT MinVar reaches OPTIMAL status');
assert(kktMinVar.iterations === 1, 'Analytical KKT converges in 1 iteration');
const sumKKT = kktMinVar.weights.reduce((s, w) => s + w, 0);
assert(Math.abs(sumKKT - 1.0) < 1e-6, 'KKT weights sum to 1.0');
assert(kktMinVar.weights[0] > kktMinVar.weights[1], 'Lowest vol asset gets largest weight');

// 3. Analytical KKT Mean-Variance
const kktMeanVar = PortfolioOptimizationSolvers.solveAnalyticalKKT({
  objectiveType: OptimizationObjective.MEAN_VARIANCE,
  symbols,
  expectedReturns: expReturns,
  covarianceMatrix: cov,
  lambda: 2.0,
  periodsPerYear: 252
});
assert(kktMeanVar.status === SolverStatus.OPTIMAL, 'KKT MeanVar reaches OPTIMAL status');
assert(kktMeanVar.weights.length === 3, 'KKT MeanVar produces 3 asset weights');

// 4. Projected Gradient SQP Solver (Box Bounds + Long-Only)
const pgResult = PortfolioOptimizationSolvers.solveProjectedGradient({
  objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
  symbols,
  expectedReturns: expReturns,
  covarianceMatrix: cov,
  constraints: {
    longOnly: true,
    maxWeights: [0.50, 0.50, 0.50]
  },
  periodsPerYear: 252
});
assert(pgResult.status === SolverStatus.OPTIMAL, 'Projected gradient reaches OPTIMAL status');
assert(pgResult.iterations > 1, 'Iterative solver executes multiple steps');
assert(pgResult.weights.every(w => w >= -1e-6 && w <= 0.50 + 1e-6), 'Iterative weights respect [0, 0.50] bounds');
const sumPG = pgResult.weights.reduce((s, w) => s + w, 0);
assert(Math.abs(sumPG - 1.0) < 1e-6, 'Iterative weights sum to 1.0');

// 5. Infeasible Problem Handled by Solver
const infeasResult = PortfolioOptimizationSolvers.solveProjectedGradient({
  objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
  symbols,
  expectedReturns: expReturns,
  covarianceMatrix: cov,
  constraints: {
    minWeights: [0.8, 0.8, 0.8] // sum min = 2.4 > 1.0
  }
});
assert(infeasResult.status === SolverStatus.INFEASIBLE, 'Infeasible constraints return SolverStatus.INFEASIBLE');
assert(infeasResult.weights === null, 'Infeasible problem returns null weights');

console.log(`PASSED: ${passed}`);
