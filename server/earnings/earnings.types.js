/**
 * server/earnings/earnings.types.js
 * 
 * Phase 21: Institutional Earnings Intelligence & Corporate-Event Engine
 * Canonical Types, Enums & Cryptographic Serialization Utilities
 */

import crypto from 'crypto';

export const CorporateEventType = Object.freeze({
  QUARTERLY_EARNINGS: 'QUARTERLY_EARNINGS',
  ANNUAL_EARNINGS: 'ANNUAL_EARNINGS',
  GUIDANCE_UPDATE: 'GUIDANCE_UPDATE',
  EPS_SURPRISE: 'EPS_SURPRISE',
  REVENUE_SURPRISE: 'REVENUE_SURPRISE',
  MARGIN_SURPRISE: 'MARGIN_SURPRISE',
  FCF_SURPRISE: 'FCF_SURPRISE',
  DIVIDEND_ANNOUNCEMENT: 'DIVIDEND_ANNOUNCEMENT',
  BUYBACK_ANNOUNCEMENT: 'BUYBACK_ANNOUNCEMENT',
  MANAGEMENT_COMMENTARY: 'MANAGEMENT_COMMENTARY',
  MATERIAL_BUSINESS_UPDATE: 'MATERIAL_BUSINESS_UPDATE',
  UNKNOWN_EVENT: 'UNKNOWN_EVENT'
});

export const EventImpactCategory = Object.freeze({
  POSITIVE: 'POSITIVE',
  NEGATIVE: 'NEGATIVE',
  MIXED: 'MIXED',
  NEUTRAL: 'NEUTRAL',
  UNKNOWN: 'UNKNOWN'
});

export const GuidanceRevisionDirection = Object.freeze({
  RAISE: 'RAISE',
  CUT: 'CUT',
  MAINTAINED: 'MAINTAINED',
  INITIATED: 'INITIATED',
  WITHDRAWN: 'WITHDRAWN',
  UNKNOWN: 'UNKNOWN'
});

export const EarningsQualityGrade = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const SourceClassification = Object.freeze({
  VERIFIED_DIRECT_EXCHANGE: 'VERIFIED_DIRECT_EXCHANGE',
  VERIFIED_REGULATORY_FILING: 'VERIFIED_REGULATORY_FILING',
  VERIFIED_CONSENSUS_FEED: 'VERIFIED_CONSENSUS_FEED',
  UNVERIFIED_SOURCE: 'UNVERIFIED_SOURCE',
  CONFIGURED_FIXTURE: 'CONFIGURED_FIXTURE'
});

export const EventClassification = Object.freeze({
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

export const RevisionCausalityType = Object.freeze({
  REVENUE_ACTUAL_SURPRISE: 'REVENUE_ACTUAL_SURPRISE',
  EPS_ACTUAL_SURPRISE: 'EPS_ACTUAL_SURPRISE',
  MARGIN_ACTUAL_SURPRISE: 'MARGIN_ACTUAL_SURPRISE',
  FCF_ACTUAL_SURPRISE: 'FCF_ACTUAL_SURPRISE',
  GUIDANCE_REVISION_MIDPOINT: 'GUIDANCE_REVISION_MIDPOINT',
  SHARE_COUNT_REVISION: 'SHARE_COUNT_REVISION',
  CAPEX_CHANGE: 'CAPEX_CHANGE',
  NWC_CHANGE: 'NWC_CHANGE',
  TAX_RATE_CHANGE: 'TAX_RATE_CHANGE',
  ANALYST_ASSUMPTION_UPDATE: 'ANALYST_ASSUMPTION_UPDATE',
  MODEL_CONFIGURATION_CHANGE: 'MODEL_CONFIGURATION_CHANGE',
  CAUSE_UNAVAILABLE: 'CAUSE_UNAVAILABLE'
});

/**
 * Deterministic JSON stringifier with recursively sorted keys
 */
export function canonicalJsonStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(item => canonicalJsonStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * Computes SHA-256 canonical hash of any object
 */
export function canonicalHash(obj) {
  const canonicalString = canonicalJsonStringify(obj);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

/**
 * Recursively deep freezes an object
 */
export function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}
