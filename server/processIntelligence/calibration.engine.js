/**
 * Phase 13 - Forecast Calibration & Brier Score Engine
 * 
 * Computes deterministic calibration across confidence buckets (50-59%, 60-69%, etc.)
 * Calculates Brier score: BS = (1/N) * sum((p_i - o_i)^2)
 * Distinguishes OVERCONFIDENT from OVERCONFIDENCE_SIGNAL when sample size is small.
 * Strictly detects insufficient samples without fabricating calibration.
 */

import { deepFreeze, CalibrationStatus, ForecastStatus } from './process.types.js';
import { PROCESS_THRESHOLDS_V1 } from './processConfig.js';

export class CalibrationEngine {
  constructor(minBucketSampleSize = 5, minTotalSampleSize = 10) {
    this.minBucketSampleSize = minBucketSampleSize;
    this.minTotalSampleSize = minTotalSampleSize;
  }

  /**
   * Compute calibration analysis and Brier score over scored forecasts
   */
  computeCalibration(scoredForecasts = []) {
    // Defined buckets: [min, max] inclusive
    const buckets = [
      { name: '50-59%', min: 0.50, max: 0.5999, forecasts: [] },
      { name: '60-69%', min: 0.60, max: 0.6999, forecasts: [] },
      { name: '70-79%', min: 0.70, max: 0.7999, forecasts: [] },
      { name: '80-89%', min: 0.80, max: 0.8999, forecasts: [] },
      { name: '90-100%', min: 0.90, max: 1.0000, forecasts: [] }
    ];

    const below50Bucket = { name: '0-49%', min: 0.00, max: 0.4999, forecasts: [] };

    let totalResolved = 0;
    let brierSum = 0;
    let brierCount = 0;

    for (const sf of scoredForecasts) {
      const conf = typeof sf.confidence === 'number' ? sf.confidence : 0.5;
      
      // Skip insufficient data / unscoreable
      if (sf.status === ForecastStatus.INSUFFICIENT_DATA || sf.status === ForecastStatus.PENDING) {
        continue;
      }

      let outcomeBinary = null;
      if (sf.status === ForecastStatus.VALIDATED || sf.status === ForecastStatus.PARTIALLY_VALIDATED) {
        outcomeBinary = 1.0;
      } else if (sf.status === ForecastStatus.FALSIFIED) {
        outcomeBinary = 0.0;
      }

      if (outcomeBinary !== null) {
        totalResolved++;
        brierSum += Math.pow(conf - outcomeBinary, 2);
        brierCount++;

        let placed = false;
        for (const b of buckets) {
          if (conf >= b.min && conf <= b.max) {
            b.forecasts.push({ ...sf, outcomeBinary });
            placed = true;
            break;
          }
        }
        if (!placed && conf < 0.50) {
          below50Bucket.forecasts.push({ ...sf, outcomeBinary });
        }
      }
    }

    const brierScore = brierCount > 0 ? brierSum / brierCount : null;

    // Process each bucket
    const bucketResults = buckets.map(b => {
      const count = b.forecasts.length;
      if (count === 0) {
        return {
          bucket: b.name,
          forecastCount: 0,
          validatedCount: 0,
          falsifiedCount: 0,
          meanConfidence: null,
          empiricalAccuracy: null,
          calibrationError: null,
          status: CalibrationStatus.INSUFFICIENT_SAMPLE,
          isSufficientSample: false,
          reliabilityClassification: 'INSUFFICIENT_SAMPLE'
        };
      }

      const validatedCount = b.forecasts.filter(f => f.outcomeBinary === 1.0).length;
      const falsifiedCount = count - validatedCount;
      const meanConfidence = b.forecasts.reduce((acc, f) => acc + (f.confidence || 0.5), 0) / count;
      const empiricalAccuracy = validatedCount / count;
      const calibrationError = Math.abs(meanConfidence - empiricalAccuracy);

      let status = CalibrationStatus.INSUFFICIENT_SAMPLE;
      const isSufficientSample = count >= this.minBucketSampleSize;
      let reliabilityClassification = 'INSUFFICIENT_SAMPLE';

      if (isSufficientSample) {
        if (count >= 10) {
          reliabilityClassification = 'HIGH_RELIABILITY';
        } else {
          reliabilityClassification = 'MODERATE_SIGNAL';
        }

        if (calibrationError <= 0.10) {
          status = CalibrationStatus.WELL_CALIBRATED;
        } else if (meanConfidence > empiricalAccuracy) {
          status = count >= 10 ? CalibrationStatus.OVERCONFIDENT : 'OVERCONFIDENCE_SIGNAL';
        } else {
          status = count >= 10 ? CalibrationStatus.UNDERCONFIDENT : 'UNDERCONFIDENCE_SIGNAL';
        }
      }

      return {
        bucket: b.name,
        forecastCount: count,
        validatedCount,
        falsifiedCount,
        meanConfidence: Math.round(meanConfidence * 10000) / 10000,
        empiricalAccuracy: Math.round(empiricalAccuracy * 10000) / 10000,
        calibrationError: Math.round(calibrationError * 10000) / 10000,
        status,
        isSufficientSample,
        reliabilityClassification
      };
    });

    // Overall calibration status
    let overallStatus = CalibrationStatus.INSUFFICIENT_SAMPLE;
    let overallCalibrationError = null;
    let overallReliability = 'INSUFFICIENT_SAMPLE';

    if (totalResolved >= this.minTotalSampleSize) {
      const allResolvedConf = scoredForecasts
        .filter(sf => sf.status === ForecastStatus.VALIDATED || sf.status === ForecastStatus.PARTIALLY_VALIDATED || sf.status === ForecastStatus.FALSIFIED)
        .map(sf => sf.confidence || 0.5);
      
      const meanConf = allResolvedConf.reduce((a, b) => a + b, 0) / allResolvedConf.length;
      const totalVal = scoredForecasts.filter(sf => sf.status === ForecastStatus.VALIDATED || sf.status === ForecastStatus.PARTIALLY_VALIDATED).length;
      const overallAccuracy = totalVal / totalResolved;
      overallCalibrationError = Math.abs(meanConf - overallAccuracy);

      if (totalResolved >= 20) {
        overallReliability = 'HIGH_RELIABILITY';
      } else {
        overallReliability = 'MODERATE_SIGNAL';
      }

      if (overallCalibrationError <= 0.08) {
        overallStatus = CalibrationStatus.WELL_CALIBRATED;
      } else if (meanConf > overallAccuracy) {
        overallStatus = totalResolved >= 20 ? CalibrationStatus.OVERCONFIDENT : 'OVERCONFIDENCE_SIGNAL';
      } else {
        overallStatus = totalResolved >= 20 ? CalibrationStatus.UNDERCONFIDENT : 'UNDERCONFIDENCE_SIGNAL';
      }
    }

    const result = {
      totalEvaluated: scoredForecasts.length,
      totalResolved,
      brierScore: brierScore !== null ? Math.round(brierScore * 10000) / 10000 : null,
      brierSampleCount: brierCount,
      overallStatus,
      overallCalibrationError: overallCalibrationError !== null ? Math.round(overallCalibrationError * 10000) / 10000 : null,
      overallReliability,
      isSufficientSample: totalResolved >= this.minTotalSampleSize,
      thresholdConfigId: PROCESS_THRESHOLDS_V1.thresholdConfigId,
      buckets: bucketResults
    };

    return deepFreeze(result);
  }
}

export const calibrationEngine = new CalibrationEngine();
