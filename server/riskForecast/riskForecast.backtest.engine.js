import { DataClassification } from './riskForecast.types.js';
import { RiskForecastConfig } from './riskForecast.config.js';
import { RiskForecastValidation } from './riskForecast.validation.js';

/**
 * Phase 31 — Forecast Backtesting & Realized Risk Evaluation Engine
 */
export class RiskForecastBacktestEngine {
  /**
   * Evaluate Volatility Forecast Accuracy against Realized Volatility
   */
  static evaluateVolatilityForecast({ forecastVolatility, realizedVolatility, sampleSize = null }) {
    if (typeof forecastVolatility !== 'number' || typeof realizedVolatility !== 'number' ||
        isNaN(forecastVolatility) || isNaN(realizedVolatility)) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: 'Forecast and realized volatility must be finite numbers'
      };
    }

    const forecastError = realizedVolatility - forecastVolatility;
    const absoluteError = Math.abs(forecastError);
    const squaredError = Math.pow(forecastError, 2);

    let realizedToForecastRatio = null;
    if (forecastVolatility > 1e-8) {
      realizedToForecastRatio = realizedVolatility / forecastVolatility;
    }

    let percentageError = null;
    if (realizedVolatility > 1e-8) {
      percentageError = (forecastError / realizedVolatility) * 100;
    }

    return {
      status: DataClassification.DERIVED,
      forecastVolatility,
      realizedVolatility,
      forecastError,
      absoluteError,
      squaredError,
      percentageError,
      realizedToForecastRatio,
      sampleSize,
      bias: forecastError > 0 ? 'UNDERESTIMATED_RISK' : forecastError < 0 ? 'OVERESTIMATED_RISK' : 'UNBIASED'
    };
  }

  /**
   * Backtest VaR Model using Kupiec Likelihood Ratio (POF) Test
   */
  static backtestVaRExceptions({ realizedReturns, varThresholdPercent, confidence = 0.95 }) {
    if (!RiskForecastValidation.isFiniteArray(realizedReturns)) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: 'Invalid or empty realized return series'
      };
    }

    const n = realizedReturns.length;
    const minObs = RiskForecastConfig.MIN_OBSERVATIONS.BACKTEST;
    if (n < minObs) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: `Insufficient sample size for VaR backtest: ${n} < minimum ${minObs}`,
        sampleSize: n
      };
    }

    const p = 1.0 - confidence; // Expected exception rate
    // An exception occurs when realized loss (-return) > varThresholdPercent
    let exceptionCount = 0;
    const exceptionIndices = [];

    for (let t = 0; t < n; t++) {
      const loss = -realizedReturns[t];
      if (loss > varThresholdPercent) {
        exceptionCount++;
        exceptionIndices.push(t);
      }
    }

    const empiricalRate = exceptionCount / n;
    const expectedExceptions = p * n;

    // Kupiec Likelihood Ratio Test (LR_uc)
    let kupiecStat = 0;
    if (exceptionCount > 0 && exceptionCount < n) {
      const logL_null = (n - exceptionCount) * Math.log(1 - p) + exceptionCount * Math.log(p);
      const logL_alt = (n - exceptionCount) * Math.log(1 - empiricalRate) + exceptionCount * Math.log(empiricalRate);
      kupiecStat = -2 * (logL_null - logL_alt);
    } else if (exceptionCount === 0) {
      const logL_null = n * Math.log(1 - p);
      const logL_alt = 0;
      kupiecStat = -2 * (logL_null - logL_alt);
    }

    // Critical value for Chi-Square with 1 DF at 95% is 3.841
    const criticalValue95 = 3.841;
    const modelAccepted = kupiecStat < criticalValue95;

    return {
      status: DataClassification.DERIVED,
      sampleSize: n,
      confidence,
      expectedExceptionRate: p,
      expectedExceptions,
      actualExceptions: exceptionCount,
      actualExceptionRate: empiricalRate,
      exceptionIndices,
      kupiecStatistic: kupiecStat,
      criticalValue95,
      modelAccepted,
      trafficLight: exceptionCount <= expectedExceptions * 1.5 ? 'GREEN' :
                    exceptionCount <= expectedExceptions * 2.5 ? 'YELLOW' : 'RED',
      formula: 'Kupiec LR_uc = -2 * ln( (1-p)^(N-x) * p^x / ( (1-x/N)^(N-x) * (x/N)^x ) )'
    };
  }
}
