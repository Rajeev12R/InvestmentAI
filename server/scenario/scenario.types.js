/**
 * server/scenario/scenario.types.js
 * 
 * Phase 19: Scenario Analysis & Stress Intelligence Canonical Types, Enums & Utilities
 */

import crypto from 'crypto';

export const ScenarioStatus = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  UNAVAILABLE: 'UNAVAILABLE',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  INVALID_INPUT: 'INVALID_INPUT',
  COMPUTATION_ERROR: 'COMPUTATION_ERROR',
  SOLVER_CONVERGED: 'SOLVER_CONVERGED',
  SOLVER_FAILED: 'SOLVER_FAILED',
  AUTHORIZATION_FAILURE: 'AUTHORIZATION_FAILURE'
});

export const ScenarioType = Object.freeze({
  HYPOTHETICAL_STRESS: 'HYPOTHETICAL_STRESS',
  HISTORICAL_REPLAY: 'HISTORICAL_REPLAY',
  MACRO_FACTOR: 'MACRO_FACTOR',
  REVERSE_SOLVER: 'REVERSE_SOLVER',
  MULTI_HORIZON: 'MULTI_HORIZON'
});

export const ShockUnit = Object.freeze({
  PERCENT: 'PERCENT',
  BPS: 'BPS',
  MULTIPLIER: 'MULTIPLIER',
  ABSOLUTE: 'ABSOLUTE'
});

export const ScenarioHorizon = Object.freeze({
  HORIZON_1D: 'HORIZON_1D',
  HORIZON_1W: 'HORIZON_1W',
  HORIZON_1M: 'HORIZON_1M',
  HORIZON_30D: 'HORIZON_30D',
  HORIZON_90D: 'HORIZON_90D',
  HORIZON_1Y: 'HORIZON_1Y'
});

export const ValueStatus = Object.freeze({
  REAL_DATA: 'REAL_DATA',
  DERIVED: 'DERIVED',
  CONFIGURED: 'CONFIGURED',
  MODEL_ESTIMATE: 'MODEL_ESTIMATE',
  SCENARIO_INPUT: 'SCENARIO_INPUT',
  SCENARIO_OUTPUT: 'SCENARIO_OUTPUT',
  UNAVAILABLE: 'UNAVAILABLE',
  GOLDEN_SYNTHETIC: 'GOLDEN_SYNTHETIC'
});

export const SolverMethod = Object.freeze({
  BISECTION: 'BISECTION',
  SECANT: 'SECANT',
  BRENT: 'BRENT'
});

export const BaselineType = Object.freeze({
  TRUTH_REAL_DATA: 'TRUTH_REAL_DATA',
  CURRENT_PORTFOLIO: 'CURRENT_PORTFOLIO',
  CUSTOM_BENCHMARK: 'CUSTOM_BENCHMARK'
});

export function canonicalJsonStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(key => `${JSON.stringify(key)}:${canonicalJsonStringify(obj[key])}`);
  return '{' + pairs.join(',') + '}';
}

export function canonicalHash(data) {
  const jsonStr = canonicalJsonStringify(data);
  return crypto.createHash('sha256').update(jsonStr).digest('hex');
}

export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}
