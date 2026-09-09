/**
 * server/macro/macro.types.js
 * 
 * Phase 22: Macro Data Model, Canonical Enums & Classification Types
 * Strict separation of REAL_DATA, DERIVED, CONFIGURED, ASSUMPTION, MODEL_ESTIMATE, SCENARIO_INPUT, SCENARIO_OUTPUT, UNAVAILABLE.
 */

import crypto from 'crypto';

export const MacroClassification = Object.freeze({
  REAL_DATA: 'REAL_DATA',
  VERIFIED_REAL_DATA: 'VERIFIED_REAL_DATA',
  DERIVED: 'DERIVED',
  CONFIGURED: 'CONFIGURED',
  ASSUMPTION: 'ASSUMPTION',
  MODEL_ESTIMATE: 'MODEL_ESTIMATE',
  SCENARIO_INPUT: 'SCENARIO_INPUT',
  SCENARIO_OUTPUT: 'SCENARIO_OUTPUT',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const MacroMetricCategory = Object.freeze({
  GROWTH: 'GROWTH',
  INFLATION: 'INFLATION',
  EMPLOYMENT: 'EMPLOYMENT',
  RATES: 'RATES',
  CREDIT: 'CREDIT',
  FX: 'FX',
  COMMODITIES: 'COMMODITIES',
  LIQUIDITY: 'LIQUIDITY'
});

export const MacroRegimeType = Object.freeze({
  GROWTH_ACCELERATING: 'GROWTH_ACCELERATING',
  GROWTH_DECELERATING: 'GROWTH_DECELERATING',
  INFLATION_RISING: 'INFLATION_RISING',
  INFLATION_FALLING: 'INFLATION_FALLING',
  POLICY_TIGHTENING: 'POLICY_TIGHTENING',
  POLICY_EASING: 'POLICY_EASING',
  LIQUIDITY_EXPANDING: 'LIQUIDITY_EXPANDING',
  LIQUIDITY_CONTRACTING: 'LIQUIDITY_CONTRACTING',
  CREDIT_STRESS: 'CREDIT_STRESS',
  RISK_ON: 'RISK_ON',
  RISK_OFF: 'RISK_OFF',
  MIXED: 'MIXED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA'
});

export const SensitivityType = Object.freeze({
  OBSERVED: 'OBSERVED',
  ESTIMATED: 'ESTIMATED',
  CONFIGURED: 'CONFIGURED',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const MacroSourceTier = Object.freeze({
  TIER_1_CENTRAL_BANK_GOV_STATS: 'TIER_1_CENTRAL_BANK_GOV_STATS',
  TIER_2_EXCHANGE_INDEX_PROVIDER: 'TIER_2_EXCHANGE_INDEX_PROVIDER',
  TIER_3_INSTITUTIONAL_CONSENSUS: 'TIER_3_INSTITUTIONAL_CONSENSUS',
  TIER_4_VENDOR_FEED: 'TIER_4_VENDOR_FEED',
  TIER_5_SYNTHETIC_FIXTURE: 'TIER_5_SYNTHETIC_FIXTURE'
});

export const SourceVerificationStatus = Object.freeze({
  VERIFIED_DIRECT_AUTHORITY: 'VERIFIED_DIRECT_AUTHORITY',
  VERIFIED_EXCHANGE_FEED: 'VERIFIED_EXCHANGE_FEED',
  UNVERIFIED_SOURCE: 'UNVERIFIED_SOURCE'
});

export const TransmissionChannel = Object.freeze({
  RATES_TO_EQUITIES: 'RATES_TO_EQUITIES',
  RATES_TO_VALUATION_DISCOUNT: 'RATES_TO_VALUATION_DISCOUNT',
  COMMODITY_TO_INFLATION: 'COMMODITY_TO_INFLATION',
  COMMODITY_TO_MARGINS: 'COMMODITY_TO_MARGINS',
  FX_TO_INFLATION: 'FX_TO_INFLATION',
  FX_TO_EXPORT_COMPETITIVENESS: 'FX_TO_EXPORT_COMPETITIVENESS',
  CREDIT_TO_EQUITY_VALUATION: 'CREDIT_TO_EQUITY_VALUATION',
  CREDIT_TO_DEFAULT_PROBABILITY: 'CREDIT_TO_DEFAULT_PROBABILITY',
  INFLATION_TO_POLICY_RATES: 'INFLATION_TO_POLICY_RATES',
  GROWTH_TO_EARNINGS: 'GROWTH_TO_EARNINGS',
  LIQUIDITY_TO_MULTIPLES: 'LIQUIDITY_TO_MULTIPLES',
  CURRENCY_CRISIS_TO_SOVEREIGN_SPREAD: 'CURRENCY_CRISIS_TO_SOVEREIGN_SPREAD'
});

export const MacroFactorType = Object.freeze({
  RATES: 'RATES',
  INFLATION: 'INFLATION',
  GROWTH: 'GROWTH',
  USD: 'USD',
  COMMODITIES: 'COMMODITIES',
  CREDIT_SPREADS: 'CREDIT_SPREADS',
  LIQUIDITY: 'LIQUIDITY'
});

export const MacroRegime = Object.freeze({
  GOLDILOCKS: 'GOLDILOCKS',
  STAGFLATION: 'STAGFLATION',
  RECESSION: 'RECESSION',
  OVERHEATING: 'OVERHEATING',
  LATE_CYCLE_SLOWDOWN: 'LATE_CYCLE_SLOWDOWN',
  EARLY_CYCLE_RECOVERY: 'EARLY_CYCLE_RECOVERY',
  DISINFLATION_BOOM: 'DISINFLATION_BOOM',
  POLICY_TIGHTENING_SHOCK: 'POLICY_TIGHTENING_SHOCK',
  CREDIT_CONTRACTION: 'CREDIT_CONTRACTION',
  DEVALUATION_CRISIS: 'DEVALUATION_CRISIS',
  LIQUIDITY_CRUNCH: 'LIQUIDITY_CRUNCH',
  MIXED: 'MIXED',
  UNKNOWN: 'UNKNOWN'
});

export const MacroEnums = Object.freeze({
  MacroCategory: MacroMetricCategory,
  MacroRegime: MacroRegime,
  MacroFactorType: MacroFactorType,
  TransmissionChannel: TransmissionChannel,
  Classification: MacroClassification,
  SourceTier: MacroSourceTier,
  SourceVerificationStatus: SourceVerificationStatus
});

function deterministicStringify(obj) {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(item => deterministicStringify(item)).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k => `${JSON.stringify(k)}:${deterministicStringify(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Deterministic canonical SHA-256 hash generator
 */
export function canonicalHash(payload) {
  if (payload === null || payload === undefined) return null;
  const canonicalString = deterministicStringify(payload);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

export const canonicalSha256 = canonicalHash;

/**
 * Deep recursive object freezing
 */
export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach(prop => {
    if (
      obj[prop] !== null &&
      (typeof obj[prop] === 'object' || typeof obj[prop] === 'function') &&
      !Object.isFrozen(obj[prop])
    ) {
      deepFreeze(obj[prop]);
    }
  });
  return obj;
}

