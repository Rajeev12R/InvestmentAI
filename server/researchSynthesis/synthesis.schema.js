/**
 * server/researchSynthesis/synthesis.schema.js
 * 
 * Phase 24: Institutional Research Product & Claim Schema Validation
 * Validates data contracts, provenance completeness, and state transitions.
 */

import {
  ResearchProductType,
  ResearchClaimType,
  ResearchReviewStatus,
  ThesisHealthStatus,
  ModelAgreementClass
} from './synthesis.types.js';

/**
 * Validates a factual or analytical research claim
 */
export function validateResearchClaim(claim, knowledgeCutoff = null) {
  const errors = [];
  if (!claim || typeof claim !== 'object') {
    return { isValid: false, errors: ['Claim must be a non-null object'] };
  }

  if (!claim.claimId || typeof claim.claimId !== 'string') {
    errors.push('claimId is required');
  }
  if (!claim.claimText || typeof claim.claimText !== 'string' || claim.claimText.trim().length === 0) {
    errors.push('claimText is required');
  }
  if (!claim.claimType || !Object.values(ResearchClaimType).includes(claim.claimType)) {
    errors.push(`Invalid claimType: ${claim.claimType}`);
  }

  // Authoritative provenance rules
  if (claim.claimType === ResearchClaimType.FACT) {
    if (!Array.isArray(claim.sourceEvidenceIds) || claim.sourceEvidenceIds.length === 0) {
      errors.push('FACT claim strictly requires sourceEvidenceIds array with at least 1 evidence reference');
    }
  }

  if (claim.claimType === ResearchClaimType.MODEL_ESTIMATE) {
    if (!claim.modelName && !claim.modelVersion && (!claim.underlyingObjectIds || claim.underlyingObjectIds.length === 0)) {
      errors.push('MODEL_ESTIMATE claim requires model specification or underlying object reference');
    }
  }

  if (claim.claimType === ResearchClaimType.FORECAST) {
    if (!claim.forecastVintage && !claim.forecastHorizon && (!claim.underlyingObjectIds || claim.underlyingObjectIds.length === 0)) {
      errors.push('FORECAST claim requires forecast vintage/horizon or underlying object reference');
    }
  }

  if (claim.claimType === ResearchClaimType.SCENARIO) {
    if (!claim.scenarioName && !claim.scenarioId && (!claim.underlyingObjectIds || claim.underlyingObjectIds.length === 0)) {
      errors.push('SCENARIO claim requires scenario name/id or underlying object reference');
    }
  }

  // Temporal check against knowledgeCutoff
  if (knowledgeCutoff && claim.observedAt) {
    const cutoffTime = new Date(knowledgeCutoff).getTime();
    const observedTime = new Date(claim.observedAt).getTime();
    if (observedTime > cutoffTime) {
      errors.push(`Claim observedAt (${claim.observedAt}) exceeds knowledgeCutoff (${knowledgeCutoff}) - anti-lookahead violation`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a complete research product artifact
 */
export function validateResearchProduct(product) {
  const errors = [];
  if (!product || typeof product !== 'object') {
    return { isValid: false, errors: ['ResearchProduct must be a non-null object'] };
  }

  if (!product.productId || typeof product.productId !== 'string') {
    errors.push('productId is required');
  }
  if (!product.productType || !Object.values(ResearchProductType).includes(product.productType)) {
    errors.push(`Invalid productType: ${product.productType}`);
  }
  if (!product.tenantId || typeof product.tenantId !== 'string') {
    errors.push('tenantId is required');
  }
  if (!Array.isArray(product.subjectIds) || product.subjectIds.length === 0) {
    errors.push('subjectIds must be a non-empty array of target securities/entities/portfolios');
  }
  if (!product.generatedAt || new Date(product.generatedAt).toString() === 'Invalid Date') {
    errors.push('Valid generatedAt timestamp is required');
  }
  if (!product.knowledgeCutoff || new Date(product.knowledgeCutoff).toString() === 'Invalid Date') {
    errors.push('Valid knowledgeCutoff timestamp is required');
  }
  if (product.reviewerStatus && !Object.values(ResearchReviewStatus).includes(product.reviewerStatus)) {
    errors.push(`Invalid reviewerStatus: ${product.reviewerStatus}`);
  }

  // Validate embedded claims if present
  if (Array.isArray(product.claims)) {
    product.claims.forEach((claim, idx) => {
      const claimVal = validateResearchClaim(claim, product.knowledgeCutoff);
      if (!claimVal.isValid) {
        errors.push(`Claim [${idx}]: ${claimVal.errors.join(', ')}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
