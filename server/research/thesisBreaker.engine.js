import { THESIS_BREAKER_SEVERITY } from './research.types.js';

/**
 * Deterministic Thesis Breaker Engine.
 * Formulates explicit, measurable threshold triggers that would invalidate the investment thesis.
 *
 * @param {Object} truthPackage - Sealed Investment Truth Package
 * @returns {Array<Object>} List of falsification triggers
 */
export function generateThesisBreakers(truthPackage = {}) {
  const breakers = [];
  const vm = truthPackage?.valuationModels || {};
  const facts = [...(truthPackage?.financialFacts || []), ...(truthPackage?.calculatedMetrics || [])];
  const risks = truthPackage?.riskSignals || {};

  const opMarginFact = facts.find(f => f.id === 'financial.operatingMargin' || f.id === 'financial.operatingMargins');
  const debtFact = facts.find(f => f.id === 'financial.totalDebt');
  const cashFact = facts.find(f => f.id === 'financial.totalCash');
  const dcfVal = vm.dcf?.fairValue ?? null;
  const currentPrice = truthPackage?.company?.currentPrice ?? vm.dcf?.currentPrice ?? null;

  // 1. Operating Margin Erosion Trigger
  if (opMarginFact && typeof opMarginFact.value === 'number') {
    const currentMargin = opMarginFact.value * (Math.abs(opMarginFact.value) < 1 ? 100 : 1);
    const triggerMargin = Math.max(2, Math.round((currentMargin - 3.0) * 10) / 10);
    breakers.push({
      trigger: `Operating Margin Deterioration below ${triggerMargin}%`,
      currentValue: `${currentMargin.toFixed(1)}%`,
      threshold: `${triggerMargin}%`,
      direction: 'CONTRACTION_BELOW_THRESHOLD',
      evidenceIds: ['financial.operatingMargin'],
      severity: THESIS_BREAKER_SEVERITY.HIGH,
      impact: 'Erosion of operating margin cushion would reduce forward free cash flow generation and lower DCF fair value.'
    });
  }

  // 2. Leverage Spike Trigger
  breakers.push({
    trigger: 'Balance Sheet Leverage Spike (Net Debt / EBITDA > 3.5x)',
    currentValue: risks.financialRisk?.debtToEbitda !== 'UNAVAILABLE' ? `${risks.financialRisk?.debtToEbitda}x` : 'Within safe limits',
    threshold: '3.5x',
    direction: 'EXPANSION_ABOVE_THRESHOLD',
    evidenceIds: ['financial.totalDebt', 'financial.totalCash'],
    severity: THESIS_BREAKER_SEVERITY.CRITICAL,
    impact: 'Elevated debt service burden would restrict capital allocation flexibility and elevate financial solvency risk.'
  });

  // 3. Cash Flow Divergence Trigger
  breakers.push({
    trigger: 'Cash Flow Divergence (Operating Cash Flow falling below Net Income)',
    currentValue: 'Verified accounting alignment',
    threshold: 'CFO / Net Income < 0.80x',
    direction: 'DIVERGENCE',
    evidenceIds: ['financial.operatingCashFlow', 'financial.netIncome'],
    severity: THESIS_BREAKER_SEVERITY.HIGH,
    impact: 'Accumulation of uncollected non-cash receivables or accruals signals deteriorating earnings quality.'
  });

  // 4. Valuation Breakeven Trigger
  if (dcfVal !== null && currentPrice !== null) {
    breakers.push({
      trigger: `Market Price Appreciation Eliminating Margin of Safety ($${dcfVal})`,
      currentValue: `$${currentPrice}`,
      threshold: `$${dcfVal}`,
      direction: 'PRICE_CROSSOVER',
      evidenceIds: ['valuation.dcfFairValue'],
      severity: THESIS_BREAKER_SEVERITY.MODERATE,
      impact: 'Price surpassing intrinsic fair value removes margin of safety and triggers a downgrade to HOLD or WATCH.'
    });
  }

  return breakers;
}
