/**
 * @file attention.questionGenerator.js
 * Deterministic investigation question generator for Phase 7 Attention Intelligence.
 * Formulates specific, evidence-backed research questions directly from detected drifts.
 */

/**
 * Generates deterministic investigation questions based on attention item triggers.
 * @param {Object} item
 * @returns {string[]} Array of actionable investigation questions
 */
export function generateInvestigationQuestions(item) {
  const questions = [];
  const ticker = item.ticker || 'the company';

  // 1. Decision Change Questions
  if (item.previousDecision && item.currentDecision && item.previousDecision !== item.currentDecision) {
    questions.push(
      `What primary fundamental factor drove the decision downgrade/upgrade from ${item.previousDecision} to ${item.currentDecision} for ${ticker}?`
    );
  }

  // 2. Valuation Drift Questions
  if (item.metrics?.valuationDriftPct !== undefined) {
    const drift = item.metrics.valuationDriftPct;
    if (Math.abs(drift) >= 5.0) {
      questions.push(
        `Is the ${drift.toFixed(1)}% valuation drift in ${ticker} driven by fundamental cash flow revisions or discount rate/WACC adjustments?`
      );
    }
  }

  // 3. Risk Escalation Questions
  if (item.metrics?.riskDriftSeverity && !item.metrics.riskDriftSeverity.includes('STABLE')) {
    questions.push(
      `Which specific balance sheet or operational risk metric escalated to ${item.metrics.riskDriftSeverity} in ${ticker}?`
    );
  }

  // 4. Thesis Breaker Questions
  if (item.thesisBreakerStatus === 'TRIGGERED' || item.thesisBreakerStatus === 'APPROACHING') {
    questions.push(
      `What is the remaining buffer before the thesis-breaker condition for ${ticker} is permanently breached?`
    );
  }

  // 5. Margin / Earnings Changes
  if (item.category === 'EARNINGS_CHANGE' || item.category === 'GUIDANCE_CHANGE') {
    questions.push(
      `How does the latest earnings or guidance revision for ${ticker} impact long-term operating margin projections?`
    );
  }

  // 6. Portfolio Concentration / Sizing
  if (item.category === 'PORTFOLIO_CONCENTRATION' || item.category === 'POSITION_SIZE_RISK') {
    questions.push(
      `Does the current position size in ${ticker} exceed the risk-budgeted maximum portfolio exposure?`
    );
  }

  // Fallback if no specific condition matched
  if (questions.length === 0) {
    questions.push(
      `What are the key operational developments identified in the latest verified snapshot for ${ticker}?`
    );
  }

  return questions;
}
