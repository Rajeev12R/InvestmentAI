import { DataClassification } from './riskForecast.types.js';
import { RiskForecastConfig } from './riskForecast.config.js';
import { RiskForecastDistributionEngine } from './riskForecast.distribution.engine.js';

/**
 * Phase 31 — Forecast Uncertainty & Confidence Bands Engine
 */
export class RiskForecastUncertaintyEngine {
  /**
   * Calculate Analytical Confidence Interval for Volatility Forecast
   */
  static calculateVolatilityUncertainty({ forecastVolatility, sampleSize, confidence = 0.95 }) {
    if (typeof forecastVolatility !== 'number' || isNaN(forecastVolatility) || forecastVolatility <= 0) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: 'Forecast volatility must be a positive finite number'
      };
    }

    const minObs = RiskForecastConfig.MIN_OBSERVATIONS.VOLATILITY;
    if (typeof sampleSize !== 'number' || sampleSize < minObs) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: `Sample size ${sampleSize} is insufficient for asymptotic uncertainty bands (minimum ${minObs})`
      };
    }

    // Asymptotic standard error of sample standard deviation: SE = sigma / sqrt(2 * N)
    const se = forecastVolatility / Math.sqrt(2 * sampleSize);

    // Two-tailed critical z-score
    const p = 1.0 - (1.0 - confidence) / 2.0;
    const z = RiskForecastDistributionEngine.standardNormalQuantile(p);

    const lowerBound = Math.max(0, forecastVolatility - z * se);
    const upperBound = forecastVolatility + z * se;

    return {
      status: DataClassification.MODEL_ESTIMATE,
      forecastVolatility,
      sampleSize,
      confidence,
      zScore: z,
      standardError: se,
      relativeStandardError: se / forecastVolatility,
      lowerBound,
      upperBound,
      bandWidth: upperBound - lowerBound,
      model: 'Asymptotic Gaussian Variance Estimator SE = sigma / sqrt(2N)',
      assumptions: 'Assumes i.i.d. returns and asymptotic normality of the sample variance estimator. Tagged MODEL_ESTIMATE.'
    };
  }
}
