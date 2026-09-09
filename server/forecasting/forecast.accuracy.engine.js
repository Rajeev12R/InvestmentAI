/**
 * server/forecasting/forecast.accuracy.engine.js
 * 
 * Phase 20: Forecast Accuracy & Calibration Engine (Phase 13 Integration)
 * Evaluates forecast errors, signed bias, MAE, RMSE, and model calibration against realized Truth facts.
 * Handles zero denominators, negative EPS, and directional hit rate edge cases deterministically.
 */

import { ForecastClassification } from './forecast.types.js';

/**
 * Evaluates a single forecast against its realized Truth Layer fact.
 * 
 * Mathematical Rules for Edge Cases:
 * 1. MAPE:
 *    - Realized Value = 0 or |Realized Value| < 1e-6 -> MAPE is UNAVAILABLE (No division by zero)
 *    - Realized Value < 0 (e.g. Negative EPS) -> MAPE is UNAVAILABLE (Conventional MAPE is meaningless for negative numbers)
 *    - When MAPE is UNAVAILABLE, MAE, RMSE, and signed error are the authoritative metrics.
 * 2. Directional Accuracy:
 *    - If forecast = 0 or realized = 0 -> Direction is undefined -> returns UNAVAILABLE.
 * 
 * @param {Object} forecast - Forecast record with value/forecastValue, createdAt, etc.
 * @param {Object} realizedFact - Realized observed fact with value/realizedValue, realizationDate, classification
 * @returns {Object} Error evaluation metrics
 */
export function evaluateForecastAccuracy(forecast, realizedFact) {
  if (!forecast || typeof forecast !== 'object') {
    throw new Error('Valid forecast object is required for accuracy evaluation');
  }
  if (!realizedFact || typeof realizedFact !== 'object') {
    throw new Error('Valid realizedFact object is required for accuracy evaluation');
  }

  const fVal = typeof forecast.value === 'number' ? forecast.value : (typeof forecast.forecastValue === 'number' ? forecast.forecastValue : null);
  const rVal = typeof realizedFact.value === 'number' ? realizedFact.value : (typeof realizedFact.realizedValue === 'number' ? realizedFact.realizedValue : null);

  if (fVal === null || !Number.isFinite(fVal)) {
    throw new Error(`Invalid forecast value: ${fVal}. Must be a finite number.`);
  }
  if (rVal === null || !Number.isFinite(rVal)) {
    throw new Error(`Invalid realized value: ${rVal}. Must be a finite number.`);
  }

  const isRealData = 
    realizedFact.classification === 'REAL_DATA' ||
    realizedFact.classification === 'VERIFIED_REAL_DATA' ||
    realizedFact.status === 'REAL_DATA' ||
    realizedFact.status === 'VERIFIED_REAL_DATA';

  if (!isRealData) {
    throw new Error('realizedFact must be verified REAL_DATA or VERIFIED_REAL_DATA from the Truth Layer');
  }

  // Temporal check: forecast cutoff must precede realization date
  if (forecast.createdAt && realizedFact.realizationDate) {
    if (new Date(forecast.createdAt) > new Date(realizedFact.realizationDate)) {
      throw new Error(`Temporal anomaly: forecast createdAt (${forecast.createdAt}) is after realizationDate (${realizedFact.realizationDate})`);
    }
  }

  const signedError = rVal - fVal; // positive: under-forecasted, negative: over-forecasted
  const absError = Math.abs(signedError);

  // Percentage error handling:
  let pctError = null;
  let absPctError = null;
  let isAccurateWithin5Pct = null;
  let isAccurateWithin10Pct = null;
  let percentageErrorStatus = 'VALID';

  if (Math.abs(rVal) < 1e-6) {
    pctError = null;
    absPctError = null;
    percentageErrorStatus = 'UNAVAILABLE_ZERO_REALIZED_DENOMINATOR';
  } else if (rVal < 0) {
    pctError = null;
    absPctError = null;
    percentageErrorStatus = 'UNAVAILABLE_NEGATIVE_REALIZED_DENOMINATOR';
  } else {
    pctError = signedError / rVal;
    absPctError = Math.abs(pctError);
    isAccurateWithin5Pct = absPctError <= 0.05;
    isAccurateWithin10Pct = absPctError <= 0.10;
  }

  // Directional accuracy handling:
  let directionalAcc = null;
  let directionalStatus = 'VALID';
  if (fVal === 0 || rVal === 0) {
    directionalAcc = null;
    directionalStatus = 'UNAVAILABLE_ZERO_TRANSITION';
  } else {
    directionalAcc = (fVal > 0 && rVal > 0) || (fVal < 0 && rVal < 0);
  }

  return {
    forecastValue: fVal,
    realizedValue: rVal,
    signedError,
    absoluteError: absError,
    percentageError: pctError !== null ? pctError : 'UNAVAILABLE',
    absolutePercentageError: absPctError !== null ? absPctError : 'UNAVAILABLE',
    percentageErrorStatus,
    isAccurateWithin5Pct: isAccurateWithin5Pct !== null ? isAccurateWithin5Pct : 'UNAVAILABLE',
    isAccurateWithin10Pct: isAccurateWithin10Pct !== null ? isAccurateWithin10Pct : 'UNAVAILABLE',
    directionalAccuracy: directionalAcc !== null ? directionalAcc : 'UNAVAILABLE',
    directionalStatus,
    classification: ForecastClassification.DERIVED
  };
}

