import { VaRMethod, DataClassification } from './riskForecast.types.js';
import { RiskForecastConfig } from './riskForecast.config.js';
import { RiskForecastValidation } from './riskForecast.validation.js';
import { RiskForecastDistributionEngine } from './riskForecast.distribution.engine.js';

/**
 * Phase 31 — Deterministic Value at Risk (VaR) Engine
 */
export class RiskForecastVaREngine {
  /**
   * Calculate Historical Simulation VaR
   */
  static calculateHistoricalVaR(returns, options = {}) {
    if (!RiskForecastValidation.isFiniteArray(returns)) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: 'Invalid or empty return series',
        varPercent: null
      };
    }

    const minObs = options.minObservations || RiskForecastConfig.MIN_OBSERVATIONS.VAR_HISTORICAL;
    if (returns.length < minObs) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: `Insufficient observations for Historical VaR: ${returns.length} < minimum ${minObs}`,
        sampleSize: returns.length,
        varPercent: null
      };
    }

    const confidence = options.confidence || RiskForecastConfig.VAR_ES.DEFAULT_CONFIDENCE;
    const horizonDays = options.horizonDays || 1;
    const portfolioValue = options.portfolioValue || 1.0;

    // Sort returns in ascending order (worst returns / biggest losses first)
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const n = sortedReturns.length;

    // Percentile rank for loss tail
    const alpha = 1.0 - confidence;
    const rank = alpha * (n - 1);
    const lowerIndex = Math.floor(rank);
    const upperIndex = Math.ceil(rank);
    const weight = rank - lowerIndex;

    const interpolatedReturn = (1 - weight) * sortedReturns[lowerIndex] + weight * sortedReturns[upperIndex];
    
    // Loss is negative of return
    const periodLoss = -interpolatedReturn;
    const scaledLoss = periodLoss * Math.sqrt(horizonDays);
    const varPercent = Math.max(0, scaledLoss);
    const varAmount = varPercent * portfolioValue;

    return {
      status: DataClassification.DERIVED,
      method: VaRMethod.HISTORICAL,
      confidence,
      horizonDays,
      sampleSize: n,
      cutoffPercentile: alpha,
      periodReturnAtVaR: interpolatedReturn,
      varPercent,
      varAmount,
      portfolioValue,
      scalingFactor: Math.sqrt(horizonDays),
      assumptions: 'Empirical distribution of historical returns with linear percentile interpolation and square-root-of-time scaling.'
    };
  }

  /**
   * Calculate Parametric (Normal) VaR
   * VaR = z_alpha * sigma_p * sqrt(horizon)
   */
  static calculateParametricVaR({ portfolioVolatility, confidence, horizonDays, portfolioValue, periodsPerYear }) {
    if (typeof portfolioVolatility !== 'number' || isNaN(portfolioVolatility) || portfolioVolatility < 0) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: 'Valid non-negative portfolio volatility is required for Parametric VaR',
        varPercent: null
      };
    }

    const conf = confidence || RiskForecastConfig.VAR_ES.DEFAULT_CONFIDENCE;
    const hDays = horizonDays || 1;
    const pValue = portfolioValue || 1.0;
    const ppy = periodsPerYear || RiskForecastConfig.PERIODS_PER_YEAR.DAILY;

    // Standard normal z-score for confidence level
    const zScore = RiskForecastDistributionEngine.standardNormalQuantile(conf);

    // If portfolioVolatility is annualized, convert to daily
    const dailyVol = portfolioVolatility / Math.sqrt(ppy);
    const horizonVol = dailyVol * Math.sqrt(hDays);
    const varPercent = zScore * horizonVol;
    const varAmount = varPercent * pValue;

    return {
      status: DataClassification.MODEL_ESTIMATE,
      method: VaRMethod.PARAMETRIC,
      confidence: conf,
      zScore,
      horizonDays: hDays,
      portfolioVolatilityAnnualized: portfolioVolatility,
      dailyVolatility: dailyVol,
      horizonVolatility: horizonVol,
      varPercent,
      varAmount,
      portfolioValue: pValue,
      assumptions: 'Assumes portfolio returns follow a Gaussian (normal) distribution. Tagged MODEL_ESTIMATE.'
    };
  }
}
