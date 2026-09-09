import { DataClassification } from './riskForecast.types.js';
import { RiskForecastConfig } from './riskForecast.config.js';
import { RiskForecastValidation } from './riskForecast.validation.js';

/**
 * Phase 31 — Expected Shortfall (CVaR) Engine
 */
export class RiskForecastExpectedShortfallEngine {
  /**
   * Calculate Historical Simulation Expected Shortfall (Conditional Value at Risk)
   */
  static calculateHistoricalExpectedShortfall(returns, options = {}) {
    if (!RiskForecastValidation.isFiniteArray(returns)) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: 'Invalid or empty return series',
        expectedShortfallPercent: null
      };
    }

    const minObs = options.minObservations || RiskForecastConfig.MIN_OBSERVATIONS.ES_HISTORICAL;
    if (returns.length < minObs) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: `Insufficient observations for Expected Shortfall: ${returns.length} < minimum ${minObs}`,
        sampleSize: returns.length,
        expectedShortfallPercent: null
      };
    }

    const confidence = options.confidence || RiskForecastConfig.VAR_ES.DEFAULT_CONFIDENCE;
    const horizonDays = options.horizonDays || 1;
    const portfolioValue = options.portfolioValue || 1.0;

    // Sort ascending (worst returns first)
    const sorted = [...returns].sort((a, b) => a - b);
    const n = sorted.length;
    const alpha = 1.0 - confidence;
    const tailCountFloat = alpha * n;
    const tailCount = Math.max(1, Math.floor(tailCountFloat));

    // Tail losses are -return for returns in the alpha tail
    const tailReturns = sorted.slice(0, tailCount);
    const tailLosses = tailReturns.map(r => -r);
    const averageTailLoss = tailLosses.reduce((s, l) => s + l, 0) / tailCount;

    const scaledES = averageTailLoss * Math.sqrt(horizonDays);
    const esPercent = Math.max(0, scaledES);
    const esAmount = esPercent * portfolioValue;

    return {
      status: DataClassification.DERIVED,
      confidence,
      horizonDays,
      sampleSize: n,
      tailObservationCount: tailCount,
      tailLosses,
      averageTailLoss,
      expectedShortfallPercent: esPercent,
      expectedShortfallAmount: esAmount,
      portfolioValue,
      scalingFactor: Math.sqrt(horizonDays),
      formula: 'ES_alpha = mean(losses in worst (1 - alpha) quantile) * sqrt(horizon_days)'
    };
  }
}
