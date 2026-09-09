/**
 * server/researchSynthesis/synthesis.tool.js
 * 
 * Phase 24: Read-Only Copilot Research Synthesis Tools
 * Allows Copilot to query research contexts, explain model disagreement, verify claims, and inspect thesis health.
 */

import { defaultResearchContextBuilder } from './synthesis.context.builder.js';
import { defaultResearchNarrativeEngine } from './synthesis.narrative.engine.js';
import { defaultResearchClaimValidator } from './synthesis.claim.validator.js';
import { defaultModelAgreementEngine } from './synthesis.modelAgreement.engine.js';
import { defaultThesisDecisionReviewEngine } from './synthesis.thesisDecision.engine.js';
import { defaultResearchDeltaEngine } from './synthesis.delta.engine.js';
import { defaultResearchProductStore } from './synthesis.store.js';
import { deepFreeze } from './synthesis.types.js';

export const ResearchCopilotTools = {
  /**
   * Generates a validated research brief for a security or portfolio
   */
  async generateResearchBrief(tenantId, subjectId, knowledgeCutoff = new Date().toISOString(), options = {}) {
    const context = defaultResearchContextBuilder.buildResearchContext(subjectId, knowledgeCutoff, 'FULL', { ...options, tenantId });
    const brief = defaultResearchNarrativeEngine.generateStructuredBrief(context, options);
    const validation = defaultResearchClaimValidator.validateClaims(brief.claims, { knowledgeCutoff, tenantId });

    return deepFreeze({
      subjectId,
      knowledgeCutoff,
      brief,
      validation,
      contextHash: context.contextHash,
      isFullyValidated: validation.isValid
    });
  },

  /**
   * Explains valuation model disagreement for a given security
   */
  explainModelDisagreement(modelsInput, marketPrice = null) {
    return defaultModelAgreementEngine.evaluateModelAgreement(modelsInput, marketPrice);
  },

  /**
   * Evaluates thesis health deterministically from drivers and breakers
   */
  explainThesisHealth(thesisData) {
    return defaultThesisDecisionReviewEngine.evaluateThesisHealth(thesisData);
  },

  /**
   * Reviews a historical decision without hindsight bias
   */
  explainDecisionOutcome(decisionRecord, subsequentOutcomes) {
    return defaultThesisDecisionReviewEngine.reviewHistoricalDecision(decisionRecord, subsequentOutcomes);
  },

  /**
   * Compares two research versions deterministically
   */
  compareResearchVersions(tenantId, productId, versionA, versionB) {
    const prodA = defaultResearchProductStore.getProductVersion(tenantId, productId, versionA);
    const prodB = defaultResearchProductStore.getProductVersion(tenantId, productId, versionB);

    if (!prodA || !prodB) {
      return { isFound: false, error: 'One or both product versions not found' };
    }

    const diff = defaultResearchDeltaEngine.compareResearchContexts(
      { domains: prodA.domains || {}, knowledgeCutoff: prodA.knowledgeCutoff },
      { domains: prodB.domains || {}, knowledgeCutoff: prodB.knowledgeCutoff }
    );

    return deepFreeze({
      isFound: true,
      productId,
      versionA,
      versionB,
      diff
    });
  }
};
