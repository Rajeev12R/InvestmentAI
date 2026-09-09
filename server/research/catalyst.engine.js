import { CATALYST_TYPES, STATEMENT_TYPES } from './research.types.js';

/**
 * Deterministic Catalyst Identification Engine.
 * Extracts grounded positive and negative catalysts from financial metrics, valuation gaps, and event feeds.
 *
 * @param {Object} truthPackage - Sealed Investment Truth Package
 * @returns {Array<Object>} List of structured catalysts
 */
export function identifyCatalysts(truthPackage = {}) {
  const catalysts = [];
  const vm = truthPackage?.valuationModels || {};
  const risks = truthPackage?.riskSignals || {};
  const news = truthPackage?.newsEvents || [];
  const facts = [...(truthPackage?.financialFacts || []), ...(truthPackage?.calculatedMetrics || [])];

  const marginOfSafety = vm.marginOfSafety ?? null;
  const upside = vm.upsidePotential ?? vm.dcf?.upside ?? null;
  const revGrowthFact = facts.find(f => f.id === 'financial.revenueGrowth');
  const opMarginFact = facts.find(f => f.id === 'financial.operatingMargin' || f.id === 'financial.operatingMargins');

  // 1. Valuation Gap Catalyst
  if (upside !== null) {
    if (upside > 15) {
      catalysts.push({
        type: CATALYST_TYPES.VALUATION,
        description: `Valuation Re-rating: Asset trades at a ${(upside).toFixed(1)}% discount to synthesized fair value; convergence toward intrinsic value acts as primary upside catalyst.`,
        timeHorizon: '12-24 Months',
        expectedDirection: 'POSITIVE',
        evidenceIds: ['valuation.dcfFairValue', 'valuation.relativeFairValue'],
        confidence: 'HIGH'
      });
    } else if (upside < -20) {
      catalysts.push({
        type: CATALYST_TYPES.VALUATION,
        description: `Valuation Compression: Premium pricing (${Math.abs(upside).toFixed(1)}% premium) creates multiple compression vulnerability during broader market corrections.`,
        timeHorizon: '6-18 Months',
        expectedDirection: 'NEGATIVE',
        evidenceIds: ['valuation.dcfFairValue'],
        confidence: 'HIGH'
      });
    }
  }

  // 2. Revenue Growth Momentum Catalyst
  if (revGrowthFact && typeof revGrowthFact.value === 'number') {
    const growthRate = revGrowthFact.value * (Math.abs(revGrowthFact.value) < 1 ? 100 : 1);
    if (growthRate > 15) {
      catalysts.push({
        type: CATALYST_TYPES.GROWTH,
        description: `Top-Line Expansion: YoY revenue expansion of +${growthRate.toFixed(1)}% demonstrates strong product market adoption and operating scale.`,
        timeHorizon: '6-12 Months',
        expectedDirection: 'POSITIVE',
        evidenceIds: ['financial.totalRevenue'],
        confidence: 'MEDIUM'
      });
    } else if (growthRate < -5) {
      catalysts.push({
        type: CATALYST_TYPES.GROWTH,
        description: `Revenue Headwind: Top-line contraction of ${growthRate.toFixed(1)}% signals cyclical softening or competitive pressure.`,
        timeHorizon: '6-12 Months',
        expectedDirection: 'NEGATIVE',
        evidenceIds: ['financial.totalRevenue'],
        confidence: 'HIGH'
      });
    }
  }

  // 3. Operating Margin Moat Catalyst
  if (opMarginFact && typeof opMarginFact.value === 'number') {
    const margin = opMarginFact.value * (Math.abs(opMarginFact.value) < 1 ? 100 : 1);
    if (margin > 20) {
      catalysts.push({
        type: CATALYST_TYPES.MARGIN,
        description: `Operating Moat & Pricing Power: Robust operating margin of ${margin.toFixed(1)}% provides structural earnings insulation against inflation and cost pressures.`,
        timeHorizon: 'Ongoing (3-5 Years)',
        expectedDirection: 'POSITIVE',
        evidenceIds: ['financial.operatingMargin'],
        confidence: 'HIGH'
      });
    }
  }

  // 4. News & Event Catalyst
  const significantNews = news.filter(n => Math.abs(n.severity || 0) >= 0.3 || n.sentiment === 'POSITIVE' || n.sentiment === 'NEGATIVE');
  if (significantNews.length > 0) {
    const topEvent = significantNews[0];
    catalysts.push({
      type: CATALYST_TYPES.EVENT,
      description: `Headline Velocity: ${topEvent.title} (${topEvent.category || 'Operations'}).`,
      timeHorizon: 'Near Term (1-3 Months)',
      expectedDirection: topEvent.sentiment === 'POSITIVE' ? 'POSITIVE' : 'NEGATIVE',
      evidenceIds: [],
      confidence: 'MEDIUM'
    });
  }

  return catalysts;
}
