import { FIT_SCORES, INVESTOR_PROFILES } from './decision.types.js';

/**
 * Evaluates target asset alignment against user or specified investor profile.
 *
 * @param {Object} params
 * @param {string} params.investorProfile - e.g. 'CONSERVATIVE_INCOME', 'BALANCED_VALUE', 'GROWTH_AT_REASONABLE_PRICE', 'AGGRESSIVE_GROWTH', 'DEEP_VALUE'
 * @param {Object} params.valuation - Valuation engine output or truth package valuation
 * @param {Object} params.riskProfile - Risk engine output
 * @param {Object} params.financialFacts - Grounded and calculated financial facts
 * @returns {Object} Deterministic investor fit breakdown
 */
export function evaluateInvestorFit({
  investorProfile = INVESTOR_PROFILES.BALANCED_VALUE,
  valuation = {},
  riskProfile = {},
  financialFacts = {}
} = {}) {
  const profile = investorProfile || INVESTOR_PROFILES.BALANCED_VALUE;

  const scoreFactors = [];
  let alignmentScore = 100;
  const misalignments = [];
  const alignments = [];

  const overallRiskLevel = riskProfile?.overallRiskLevel || 'UNKNOWN';
  const marginOfSafety = valuation?.valuationSummary?.marginOfSafetyPct ?? null;
  const valuationStatus = valuation?.valuationSummary?.valuationStatus ?? 'UNAVAILABLE';
  const beta = riskProfile?.categoryBreakdowns?.MARKET?.metrics?.beta ?? null;
  const netDebtToEbitda = riskProfile?.categoryBreakdowns?.FINANCIAL?.metrics?.netDebtToEbitda ?? null;
  const revenueGrowth = riskProfile?.categoryBreakdowns?.GROWTH?.metrics?.revenueGrowth ?? null;
  const cashFlowDivergence = riskProfile?.categoryBreakdowns?.EARNINGS_QUALITY?.flags?.includes('CASH_FLOW_DIVERGENCE');

  // Dimension 1: Risk & Stability Tolerance
  if (profile === 'CONSERVATIVE' || profile === INVESTOR_PROFILES.CONSERVATIVE_INCOME) {
    if (overallRiskLevel === 'HIGH' || overallRiskLevel === 'CRITICAL') {
      alignmentScore -= 35;
      misalignments.push(`Overall risk level (${overallRiskLevel}) exceeds conservative risk budget`);
    } else if (overallRiskLevel === 'LOW') {
      alignments.push(`Low risk profile matches capital preservation objective`);
    }

    if (beta !== null && beta > 1.15) {
      alignmentScore -= 15;
      misalignments.push(`Beta (${beta}) exceeds conservative threshold of 1.15`);
    }
    if (netDebtToEbitda !== null && netDebtToEbitda > 2.5) {
      alignmentScore -= 15;
      misalignments.push(`Net Debt / EBITDA (${netDebtToEbitda.toFixed(1)}x) exceeds conservative leverage threshold of 2.5x`);
    }
  } else if (profile === INVESTOR_PROFILES.AGGRESSIVE_GROWTH) {
    if (revenueGrowth !== null && revenueGrowth < 0.05) {
      alignmentScore -= 25;
      misalignments.push(`Revenue growth (${(revenueGrowth * 100).toFixed(1)}%) is too low for aggressive growth strategy`);
    } else if (revenueGrowth !== null && revenueGrowth >= 0.15) {
      alignments.push(`Strong top-line growth (${(revenueGrowth * 100).toFixed(1)}%) aligns with aggressive growth mandate`);
    }
  }

  // Dimension 2: Valuation Discipline
  if (profile === 'VALUE' || profile === INVESTOR_PROFILES.BALANCED_VALUE || profile === INVESTOR_PROFILES.DEEP_VALUE) {
    if (valuationStatus === 'OVERVALUED') {
      alignmentScore -= 30;
      misalignments.push(`Asset is evaluated as OVERVALUED; violates value margin-of-safety mandate`);
    } else if (valuationStatus === 'UNDERVALUED' && marginOfSafety !== null && marginOfSafety >= 15) {
      alignments.push(`Positive margin of safety (${marginOfSafety.toFixed(1)}%) satisfies value investment criteria`);
    }
  }

  // Dimension 3: Earnings Quality
  if (cashFlowDivergence) {
    alignmentScore -= 20;
    misalignments.push(`Cash flow divergence detected (Net Income exceeds Cash from Operations)`);
  }

  // Dimension 4: Missing Valuation
  if (valuationStatus === 'UNAVAILABLE' || valuationStatus === 'NO_MODELS_AVAILABLE') {
    alignmentScore -= 10;
    misalignments.push(`No absolute or relative valuation models available for confirmation`);
  }

  alignmentScore = Math.max(0, Math.min(100, Math.round(alignmentScore)));

  let fitStatus = FIT_SCORES.MODERATE_FIT;
  if (alignmentScore >= 80) fitStatus = FIT_SCORES.HIGH_FIT;
  else if (alignmentScore >= 50) fitStatus = FIT_SCORES.MODERATE_FIT;
  else if (alignmentScore >= 30) fitStatus = FIT_SCORES.LOW_FIT;
  else fitStatus = FIT_SCORES.MISALIGNED;

  return {
    investorProfile: profile,
    fitStatus,
    fitScore: alignmentScore,
    alignments,
    misalignments,
    summary: fitStatus === FIT_SCORES.HIGH_FIT
      ? `Strong alignment with ${profile} profile`
      : fitStatus === FIT_SCORES.MODERATE_FIT
      ? `Moderate alignment with ${profile} profile with manageable tradeoffs`
      : `Poor alignment with ${profile} profile due to risk/valuation criteria violations`
  };
}
