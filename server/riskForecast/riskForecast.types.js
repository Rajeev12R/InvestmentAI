import crypto from 'crypto';

/**
 * Phase 31 — Institutional Portfolio Risk Forecasting & Dynamic Risk Budgeting Taxonomy
 */

export const DataClassification = Object.freeze({
  OBSERVED: 'OBSERVED',
  DERIVED: 'DERIVED',
  MODEL_ESTIMATE: 'MODEL_ESTIMATE',
  FORECAST: 'FORECAST',
  SCENARIO_INPUT: 'SCENARIO_INPUT',
  SCENARIO_OUTPUT: 'SCENARIO_OUTPUT',
  CONFIGURED: 'CONFIGURED',
  ASSUMPTION: 'ASSUMPTION',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const RiskHorizon = Object.freeze({
  ONE_DAY: '1D',
  FIVE_DAY: '5D',
  TWENTY_DAY: '20D',
  SIXTY_DAY: '60D',
  ONE_YEAR: '252D'
});

export const HORIZON_DAYS = Object.freeze({
  '1D': 1,
  '5D': 5,
  '20D': 20,
  '60D': 60,
  '252D': 252
});

export const VolatilityModel = Object.freeze({
  HISTORICAL: 'HISTORICAL',
  EWMA: 'EWMA'
});

export const CovarianceModel = Object.freeze({
  HISTORICAL: 'HISTORICAL',
  EWMA: 'EWMA'
});

export const VaRMethod = Object.freeze({
  HISTORICAL: 'HISTORICAL',
  PARAMETRIC: 'PARAMETRIC'
});

export const ModelHealthState = Object.freeze({
  VALID: 'VALID',
  DEGRADED: 'DEGRADED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  FAILED: 'FAILED',
  STALE: 'STALE'
});

export const BudgetScope = Object.freeze({
  PORTFOLIO: 'PORTFOLIO',
  ASSET: 'ASSET',
  SECTOR: 'SECTOR',
  INDUSTRY: 'INDUSTRY',
  FACTOR: 'FACTOR',
  CURRENCY: 'CURRENCY',
  STRATEGY: 'STRATEGY',
  MANAGER: 'MANAGER',
  LIQUIDITY: 'LIQUIDITY',
  TAIL_RISK: 'TAIL_RISK',
  TRACKING_ERROR: 'TRACKING_ERROR',
  VOLATILITY: 'VOLATILITY'
});

export const BudgetUtilizationStatus = Object.freeze({
  GREEN: 'GREEN',
  AMBER: 'AMBER',
  RED: 'RED',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const CompliancePrecedence = Object.freeze({
  REGULATORY: 'REGULATORY', // 1 (Highest)
  FIRM: 'FIRM',             // 2
  PORTFOLIO: 'PORTFOLIO',   // 3
  STRATEGY: 'STRATEGY',     // 4
  SOFT: 'SOFT'              // 5 (Lowest)
});

export const CovarianceRepairMethod = Object.freeze({
  NONE: 'NONE',
  EIGENVALUE_CLIPPING: 'EIGENVALUE_CLIPPING',
  HIGHAM_NEAREST_PSD: 'HIGHAM_NEAREST_PSD',
  SHRINKAGE_LEDROIT_WOLF: 'SHRINKAGE_LEDROIT_WOLF'
});

export const CausalAttributionType = Object.freeze({
  CAUSAL_FACTOR: 'CAUSAL_FACTOR',
  ASSOCIATED_WITH: 'ASSOCIATED_WITH',
  UNAVAILABLE: 'UNAVAILABLE'
});

/**
 * Deep freeze helper
 */
export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach(prop => {
    if (obj[prop] !== null && (typeof obj[prop] === 'object' || typeof obj[prop] === 'function') && !Object.isFrozen(obj[prop])) {
      deepFreeze(obj[prop]);
    }
  });
  return obj;
}

/**
 * Canonical Deterministic SHA-256 Hashing with Timestamp Exclusions for Exact Replay Invariance
 */
export function computeRiskForecastHash(obj) {
  const normalize = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'object') return val;
    if (Array.isArray(val)) return val.map(normalize);
    const sorted = {};
    const excludedKeys = new Set([
      'verifiedAt',
      'sealedAt',
      'storedAt',
      'calculatedAt',
      'evaluatedAt',
      'assessedAt',
      'bridgedAt',
      'observedAt',
      'decomposedAt',
      'identifiedAt',
      'simulatedAt',
      'forecastAt',
      'createdAt',
      'updatedAt',
      'timestamp',
      'packageId'
    ]);
    Object.keys(val).sort().forEach(k => {
      if (excludedKeys.has(k)) return;
      sorted[k] = normalize(val[k]);
    });
    return sorted;
  };
  const json = JSON.stringify(normalize(obj));
  return crypto.createHash('sha256').update(json).digest('hex');
}
