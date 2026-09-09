import { VolatilityModel, DataClassification } from './riskForecast.types.js';
import { RiskForecastConfig } from './riskForecast.config.js';
import { RiskForecastValidation } from './riskForecast.validation.js';

/**
 * Phase 31 — Deterministic Volatility Forecasting Engine
 */
export class RiskForecastVolatilityEngine {
  /**
   * Calculate Historical Sample Volatility
   * sigma = sqrt( sum(r_i - mean_r)^2 / (N - 1) )
   */
  static calculateHistoricalVolatility(returns, options = {}) {
    if (!RiskForecastValidation.isFiniteArray(returns)) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: 'Invalid or non-finite return series',
        volatility: null,
        annualizedVolatility: null
      };
    }

    const minObs = options.minObservations || RiskForecastConfig.MIN_OBSERVATIONS.VOLATILITY;
    if (returns.length < minObs) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: `Insufficient observations: ${returns.length} < minimum ${minObs}`,
        volatility: null,
        annualizedVolatility: null,
        sampleSize: returns.length
      };
    }

    const n = returns.length;
    const mean = returns.reduce((sum, r) => sum + r, 0) / n;
    const sumSqDiff = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0);
    const sampleVariance = sumSqDiff / (n - 1);
    const periodVol = Math.sqrt(Math.max(0, sampleVariance));

    const periodsPerYear = options.periodsPerYear || RiskForecastConfig.PERIODS_PER_YEAR.DAILY;
    const annualizedVol = periodVol * Math.sqrt(periodsPerYear);

    return {
      status: DataClassification.DERIVED,
      model: VolatilityModel.HISTORICAL,
      meanReturn: mean,
      variance: sampleVariance,
      periodVolatility: periodVol,
      annualizedVolatility: annualizedVol,
      annualizationFactor: Math.sqrt(periodsPerYear),
      periodsPerYear,
      sampleSize: n,
      formula: 'sigma = sqrt( sum(r_i - mean)^2 / (N - 1) ) * sqrt(periods_per_year)'
    };
  }

  /**
   * Calculate EWMA Volatility
   * sigma^2_t = lambda * sigma^2_{t-1} + (1 - lambda) * r^2_t
   */
  static calculateEWMAVolatility(returns, options = {}) {
    if (!RiskForecastValidation.isFiniteArray(returns)) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: 'Invalid or non-finite return series',
        volatility: null,
        annualizedVolatility: null
      };
    }

    const minObs = options.minObservations || RiskForecastConfig.MIN_OBSERVATIONS.VOLATILITY;
    if (returns.length < minObs) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: `Insufficient observations for EWMA: ${returns.length} < minimum ${minObs}`,
        volatility: null,
        annualizedVolatility: null,
        sampleSize: returns.length
      };
    }

    const lambda = typeof options.lambda === 'number' && options.lambda >= RiskForecastConfig.EWMA.MIN_LAMBDA && options.lambda <= RiskForecastConfig.EWMA.MAX_LAMBDA
      ? options.lambda
      : RiskForecastConfig.EWMA.DEFAULT_LAMBDA;

    const n = returns.length;
    
    // Initial variance estimate from first min(10, n) observations or first return squared
    const initWindow = Math.min(10, n);
    const initReturns = returns.slice(0, initWindow);
    const initMean = initReturns.reduce((s, r) => s + r, 0) / initWindow;
    let currentVariance = initReturns.reduce((s, r) => s + Math.pow(r - initMean, 2), 0) / Math.max(1, initWindow - 1);
    if (currentVariance <= 0) {
      currentVariance = Math.pow(returns[0], 2) || 1e-6;
    }

    const varianceHistory = [currentVariance];

    for (let t = initWindow; t < n; t++) {
      const r_t = returns[t];
      currentVariance = lambda * currentVariance + (1 - lambda) * Math.pow(r_t, 2);
      varianceHistory.push(currentVariance);
    }

    const periodVol = Math.sqrt(Math.max(0, currentVariance));
    const periodsPerYear = options.periodsPerYear || RiskForecastConfig.PERIODS_PER_YEAR.DAILY;
    const annualizedVol = periodVol * Math.sqrt(periodsPerYear);

    return {
      status: DataClassification.MODEL_ESTIMATE,
      model: VolatilityModel.EWMA,
      lambda,
      finalVariance: currentVariance,
      periodVolatility: periodVol,
      annualizedVolatility: annualizedVol,
      annualizationFactor: Math.sqrt(periodsPerYear),
      periodsPerYear,
      sampleSize: n,
      formula: 'sigma^2_t = lambda * sigma^2_{t-1} + (1 - lambda) * r^2_t'
    };
  }

  /**
   * Forecast volatility across multiple horizons (1D, 5D, 20D, 60D, 252D)
   */
  static forecastVolatilityByHorizon(returns, options = {}) {
    const baseResult = options.model === VolatilityModel.EWMA
      ? RiskForecastVolatilityEngine.calculateEWMAVolatility(returns, options)
      : RiskForecastVolatilityEngine.calculateHistoricalVolatility(returns, options);

    if (baseResult.status === DataClassification.UNAVAILABLE) {
      return baseResult;
    }

    const dailyVol = baseResult.periodVolatility;
    const horizonForecasts = {
      '1D': { days: 1, volatility: dailyVol * Math.sqrt(1), annualized: baseResult.annualizedVolatility },
      '5D': { days: 5, volatility: dailyVol * Math.sqrt(5), annualized: baseResult.annualizedVolatility },
      '20D': { days: 20, volatility: dailyVol * Math.sqrt(20), annualized: baseResult.annualizedVolatility },
      '60D': { days: 60, volatility: dailyVol * Math.sqrt(60), annualized: baseResult.annualizedVolatility },
      '252D': { days: 252, volatility: dailyVol * Math.sqrt(252), annualized: baseResult.annualizedVolatility }
    };

    return {
      ...baseResult,
      classification: DataClassification.FORECAST,
      horizonForecasts
    };
  }
}
