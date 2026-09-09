/**
 * Phase 18 — Institutional Liquidity & Trading Intelligence Types & Enums
 */

import crypto from 'crypto';

export const LiquidityStatus = Object.freeze({
  PASS: 'PASS',
  FEASIBLE: 'FEASIBLE',
  CONDITIONALLY_FEASIBLE: 'CONDITIONALLY_FEASIBLE',
  INFEASIBLE: 'INFEASIBLE',
  UNAVAILABLE: 'UNAVAILABLE',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_QUOTE: 'INVALID_QUOTE',
  INVALID_ADV: 'INVALID_ADV',
  INVALID_PRICE: 'INVALID_PRICE',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  STALE_DATA: 'STALE_DATA',
  SUSPENDED_SECURITY: 'SUSPENDED_SECURITY',
  LIQUIDITY_INSUFFICIENT: 'LIQUIDITY_INSUFFICIENT',
  PARTICIPATION_LIMIT_EXCEEDED: 'PARTICIPATION_LIMIT_EXCEEDED',
  HORIZON_LIMIT_EXCEEDED: 'HORIZON_LIMIT_EXCEEDED',
  COST_LIMIT_EXCEEDED: 'COST_LIMIT_EXCEEDED',
  FX_UNAVAILABLE: 'FX_UNAVAILABLE',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  AUTHORIZATION_FAILURE: 'AUTHORIZATION_FAILURE',
  TEMPORAL_VIOLATION: 'TEMPORAL_VIOLATION',
  CONFLICT: 'CONFLICT'
});

export const LiquidityTier = Object.freeze({
  TIER_1_HIGH_LIQUIDITY: 'TIER_1_HIGH_LIQUIDITY',
  TIER_2_MODERATE_LIQUIDITY: 'TIER_2_MODERATE_LIQUIDITY',
  TIER_3_LOW_LIQUIDITY: 'TIER_3_LOW_LIQUIDITY',
  TIER_4_ILLIQUID: 'TIER_4_ILLIQUID',
  UNKNOWN: 'UNKNOWN'
});

export const ExecutionFeasibility = Object.freeze({
  FEASIBLE: 'FEASIBLE',
  CONDITIONALLY_FEASIBLE: 'CONDITIONALLY_FEASIBLE',
  INFEASIBLE: 'INFEASIBLE',
  UNKNOWN: 'UNKNOWN'
});

export const LiquidityDataStatus = Object.freeze({
  REAL_DATA: 'REAL_DATA',
  DERIVED: 'DERIVED',
  MODEL_ESTIMATE: 'MODEL_ESTIMATE',
  CONFIGURED: 'CONFIGURED',
  GOLDEN_SYNTHETIC: 'GOLDEN_SYNTHETIC',
  UNAVAILABLE: 'UNAVAILABLE',
  // Backward-compatible alias
  ESTIMATED: 'ESTIMATED'
});

