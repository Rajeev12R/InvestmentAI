import { EVENT_TYPES } from './ingestion.types.js';

/**
 * Deterministic Event Impact Mapping Engine.
 */
export function analyzeEventImpact(event) {
  if (!event) {
    return {
      materiality: 'NONE',
      direction: 'NEUTRAL',
      affectedFacts: [],
      affectedMetrics: [],
      affectedValuationModels: [],
      affectedRiskCategories: [],
      deterministicReasons: ['Empty event']
    };
  }

  const affectedFacts = (event.extractedFacts || []).map(f => f.id);
  const affectedMetrics = [];
  const affectedValuationModels = [];
  const affectedRiskCategories = [];
  const affectedThesisElements = [];
  const deterministicReasons = [];

  let materiality = 'LOW';
  let direction = 'NEUTRAL';

  switch (event.eventType) {
    case EVENT_TYPES.EARNINGS_RELEASE:
    case EVENT_TYPES.ANNUAL_REPORT:
    case EVENT_TYPES.QUARTERLY_REPORT:
      affectedMetrics.push('financial.operatingMargin', 'financial.fcfMargin', 'financial.netDebt');
      affectedValuationModels.push('DCF', 'Relative Valuation', 'Reverse DCF');
      affectedRiskCategories.push('earningsQuality', 'financialRisk');
      affectedThesisElements.push('profitabilityCase', 'growthCase');
      materiality = 'HIGH';
      direction = 'MIXED';
      deterministicReasons.push('Comprehensive quarterly financial filing updates fundamental operating trajectory.');
      break;

    case EVENT_TYPES.GUIDANCE_CHANGE:
      affectedMetrics.push('guidance.revenueGrowth');
      affectedValuationModels.push('DCF', 'Reverse DCF');
      affectedRiskCategories.push('growthRisk');
      affectedThesisElements.push('growthCase');
      materiality = 'HIGH';
      deterministicReasons.push('Management forward guidance update directly alters terminal growth and cash flow projections.');
      break;

    case EVENT_TYPES.DEBT_ISSUANCE:
      affectedMetrics.push('financial.totalDebt', 'financial.debtToEbitda');
      affectedValuationModels.push('DCF', 'WACC');
      affectedRiskCategories.push('financialRisk', 'liquidityRisk');
      affectedThesisElements.push('balanceSheetCase');
      materiality = 'MEDIUM';
      direction = 'DETERIORATING';
      deterministicReasons.push('Debt offering expands leverage obligations and potential interest expense.');
      break;

    case EVENT_TYPES.BUYBACK:
      affectedMetrics.push('corporate.buybackAmount', 'sharesOutstanding');
      affectedValuationModels.push('DCF Per Share', 'P/E Multiple');
      affectedRiskCategories.push('capitalAllocation');
      affectedThesisElements.push('capitalAllocation');
      materiality = 'MEDIUM';
      direction = 'IMPROVING';
      deterministicReasons.push('Share repurchase reduces share count and concentrates equity cash flows.');
      break;


    case EVENT_TYPES.DIVIDEND_CHANGE:
      affectedMetrics.push('corporate.dividendPerShare', 'dividendYield');
      affectedRiskCategories.push('liquidityRisk');
      materiality = 'LOW';
      deterministicReasons.push('Dividend adjustment reflects ongoing capital return policy.');
      break;

    case EVENT_TYPES.CEO_CHANGE:
    case EVENT_TYPES.CFO_CHANGE:
      affectedRiskCategories.push('governanceRisk', 'eventRisk');
      affectedThesisElements.push('managementMoat');
      materiality = 'HIGH';
      direction = 'MIXED';
      deterministicReasons.push('Executive leadership transition introduces strategic execution variability.');
      break;

    case EVENT_TYPES.ACCOUNTING_RESTATEMENT:
    case EVENT_TYPES.SECURITY_FRAUD_EVENT:
      affectedRiskCategories.push('governanceRisk', 'earningsQuality', 'financialRisk');
      affectedThesisElements.push('accountingIntegrityBreaker', 'riskCase');
      materiality = 'CRITICAL';
      direction = 'DETERIORATING';
      deterministicReasons.push('Accounting restatement or fraud allegation represents a critical threat to data integrity and investor trust.');
      break;


    case EVENT_TYPES.REGULATORY_ACTION:
    case EVENT_TYPES.LAWSUIT:
      affectedRiskCategories.push('eventRisk', 'governanceRisk');
      materiality = 'HIGH';
      direction = 'DETERIORATING';
      deterministicReasons.push('Regulatory probe or litigation elevates potential fines and operational headwinds.');
      break;

    case EVENT_TYPES.PRICE_MOVE:
      affectedMetrics.push('market.currentPrice');
      affectedValuationModels.push('Margin of Safety', 'Reverse DCF Implied Growth');
      materiality = 'MEDIUM';
      direction = 'NEUTRAL';
      deterministicReasons.push('Market price fluctuation shifts immediate entry/exit margin of safety.');
      break;

    default:
      materiality = 'LOW';
      direction = 'NEUTRAL';
      deterministicReasons.push('General market/corporate news event with non-critical fundamental impact.');
      break;
  }

  return {
    eventId: event.eventId,
    ticker: event.ticker,
    materiality,
    direction,
    affectedFacts,
    affectedMetrics,
    affectedValuationModels,
    affectedRiskCategories,
    affectedThesisElements,
    deterministicReasons
  };
}
