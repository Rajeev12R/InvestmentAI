/**
 * @file attentionAI.boundary.js
 * Enforces the strict read-only AI security boundary for Phase 7 Attention Intelligence.
 * Prepares sealed, immutable DTOs for AI interpretation while preventing prompt-injection
 * or state mutation attempts.
 */

/**
 * Prepares a read-only, sanitized AttentionIntelligencePackage view for the AI research analyst.
 * @param {Object} attentionPackage Sealed package from attention.engine.js
 * @returns {Object} Immutable, sanitized AI Context DTO
 */
export function buildAIAttentionContext(attentionPackage) {
  if (!attentionPackage || !attentionPackage.isSealed) {
    throw new Error('AI boundary violation: Only sealed AttentionIntelligencePackages may be presented to AI.');
  }

  // Deep clone to prevent any runtime mutation
  const sanitized = {
    packageId: attentionPackage.packageId,
    packageHash: attentionPackage.packageHash,
    generatedAt: attentionPackage.generatedAt,
    prioritySummary: { ...attentionPackage.prioritySummary },
    portfolioSummary: attentionPackage.portfolioSummary ? { ...attentionPackage.portfolioSummary } : null,
    attentionItems: (attentionPackage.attentionItems || []).map(item => ({
      attentionId: item.attentionId,
      ticker: item.ticker,
      priority: item.priority,
      category: item.category,
      title: item.title,
      summary: item.summary,
      triggerType: item.triggerType,
      previousDecision: item.previousDecision,
      currentDecision: item.currentDecision,
      whyMatters: [...(item.whyMatters || [])],
      whatChanged: [...(item.whatChanged || [])],
      whatInvalidates: [...(item.whatInvalidates || [])],
      approvedInvestigationQuestions: [...(item.investigationQuestions || [])],
      secondarySignals: (item.secondarySignals || []).map(s => ({
        category: s.category,
        title: s.title,
        summary: s.summary
      }))
    }))
  };

  // Object.freeze top-level and children to ensure absolute immutability
  Object.freeze(sanitized.prioritySummary);
  if (sanitized.portfolioSummary) Object.freeze(sanitized.portfolioSummary);
  sanitized.attentionItems.forEach(item => {
    Object.freeze(item.whyMatters);
    Object.freeze(item.whatChanged);
    Object.freeze(item.whatInvalidates);
    Object.freeze(item.approvedInvestigationQuestions);
    Object.freeze(item.secondarySignals);
    Object.freeze(item);
  });
  Object.freeze(sanitized.attentionItems);
  Object.freeze(sanitized);

  return sanitized;
}

/**
 * Validates that an AI output does NOT attempt to modify deterministic state.
 * @param {Object} aiResponse
 * @returns {{ safe: boolean, violations: string[] }}
 */
export function validateAIResponseSafety(aiResponse) {
  const violations = [];
  if (!aiResponse || typeof aiResponse !== 'object') {
    return { safe: true, violations: [] };
  }

  // AI cannot return direct state mutation commands
  if (aiResponse.mutatedDecision || aiResponse.overrideDecision || aiResponse.decision) {
    violations.push('AI attempted to override deterministic decision.');
  }
  if (aiResponse.mutatedPriority || aiResponse.overridePriority || aiResponse.priority) {
    violations.push('AI attempted to override attention priority.');
  }
  if (aiResponse.suppressAlert) {
    violations.push('AI attempted to suppress deterministic alert.');
  }
  if (aiResponse.injectedFact || aiResponse.newFinancialFact || aiResponse.fact) {
    violations.push('AI attempted to inject unverified financial fact.');
  }
  if (aiResponse.mutatedValuation || aiResponse.overrideValuation || aiResponse.valuation) {
    violations.push('AI attempted to override deterministic valuation.');
  }
  if (aiResponse.synthesizedEvidence || aiResponse.inventedEvidence) {
    violations.push('AI attempted to synthesize fake evidence.');
  }

  return {
    safe: violations.length === 0,
    violations
  };
}
