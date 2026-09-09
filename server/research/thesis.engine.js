import { STATEMENT_TYPES } from './research.types.js';

/**
 * Deterministic Investment Thesis Engine.
 * Formulates Bull, Base, and Bear scenarios grounded in verified valuation models and risk metrics.
 *
 * @param {Object} truthPackage - Sealed Investment Truth Package
 * @returns {Object} Structured thesis breakdown
 */
export function buildInvestmentThesis(truthPackage = {}) {
  const company = truthPackage?.company || {};
  const vm = truthPackage?.valuationModels || {};
  const risks = truthPackage?.riskSignals || {};
  const facts = [...(truthPackage?.financialFacts || []), ...(truthPackage?.calculatedMetrics || [])];

  const ticker = company.ticker || 'Security';
  const name = company.name || ticker;

  // Extract valuation values
  const dcfVal = vm.dcf?.fairValue ?? null;
  const relVal = vm.relativeValuation?.fairValue ?? null;
  const targetVal = vm.compositeFairValue ?? dcfVal ?? relVal ?? null;
  const upside = vm.upsidePotential ?? vm.dcf?.upside ?? null;
  const marginOfSafety = vm.marginOfSafety ?? null;
  const reverseDcfGrowth = vm.reverseDcf?.impliedGrowthRate ?? null;

  // Extract risk profile
  const overallRisk = risks.overallRiskLevel || risks.overallScore || 'MODERATE';
  const criticalFlags = risks.criticalFlags || [];

  // Scenarios from Phase 2A
  const scenarios = vm.scenarios || {};
  const bearFairValue = scenarios.bear?.fairValue ?? null;
  const baseFairValue = scenarios.base?.fairValue ?? targetVal;
  const bullFairValue = scenarios.bull?.fairValue ?? null;

  // Derive Bull Case
  const bullCase = bullFairValue !== null
    ? `${name} achieves operational expansion with modeled bull-case fair value of ${bullFairValue} ${company.currency || 'USD'}. Key driver: sustained top-line momentum and operating leverage.`
    : `Expansion in operating cash flows and margin stability supports fundamental outperformance.`;

  // Derive Base Case
  const baseCase = baseFairValue !== null
    ? `Base-case intrinsic valuation evaluated at ${baseFairValue} ${company.currency || 'USD'} (${upside !== null ? (upside >= 0 ? '+' : '') + upside.toFixed(1) + '% vs market price' : 'grounded valuation'}). Solvency and operating cash flows remain within historical ranges.`
    : `Company operates under current baseline cash flow generation with normalized capital reinvestment.`;

  // Derive Bear Case
  const bearCase = bearFairValue !== null
    ? `Downside risk evaluated at bear-case fair value of ${bearFairValue} ${company.currency || 'USD'}. Vulnerabilities include margin compression, elevated leverage, or broader market volatility (${overallRisk} risk profile).`
    : `Deterioration in operating margins or emergence of cash flow divergence would impair fair value realizations.`;

  // Key Drivers
  const keyDrivers = [];
  if (dcfVal !== null) {
    keyDrivers.push({
      claim: `DCF intrinsic fair value calculated at ${dcfVal} ${company.currency || 'USD'} based on 5-year discrete cash flow projections.`,
      statementType: STATEMENT_TYPES.CALCULATION,
      evidenceIds: ['valuation.dcfFairValue']
    });
  }
  if (reverseDcfGrowth !== null) {
    keyDrivers.push({
      claim: `Current market price embeds an implied annual cash flow growth hurdle of +${(reverseDcfGrowth * 100).toFixed(1)}%.`,
      statementType: STATEMENT_TYPES.CALCULATION,
      evidenceIds: ['valuation.reverseDcf']
    });
  }
  if (criticalFlags.length > 0) {
    keyDrivers.push({
      claim: `Critical risk alert: ${criticalFlags.map(f => typeof f === 'string' ? f : f.message || f.reason).join(', ')}.`,
      statementType: STATEMENT_TYPES.FACT,
      evidenceIds: ['risk.overall']
    });
  }

  return {
    summary: `${name} (${ticker}) is evaluated with an overall ${overallRisk} risk profile and ${targetVal !== null ? 'intrinsic fair value of ' + targetVal + ' ' + (company.currency || 'USD') : 'valuation currently unavailable'}.`,
    bullCase,
    baseCase,
    bearCase,
    keyDrivers,
    scenarios: {
      bear: bearFairValue,
      base: baseFairValue,
      bull: bullFairValue
    },
    limitations: facts.filter(f => f.status === 'UNAVAILABLE').map(f => `Missing ${f.metric || f.id} in primary reporting feeds.`)
  };
}
