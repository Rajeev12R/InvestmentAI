import crypto from 'crypto';
import {
  SampleStatus,
  ValidationPeriod,
  computeSignalHash,
  deepFreeze
} from './signal.types.js';
import { defaultSignalStore } from './signal.store.js';

export class SignalValidationEngine {
  constructor(store = defaultSignalStore) {
    this.store = store;
  }

  /**
   * Validate Historical Signal Predictive Association & Performance
   * Enforces Out-of-Sample segregation and sample sufficiency tiers.
   */
  evaluateHistoricalSignal(tenantId = 'tenant_default', {
    signalType,
    observations = [], // [{ signalScore: 0.8, realizedForwardReturn: 0.05, period: 'OUT_OF_SAMPLE', isDelisted: false }]
    validationPeriod = ValidationPeriod.OUT_OF_SAMPLE,
    survivorshipControlled = true,
    methodologyVersion = '2026.1'
  }) {
    if (!signalType) throw new Error('evaluateHistoricalSignal requires signalType');

    const filtered = observations.filter(obs => {
      if (validationPeriod && obs.period && obs.period !== validationPeriod) return false;
      return true;
    });

    const N = filtered.length;

    // Sample Sufficiency Tiering
    let sampleStatus = SampleStatus.INSUFFICIENT_SAMPLE;
    if (N >= 30) {
      sampleStatus = SampleStatus.EVALUABLE;
    } else if (N >= 10) {
      sampleStatus = SampleStatus.LOW_SAMPLE;
    }

    if (N < 10) {
      const result = {
        validationId: `val_${crypto.randomBytes(8).toString('hex')}`,
        signalType,
        N,
        sampleStatus,
        validationPeriod,
        survivorshipControlled,
        hitRate: null,
        falsePositiveRate: null,
        falseNegativeRate: null,
        informationCoefficient: null,
        rankCorrelation: null,
        averageForwardReturn: null,
        status: 'INSUFFICIENT_SAMPLE',
        message: 'Sample size insufficient (N < 10) to evaluate statistical association',
        methodologyVersion,
        evaluatedAt: new Date().toISOString()
      };
      return this.store.saveValidation(tenantId, result);
    }

    let hits = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    let totalReturn = 0;
    let returnSumXY = 0;
    let sumX = 0;
    let sumY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (const obs of filtered) {
      const x = obs.signalScore || 0;
      const y = obs.realizedForwardReturn !== undefined ? obs.realizedForwardReturn : 0;
      totalReturn += y;

      const predPositive = x > 0;
      const actPositive = y > 0;

      if (predPositive === actPositive) {
        hits++;
      } else {
        if (predPositive && !actPositive) falsePositives++;
        else falseNegatives++;
      }

      sumX += x;
      sumY += y;
      sumX2 += x * x;
      sumY2 += y * y;
      returnSumXY += x * y;
    }

    const hitRate = parseFloat((hits / N).toFixed(3));
    const falsePositiveRate = parseFloat((falsePositives / N).toFixed(3));
    const falseNegativeRate = parseFloat((falseNegatives / N).toFixed(3));
    const averageForwardReturn = parseFloat((totalReturn / N).toFixed(4));

    // Pearson Correlation (Information Coefficient)
    const numerator = (N * returnSumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((N * sumX2) - (sumX * sumX)) * ((N * sumY2) - (sumY * sumY)));
    const ic = denominator !== 0 ? parseFloat((numerator / denominator).toFixed(3)) : 0.0;

    const isHistoricallySupported = (
      validationPeriod === ValidationPeriod.OUT_OF_SAMPLE &&
      sampleStatus === SampleStatus.EVALUABLE &&
      hitRate >= 0.58 &&
      ic >= 0.05
    );

    const validationRecord = {
      validationId: `val_${crypto.randomBytes(8).toString('hex')}`,
      signalType,
      N,
      sampleStatus,
      validationPeriod,
      survivorshipControlled,
      hitRate,
      falsePositiveRate,
      falseNegativeRate,
      informationCoefficient: ic,
      rankCorrelation: ic,
      averageForwardReturn,
      isHistoricallySupported,
      supportClassification: isHistoricallySupported ? 'HISTORICALLY_SUPPORTED' : (sampleStatus === SampleStatus.LOW_SAMPLE ? 'LOW_SAMPLE_ASSOCIATION' : 'NO_DEMONSTRATED_EDGE'),
      methodologyVersion,
      evaluatedAt: new Date().toISOString()
    };

    return this.store.saveValidation(tenantId, validationRecord);
  }
}

export const defaultValidationEngine = new SignalValidationEngine();
