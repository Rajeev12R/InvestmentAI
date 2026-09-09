/**
 * @file copilot.questionPlanner.js
 * Generates grounded, contextual follow-up questions for the investor based on the
 * active sealed context, decision shifts, valuation drift, thesis breakers, and portfolio exposure.
 */

import { CopilotIntent } from './copilot.types.js';

/**
 * Plans grounded follow-up investigation questions.
 * @param {Object} params
 * @param {Object} params.sealedContext
 * @param {string} [params.intent]
 * @returns {string[]} Array of suggested follow-up questions
 */
export function planFollowUpQuestions({ sealedContext, intent = CopilotIntent.UNKNOWN }) {
  const suggestions = [];
  const ticker = sealedContext.ticker;

  if (ticker) {
    const dec = sealedContext.decisionPackage;
    const val = sealedContext.valuationPackage;
    const chg = sealedContext.changePackage;
    const attn = sealedContext.attentionPackage;

    // Decision follow-ups
    if (dec?.decision === 'WATCH' || dec?.decision === 'AVOID') {
      suggestions.push(`What specific metrics would be required to restore ${ticker} to a BUY?`);
    }

    // Valuation follow-ups
    if (val?.dcfValue) {
      suggestions.push(`What core growth and margin assumptions drive ${ticker}'s $${val.dcfValue} DCF fair value?`);
    }

    // Thesis breaker follow-ups
    if (dec?.thesis?.breakers?.length > 0) {
      const activeBreaker = dec.thesis.breakers.find(b => b.triggered || b.approaching);
      if (activeBreaker) {
        suggestions.push(`Which operational milestones track the ${activeBreaker.id || 'primary'} thesis breaker for ${ticker}?`);
      }
    }

    // Change follow-ups
    if (chg?.metricChanges?.length > 0) {
      suggestions.push(`How do the latest snapshot changes in ${ticker} impact long-term cash flow projections?`);
    }

    // Evidence & filing follow-ups
    suggestions.push(`What primary SEC filings and management disclosures verify these ${ticker} metrics?`);
  } else if (sealedContext.portfolioPackage) {
    const port = sealedContext.portfolioPackage;
    if (port.top1Weight >= 0.30) {
      suggestions.push(`How does the high concentration in top holdings affect the portfolio's effective independent bets (N_eff)?`);
    }
    if (port.correlationClusters?.length > 0) {
      suggestions.push(`Which assets in the portfolio share high pairwise correlation (r >= 0.80)?`);
    }
    suggestions.push(`Which holdings in my watchlist currently require the highest operational attention?`);
  } else {
    suggestions.push('What are the highest priority attention items across my portfolio today?');
    suggestions.push('Which holdings experienced material valuation drift in the latest update?');
  }

  return suggestions.slice(0, 4);
}
