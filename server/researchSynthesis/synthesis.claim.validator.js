/**
 * server/researchSynthesis/synthesis.claim.validator.js
 * 
 * Phase 24: Deterministic Evidence-First Research Claim Validator
 * Audits all claims against authoritative evidence, anti-lookahead boundaries, model tags, and tenant isolation.
 */

import { ResearchClaimType, ClaimConfidence, deepFreeze } from './synthesis.types.js';
import { validateResearchClaim } from './synthesis.schema.js';

export class ResearchClaimValidator {
  /**
   * Validates an array of research claims against evidence and knowledge cutoff
   */
  validateClaims(claims = [], options = {}) {
    const knowledgeCutoff = options.knowledgeCutoff || new Date().toISOString();
    const cutoffTime = new Date(knowledgeCutoff).getTime();
    const expectedTenantId = options.tenantId || null;

    const validatedClaims = [];
    const violations = [];

    for (let idx = 0; idx < claims.length; idx++) {
      const claim = claims[idx];
      const claimErrors = [];

      // 1. Schema & Basic Type Validation
      const schemaCheck = validateResearchClaim(claim, knowledgeCutoff);
      if (!schemaCheck.isValid) {
        claimErrors.push(...schemaCheck.errors);
      }

      // 2. Tenant Isolation Check
      if (expectedTenantId && claim.tenantId && claim.tenantId !== expectedTenantId) {
        claimErrors.push(`Tenant isolation breach: claim tenant (${claim.tenantId}) does not match expected tenant (${expectedTenantId})`);
      }

      // 3. Temporal Cutoff Check
      if (claim.observedAt) {
        const obsTime = new Date(claim.observedAt).getTime();
        if (obsTime > cutoffTime) {
          claimErrors.push(`Temporal violation: claim observedAt (${claim.observedAt}) is after knowledgeCutoff (${knowledgeCutoff})`);
        }
      }

      // 4. FACT Claim Grounding
      if (claim.claimType === ResearchClaimType.FACT) {
        if (!Array.isArray(claim.sourceEvidenceIds) || claim.sourceEvidenceIds.length === 0) {
          claimErrors.push('FACT claim missing authoritative sourceEvidenceIds reference');
        }
      }

      // 5. AI_HYPOTHESIS Isolation Gate: Cannot claim authoritative confidence
      if (claim.claimType === ResearchClaimType.AI_HYPOTHESIS) {
        if (claim.confidenceStatus === ClaimConfidence.VERIFIED_HIGH || claim.isAuthoritativeFact === true) {
          claimErrors.push('AI_HYPOTHESIS claim cannot be classified as VERIFIED_HIGH or authoritative fact');
        }
      }

      // 6. Missing Data Handling: Cannot assert numbers on UNAVAILABLE status
      if (claim.confidenceStatus === ClaimConfidence.UNAVAILABLE || claim.isDataUnavailable === true) {
        if (typeof claim.numericValue === 'number' && !claim.isExplicitNullPlaceholder) {
          claimErrors.push('Claim marked UNAVAILABLE cannot assert authoritative non-null numeric values');
        }
      }

      const isClaimValid = claimErrors.length === 0;

      const processedClaim = {
        ...claim,
        isValid: isClaimValid,
        validationErrors: claimErrors,
        validatedAt: new Date().toISOString(),
        confidenceStatus: isClaimValid ? (claim.confidenceStatus || this._inferConfidence(claim.claimType)) : ClaimConfidence.UNAVAILABLE
      };

      validatedClaims.push(processedClaim);

      if (!isClaimValid) {
        violations.push({
          claimIndex: idx,
          claimId: claim.claimId || `CLAIM_${idx}`,
          claimType: claim.claimType,
          errors: claimErrors
        });
      }
    }

    const overallValid = violations.length === 0;

    return deepFreeze({
      isValid: overallValid,
      totalClaimsCount: claims.length,
      validClaimsCount: validatedClaims.filter(c => c.isValid).length,
      invalidClaimsCount: violations.length,
      knowledgeCutoff,
      tenantId: expectedTenantId,
      claims: validatedClaims,
      violations
    });
  }

  _inferConfidence(claimType) {
    switch (claimType) {
      case ResearchClaimType.FACT: return ClaimConfidence.VERIFIED_HIGH;
      case ResearchClaimType.DERIVED: return ClaimConfidence.CALCULATED_HIGH;
      case ResearchClaimType.MODEL_ESTIMATE: return ClaimConfidence.MODEL_MODERATE;
      case ResearchClaimType.FORECAST: return ClaimConfidence.MODEL_MODERATE;
      case ResearchClaimType.SCENARIO: return ClaimConfidence.CONDITIONAL_SCENARIO;
      case ResearchClaimType.AI_HYPOTHESIS: return ClaimConfidence.HYPOTHETICAL_UNVERIFIED;
      default: return ClaimConfidence.MODEL_MODERATE;
    }
  }
}

export const defaultResearchClaimValidator = new ResearchClaimValidator();
