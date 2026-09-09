/**
 * server/forecasting/forecast.types.js
 * 
 * Phase 20: Institutional Forecasting & Forward-Looking Intelligence
 * Canonical Types, Enums & Cryptographic Utilities
 */

import crypto from 'crypto';

export const ForecastStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUPERSEDED: 'SUPERSEDED',
  EXPIRED: 'EXPIRED',
  REALIZED: 'REALIZED',
  INVALID: 'INVALID',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const ForecastClassification = Object.freeze({
  REAL_DATA: 'REAL_DATA',
  VERIFIED_REAL_DATA: 'VERIFIED_REAL_DATA',
  DERIVED: 'DERIVED',
  CONFIGURED: 'CONFIGURED',
  ASSUMPTION: 'ASSUMPTION',
  FORECAST: 'FORECAST',
  MODEL_ESTIMATE: 'MODEL_ESTIMATE',
  SCENARIO_INPUT: 'SCENARIO_INPUT',
  SCENARIO_OUTPUT: 'SCENARIO_OUTPUT',
  UNAVAILABLE: 'UNAVAILABLE',
  GOLDEN_SYNTHETIC: 'GOLDEN_SYNTHETIC'
});

export const ForecastMethod = Object.freeze({
  HISTORICAL_CAGR: 'HISTORICAL_CAGR',
  LINEAR_TREND: 'LINEAR_TREND',
  ROLLING_MARGIN: 'ROLLING_MARGIN',
  FUNDAMENTAL_INTEGRATED: 'FUNDAMENTAL_INTEGRATED',
  EXTERNAL_CONSENSUS: 'EXTERNAL_CONSENSUS',
  ANALYST_EXPLICIT: 'ANALYST_EXPLICIT',
  VALUATION_IMPLIED: 'VALUATION_IMPLIED'
});

export const ForecastHorizon = Object.freeze({
  HORIZON_1Y: '1Y',
  HORIZON_2Y: '2Y',
  HORIZON_3Y: '3Y',
  HORIZON_5Y: '5Y',
  HORIZON_10Y: '10Y'
});

export const ForecastCase = Object.freeze({
  BASE: 'BASE',
  BULL: 'BULL',
  BEAR: 'BEAR'
});

export const ForecastFreshnessStatus = Object.freeze({
  CURRENT: 'CURRENT',
  AGING: 'AGING',
  STALE: 'STALE',
  EXPIRED: 'EXPIRED'
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
