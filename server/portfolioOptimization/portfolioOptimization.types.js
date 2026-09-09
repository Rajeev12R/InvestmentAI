/**
 * server/portfolioOptimization/portfolioOptimization.types.js
 * 
 * Phase 33: Institutional Portfolio Optimization & Decision Engine
 * Canonical types, enumerations, and immutable schema definitions.
 */

export const OptimizationObjective = Object.freeze({
  MEAN_VARIANCE: 'MEAN_VARIANCE',
  MINIMUM_VARIANCE: 'MINIMUM_VARIANCE',
  MAXIMUM_SHARPE: 'MAXIMUM_SHARPE',
  RISK_TARGET: 'RISK_TARGET',
  TRACKING_ERROR: 'TRACKING_ERROR',
  ACTIVE_RETURN_RISK: 'ACTIVE_RETURN_RISK',
  RISK_BUDGETING: 'RISK_BUDGETING',
  INVESTOR_UTILITY: 'INVESTOR_UTILITY'
});

export const ConstraintType = Object.freeze({
  FULLY_INVESTED: 'FULLY_INVESTED',
  CASH_ALLOWANCE: 'CASH_ALLOWANCE',
  LONG_ONLY: 'LONG_ONLY',
  POSITION_BOUNDS: 'POSITION_BOUNDS',
  SECTOR_BOUNDS: 'SECTOR_BOUNDS',
  GEOGRAPHY_BOUNDS: 'GEOGRAPHY_BOUNDS',
  SLEEVE_BOUNDS: 'SLEEVE_BOUNDS',
  TURNOVER_LIMIT: 'TURNOVER_LIMIT',
  FACTOR_EXPOSURE: 'FACTOR_EXPOSURE',
  CONCENTRATION_LIMIT: 'CONCENTRATION_LIMIT',
  VOLATILITY_CAP: 'VOLATILITY_CAP',
  VAR_CAP: 'VAR_CAP',
  EXPECTED_SHORTFALL_CAP: 'EXPECTED_SHORTFALL_CAP',
  TRACKING_ERROR_CAP: 'TRACKING_ERROR_CAP',
  RISK_BUDGET_CAP: 'RISK_BUDGET_CAP'
});

export const ConstraintStatus = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  WITHIN_TOLERANCE: 'WITHIN_TOLERANCE'
});

export const FeasibilityStatus = Object.freeze({
  FEASIBLE: 'FEASIBLE',
  INFEASIBLE: 'INFEASIBLE',
  UNKNOWN: 'UNKNOWN'
});

export const SolverStatus = Object.freeze({
  OPTIMAL: 'OPTIMAL',
  FEASIBLE: 'FEASIBLE',
  INFEASIBLE: 'INFEASIBLE',
  UNBOUNDED: 'UNBOUNDED',
  NUMERICAL_FAILURE: 'NUMERICAL_FAILURE',
  TIMEOUT: 'TIMEOUT'
});

export const RelaxationPolicy = Object.freeze({
  STRICT_HARD_ONLY: 'STRICT_HARD_ONLY',
  ALLOW_CONFIGURED_SOFT: 'ALLOW_CONFIGURED_SOFT'
});

export const DecisionAction = Object.freeze({
  INCREASE: 'INCREASE',
  DECREASE: 'DECREASE',
  HOLD: 'HOLD',
  ENTER: 'ENTER',
  EXIT: 'EXIT'
});

/**
 * Deep freezes an object recursively to guarantee Point-in-Time immutability.
 */
export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = obj[name];
    if (value && typeof value === 'object') {
      deepFreeze(value);
    }
  }
  return Object.freeze(obj);
}