/**
 * Computes aggregate model accuracy statistics (MAE, RMSE, Bias, MAPE, Hit Rate) across a historical series of realizations.
 * 
 * @param {Array<Object>} pairs - Array of { forecast, realizedFact }
 * @returns {Object} Aggregated calibration and error statistics
 */
export function computeAggregateModelAccuracy(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    throw new Error('pairs must be a non-empty array of { forecast, realizedFact }');
  }

  let sumAbsError = 0.0;
  let sumSqError = 0.0;
  let sumSignedError = 0.0;
  let sumAbsPctError = 0.0;
  let validMapeCount = 0;
  let correctDirectionCount = 0;
  let validDirectionCount = 0;

  const evaluatedPairs = [];

  for (const pair of pairs) {
    const res = evaluateForecastAccuracy(pair.forecast, pair.realizedFact);
    evaluatedPairs.push(res);

    sumAbsError += res.absoluteError;
    sumSqError += Math.pow(res.signedError, 2);
    sumSignedError += res.signedError;

    if (typeof res.absolutePercentageError === 'number') {
      sumAbsPctError += res.absolutePercentageError;
      validMapeCount++;
    }

    if (typeof res.directionalAccuracy === 'boolean') {
      validDirectionCount++;
      if (res.directionalAccuracy === true) {
        correctDirectionCount++;
      }
    }
  }

  const N = pairs.length;
  const mae = sumAbsError / N;
  const rmse = Math.sqrt(sumSqError / N);
  const meanSignedBias = sumSignedError / N;
  const mape = validMapeCount > 0 ? (sumAbsPctError / validMapeCount) : 'UNAVAILABLE';
  const directionalAccuracyPct = validDirectionCount > 0 ? (correctDirectionCount / validDirectionCount) : 'UNAVAILABLE';

  // Phase 13 Decision Calibration Score (0 - 100):
  const calibrationScore = (typeof mape === 'number') ? Math.max(0, 100 - (mape * 100)) : null;

  return {
    sampleSize: N,
    mae,
    rmse,
    meanSignedBias,
    mape,
    validMapeSampleSize: validMapeCount,
    directionalAccuracyPct,
    validDirectionSampleSize: validDirectionCount,
    calibrationScore: calibrationScore !== null ? calibrationScore : 'UNAVAILABLE',
    evaluatedPairs,
    classification: ForecastClassification.DERIVED
  };
}
