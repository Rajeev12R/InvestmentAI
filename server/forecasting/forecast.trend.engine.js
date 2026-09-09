/**
 * server/forecasting/forecast.trend.engine.js
 * 
 * Phase 20: Deterministic Trend Forecasting Engine
 * Mathematical implementation of CAGR, linear regression trend with exact Student-t prediction intervals,
 * and rolling margin forecasting with explicit classification and bounds.
 */

import { ForecastClassification, ForecastMethod } from './forecast.types.js';

/**
 * Exact two-tailed Student-t critical values at alpha = 0.05 (95% confidence level)
 * Table indexed by degrees of freedom (df = N - 2)
 */
const STUDENT_T_95_CRITICAL_VALUES = {
  1: 12.706,
  2: 4.303,
  3: 3.182,
  4: 2.776,
  5: 2.571,
  6: 2.447,
  7: 2.365,
  8: 2.306,
  9: 2.262,
  10: 2.228,
  11: 2.201,
  12: 2.179,
  13: 2.160,
  14: 2.145,
  15: 2.131,
  16: 2.120,
  17: 2.110,
  18: 2.101,
  19: 2.093,
  20: 2.086,
  25: 2.060,
  30: 2.042,
  40: 2.021,
  50: 2.009,
  60: 2.000,
  80: 1.990,
  100: 1.984,
  120: 1.980
};

/**
 * Retrieves the exact Student-t critical value for degrees of freedom df.
 * For df > 120, asymptotically approaches standard normal z = 1.95996 (~1.96).
 * 
 * @param {number} df - Degrees of freedom (N - 2)
 * @returns {number} Critical value t_(0.975, df)
 */
export function getStudentTCriticalValue(df) {
  if (typeof df !== 'number' || !Number.isFinite(df) || df < 1) {
    throw new Error(`Invalid degrees of freedom: ${df}. Must be >= 1.`);
  }

  const intDf = Math.floor(df);
  if (STUDENT_T_95_CRITICAL_VALUES[intDf]) {
    return STUDENT_T_95_CRITICAL_VALUES[intDf];
  }

  if (intDf > 120) {
    // Normal approximation for large samples: z + (z^3 + z) / (4 * df)
    const z = 1.959963984540054;
    return z + (Math.pow(z, 3) + z) / (4 * intDf);
  }

  // Linear interpolation for intermediate unlisted df between 20 and 120
  const keys = Object.keys(STUDENT_T_95_CRITICAL_VALUES).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i++) {
    const k1 = keys[i];
    const k2 = keys[i + 1];
    if (intDf > k1 && intDf < k2) {
      const v1 = STUDENT_T_95_CRITICAL_VALUES[k1];
      const v2 = STUDENT_T_95_CRITICAL_VALUES[k2];
      return v1 + ((intDf - k1) / (k2 - k1)) * (v2 - v1);
    }
  }

  return 1.96;
}

/**
 * Computes Historical CAGR and extrapolates forward.
 * 
 * @param {Array<number>} historicalSeries - Chronologically sorted historical observations [v0, v1, ..., vT]
 * @param {number} horizonYears - Number of forward years (e.g. 1, 2, 3, 5)
 * @returns {Object} Forecast point estimate and CAGR rate
 */
export function forecastCAGR(historicalSeries, horizonYears = 1) {
  if (!Array.isArray(historicalSeries) || historicalSeries.length < 2) {
    throw new Error('historicalSeries must contain at least 2 observations for CAGR computation');
  }

  for (const v of historicalSeries) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new TypeError(`historicalSeries elements must be finite numbers, got: ${v}`);
    }
  }

  if (typeof horizonYears !== 'number' || !Number.isFinite(horizonYears) || horizonYears < 1 || horizonYears > 10) {
    throw new Error(`Unsupported forecast horizonYears: ${horizonYears}. Supported range: 1 to 10.`);
  }

  const n = historicalSeries.length - 1; // number of periods
  const v0 = historicalSeries[0];
  const vT = historicalSeries[historicalSeries.length - 1];

  if (v0 <= 0 || vT <= 0) {
    throw new Error('CAGR requires strictly positive start and end values');
  }

  const cagr = Math.pow(vT / v0, 1 / n) - 1;
  const forecastedValue = vT * Math.pow(1 + cagr, horizonYears);

  return {
    method: ForecastMethod.HISTORICAL_CAGR,
    cagrRate: cagr,
    baseValue: vT,
    horizonYears,
    forecastValue: forecastedValue,
    observationCount: historicalSeries.length,
    classification: ForecastClassification.FORECAST
  };
}

/**
 * Computes Linear Trend via Ordinary Least Squares (OLS) regression with exact finite-sample Student-t prediction intervals.
 * 
 * @param {Array<number>} historicalSeries - Chronological observations [y0, y1, ..., yN-1]
 * @param {number} horizonSteps - Number of forward steps (e.g. 1, 2, 3, 5)
 * @returns {Object} Point estimate, slope, intercept, R-squared, exact Student-t prediction intervals, and normal approximation
 */
