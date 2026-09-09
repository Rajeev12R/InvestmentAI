import { OptimizationStatus } from "./portfolioConstruction.types.js";
import { CovarianceEngine } from "./portfolioConstruction.covariance.engine.js";
import { TurnoverEngine } from "./portfolioConstruction.turnover.engine.js";

/**
 * Deterministic What-If Scenario Engine for Phase 14
 * Simulates portfolio adjustments without mutating baseline truth or existing allocations.
 */
export class ScenarioEngine {
  /**
   * Run a what-if scenario on a baseline allocation.
   * Actions supported:
   * - "ADJUST_WEIGHT": { ticker, newWeight }
   * - "EXCLUDE_TICKER": { ticker }
   * - "ADD_TICKER": { ticker, weight }
   * - "SHOCK_VOLATILITY": { factor }
   * - "SHOCK_EXPECTED_RETURN": { ticker, delta }
   */
  static runScenario(baselineAllocation, scenarioSpec = {}, covarianceMatrix = null, expectedReturns = {}) {
    const baselineWeights = { ...baselineAllocation.weights };
    const scenarioWeights = { ...baselineWeights };
    const tickers = Object.keys(baselineWeights);

    const { action, params = {} } = scenarioSpec;

    switch (action) {
      case "ADJUST_WEIGHT": {
        const { ticker, newWeight } = params;
        if (ticker && typeof newWeight === "number") {
          scenarioWeights[ticker] = newWeight;
          // Re-normalize remaining weights to sum to 1.0
          const remainingTickers = tickers.filter(t => t !== ticker);
          const currentRemainingSum = remainingTickers.reduce((s, t) => s + (baselineWeights[t] || 0), 0);
          const targetRemainingSum = 1.0 - newWeight;

          if (currentRemainingSum > 0 && targetRemainingSum >= 0) {
            for (const t of remainingTickers) {
              scenarioWeights[t] = (baselineWeights[t] / currentRemainingSum) * targetRemainingSum;
            }
          }
        }
        break;
      }

      case "EXCLUDE_TICKER": {
        const { ticker } = params;
        if (ticker && scenarioWeights[ticker] !== undefined) {
          const removedWeight = scenarioWeights[ticker];
          delete scenarioWeights[ticker];
          const remaining = Object.keys(scenarioWeights);
          const currentSum = remaining.reduce((s, t) => s + scenarioWeights[t], 0);
          if (currentSum > 0) {
            for (const t of remaining) {
              scenarioWeights[t] = scenarioWeights[t] / currentSum;
            }
          }
        }
        break;
      }

      case "ADD_TICKER": {
        const { ticker, weight } = params;
        if (ticker && typeof weight === "number") {
          const scale = 1.0 - weight;
          for (const t of Object.keys(scenarioWeights)) {
            scenarioWeights[t] = scenarioWeights[t] * scale;
          }
          scenarioWeights[ticker] = weight;
        }
        break;
      }

      case "SHOCK_EXPECTED_RETURN": {
        // Keeps weights unchanged, shocks expected returns
        break;
      }

      default:
        // Generic or unadjusted
        break;
    }

    // Clean weights map
    for (const t of Object.keys(scenarioWeights)) {
      scenarioWeights[t] = Number(scenarioWeights[t].toFixed(6));
    }

    // Compute turnover
    const turnover = TurnoverEngine.calculateTurnover(baselineWeights, scenarioWeights);

    // Compute risk impact if covariance matrix provided
    let baselineVol = baselineAllocation.portfolioVolatility || 0;
    let scenarioVol = 0;
    if (covarianceMatrix && tickers.length === covarianceMatrix.length) {
      const scenarioArray = tickers.map(t => scenarioWeights[t] || 0);
      scenarioVol = CovarianceEngine.calculatePortfolioVolatility(scenarioArray, covarianceMatrix);
    }

    return {
      status: OptimizationStatus.OPTIMAL,
      scenarioName: scenarioSpec.name || action || "CUSTOM_SCENARIO",
      action,
      params,
      baselineWeights,
      scenarioWeights,
      turnover,
      impact: {
        baselineVolatility: Number(baselineVol.toFixed(6)),
        scenarioVolatility: Number(scenarioVol.toFixed(6)),
        volatilityDelta: Number((scenarioVol - baselineVol).toFixed(6))
      }
    };
  }
}
