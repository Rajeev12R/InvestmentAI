import { CompliancePrecedence, DataClassification } from './riskForecast.types.js';
import { RiskForecastConfig } from './riskForecast.config.js';
import { RiskForecastSchema } from './riskForecast.schema.js';
import { RiskForecastDistributionEngine } from './riskForecast.distribution.engine.js';

/**
 * Phase 31 — Institutional Risk Limits & Breach Probability Engine
 */
export class RiskForecastLimitEngine {
  /**
   * Numeric rank for compliance precedence (1 = highest / strictest)
   */
  static getPrecedenceRank(precedence) {
    switch (precedence) {
      case CompliancePrecedence.REGULATORY: return 1;
      case CompliancePrecedence.FIRM: return 2;
      case CompliancePrecedence.PORTFOLIO: return 3;
      case CompliancePrecedence.STRATEGY: return 4;
      case CompliancePrecedence.SOFT: return 5;
      default: return 99;
    }
  }

  /**
   * Evaluate Risk Limits with Phase 16 Precedence Ordering
   */
  static evaluateLimits({ limits, riskValues }) {
    if (!Array.isArray(limits)) {
      throw new Error('limits must be an array');
    }

    const evaluations = [];
    let breachCount = 0;

    for (const lim of limits) {
      RiskForecastSchema.validateRiskLimit(lim);
      const observedVal = riskValues[lim.metric];
      const isObserved = typeof observedVal === 'number' && !isNaN(observedVal) && isFinite(observedVal);

      let isBreached = false;
      let breachAmount = 0;
      let status = DataClassification.UNAVAILABLE;

      if (isObserved) {
        status = DataClassification.DERIVED;
        if (observedVal > lim.threshold) {
          isBreached = true;
          breachAmount = observedVal - lim.threshold;
          breachCount++;
        }
      }

      evaluations.push({
        limitId: lim.limitId,
        metric: lim.metric,
        threshold: lim.threshold,
        observedValue: isObserved ? observedVal : null,
        precedence: lim.precedence,
        precedenceRank: RiskForecastLimitEngine.getPrecedenceRank(lim.precedence),
        isBreached,
        breachAmount: isBreached ? breachAmount : 0,
        status,
        authority: lim.authority || 'CHIEF_RISK_OFFICER'
      });
    }

    // Sort evaluations by precedence rank ascending (REGULATORY first), then breach amount descending
    evaluations.sort((a, b) => {
      if (a.precedenceRank !== b.precedenceRank) {
        return a.precedenceRank - b.precedenceRank;
      }
      return (b.breachAmount || 0) - (a.breachAmount || 0);
    });

    return {
      status: DataClassification.DERIVED,
      limitCount: limits.length,
      breachCount,
      hasBreaches: breachCount > 0,
      highestPrecedenceBreach: evaluations.find(e => e.isBreached)?.precedence || null,
      evaluations
    };
  }

