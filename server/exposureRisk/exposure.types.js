import crypto from 'crypto';

/**
 * Phase 30 — Institutional Factor, Exposure & Risk Decomposition Taxonomy
 */

export const ExposureStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  HISTORICAL: 'HISTORICAL',
  REVISED: 'REVISED',
  UNAVAILABLE: 'UNAVAILABLE',
  BREACHED: 'BREACHED'
});

export const ExposureSourceTier = Object.freeze({
  VERIFIED_REAL_DATA: 'VERIFIED_REAL_DATA',
  REAL_DATA: 'REAL_DATA',
  VERIFIED_VENDOR_SOURCE: 'VERIFIED_VENDOR_SOURCE',
  UNVERIFIED_SOURCE: 'UNVERIFIED_SOURCE',
  CONFIGURED: 'CONFIGURED',
  DERIVED: 'DERIVED',
  MODEL_ESTIMATE: 'MODEL_ESTIMATE',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const ExposureClassification = Object.freeze({
  DIRECT_EXPOSURE: 'DIRECT_EXPOSURE',
  LOOK_THROUGH_EXPOSURE: 'LOOK_THROUGH_EXPOSURE',
  UNCOVERED_LOOK_THROUGH: 'UNCOVERED_LOOK_THROUGH',
  CONFIGURED_THEME: 'CONFIGURED_THEME'
});

export const FactorCategory = Object.freeze({
  MARKET: 'MARKET',
  EQUITY_STYLE: 'EQUITY_STYLE',
  RATES_DURATION: 'RATES_DURATION',
  CREDIT_SPREAD: 'CREDIT_SPREAD',
  CURRENCY_FX: 'CURRENCY_FX',
  GEOGRAPHIC_REVENUE: 'GEOGRAPHIC_REVENUE',
  INDUSTRY_SECTOR: 'INDUSTRY_SECTOR',
  LIQUIDITY_IMPACT: 'LIQUIDITY_IMPACT',
  THEMATIC: 'THEMATIC'
});

export const RiskMethodology = Object.freeze({
  PARAMETRIC_COVARIANCE: 'PARAMETRIC_COVARIANCE',
  HISTORICAL_SIMULATION: 'HISTORICAL_SIMULATION',
  FACTOR_MODEL: 'FACTOR_MODEL',
  MONTE_CARLO: 'MONTE_CARLO',
  COMPONENT_DECOMPOSITION: 'COMPONENT_DECOMPOSITION'
});

export const BreachPrecedenceLevel = Object.freeze({
  REGULATORY_MANDATE: 'REGULATORY_MANDATE', // Precedence 1 (Highest)
  FIRM_MANDATE: 'FIRM_MANDATE',             // Precedence 2
  CLIENT_IPS_RULE: 'CLIENT_IPS_RULE',       // Precedence 3
  PM_SOFT_LIMIT: 'PM_SOFT_LIMIT'            // Precedence 4 (Lowest)
});

export const BreachStatus = Object.freeze({
  COMPLIANT: 'COMPLIANT',
  WARNING: 'WARNING',
  BREACHED: 'BREACHED',
  UNAVAILABLE: 'UNAVAILABLE',
  EXEMPTED: 'EXEMPTED'
});

export const ExposureChangeType = Object.freeze({
  EXPOSURE_INCREASE: 'EXPOSURE_INCREASE',
  EXPOSURE_DECREASE: 'EXPOSURE_DECREASE',
  NEW_EXPOSURE: 'NEW_EXPOSURE',
  REMOVED_EXPOSURE: 'REMOVED_EXPOSURE',
  FACTOR_ROTATION: 'FACTOR_ROTATION',
  CONCENTRATION_INCREASE: 'CONCENTRATION_INCREASE',
  CONCENTRATION_REDUCTION: 'CONCENTRATION_REDUCTION',
  HIDDEN_RISK_EMERGENCE: 'HIDDEN_RISK_EMERGENCE'
});

export const CommonDriverType = Object.freeze({
  SHARED_SUPPLY_CHAIN: 'SHARED_SUPPLY_CHAIN',
  COMMON_MACRO_SENSITIVITY: 'COMMON_MACRO_SENSITIVITY',
  CUSTOMER_CONCENTRATION: 'CUSTOMER_CONCENTRATION',
  SHARED_FACTOR_BETAS: 'SHARED_FACTOR_BETAS',
  COMMODITY_DEPENDENCY: 'COMMODITY_DEPENDENCY',
  GEOGRAPHIC_OVERLAP: 'GEOGRAPHIC_OVERLAP',
  THEMATIC_OVERLAP: 'THEMATIC_OVERLAP'
});

export const SensitivityTier = Object.freeze({
  OBSERVED: 'OBSERVED',
  DERIVED: 'DERIVED',
  MODEL_ESTIMATE: 'MODEL_ESTIMATE',
  SCENARIO_INPUT: 'SCENARIO_INPUT'
});

/**
 * Deep Freeze helper
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
 * Canonical Deterministic SHA-256 Hashing with Timestamp Exclusions
 */
export function computeExposureHash(obj) {
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
      'timestamp'
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
