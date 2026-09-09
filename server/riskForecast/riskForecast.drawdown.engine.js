import { DataClassification } from './riskForecast.types.js';
import { RiskForecastValidation } from './riskForecast.validation.js';

/**
 * Phase 31 — Deterministic Drawdown & Tail Risk Engine
 */
export class RiskForecastDrawdownEngine {
  /**
   * Calculate Historical Maximum Drawdown and Underwater Curve
   */
  static calculateHistoricalDrawdown(returns, initialNAV = 100.0) {
    if (!RiskForecastValidation.isFiniteArray(returns)) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: 'Invalid or empty return series',
        maxDrawdown: null
      };
    }

    let nav = initialNAV;
    let peak = initialNAV;
    let maxDD = 0;
    let peakIndex = 0;
    let troughIndex = 0;

    const navSeries = [nav];
    const underwaterCurve = [0];

    for (let t = 0; t < returns.length; t++) {
      nav = nav * (1 + returns[t]);
      navSeries.push(nav);

      if (nav > peak) {
        peak = nav;
        peakIndex = t + 1;
      }

      const currentDD = (peak - nav) / peak;
      underwaterCurve.push(currentDD);

      if (currentDD > maxDD) {
        maxDD = currentDD;
        troughIndex = t + 1;
      }
    }

    return {
      status: DataClassification.DERIVED,
      maxDrawdown: maxDD,
      maxDrawdownPercent: maxDD * 100,
      peakIndex,
      troughIndex,
      currentDrawdown: underwaterCurve[underwaterCurve.length - 1],
      finalNAV: nav,
      sampleSize: returns.length,
      underwaterCurve
    };
  }

  /**
   * Estimate Forward Expected Maximum Drawdown over horizon (Magdon-Ismail / Atiya model)
   * Strictly classified as SIMPLIFIED_BROWNIAN_DRAWDOWN_MODEL_ESTIMATE
   */
  static estimateForwardDrawdown({ annualizedVolatility, horizonDays = 20, periodsPerYear = 252 }) {
    if (typeof annualizedVolatility !== 'number' || isNaN(annualizedVolatility) || !isFinite(annualizedVolatility) || annualizedVolatility <= 0) {
      return {
        status: DataClassification.UNAVAILABLE,
        classification: DataClassification.UNAVAILABLE,
        model: 'SIMPLIFIED_BROWNIAN_DRAWDOWN_MODEL_ESTIMATE',
        error: 'Valid positive annualized volatility is required for forward drawdown estimation'
      };
    }

    const T = horizonDays / periodsPerYear;
    // Expected maximum drawdown constant for zero-drift Brownian motion: gamma = sqrt(pi / 2) ~= 1.253314
    const gamma = Math.sqrt(Math.PI / 2.0); // 1.2533141373155001
    const expectedMDD = gamma * annualizedVolatility * Math.sqrt(T);

    return {
      status: DataClassification.MODEL_ESTIMATE,
      classification: DataClassification.MODEL_ESTIMATE,
      horizonDays,
      timeHorizonYears: T,
      annualizedVolatility,
      expectedMaxDrawdown: expectedMDD,
      expectedMaxDrawdownPercent: expectedMDD * 100,
      model: 'SIMPLIFIED_BROWNIAN_DRAWDOWN_MODEL_ESTIMATE',
      process: 'Zero-Drift Geometric Brownian Motion',
      drift: 0.0,
      scalingConstantGamma: gamma,
      scalingConstantDerivation: 'gamma = sqrt(pi / 2) ~= 1.253314',
      observationTreatment: 'Continuous Monitoring (Theoretical lower bound for discrete paths)',
      assumptions: 'Theoretical expected maximum drawdown under continuous zero-drift geometric Brownian motion. Strictly MODEL_ESTIMATE.',
      limitations: 'Drawdown is strictly path-dependent. Real market returns exhibit negative skewness, kurtosis, and correlation breakdowns that can cause realized drawdown to diverge materially from Brownian diffusion.'
    };
  }
}