  /**
   * Calculate Mathematical Breach Probability
   * Adheres to strict metric-specific distribution modeling
   */
  static calculateBreachProbability({
    metricType = 'PORTFOLIO_LOSS',
    metric = null,
    currentValue = 0,
    expectedReturn = 0,
    threshold,
    forecastVolatility,
    horizonDays = 20,
    sampleSize = 100,
    direction = 'GREATER_THAN',
    modelVersion = RiskForecastConfig.VERSION
  }) {
    const effectiveMetric = (metricType || metric || 'PORTFOLIO_LOSS').toUpperCase();

    // Reject unsupported distributions (e.g. DRAWDOWN, UTILIZATION, ARBITRARY METRICS)
    const supportedMetrics = ['PORTFOLIO_LOSS', 'RETURN_THRESHOLD', 'PORTFOLIO_VOLATILITY'];
    if (!supportedMetrics.includes(effectiveMetric)) {
      return {
        metricType: effectiveMetric,
        threshold,
        direction,
        classification: DataClassification.UNAVAILABLE,
        distributionModel: 'NONE',
        error: `Breach probability calculation is UNAVAILABLE for metric type '${effectiveMetric}'. Gaussian tail cannot be assumed for path-dependent or bounded metrics.`,
        breachProbability: null
      };
    }

    if (typeof threshold !== 'number' || isNaN(threshold) || !isFinite(threshold) ||
        typeof forecastVolatility !== 'number' || isNaN(forecastVolatility) || forecastVolatility <= 0) {
      return {
        metricType: effectiveMetric,
        threshold,
        direction,
        classification: DataClassification.UNAVAILABLE,
        distributionModel: 'NONE',
        error: 'Valid numeric threshold and positive forecast volatility are required',
        breachProbability: null
      };
    }

    if (sampleSize < RiskForecastConfig.MIN_OBSERVATIONS.VOLATILITY) {
      return {
        metricType: effectiveMetric,
        threshold,
        direction,
        classification: DataClassification.UNAVAILABLE,
        distributionModel: 'NONE',
        error: `Insufficient sample size (${sampleSize} < minimum ${RiskForecastConfig.MIN_OBSERVATIONS.VOLATILITY})`,
        breachProbability: null
      };
    }

    const horizonYears = horizonDays / 252.0;
    const horizonVol = forecastVolatility * Math.sqrt(horizonYears);

    let zScore = 0;
    let breachProb = 0;
    let distributionModel = 'NORMAL';
    let distributionParameters = {};
    let assumptions = '';

    if (effectiveMetric === 'PORTFOLIO_LOSS') {
      // P(Loss > threshold) where Return = -Loss ~ N(mu_h, sigma_h^2)
      // Loss = -Return. Loss > threshold <=> Return < -threshold
      const mu_h = expectedReturn * horizonYears;
      const sigma_h = horizonVol;
      zScore = (-threshold - mu_h) / sigma_h; // P(R < -threshold) = Phi(zScore)
      breachProb = RiskForecastDistributionEngine.standardNormalCDF(zScore);
      distributionParameters = { mean: mu_h, standardDeviation: sigma_h, horizonYears };
      assumptions = 'Assumes portfolio returns over the horizon follow a continuous Gaussian normal distribution with independent increments.';
    } else if (effectiveMetric === 'RETURN_THRESHOLD') {
      // P(Return < threshold)
      const mu_h = expectedReturn * horizonYears;
      const sigma_h = horizonVol;
      zScore = (threshold - mu_h) / sigma_h;
      breachProb = direction === 'LESS_THAN'
        ? RiskForecastDistributionEngine.standardNormalCDF(zScore)
        : 1.0 - RiskForecastDistributionEngine.standardNormalCDF(zScore);
      distributionParameters = { mean: mu_h, standardDeviation: sigma_h, horizonYears };
      assumptions = 'Assumes portfolio returns follow a continuous normal distribution.';
    } else if (effectiveMetric === 'PORTFOLIO_VOLATILITY') {
      // P(estimated sigma > threshold) using asymptotic normal variance estimator error SE = sigma / sqrt(2N)
      const se = forecastVolatility / Math.sqrt(2 * sampleSize);
      zScore = (threshold - (currentValue || forecastVolatility)) / Math.max(1e-8, se);
      breachProb = 1.0 - RiskForecastDistributionEngine.standardNormalCDF(zScore);
      distributionParameters = { pointEstimate: forecastVolatility, standardError: se, sampleSize };
      assumptions = 'Assumes sample volatility estimation error follows an asymptotic normal distribution under i.i.d. returns.';
    }

    const clampedProb = Math.max(0.0, Math.min(1.0, breachProb));

    return {
      metricType: effectiveMetric,
      threshold,
      direction,
      distributionModel,
      distributionParameters,
      confidence: 0.95,
      horizon: `${horizonDays}D`,
      horizonDays,
      sampleSize,
      zScore,
      breachProbability: clampedProb,
      breachProbabilityPercent: clampedProb * 100,
      classification: DataClassification.MODEL_ESTIMATE,
      assumptions,
      modelVersion
    };
  }
}
