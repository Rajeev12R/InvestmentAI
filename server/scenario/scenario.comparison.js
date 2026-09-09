/**
 * server/scenario/scenario.comparison.js
 * 
 * Phase 19: Scenario Comparison & Differential Intelligence
 * Performs side-by-side comparison and delta divergence analysis between multiple hypothetical scenarios.
 */

import { ValueStatus } from './scenario.types.js';
import { aggregatePortfolioScenario } from './scenario.aggregation.js';
import { calculateDelta } from './scenario.transform.js';

/**
 * Compares two or more scenario results on the same portfolio.
 */
export function compareScenarios(portfolio, scenarioDefs, options = {}) {
  if (!portfolio || typeof portfolio !== 'object') {
    throw new TypeError('portfolio must be a valid object');
  }
  if (!Array.isArray(scenarioDefs) || scenarioDefs.length < 2) {
    throw new Error('scenarioDefs must be an array containing at least 2 scenario definitions for comparison');
  }

  const scenarioResults = scenarioDefs.map(def => aggregatePortfolioScenario(portfolio, def, options));

  // Base summary comparisons
  const summaryComparison = scenarioResults.map(res => ({
    scenarioId: res.scenarioId,
    scenarioName: res.scenarioName,
    scenarioType: res.scenarioType,
    baselineNav: res.baseline.nav,
    stressedNav: res.stressed.nav,
    pnlDollar: res.deltas.pnlDollar,
    pnlPercent: res.deltas.pnlPercent
  }));

  // Position-by-position cross-scenario matrix
  const positionMatrix = [];
  const primaryPositions = scenarioResults[0].positions;

  for (let i = 0; i < primaryPositions.length; i++) {
    const ticker = primaryPositions[i].ticker;
    const posRow = {
      ticker,
      baselineValue: primaryPositions[i].baseline.marketValue,
      scenarios: {}
    };

    scenarioResults.forEach(res => {
      const p = res.positions.find(pos => pos.ticker === ticker);
      if (p) {
        posRow.scenarios[res.scenarioId] = {
          stressedValue: p.stressed.marketValue,
          pnlDollar: p.deltas.pnlDollar,
          pnlPercent: p.deltas.pnlPercent,
          weight: p.stressed.weight
        };
      }
    });

    positionMatrix.push(posRow);
  }

  // Pairwise pairwise spreads between first scenario (Scenario A) and subsequent scenarios
  const baseScenario = scenarioResults[0];
  const pairwiseSpreads = [];

  for (let i = 1; i < scenarioResults.length; i++) {
    const compScenario = scenarioResults[i];
    pairwiseSpreads.push({
      scenarioA: baseScenario.scenarioId,
      scenarioB: compScenario.scenarioId,
      navSpreadDollar: compScenario.stressed.nav - baseScenario.stressed.nav,
      pnlSpreadPercent: compScenario.deltas.pnlPercent - baseScenario.deltas.pnlPercent,
      moreSevere: compScenario.deltas.pnlDollar < baseScenario.deltas.pnlDollar ? compScenario.scenarioId : baseScenario.scenarioId
    });
  }

  return {
    portfolioId: portfolio.id || 'PORTFOLIO_UNKNOWN',
    scenarioCount: scenarioResults.length,
    scenarios: summaryComparison,
    pairwiseSpreads,
    positionMatrix,
    status: ValueStatus.SCENARIO_OUTPUT
  };
}
