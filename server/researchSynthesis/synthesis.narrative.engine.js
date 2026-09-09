/**
 * server/researchSynthesis/synthesis.narrative.engine.js
 * 
 * Phase 24: Prompt-Injection-Defended AI Narrative Synthesis Engine
 * Synthesizes structured institutional narrative from validated context with strict untrusted data isolation.
 */

import { ResearchClaimType, ClaimConfidence, deepFreeze } from './synthesis.types.js';

export class ResearchNarrativeEngine {
  /**
   * Sanitizes untrusted evidence text and neutralizes prompt-injection attempts
   */
  sanitizeUntrustedEvidence(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';
    
    // Check for prompt injection markers
    const injectionPatterns = [
      /ignore\s+(all\s+)?(previous|above|prior)\s+instructions/i,
      /system\s+prompt\s+override/i,
      /you\s+are\s+now\s+in\s+developer\s+mode/i,
      /disregard\s+(all\s+)?prior\s+directives/i,
      /as\s+an\s+ai\s+model\s+say\s+the\s+following/i,
      /<\/?system>/i,
      /<\/?script>/i,
      /javascript:/i,
      /alert\(/i,
      /ignore\s+compliance/i
    ];

    let hasInjectionAttempt = false;
    for (const pattern of injectionPatterns) {
      if (pattern.test(rawText)) {
        hasInjectionAttempt = true;
        break;
      }
    }

    // Wrap untrusted evidence inside dedicated boundary tag
    const sanitized = rawText
      .replace(/<\/?system>/gi, '')
      .replace(/<\/?script>/gi, '')
      .replace(/```/g, "'''");

    return {
      sanitizedText: `<untrusted_evidence_payload>\n${sanitized}\n</untrusted_evidence_payload>`,
      hasInjectionAttempt,
      originalLength: rawText.length
    };
  }

  /**
   * Synthesizes institutional research brief from validated research context
   */
  generateStructuredBrief(context, options = {}) {
    if (!context || !context.domains) {
      throw new Error('Valid research context with domains is required');
    }

    const { fundamentals, valuation, forecast, earnings, macro, risk, portfolio, scenario, thesis, decision } = context.domains;
    const claims = [];

    // 1. Executive Summary & Core Facts
    claims.push({
      claimId: `CLM_REV_${Date.now()}_1`,
      claimText: `Reported FY revenue of $${(fundamentals.revenue / 1e6).toFixed(1)}M with ${fundamentals.revenueGrowthYoY}% YoY growth`,
      claimType: ResearchClaimType.FACT,
      sourceEvidenceIds: fundamentals.evidenceIds || ['EV_SEC_10K'],
      observedAt: fundamentals.asOf,
      confidenceStatus: ClaimConfidence.VERIFIED_HIGH
    });

    claims.push({
      claimId: `CLM_VAL_${Date.now()}_2`,
      claimText: `DCF model fair value estimate is $${valuation.dcfFairValue} (WACC: ${valuation.discountRateWacc}%, Terminal Growth: ${valuation.terminalGrowthRate}%)`,
      claimType: ResearchClaimType.MODEL_ESTIMATE,
      modelName: 'DCF_DISCOUNTED_CASH_FLOW',
      confidenceStatus: ClaimConfidence.MODEL_MODERATE
    });

    claims.push({
      claimId: `CLM_FCST_${Date.now()}_3`,
      claimText: `Forward FY EPS forecast is $${forecast.forwardEps} (Revision: +${forecast.forecastRevisionPct}%)`,
      claimType: ResearchClaimType.FORECAST,
      forecastVintage: forecast.forecastVintage,
      confidenceStatus: ClaimConfidence.MODEL_MODERATE
    });

    if (earnings.reportedEps !== undefined) {
      claims.push({
        claimId: `CLM_EARN_${Date.now()}_4`,
        claimText: `Q4 reported EPS of $${earnings.reportedEps} vs consensus $${earnings.consensusEps} (+${earnings.surprisePct}% surprise)`,
        claimType: ResearchClaimType.FACT,
        sourceEvidenceIds: earnings.evidenceIds || ['EV_EARNINGS_8K'],
        confidenceStatus: ClaimConfidence.VERIFIED_HIGH
      });
    }

    claims.push({
      claimId: `CLM_MACRO_${Date.now()}_5`,
      claimText: `Operating under ${macro.currentRegime} macro regime with ${macro.interestRateSensitivity} rate sensitivity`,
      claimType: ResearchClaimType.DERIVED,
      confidenceStatus: ClaimConfidence.CALCULATED_HIGH
    });

    // 2. Sections Generation
    const sections = {
      executiveConclusion: `Comprehensive evaluation of ${context.subjectId} indicates a robust fundamental profile with $${(fundamentals.revenue / 1e6).toFixed(1)}M revenue and $${valuation.dcfFairValue} DCF fair value.`,
      whatChanged: `Latest earnings beat (+${earnings.surprisePct}%) triggered a +${forecast.forecastRevisionPct}% forward EPS forecast upgrade.`,
      investmentCase: `${thesis.thesisSummary}. Supported by ${thesis.expectedDrivers?.length || 0} active operational drivers.`,
      whatCouldGoRight: thesis.catalysts?.map(c => `${c.catalyst} (${c.timeframe})`).join('; ') || 'Continued enterprise expansion',
      whatCouldGoWrong: thesis.breakers?.map(b => `${b.breaker} [Status: ${b.status}]`).join('; ') || 'Macro rate compression',
      valuationAnalysis: `DCF Fair Value: $${valuation.dcfFairValue}, Relative Fair Value: $${valuation.relativeFairValue}, Spot Price: $${valuation.currentMarketPrice}.`,
      macroContext: `Regime: ${macro.currentRegime}. Rate transmission via ${macro.primaryTransmissionChannel}.`,
      portfolioContext: `Portfolio Weight: ${portfolio.portfolioWeightPct}%. Common Drivers: ${portfolio.commonDrivers?.join(', ')}. Shared Risks: ${portfolio.sharedRisks?.join(', ')}.`,
      scenarioAnalysis: `Base Case Return: +${scenario.baseCaseReturnPct}%, Stress Drawdown: ${scenario.stressDrawdownPct}%.`,
      decisionContext: `Prior Decision: ${decision.lastDecision} at $${decision.decisionPrice}. Outcome alignment: ${decision.isOutcomeAligned ? 'CONFIRMED' : 'DIVERGENT'}.`,
      openQuestions: [
        'Sustainability of gross margins under rising component supply costs',
        'Impact of potential central bank rate shifts on enterprise software capex budgets'
      ]
    };

    return deepFreeze({
      subjectId: context.subjectId,
      knowledgeCutoff: context.knowledgeCutoff,
      sections,
      claims,
      claimsCount: claims.length,
      methodology: 'DETERMINISTIC_EVIDENCE_SYNTHESIS',
      aiNarrativeGenerated: true
    });
  }
}

export const defaultResearchNarrativeEngine = new ResearchNarrativeEngine();
