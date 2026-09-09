import { CHANGE_CATEGORIES, CHANGE_DIRECTIONS } from './change.types.js';
import { evaluateMateriality } from './materiality.config.js';

/**
 * Helper to compute directional classification for metrics.
 */
function determineDirection(category, delta) {
  if (delta === 0) return CHANGE_DIRECTIONS.NEUTRAL;
  if (delta === null || delta === undefined || isNaN(delta)) return CHANGE_DIRECTIONS.UNKNOWN;

  switch (category) {
    case CHANGE_CATEGORIES.REVENUE:
    case CHANGE_CATEGORIES.EARNINGS:
    case CHANGE_CATEGORIES.FREE_CASH_FLOW:
    case CHANGE_CATEGORIES.MARGINS:
    case CHANGE_CATEGORIES.CASH:
    case CHANGE_CATEGORIES.VALUATION:
      return delta > 0 ? CHANGE_DIRECTIONS.IMPROVING : CHANGE_DIRECTIONS.DETERIORATING;

    case CHANGE_CATEGORIES.DEBT:
    case CHANGE_CATEGORIES.LEVERAGE:
    case CHANGE_CATEGORIES.VOLATILITY:
      return delta > 0 ? CHANGE_DIRECTIONS.DETERIORATING : CHANGE_DIRECTIONS.IMPROVING;

    case CHANGE_CATEGORIES.PRICE:
    case CHANGE_CATEGORIES.BETA:
    case CHANGE_CATEGORIES.REVERSE_DCF:
      return delta > 0 ? CHANGE_DIRECTIONS.MIXED : CHANGE_DIRECTIONS.NEUTRAL;

    default:
      return delta > 0 ? CHANGE_DIRECTIONS.IMPROVING : CHANGE_DIRECTIONS.DETERIORATING;
  }
}

/**
 * Detects and computes all mathematical differences between two Investment Snapshots.
 *
 * @param {Object} previousSnapshot - Historical snapshot (T0)
 * @param {Object} currentSnapshot - Current snapshot (T1)
 * @returns {Array<Object>} List of structured change objects
 */
