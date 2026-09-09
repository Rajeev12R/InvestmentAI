/**
 * server/researchSynthesis/synthesis.types.js
 * 
 * Phase 24: Institutional Research Synthesis & Intelligence Briefing Data Models, Enums & Hashing
 * Strict separation between factual claims, model derivations, estimates, scenarios, and AI hypotheses.
 */

import crypto from 'crypto';

export const ResearchProductType = Object.freeze({
  RESEARCH_BRIEF: 'RESEARCH_BRIEF',
  SECURITY_BRIEF: 'SECURITY_BRIEF',
  PORTFOLIO_BRIEF: 'PORTFOLIO_BRIEF',
  EARNINGS_BRIEF: 'EARNINGS_BRIEF',
  MACRO_BRIEF: 'MACRO_BRIEF',
  THESIS_REVIEW: 'THESIS_REVIEW',
  DECISION_REVIEW: 'DECISION_REVIEW',
  RISK_BRIEF: 'RISK_BRIEF',
  EVENT_IMPACT_BRIEF: 'EVENT_IMPACT_BRIEF',
  INVESTMENT_COMMITTEE_BRIEF: 'INVESTMENT_COMMITTEE_BRIEF'
});

export const ResearchClaimType = Object.freeze({
  FACT: 'FACT',
  DERIVED: 'DERIVED',
  MODEL_ESTIMATE: 'MODEL_ESTIMATE',
  FORECAST: 'FORECAST',
  SCENARIO: 'SCENARIO',
  CONFIGURED: 'CONFIGURED',
  AI_HYPOTHESIS: 'AI_HYPOTHESIS',
  OPINION: 'OPINION'
});

export const ResearchReviewStatus = Object.freeze({
  DRAFT: 'DRAFT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATED: 'VALIDATED',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  HUMAN_APPROVED: 'HUMAN_APPROVED',
  PUBLISHED: 'PUBLISHED',
  SUPERSEDED: 'SUPERSEDED'
});

export const ThesisHealthStatus = Object.freeze({
  SUPPORTED: 'SUPPORTED',
  MIXED: 'MIXED',
  WEAKENING: 'WEAKENING',
  INVALIDATED: 'INVALIDATED',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE'
});

export const ModelAgreementClass = Object.freeze({
  CONVERGENT: 'CONVERGENT',
  MODERATE_DISPERSION: 'MODERATE_DISPERSION',
  DIVERGENT: 'DIVERGENT',
  CONFLICTING: 'CONFLICTING',
  INSUFFICIENT_MODELS: 'INSUFFICIENT_MODELS'
});

export const ResearchPriority = Object.freeze({
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
});

export const ClaimMateriality = Object.freeze({
  MATERIAL: 'MATERIAL',
  SECONDARY: 'SECONDARY',
  INFORMATIONAL: 'INFORMATIONAL'
});

export const ClaimConfidence = Object.freeze({
  VERIFIED_HIGH: 'VERIFIED_HIGH',
  CALCULATED_HIGH: 'CALCULATED_HIGH',
  MODEL_MODERATE: 'MODEL_MODERATE',
  CONDITIONAL_SCENARIO: 'CONDITIONAL_SCENARIO',
  HYPOTHETICAL_UNVERIFIED: 'HYPOTHETICAL_UNVERIFIED',
  UNAVAILABLE: 'UNAVAILABLE'
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
