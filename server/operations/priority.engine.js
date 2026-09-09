/**
 * @file priority.engine.js
 * Calculates operational urgency for decision reviews and follow-ups.
 */

import { ReviewUrgency } from './operations.types.js';

/**
 * Calculates operational review urgency.
 * @param {Object} params
 * @param {string} [params.previousDecision]
 * @param {string} [params.currentDecision]
 * @param {string} [params.thesisBreakerStatus]
 * @param {number} [params.valuationDriftPct]
 * @returns {string} ReviewUrgency
 */
export function calculateOperationalUrgency({
  previousDecision,
  currentDecision,
  thesisBreakerStatus,
  valuationDriftPct
}) {
  // Decision downgraded to AVOID or triggered breaker is IMMEDIATE
  if (currentDecision === 'AVOID' && previousDecision && previousDecision !== 'AVOID') {
    return ReviewUrgency.IMMEDIATE;
  }
  if (thesisBreakerStatus === 'TRIGGERED') {
    return ReviewUrgency.IMMEDIATE;
  }

  // Decision downgrade to WATCH or approaching breaker is HIGH
  if (previousDecision === 'BUY' && currentDecision === 'WATCH') {
    return ReviewUrgency.HIGH;
  }
  if (thesisBreakerStatus === 'APPROACHING') {
    return ReviewUrgency.HIGH;
  }
  if (typeof valuationDriftPct === 'number' && Math.abs(valuationDriftPct) >= 15.0) {
    return ReviewUrgency.HIGH;
  }

  // Other decision changes or moderate valuation drift are NORMAL
  if (previousDecision && currentDecision && previousDecision !== currentDecision) {
    return ReviewUrgency.NORMAL;
  }
  if (typeof valuationDriftPct === 'number' && Math.abs(valuationDriftPct) >= 5.0) {
    return ReviewUrgency.NORMAL;
  }

  return ReviewUrgency.LOW;
}
