/**
 * server/test-script/test-portfolio-opt-types-schema.js
 * 
 * Phase 33 — Suite 1: Portfolio Optimization Types, Taxonomy & Schema Validation
 */

import { OptimizationObjective, ConstraintType, ConstraintStatus, FeasibilityStatus, SolverStatus, RelaxationPolicy, DecisionAction, deepFreeze } from '../portfolioOptimization/portfolioOptimization.types.js';
import { OPTIMIZATION_CONFIG } from '../portfolioOptimization/portfolioOptimization.config.js';
import { PortfolioOptimizationValidation } from '../portfolioOptimization/portfolioOptimization.validation.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 1: Portfolio Optimization Types, Taxonomy & Validation ---');

// 1. Enums Verification
assert(Object.keys(OptimizationObjective).length === 8, '8 Optimization Objectives defined');
assert(OptimizationObjective.MEAN_VARIANCE === 'MEAN_VARIANCE', 'MEAN_VARIANCE defined');
assert(OptimizationObjective.MINIMUM_VARIANCE === 'MINIMUM_VARIANCE', 'MINIMUM_VARIANCE defined');
assert(OptimizationObjective.MAXIMUM_SHARPE === 'MAXIMUM_SHARPE', 'MAXIMUM_SHARPE defined');
assert(OptimizationObjective.RISK_TARGET === 'RISK_TARGET', 'RISK_TARGET defined');
assert(OptimizationObjective.TRACKING_ERROR === 'TRACKING_ERROR', 'TRACKING_ERROR defined');
assert(OptimizationObjective.ACTIVE_RETURN_RISK === 'ACTIVE_RETURN_RISK', 'ACTIVE_RETURN_RISK defined');
assert(OptimizationObjective.RISK_BUDGETING === 'RISK_BUDGETING', 'RISK_BUDGETING defined');
assert(OptimizationObjective.INVESTOR_UTILITY === 'INVESTOR_UTILITY', 'INVESTOR_UTILITY defined');

assert(ConstraintType.FULLY_INVESTED === 'FULLY_INVESTED', 'FULLY_INVESTED constraint defined');
assert(ConstraintType.LONG_ONLY === 'LONG_ONLY', 'LONG_ONLY constraint defined');
assert(ConstraintType.POSITION_BOUNDS === 'POSITION_BOUNDS', 'POSITION_BOUNDS constraint defined');
assert(ConstraintType.SECTOR_BOUNDS === 'SECTOR_BOUNDS', 'SECTOR_BOUNDS constraint defined');
assert(ConstraintType.GEOGRAPHY_BOUNDS === 'GEOGRAPHY_BOUNDS', 'GEOGRAPHY_BOUNDS constraint defined');
assert(ConstraintType.TURNOVER_LIMIT === 'TURNOVER_LIMIT', 'TURNOVER_LIMIT constraint defined');
assert(ConstraintType.VOLATILITY_CAP === 'VOLATILITY_CAP', 'VOLATILITY_CAP constraint defined');
assert(ConstraintType.VAR_CAP === 'VAR_CAP', 'VAR_CAP constraint defined');
assert(ConstraintType.TRACKING_ERROR_CAP === 'TRACKING_ERROR_CAP', 'TRACKING_ERROR_CAP constraint defined');
assert(ConstraintType.CONCENTRATION_LIMIT === 'CONCENTRATION_LIMIT', 'CONCENTRATION_LIMIT constraint defined');

assert(SolverStatus.OPTIMAL === 'OPTIMAL', 'SolverStatus.OPTIMAL defined');
assert(SolverStatus.INFEASIBLE === 'INFEASIBLE', 'SolverStatus.INFEASIBLE defined');
assert(SolverStatus.NUMERICAL_FAILURE === 'NUMERICAL_FAILURE', 'SolverStatus.NUMERICAL_FAILURE defined');

assert(FeasibilityStatus.FEASIBLE === 'FEASIBLE', 'FeasibilityStatus.FEASIBLE defined');
assert(FeasibilityStatus.INFEASIBLE === 'INFEASIBLE', 'FeasibilityStatus.INFEASIBLE defined');

assert(DecisionAction.ENTER === 'ENTER', 'DecisionAction.ENTER defined');
assert(DecisionAction.EXIT === 'EXIT', 'DecisionAction.EXIT defined');
assert(DecisionAction.INCREASE === 'INCREASE', 'DecisionAction.INCREASE defined');
assert(DecisionAction.DECREASE === 'DECREASE', 'DecisionAction.DECREASE defined');
assert(DecisionAction.HOLD === 'HOLD', 'DecisionAction.HOLD defined');

// 2. Immutability
const obj = { test: { a: 1, b: [1, 2, 3] } };
deepFreeze(obj);
assert(Object.isFrozen(obj), 'Root object is frozen');
assert(Object.isFrozen(obj.test), 'Nested object is frozen');
assert(Object.isFrozen(obj.test.b), 'Nested array is frozen');

// 3. Mathematical Validation Helpers
const z95 = PortfolioOptimizationValidation.inverseNormalCDF(0.95);
assert(Math.abs(z95 - 1.6448536) < 1e-5, 'Acklam 95% quantile is 1.6448536');
const z99 = PortfolioOptimizationValidation.inverseNormalCDF(0.99);
assert(Math.abs(z99 - 2.3263479) < 1e-5, 'Acklam 99% quantile is 2.3263479');

const pdf0 = PortfolioOptimizationValidation.normalPDF(0);
assert(Math.abs(pdf0 - (1.0 / Math.sqrt(2 * Math.PI))) < 1e-10, 'Normal PDF at zero is 1/sqrt(2pi)');

const syms = ['A', 'B'];
const validCov = [[0.04, 0.01], [0.01, 0.04]];
assert(PortfolioOptimizationValidation.validateCovarianceMatrix(validCov, syms) === true, 'Valid covariance passes check');

const chol = PortfolioOptimizationValidation.choleskyDecomposition(validCov);
assert(chol !== null, 'PSD matrix has valid Cholesky decomposition');
assert(chol[0][0] === 0.2, 'Cholesky [0][0] is sqrt(0.04) = 0.2');

const reg = PortfolioOptimizationValidation.regularizeCovariance([[0.04, 0.04], [0.04, 0.04]], 1e-5);
assert(reg.wasRegularized === true, 'Regularization applied to singular matrix');
assert(reg.regularizedMatrix[0][0] > 0.04, 'Diagonal boosted by regularization shrinkage');

const dot = PortfolioOptimizationValidation.dotProduct([1, 2], [3, 4]);
assert(dot === 11, 'Dot product computed correctly (1*3 + 2*4 = 11)');

const qf = PortfolioOptimizationValidation.quadraticForm([0.5, 0.5], validCov);
assert(Math.abs(qf - 0.025) < 1e-6, 'Quadratic form computed correctly (0.025)');

console.log(`PASSED: ${passed}`);
