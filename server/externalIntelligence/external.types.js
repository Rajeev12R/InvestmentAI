import crypto from 'crypto';

/**
 * Phase 26 — Source Taxonomy (16 Explicit Classes)
 */
export const SourceType = Object.freeze({
  REGULATORY: 'REGULATORY',
  COMPANY_PRIMARY: 'COMPANY_PRIMARY',
  EXCHANGE: 'EXCHANGE',
  CENTRAL_BANK: 'CENTRAL_BANK',
  GOVERNMENT: 'GOVERNMENT',
  TRANSCRIPT: 'TRANSCRIPT',
  INVESTOR_PRESENTATION: 'INVESTOR_PRESENTATION',
  COMPANY_WEBSITE: 'COMPANY_WEBSITE',
  INDUSTRY_SOURCE: 'INDUSTRY_SOURCE',
  RESEARCH_PROVIDER: 'RESEARCH_PROVIDER',
  NEWS: 'NEWS',
  WEB: 'WEB',
  ALTERNATIVE_DATA_VENDOR: 'ALTERNATIVE_DATA_VENDOR',
  SOCIAL: 'SOCIAL',
  USER_PROVIDED: 'USER_PROVIDED',
  AI_GENERATED: 'AI_GENERATED'
});

/**
 * Source Verification Statuses
 */
export const VerificationStatus = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  UNVERIFIED: 'UNVERIFIED',
  VERIFIED_VENDOR: 'VERIFIED_VENDOR',
  VERIFIED_PRIMARY: 'VERIFIED_PRIMARY',
  VERIFIED_REGULATORY: 'VERIFIED_REGULATORY',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED'
});

/**
 * Observation Types (18 Types)
 */
export const ObservationType = Object.freeze({
  COMPANY_GUIDANCE_OBSERVATION: 'COMPANY_GUIDANCE_OBSERVATION',
  MANAGEMENT_COMMENTARY: 'MANAGEMENT_COMMENTARY',
  COMPETITIVE_SIGNAL: 'COMPETITIVE_SIGNAL',
  SUPPLY_CHAIN_SIGNAL: 'SUPPLY_CHAIN_SIGNAL',
  DEMAND_SIGNAL: 'DEMAND_SIGNAL',
  PRICING_SIGNAL: 'PRICING_SIGNAL',
  INVENTORY_SIGNAL: 'INVENTORY_SIGNAL',
  WEB_TRAFFIC_SIGNAL: 'WEB_TRAFFIC_SIGNAL',
  APP_ACTIVITY_SIGNAL: 'APP_ACTIVITY_SIGNAL',
  HIRING_SIGNAL: 'HIRING_SIGNAL',
  REGULATORY_SIGNAL: 'REGULATORY_SIGNAL',
  PRODUCT_SIGNAL: 'PRODUCT_SIGNAL',
  INDUSTRY_SIGNAL: 'INDUSTRY_SIGNAL',
  SENTIMENT_SIGNAL: 'SENTIMENT_SIGNAL',
  CHANNEL_CHECK: 'CHANNEL_CHECK',
  CUSTOMER_SIGNAL: 'CUSTOMER_SIGNAL',
  SUPPLIER_SIGNAL: 'SUPPLIER_SIGNAL',
  RESEARCH_ESTIMATE: 'RESEARCH_ESTIMATE'
});

/**
 * Observation Classifications
 */
export const ObservationClass = Object.freeze({
  VERIFIED_PRIMARY: 'VERIFIED_PRIMARY',
  VERIFIED_REGULATORY: 'VERIFIED_REGULATORY',
  VERIFIED_VENDOR: 'VERIFIED_VENDOR',
  VALIDATED_EXTERNAL: 'VALIDATED_EXTERNAL',
  UNVERIFIED_EXTERNAL: 'UNVERIFIED_EXTERNAL',
  DERIVED: 'DERIVED',
  MODEL_ESTIMATE: 'MODEL_ESTIMATE',
  AI_EXTRACTED_CANDIDATE: 'AI_EXTRACTED_CANDIDATE',
  CONFLICTED: 'CONFLICTED',
  UNAVAILABLE: 'UNAVAILABLE',
  REVOKED: 'REVOKED',
  INVALIDATED: 'INVALIDATED'
});

/**
 * Corroboration States
 */
export const CorroborationState = Object.freeze({
  SINGLE_SOURCE: 'SINGLE_SOURCE',
  MULTI_SOURCE: 'MULTI_SOURCE',
  PRIMARY_CORROBORATED: 'PRIMARY_CORROBORATED',
  CONFLICTED: 'CONFLICTED',
  UNCORROBORATED: 'UNCORROBORATED'
});

/**
 * Regulatory Statuses
 */
export const RegulatoryStatus = Object.freeze({
  PROPOSED: 'PROPOSED',
  ANNOUNCED: 'ANNOUNCED',
  EFFECTIVE: 'EFFECTIVE',
  WITHDRAWN: 'WITHDRAWN',
  FINAL: 'FINAL'
});

/**
 * Alternative Dataset Types
 */
export const DatasetType = Object.freeze({
  POINT_IN_TIME: 'POINT_IN_TIME',
  REVISED: 'REVISED',
  SURVIVORSHIP_BIASED: 'SURVIVORSHIP_BIASED',
  BACKFILLED: 'BACKFILLED',
  ESTIMATED: 'ESTIMATED',
  MODELED: 'MODELED'
});

/**
 * Content Types
 */
export const ArtifactContentType = Object.freeze({
  HTML: 'HTML',
  PDF: 'PDF',
  JSON: 'JSON',
  CSV: 'CSV',
  XLSX: 'XLSX',
  TRANSCRIPT_TEXT: 'TRANSCRIPT_TEXT',
  PRESENTATION_TEXT: 'PRESENTATION_TEXT'
});

/**
 * Deterministic Canonical Hashing (SHA-256)
 */
export function computeExternalHash(obj) {
  const normalize = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'object') return val;
    if (Array.isArray(val)) return val.map(normalize);
    const sorted = {};
    Object.keys(val).sort().forEach(k => {
      sorted[k] = normalize(val[k]);
    });
    return sorted;
  };
  const json = JSON.stringify(normalize(obj));
  return crypto.createHash('sha256').update(json).digest('hex');
}

/**
 * Compute raw content hash
 */
export function computeRawContentHash(content) {
  if (typeof content !== 'string') {
    content = JSON.stringify(content);
  }
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Deterministic Object Deep Freeze
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
