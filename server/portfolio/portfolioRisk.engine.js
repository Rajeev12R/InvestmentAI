import { calculateConcentration } from './concentration.engine.js';
import { buildCorrelationMatrix } from './correlation.engine.js';
import { evaluateDiversification } from './diversification.engine.js';
import { calculateTargetWeights } from './positionSizing.engine.js';

/**
 * Builds the comprehensive deterministic portfolio analytics payload.
 *
 * @param {Object} params
 * @param {Array<Object>} params.positions - Portfolio positions
 * @param {Object<string, Array<number>>} [params.returnsMap] - Optional returns series for correlations
 * @param {Object} [params.sizingOptions] - Sizing model parameters
 * @returns {Object} Comprehensive portfolio analytics
 */
export function buildPortfolioAnalytics({
  positions = [],
  returnsMap = {},
  sizingOptions = {}
} = {}) {
  // 1. Concentration
  const concentration = calculateConcentration(positions);

  if (concentration.status !== 'COMPLETE') {
    return {
      status: concentration.status,
      reason: concentration.reason || 'Insufficient portfolio positions',
      concentration,
      correlation: { status: 'UNAVAILABLE', matrix: {} },
      diversification: { status: 'UNAVAILABLE', diversificationLevel: 'UNKNOWN' },
      sizing: { status: 'UNAVAILABLE', targets: [] },
      summary: {
        totalValue: 0,
        positionCount: 0,
        diversificationLevel: 'UNKNOWN',
        hhi: null,
        topHoldingWeight: null
      }
    };
  }

  // 2. Correlation
  const correlation = buildCorrelationMatrix(returnsMap);

  // 3. Diversification
  const diversification = evaluateDiversification(concentration, correlation);

  // 4. Target Sizing
  const sizing = calculateTargetWeights(positions, sizingOptions);

  return {
    status: 'COMPLETE',
    summary: {
      totalValue: concentration.totalPortfolioValue,
      positionCount: concentration.positionCount,
      diversificationLevel: diversification.diversificationLevel,
      diversificationScore: diversification.diversificationScore,
      hhi: concentration.hhi,
      topHoldingWeight: concentration.topHoldings.top1,
      topSector: concentration.sectorConcentration.topSector,
      topSectorWeight: concentration.sectorConcentration.topSectorWeight,
      warnings: concentration.warnings
    },
    concentration,
    correlation,
    diversification,
    sizing
  };
}