export const ValueStatus = Object.freeze({
  REAL_DATA: 'REAL_DATA',
  DERIVED: 'DERIVED',
  MODEL_ESTIMATE: 'MODEL_ESTIMATE',
  CONFIGURED: 'CONFIGURED',
  GOLDEN_SYNTHETIC: 'GOLDEN_SYNTHETIC',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const SourceType = Object.freeze({
  DIRECT_EXCHANGE: 'DIRECT_EXCHANGE',
  CONSOLIDATED_FEED: 'CONSOLIDATED_FEED',
  INTERMEDIARY_VENDOR: 'INTERMEDIARY_VENDOR',
  SYNTHETIC_FIXTURE: 'SYNTHETIC_FIXTURE',
  UNVERIFIED: 'UNVERIFIED'
});

export const SourceTier = Object.freeze({
  TIER_1_DIRECT_EXCHANGE_FEED: 'TIER_1_DIRECT_EXCHANGE_FEED',
  TIER_2_CONSOLIDATED_FEED: 'TIER_2_CONSOLIDATED_FEED',
  TIER_3_DELAYED_VENDOR: 'TIER_3_DELAYED_VENDOR',
  TIER_4_SYNTHETIC: 'TIER_4_SYNTHETIC',
  UNVERIFIED: 'UNVERIFIED'
});

export const VerificationStatus = Object.freeze({
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  EXPIRED: 'EXPIRED',
  FAILED: 'FAILED'
});

export const EndpointType = Object.freeze({
  DIRECT_SOCKET: 'DIRECT_SOCKET',
  INTERNAL_ADAPTER: 'INTERNAL_ADAPTER',
  SIP_CONSOLIDATOR: 'SIP_CONSOLIDATOR',
  PUBLIC_REST: 'PUBLIC_REST',
  IN_MEMORY_FIXTURE: 'IN_MEMORY_FIXTURE',
  UNVERIFIED: 'UNVERIFIED'
});

export const EvidenceOrigin = Object.freeze({
  INTERNAL_FIXTURE: 'INTERNAL_FIXTURE',
  CONFIGURED: 'CONFIGURED',
  EXTERNAL_AUTHORITY_VERIFIED: 'EXTERNAL_AUTHORITY_VERIFIED',
  OBSERVED_RUNTIME: 'OBSERVED_RUNTIME',
  UNVERIFIED: 'UNVERIFIED'
});

export const ConnectionEvidenceState = Object.freeze({
  CONFIGURED_CONNECTION: 'CONFIGURED_CONNECTION',
  OBSERVED_AUTHENTICATED_CONNECTION: 'OBSERVED_AUTHENTICATED_CONNECTION',
  INDEPENDENTLY_VERIFIED_CONNECTION: 'INDEPENDENTLY_VERIFIED_CONNECTION',
  SIMULATED_FIXTURE: 'SIMULATED_FIXTURE',
  UNVERIFIED: 'UNVERIFIED'
});

export const SourceConnectionClassification = Object.freeze({
  VERIFIED_DIRECT_EXCHANGE: 'VERIFIED_DIRECT_EXCHANGE',
  VERIFIED_INTERNAL_ADAPTER_TO_DIRECT_EXCHANGE: 'VERIFIED_INTERNAL_ADAPTER_TO_DIRECT_EXCHANGE',
  VERIFIED_VENDOR_SOURCE: 'VERIFIED_VENDOR_SOURCE',
  UNVERIFIED_SOURCE: 'UNVERIFIED_SOURCE'
});

export const TradingSide = Object.freeze({
  BUY: 'BUY',
  SELL: 'SELL',
  ROUND_TRIP: 'ROUND_TRIP'
});

export const TradeHorizonDirection = Object.freeze({
  ONE_WAY: 'ONE_WAY',
  ROUND_TRIP: 'ROUND_TRIP'
});

export const StressScenarioType = Object.freeze({
  ADV_CONTRACTION_25: 'ADV_CONTRACTION_25',
  ADV_CONTRACTION_50: 'ADV_CONTRACTION_50',
  ADV_CONTRACTION_75: 'ADV_CONTRACTION_75',
  SPREAD_EXPANSION_1_5X: 'SPREAD_EXPANSION_1_5X',
  SPREAD_EXPANSION_2X: 'SPREAD_EXPANSION_2X',
  SPREAD_EXPANSION_3X: 'SPREAD_EXPANSION_3X',
  IMPACT_COEFFICIENT_1_5X: 'IMPACT_COEFFICIENT_1_5X',
  IMPACT_COEFFICIENT_2X: 'IMPACT_COEFFICIENT_2X',
  JOINT_STRESS_SEVERE: 'JOINT_STRESS_SEVERE',
  CUSTOM_STRESS: 'CUSTOM_STRESS'
});

export const ImpactModelType = Object.freeze({
  SQUARE_ROOT: 'SQUARE_ROOT',
  LINEAR: 'LINEAR',
  EXPONENTIAL: 'EXPONENTIAL',
  CONFIGURED_MODEL: 'CONFIGURED_MODEL'
});

export const DataFreshnessStatus = Object.freeze({
  PRIME: 'PRIME',
  ACCEPTABLE: 'ACCEPTABLE',
  DEGRADED: 'DEGRADED',
  STALE: 'STALE',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const CostComponentStatus = Object.freeze({
  ACTUAL: 'ACTUAL',
  ESTIMATED: 'ESTIMATED',
  CONFIGURED: 'CONFIGURED',
  UNAVAILABLE: 'UNAVAILABLE'
});

/**
 * Deep freezes an object or array to ensure strict immutability.
 */
export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = obj[name];
    if (value && typeof value === 'object') {
      deepFreeze(value);
    }
  }
  return Object.freeze(obj);
}

/**
 * Deterministic JSON stringifier with recursive key sorting.
 */
export function canonicalJsonStringify(data) {
  if (data === null || data === undefined) return JSON.stringify(data);
  if (typeof data !== 'object') return JSON.stringify(data);
  if (Array.isArray(data)) {
    return '[' + data.map(canonicalJsonStringify).join(',') + ']';
  }
  const keys = Object.keys(data).sort();
  const pairs = keys.map(k => `${JSON.stringify(k)}:${canonicalJsonStringify(data[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Canonical SHA-256 hash.
 */
export function canonicalHash(data) {
  return crypto.createHash('sha256').update(canonicalJsonStringify(data)).digest('hex');
}
