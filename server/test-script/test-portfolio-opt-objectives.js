/**
 * server/test-script/test-portfolio-opt-objectives.js
 * 
 * Phase 33 — Suite 3: Optimization Objectives & Gradient Verification
 */

import { OptimizationObjective } from '../portfolioOptimization/portfolioOptimization.types.js';
import { PortfolioOptimizationObjectives } from '../portfolioOptimization/portfolioOptimization.objectives.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 3: Optimization Objectives & Gradient Evaluation ---');

const weights = [0.6, 0.4];
const expectedReturns = [0.10, 0.15];
const cov = [[0.04, 0.01], [0.01, 0.09]];

// 1. Minimum Variance Objective
const minVar = PortfolioOptimizationObjectives.evaluateObjective({
  objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
  weights,
  expectedReturns,
  covarianceMatrix: cov,
  periodsPerYear: 252
});
assert(minVar.portfolioVariance > 0, 'MinVar variance is strictly positive');
assert(minVar.portfolioVolatility === Math.sqrt(minVar.portfolioVariance), 'Vol is sqrt(variance)');
assert(minVar.objectiveValue === 0.5 * minVar.portfolioVariance, 'MinVar objective is 0.5 * Var');

// 2. Mean-Variance Objective
const meanVar = PortfolioOptimizationObjectives.evaluateObjective({
  objectiveType: OptimizationObjective.MEAN_VARIANCE,
  weights,
  expectedReturns,
  covarianceMatrix: cov,
  lambda: 2.0,
  periodsPerYear: 252
});
const expectedExpRet = 0.6 * 0.10 + 0.4 * 0.15; // 0.06 + 0.06 = 0.12
assert(Math.abs(meanVar.expectedReturn - expectedExpRet) < 1e-6, 'Expected return evaluated correctly (0.12)');
assert(meanVar.objectiveValue === 0.5 * 2.0 * meanVar.portfolioVariance - meanVar.expectedReturn, 'Mean-Variance quadratic loss holds');

// 3. Maximum Sharpe Objective
const maxSharpe = PortfolioOptimizationObjectives.evaluateObjective({
  objectiveType: OptimizationObjective.MAXIMUM_SHARPE,
  weights,
  expectedReturns,
  covarianceMatrix: cov,
  riskFreeRate: 0.02,
  periodsPerYear: 252
});
assert(maxSharpe.sharpeRatio > 0, 'Sharpe ratio is positive');
assert(maxSharpe.objectiveValue === -maxSharpe.sharpeRatio, 'Minimization objective is -Sharpe');

// 4. Tracking Error Objective
const teObj = PortfolioOptimizationObjectives.evaluateObjective({
  objectiveType: OptimizationObjective.TRACKING_ERROR,
  weights,
  expectedReturns,
  covarianceMatrix: cov,
  benchmarkWeights: [0.5, 0.5],
  periodsPerYear: 252
});
assert(teObj.trackingError > 0, 'Tracking error is positive');
assert(teObj.objectiveValue === 0.5 * teObj.activeVariance, 'Tracking error loss is 0.5 * active variance');

// 5. Risk Target Objective
const rtObj = PortfolioOptimizationObjectives.evaluateObjective({
  objectiveType: OptimizationObjective.RISK_TARGET,
  weights,
  expectedReturns,
  covarianceMatrix: cov,
  riskTarget: 0.20,
  periodsPerYear: 252
});
assert(rtObj.volatilityDifference !== undefined, 'Volatility difference calculated');
assert(rtObj.objectiveValue === 0.5 * Math.pow(rtObj.volatilityDifference, 2), 'Risk target quadratic deviation loss holds');

// 6. Risk Budgeting Objective
const rbObj = PortfolioOptimizationObjectives.evaluateObjective({
  objectiveType: OptimizationObjective.RISK_BUDGETING,
  weights,
  expectedReturns,
  covarianceMatrix: cov,
  periodsPerYear: 252
});
assert(rbObj.componentRiskContributions.length === 2, 'Component risk contributions evaluated');
assert(rbObj.objectiveValue >= 0, 'Risk budget objective value is non-negative');

// 7. Gradient Evaluations
const gradMinVar = PortfolioOptimizationObjectives.computeGradient({
  objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
  weights,
  expectedReturns,
  covarianceMatrix: cov,
  periodsPerYear: 252
});
assert(gradMinVar.length === 2, 'MinVar gradient length matches asset count');
assert(Number.isFinite(gradMinVar[0]) && Number.isFinite(gradMinVar[1]), 'MinVar gradient elements are finite');

const gradMeanVar = PortfolioOptimizationObjectives.computeGradient({
  objectiveType: OptimizationObjective.MEAN_VARIANCE,
  weights,
  expectedReturns,
  covarianceMatrix: cov,
  lambda: 1.0,
  periodsPerYear: 252
});
assert(gradMeanVar.length === 2, 'MeanVar gradient length matches asset count');

const gradSharpe = PortfolioOptimizationObjectives.computeGradient({
  objectiveType: OptimizationObjective.MAXIMUM_SHARPE,
  weights,
  expectedReturns,
  covarianceMatrix: cov,
  riskFreeRate: 0.04,
  periodsPerYear: 252
});
assert(gradSharpe.length === 2, 'Sharpe gradient length matches asset count');

console.log(`PASSED: ${passed}`);
