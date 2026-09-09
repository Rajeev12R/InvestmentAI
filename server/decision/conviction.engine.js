import { CONVICTION_LEVELS } from './decision.types.js';

/**
 * Calculates conviction score and level based on data completeness, model agreement, and signal cohesion.
 *
 * @param {Object} params
 * @param {Object} params.valuation - Valuation engine output
 * @param {Object} params.riskProfile - Risk engine output
 * @param {Object} params.fitResult - Investor fit output
 * @returns {Object} Conviction analysis
 */
export function calculateConviction({
  valuation = {},
  riskProfile = {},
  fitResult = {}
} = {}) {
  let score = 50;
  const rationale = [];

  // Factor 1: Data Quality & Coverage
  const dataCoverage = riskProfile?.categoryBreakdowns?.DATA_QUALITY?.metrics?.dataCoverageRatio ?? null;
  if (dataCoverage !== null) {
    if (dataCoverage >= 0.85) {
      score += 20;
      rationale.push(`High data completeness (${Math.round(dataCoverage * 100)}% verified grounded facts)`);
    } else if (dataCoverage < 0.50) {
      score -= 25;
      rationale.push(`Low data coverage (${Math.round(dataCoverage * 100)}%); multiple fundamental inputs unavailable`);
    }
  } else {
    score -= 10;
  }

  // Factor 2: Valuation Model Agreement
  const agreement = valuation?.modelAgreement;
  if (agreement && agreement.status === 'COMPLETE') {
    const modelsCount = agreement.modelsEvaluated?.length || 0;
    const dispersion = agreement.dispersion; // LOW, MODERATE, HIGH
    if (modelsCount >= 2 && dispersion === 'LOW') {
      score += 20;
      rationale.push(`Strong multi-model valuation agreement across ${modelsCount} independent methods`);
    } else if (modelsCount >= 2 && dispersion === 'HIGH') {
      score -= 15;
      rationale.push(`High valuation dispersion across models (${agreement.coefficientOfVariation ? (agreement.coefficientOfVariation * 100).toFixed(1) + '%' : 'divergent'})`);
    }
  } else {
    score -= 15;
    rationale.push('Limited or single-model valuation confirmation');
  }

  // Factor 3: Earnings Quality Flags
  const earningsFlags = riskProfile?.categoryBreakdowns?.EARNINGS_QUALITY?.flags || [];
  if (earningsFlags.includes('CASH_FLOW_DIVERGENCE')) {
    score -= 15;
    rationale.push('Cash flow divergence degrades accounting earnings conviction');
  }

  // Factor 4: Critical Risk Flags
  const criticalFlags = riskProfile?.criticalFlags || [];
  if (criticalFlags.length > 0) {
    score -= 20;
    rationale.push(`Critical risk flags present: ${criticalFlags.join(', ')}`);
  }

  score = Math.max(10, Math.min(100, Math.round(score)));

  let convictionLevel = CONVICTION_LEVELS.MEDIUM;
  if (score >= 75) {
    convictionLevel = CONVICTION_LEVELS.HIGH;
  } else if (score >= 50) {
    convictionLevel = CONVICTION_LEVELS.MEDIUM;
  } else if (score >= 30) {
    convictionLevel = CONVICTION_LEVELS.LOW;
  } else {
    convictionLevel = CONVICTION_LEVELS.SPECULATIVE;
  }

  return {
    convictionScore: score,
    convictionLevel,
    rationale
  };
}
