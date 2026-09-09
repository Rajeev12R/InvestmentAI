import { ScenarioType } from "./portfolioConstruction.types.js";
import { CovarianceEngine } from "./portfolioConstruction.covariance.engine.js";

/**
 * Deterministic Stress Testing Engine for Phase 14
 */
export class StressTestEngine {
  /**
   * Run a suite of standard deterministic stress scenarios on target portfolio.
   */
  static runStressTestSuite(targetWeights, covarianceMatrix, universeSecurities) {
    const tickers = universeSecurities.map(s => s.ticker);
    const weightsArray = tickers.map(t => targetWeights[t] || 0);
    const baseVol = CovarianceEngine.calculatePortfolioVolatility(weightsArray, covarianceMatrix);

    const results = [];

    // Scenario 1: Equity Market Crash -20%
    results.push({
      scenarioId: "STRESS_EQUITY_CRASH_20",
      scenarioName: "Global Equity Market Crash (-20%)",
      type: ScenarioType.HYPOTHETICAL,
      assumedAssetReturnShocks: tickers.reduce((acc, t) => { acc[t] = -0.20; return acc; }, {}),
      portfolioEstimatedDrawdown: -0.20 * weightsArray.reduce((a, b) => a + b, 0),
      portfolioVolatilityImpact: Number((baseVol * 1.5).toFixed(6)),
      classification: "HYPOTHETICAL_MACRO_SHOCK"
    });

    // Scenario 2: Volatility Spike +50%
    const shockedCov = covarianceMatrix.map(row => row.map(v => v * 2.25)); // Vol * 1.5 => Cov * 2.25
    const shockedVol = CovarianceEngine.calculatePortfolioVolatility(weightsArray, shockedCov);
    results.push({
      scenarioId: "STRESS_VOLATILITY_SPIKE_50",
      scenarioName: "Volatility Regime Shift (+50% Implied Vol)",
      type: ScenarioType.MODELLED,
      portfolioBaseVolatility: Number(baseVol.toFixed(6)),
      portfolioStressedVolatility: Number(shockedVol.toFixed(6)),
      volatilityIncreaseBps: Number(((shockedVol - baseVol) * 10000).toFixed(0)),
      classification: "MODELLED_VOLATILITY_SHOCK"
    });

    // Scenario 3: Correlation Breakdown (Off-diagonals converge to 0.85)
    const n = tickers.length;
    const corrBreakdownCov = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      const volI = Math.sqrt(covarianceMatrix[i][i]);
      for (let j = 0; j < n; j++) {
        if (i === j) {
          row.push(covarianceMatrix[i][j]);
        } else {
          const volJ = Math.sqrt(covarianceMatrix[j][j]);
          row.push(0.85 * volI * volJ);
        }
      }
      corrBreakdownCov.push(row);
    }
    const corrBreakdownVol = CovarianceEngine.calculatePortfolioVolatility(weightsArray, corrBreakdownCov);
    results.push({
      scenarioId: "STRESS_CORRELATION_CONVERGENCE",
      scenarioName: "Systemic Liquidity Freeze (Correlations = 0.85)",
      type: ScenarioType.MODELLED,
      portfolioBaseVolatility: Number(baseVol.toFixed(6)),
      portfolioStressedVolatility: Number(corrBreakdownVol.toFixed(6)),
      diversificationLossBps: Number(((corrBreakdownVol - baseVol) * 10000).toFixed(0)),
      classification: "MODELLED_CORRELATION_SHOCK"
    });

    // Scenario 4: Single-Stock Collapse (-40% on largest holding)
    let maxWeightIdx = 0;
    for (let i = 1; i < n; i++) {
      if (weightsArray[i] > weightsArray[maxWeightIdx]) maxWeightIdx = i;
    }
    const maxTicker = tickers[maxWeightIdx];
    const maxWeight = weightsArray[maxWeightIdx];
    results.push({
      scenarioId: "STRESS_CONCENTRATED_HOLDING_CRASH",
      scenarioName: `Concentrated Position Shock (-40% on ${maxTicker})`,
      type: ScenarioType.HYPOTHETICAL,
      shockedTicker: maxTicker,
      holdingWeight: Number(maxWeight.toFixed(4)),
      portfolioLoss: Number((-0.40 * maxWeight).toFixed(6)),
      classification: "HYPOTHETICAL_IDIOSYNCRATIC_SHOCK"
    });

    return {
      stressScenarios: results,
      baselineVolatility: Number(baseVol.toFixed(6))
    };
  }
}