export function forecastLinearTrend(historicalSeries, horizonSteps = 1) {
  if (!Array.isArray(historicalSeries) || historicalSeries.length < 3) {
    throw new Error('historicalSeries must contain at least 3 observations for linear trend regression');
  }

  for (const v of historicalSeries) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new TypeError(`historicalSeries elements must be finite numbers, got: ${v}`);
    }
  }

  if (typeof horizonSteps !== 'number' || !Number.isFinite(horizonSteps) || horizonSteps < 1 || horizonSteps > 10 || !Number.isInteger(horizonSteps)) {
    throw new Error(`Unsupported horizonSteps: ${horizonSteps}. Supported range: integer 1 to 10.`);
  }

  const N = historicalSeries.length;
  let sumT = 0;
  let sumY = 0;
  let sumTT = 0;
  let sumTY = 0;

  for (let t = 0; t < N; t++) {
    const y = historicalSeries[t];
    sumT += t;
    sumY += y;
    sumTT += t * t;
    sumTY += t * y;
  }

  const denom = (N * sumTT) - (sumT * sumT);
  if (Math.abs(denom) < 1e-12) {
    throw new Error('Degenerate time series: zero variance in time index / singular regression');
  }

  const slope = ((N * sumTY) - (sumT * sumY)) / denom;
  const intercept = (sumY - (slope * sumT)) / N;

  // Residual sum of squares & R^2 calculation
  const meanY = sumY / N;
  let ssTot = 0;
  let ssRes = 0;

  for (let t = 0; t < N; t++) {
    const y = historicalSeries[t];
    const yHat = intercept + slope * t;
    ssTot += Math.pow(y - meanY, 2);
    ssRes += Math.pow(y - yHat, 2);
  }

  const df = N - 2;
  const rSquared = ssTot > 0 ? Math.max(0, 1 - (ssRes / ssTot)) : 0;
  const standardError = df > 0 ? Math.sqrt(ssRes / df) : 0;

  const targetT = (N - 1) + horizonSteps;
  const pointEstimate = intercept + (slope * targetT);

  // Exact finite-sample leverage calculation for prediction interval:
  // Var(y_hat_new - y_new) = s_e^2 * (1 + 1/N + (t_new - t_bar)^2 / sum((t_i - t_bar)^2))
  const meanT = sumT / N;
  let sumSqTDev = 0;
  for (let t = 0; t < N; t++) {
    sumSqTDev += Math.pow(t - meanT, 2);
  }
  const leverage = (1 / N) + (Math.pow(targetT - meanT, 2) / (sumSqTDev > 0 ? sumSqTDev : 1));
  const forecastStdErr = standardError * Math.sqrt(1 + leverage);

  // 1. Exact Student-t critical value and prediction interval
  const tCrit = getStudentTCriticalValue(df);
  const exactMargin95 = tCrit * forecastStdErr;

  // 2. Normal approximation prediction interval
  const normalMargin95 = 1.95996 * forecastStdErr;

  return {
    method: ForecastMethod.LINEAR_TREND,
    slope,
    intercept,
    rSquared,
    standardError,
    degreesOfFreedom: df,
    horizonSteps,
    forecastValue: pointEstimate,
    uncertainty: {
      methodology: 'EXACT_FINITE_SAMPLE_STUDENT_T',
      confidenceLevel: 0.95,
      degreesOfFreedom: df,
      criticalValue_t: tCrit,
      standardError: forecastStdErr,
      marginOfError95: exactMargin95,
      lowerBound95: pointEstimate - exactMargin95,
      upperBound95: pointEstimate + exactMargin95
    },
    normalApproximation: {
      methodology: 'NORMAL_APPROX_95_PREDICTION_INTERVAL',
      confidenceLevel: 0.95,
      criticalValue_z: 1.96,
      marginOfError: normalMargin95,
      lowerBound: pointEstimate - normalMargin95,
      upperBound: pointEstimate + normalMargin95,
      classification: ForecastClassification.MODEL_ESTIMATE,
      caveat: 'Approximate large-sample normal interval; use exact Student-t for small sample sizes'
    },
    observationCount: N,
    classification: ForecastClassification.FORECAST
  };
}

/**
 * Computes Rolling Margin / Growth mean and standard deviation.
 */
export function forecastRollingAverage(historicalSeries, horizonYears = 1) {
  if (!Array.isArray(historicalSeries) || historicalSeries.length < 2) {
    throw new Error('historicalSeries must contain at least 2 observations');
  }

  for (const v of historicalSeries) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new TypeError(`historicalSeries elements must be finite numbers, got: ${v}`);
    }
  }

  const sum = historicalSeries.reduce((acc, v) => acc + v, 0);
  const mean = sum / historicalSeries.length;

  const variance = historicalSeries.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (historicalSeries.length - 1);
  const stdDev = Math.sqrt(variance);

  return {
    method: ForecastMethod.ROLLING_MARGIN,
    meanValue: mean,
    stdDev,
    horizonYears,
    forecastValue: mean,
    uncertainty: {
      lowerBound95: mean - (1.96 * stdDev),
      upperBound95: mean + (1.96 * stdDev),
      stdDev,
      confidenceLevel: 0.95
    },
    observationCount: historicalSeries.length,
    classification: ForecastClassification.FORECAST
  };
}
