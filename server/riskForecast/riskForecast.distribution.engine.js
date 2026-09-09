import { DataClassification } from './riskForecast.types.js';
import { RiskForecastValidation } from './riskForecast.validation.js';

/**
 * Phase 31 — Distribution Analysis & Statistical Functions
 */
export class RiskForecastDistributionEngine {
  /**
   * Rational approximation of the Standard Normal Cumulative Distribution Function (Phi)
   */
  static standardNormalCDF(x) {
    if (isNaN(x)) return NaN;
    if (x < -8.0) return 0.0;
    if (x > 8.0) return 1.0;

    // Abramowitz and Stegun approximation (Formula 7.1.26)
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x) / Math.sqrt(2.0);
    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * High-precision Inverse Standard Normal Quantile (z-score for given probability alpha)
   * Using Beasley-Springer-Moro / Acklam approximation
   */
  static standardNormalQuantile(p) {
    if (p <= 0 || p >= 1) {
      throw new Error(`Probability p must be strictly in (0, 1), received ${p}`);
    }

    // Rational approximation for central region
    const a = [
      -3.969683028665376e+01,
      2.209460984245205e+02,
      -2.759285104469687e+02,
      1.383577518672690e+02,
      -3.066479806614716e+01,
      2.506628277459239e+00
    ];

    const b = [
      -5.447609879822406e+01,
      1.615858368580409e+02,
      -1.556989798598866e+02,
      6.680131188771972e+01,
      -1.328068155288572e+01
    ];

    const c = [
      -7.784894002430293e-03,
      -3.223964580411365e-01,
      -2.400758277161838e+00,
      -2.549732539343734e+00,
      4.374664141464968e+00,
      2.938163982698783e+00
    ];

    const d = [
      7.784695709041462e-03,
      3.224671290700398e-01,
      2.445134137142996e+00,
      3.754408661907416e+00
    ];

    const p_low = 0.02425;
    const p_high = 1 - p_low;

    if (p < p_low) {
      // Lower tail
      const q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
             ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= p_high) {
      // Central region
      const q = p - 0.5;
      const r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
             (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      // Upper tail
      const q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
              ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
  }

  /**
   * Analyze empirical distribution statistics for returns
   */
  static analyzeDistribution(returns) {
    if (!RiskForecastValidation.isFiniteArray(returns)) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: 'Invalid return array for distribution analysis'
      };
    }

    const n = returns.length;
    if (n < 4) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: `Sample size ${n} too small for higher moment calculations (minimum 4)`
      };
    }

    const mean = returns.reduce((s, r) => s + r, 0) / n;
    const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);

    if (stdDev <= 1e-12) {
      return {
        status: DataClassification.DERIVED,
        sampleSize: n,
        mean,
        variance: 0,
        standardDeviation: 0,
        skewness: 0,
        kurtosis: 0,
        excessKurtosis: 0,
        isNormal: false,
        jarqueBera: { statistic: 0, isNormal: false }
      };
    }

    // Skewness: m3 / (s^3)
    const m3 = returns.reduce((s, r) => s + Math.pow((r - mean) / stdDev, 3), 0) / n;
    // Kurtosis: m4 / (s^4)
    const m4 = returns.reduce((s, r) => s + Math.pow((r - mean) / stdDev, 4), 0) / n;
    const excessKurtosis = m4 - 3.0;

    // Jarque-Bera statistic: JB = (N/6) * (S^2 + (K^2)/4)
    const jbStat = (n / 6.0) * (Math.pow(m3, 2) + Math.pow(excessKurtosis, 2) / 4.0);
    // Critical value at 95% confidence for Chi-Square(2) is ~ 5.991
    const isNormal = jbStat < 5.991;

    return {
      status: DataClassification.DERIVED,
      sampleSize: n,
      mean,
      variance,
      standardDeviation: stdDev,
      skewness: m3,
      kurtosis: m4,
      excessKurtosis,
      jarqueBera: {
        statistic: jbStat,
        criticalValue95: 5.991,
        isNormal
      }
    };
  }
}
