import { SampleTier } from './attribution.types.js';
import { defaultAttributionStore } from './attribution.store.js';

export class SignalPredictionScoringEngine {
  constructor(store = defaultAttributionStore) {
    this.store = store;
  }

  /**
   * Evaluate a collection of prediction-outcome pairs.
   * pairs: [ { predictedDirection: 1|-1|0, predictedMagnitude: number, predictedProb: number, realizedReturn: number } ]
   */
  evaluatePredictionAccuracy(tenantId = 'tenant_default', {
    performanceId,
    signalId,
    entityId = 'UNIVERSE',
    evaluationPeriod = 'HISTORICAL',
    pairs = [],
    informationCutoff = new Date().toISOString()
  }) {
    if (!signalId) throw new Error('signalId is required');

    const N = pairs.length;
    let sampleTier = SampleTier.INSUFFICIENT_SAMPLE;
    if (N >= 30) sampleTier = SampleTier.EVALUABLE;
    else if (N >= 10) sampleTier = SampleTier.LOW_SAMPLE;

    if (N === 0) {
      return {
        performanceId: performanceId || `perf_${signalId}_empty`,
        signalId,
        entityId,
        evaluationPeriod,
        sampleSize: 0,
        sampleTier,
        hitRate: 0.0,
        directionalAccuracy: 0.0,
        precision: 0.0,
        recall: 0.0,
        falsePositiveRate: 0.0,
        falseNegativeRate: 0.0,
        informationCoefficient: 0.0,
        rankIC: 0.0,
        brierScore: null,
        meanAbsoluteError: 0.0,
        rootMeanSquaredError: 0.0,
        signedError: 0.0,
        informationCutoff
      };
    }

    let correctDirectionCount = 0;
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;
    let absErrorSum = 0;
    let sqErrorSum = 0;
    let signedErrorSum = 0;
    let brierSum = 0;
    let hasBrier = false;

    const preds = [];
    const outcomes = [];

    for (const p of pairs) {
      const predDir = p.predictedDirection !== undefined ? Math.sign(p.predictedDirection) : 0;
      const realDir = Math.sign(p.realizedReturn || 0);
      const predMag = p.predictedMagnitude !== undefined ? p.predictedMagnitude : predDir;
      const realRet = p.realizedReturn || 0;

      preds.push(predMag);
      outcomes.push(realRet);

      const err = predMag - realRet;
      absErrorSum += Math.abs(err);
      sqErrorSum += err * err;
      signedErrorSum += err;

      if (predDir === realDir && predDir !== 0) {
        correctDirectionCount++;
      } else if (predDir === 0 && realDir === 0) {
        correctDirectionCount++;
      }

      // Classification metrics for binary direction (Positive vs Non-Positive)
      if (predDir > 0 && realDir > 0) truePositives++;
      else if (predDir > 0 && realDir <= 0) falsePositives++;
      else if (predDir <= 0 && realDir <= 0) trueNegatives++;
      else if (predDir <= 0 && realDir > 0) falseNegatives++;

      // Brier score if predicted probabilities exist
      if (p.predictedProbability !== undefined && p.predictedProbability !== null) {
        hasBrier = true;
        const actualBinary = realDir > 0 ? 1.0 : 0.0;
        const diff = p.predictedProbability - actualBinary;
        brierSum += diff * diff;
      }
    }

    const hitRate = parseFloat((correctDirectionCount / N).toFixed(4));
    const directionalAccuracy = hitRate;
    const precision = (truePositives + falsePositives > 0)
      ? parseFloat((truePositives / (truePositives + falsePositives)).toFixed(4))
      : 0.0;
    const recall = (truePositives + falseNegatives > 0)
      ? parseFloat((truePositives / (truePositives + falseNegatives)).toFixed(4))
      : 0.0;
    const falsePositiveRate = (falsePositives + trueNegatives > 0)
      ? parseFloat((falsePositives / (falsePositives + trueNegatives)).toFixed(4))
      : 0.0;
    const falseNegativeRate = (falseNegatives + truePositives > 0)
      ? parseFloat((falseNegatives / (falseNegatives + truePositives)).toFixed(4))
      : 0.0;

    const meanAbsoluteError = parseFloat((absErrorSum / N).toFixed(6));
    const rootMeanSquaredError = parseFloat((Math.sqrt(sqErrorSum / N)).toFixed(6));
    const signedError = parseFloat((signedErrorSum / N).toFixed(6));
    const brierScore = hasBrier ? parseFloat((brierSum / N).toFixed(4)) : null;

    // Pearson Correlation (IC)
    const ic = this._calculatePearson(preds, outcomes);
    // Spearman Rank Correlation (Rank IC)
    const rankIC = this._calculateSpearman(preds, outcomes);

    const id = performanceId || `perf_${signalId}_${evaluationPeriod}_${N}`;
    const record = {
      performanceId: id,
      signalId,
      entityId,
      evaluationPeriod,
      sampleSize: N,
      sampleTier,
      hitRate,
      directionalAccuracy,
      precision,
      recall,
      falsePositiveRate,
      falseNegativeRate,
      informationCoefficient: ic,
      rankIC,
      brierScore,
      meanAbsoluteError,
      rootMeanSquaredError,
      signedError,
      informationCutoff,
      calculatedAt: informationCutoff
    };

    return this.store.savePerformance(tenantId, record);
  }

  _calculatePearson(x, y) {
    const n = x.length;
    if (n < 2) return 0.0;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let denX = 0;
    let denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    if (denX === 0 || denY === 0) return 0.0;
    return parseFloat((num / Math.sqrt(denX * denY)).toFixed(4));
  }

  _calculateSpearman(x, y) {
    const n = x.length;
    if (n < 2) return 0.0;
    const rank = (arr) => {
      const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
      const ranks = new Array(n);
      for (let r = 0; r < n; r++) {
        ranks[sorted[r].i] = r + 1;
      }
      return ranks;
    };
    const rx = rank(x);
    const ry = rank(y);
    return this._calculatePearson(rx, ry);
  }
}

export const defaultPredictionScoringEngine = new SignalPredictionScoringEngine();