export function detectSnapshotChanges(previousSnapshot, currentSnapshot) {
  if (!previousSnapshot || !currentSnapshot) {
    return [];
  }

  const ticker = currentSnapshot.ticker || previousSnapshot.ticker || 'UNKNOWN';
  const changes = [];

  const metricsToCompare = [
    {
      category: CHANGE_CATEGORIES.PRICE,
      field: 'marketState.currentPrice',
      name: 'Market Price',
      prev: previousSnapshot.marketState?.currentPrice,
      curr: currentSnapshot.marketState?.currentPrice,
      evidenceIds: ['market.currentPrice']
    },
    {
      category: CHANGE_CATEGORIES.REVENUE,
      field: 'financialState.revenue',
      name: 'Revenue',
      prev: previousSnapshot.financialState?.revenue,
      curr: currentSnapshot.financialState?.revenue,
      evidenceIds: ['financial.revenue']
    },
    {
      category: CHANGE_CATEGORIES.EARNINGS,
      field: 'financialState.netIncome',
      name: 'Net Income',
      prev: previousSnapshot.financialState?.netIncome,
      curr: currentSnapshot.financialState?.netIncome,
      evidenceIds: ['financial.netIncome']
    },
    {
      category: CHANGE_CATEGORIES.FREE_CASH_FLOW,
      field: 'financialState.fcf',
      name: 'Free Cash Flow',
      prev: previousSnapshot.financialState?.fcf,
      curr: currentSnapshot.financialState?.fcf,
      evidenceIds: ['financial.freeCashFlow']
    },
    {
      category: CHANGE_CATEGORIES.MARGINS,
      field: 'financialState.operatingMargin',
      name: 'Operating Margin',
      prev: previousSnapshot.financialState?.operatingMargin,
      curr: currentSnapshot.financialState?.operatingMargin,
      evidenceIds: ['financial.operatingMargin']
    },
    {
      category: CHANGE_CATEGORIES.DEBT,
      field: 'financialState.totalDebt',
      name: 'Total Debt',
      prev: previousSnapshot.financialState?.totalDebt,
      curr: currentSnapshot.financialState?.totalDebt,
      evidenceIds: ['financial.totalDebt']
    },
    {
      category: CHANGE_CATEGORIES.CASH,
      field: 'financialState.totalCash',
      name: 'Total Cash',
      prev: previousSnapshot.financialState?.totalCash,
      curr: currentSnapshot.financialState?.totalCash,
      evidenceIds: ['financial.totalCash']
    },
    {
      category: CHANGE_CATEGORIES.LEVERAGE,
      field: 'financialState.debtToEbitda',
      name: 'Debt to EBITDA',
      prev: previousSnapshot.financialState?.debtToEbitda,
      curr: currentSnapshot.financialState?.debtToEbitda,
      evidenceIds: ['financial.debtToEbitda', 'financial.netDebt']
    },
    {
      category: CHANGE_CATEGORIES.VALUATION,
      field: 'valuationState.dcfFairValue',
      name: 'DCF Fair Value',
      prev: previousSnapshot.valuationState?.dcfFairValue,
      curr: currentSnapshot.valuationState?.dcfFairValue,
      evidenceIds: ['valuation.dcfFairValue']
    },
    {
      category: CHANGE_CATEGORIES.VALUATION,
      field: 'valuationState.compositeFairValue',
      name: 'Composite Fair Value',
      prev: previousSnapshot.valuationState?.compositeFairValue,
      curr: currentSnapshot.valuationState?.compositeFairValue,
      evidenceIds: ['valuation.compositeFairValue']
    },
    {
      category: CHANGE_CATEGORIES.REVERSE_DCF,
      field: 'valuationState.reverseDcfGrowth',
      name: 'Reverse DCF Implied Growth',
      prev: previousSnapshot.valuationState?.reverseDcfGrowth,
      curr: currentSnapshot.valuationState?.reverseDcfGrowth,
      evidenceIds: ['valuation.reverseDcfGrowth']
    },
    {
      category: CHANGE_CATEGORIES.RISK,
      field: 'riskState.overallCategory',
      name: 'Overall Risk Category',
      prev: previousSnapshot.riskState?.overallCategory,
      curr: currentSnapshot.riskState?.overallCategory,
      evidenceIds: ['risk.overallCategory', 'risk.overallScore']
    },
    {
      category: CHANGE_CATEGORIES.DECISION,
      field: 'decisionState.decision',
      name: 'Investment Decision',
      prev: previousSnapshot.decisionState?.decision,
      curr: currentSnapshot.decisionState?.decision,
      evidenceIds: ['decision.outcome']
    }
  ];

  for (const item of metricsToCompare) {
    const prevVal = item.prev;
    const currVal = item.curr;

    // Check for unavailable data
    if (prevVal === 'UNAVAILABLE' || currVal === 'UNAVAILABLE' || prevVal === undefined || currVal === undefined) {
      continue;
    }

    // Numerical difference
    if (typeof prevVal === 'number' && typeof currVal === 'number') {
      const absoluteChange = currVal - prevVal;
      const percentageChange = prevVal !== 0 ? (absoluteChange / Math.abs(prevVal)) * 100 : (currVal > 0 ? 100 : 0);

      // Evaluate materiality
      const materiality = evaluateMateriality({
        category: item.category,
        previousValue: prevVal,
        currentValue: currVal,
        percentageChange,
        absoluteChange
      });

      const direction = determineDirection(item.category, absoluteChange);

      changes.push({
        changeId: `CHG_${ticker}_${item.category}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        ticker,
        category: item.category,
        field: item.field,
        name: item.name,
        previousValue: prevVal,
        currentValue: currVal,
        absoluteChange: Math.round(absoluteChange * 1000) / 1000,
        percentageChange: Math.round(percentageChange * 100) / 100,
        previousAsOf: previousSnapshot.asOf,
        currentAsOf: currentSnapshot.asOf,
        materiality: materiality.level,
        isMaterial: materiality.isMaterial,
        materialityReason: materiality.reason,
        direction,
        evidenceIds: item.evidenceIds
      });
    } else if (typeof prevVal === 'string' && typeof currVal === 'string') {
      // Categorical / Transition differences
      if (prevVal !== currVal) {
        const materiality = evaluateMateriality({
          category: item.category,
          previousValue: prevVal,
          currentValue: currVal
        });

        let direction = CHANGE_DIRECTIONS.MIXED;
        if (item.category === CHANGE_CATEGORIES.DECISION) {
          const ranks = { BUY: 4, HOLD: 3, WATCH: 2, AVOID: 1 };
          direction = (ranks[currVal] || 0) > (ranks[prevVal] || 0) ? CHANGE_DIRECTIONS.IMPROVING : CHANGE_DIRECTIONS.DETERIORATING;
        } else if (item.category === CHANGE_CATEGORIES.RISK) {
          const riskRanks = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
          direction = (riskRanks[currVal] || 0) > (riskRanks[prevVal] || 0) ? CHANGE_DIRECTIONS.DETERIORATING : CHANGE_DIRECTIONS.IMPROVING;
        }

        changes.push({
          changeId: `CHG_${ticker}_${item.category}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          ticker,
          category: item.category,
          field: item.field,
          name: item.name,
          previousValue: prevVal,
          currentValue: currVal,
          absoluteChange: null,
          percentageChange: null,
          previousAsOf: previousSnapshot.asOf,
          currentAsOf: currentSnapshot.asOf,
          materiality: materiality.level,
          isMaterial: materiality.isMaterial,
          materialityReason: materiality.reason,
          direction,
          evidenceIds: item.evidenceIds
        });
      }
    }
  }

  return changes;
}
