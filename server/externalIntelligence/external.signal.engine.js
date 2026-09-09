import crypto from 'crypto';
import { DatasetType, computeExternalHash, deepFreeze } from './external.types.js';
import { defaultExternalStore } from './external.store.js';

export class ExternalSignalEngine {
  constructor(store = defaultExternalStore) {
    this.store = store;
  }

  /**
   * Register Alternative Dataset
   */
  registerDataset(tenantId = 'tenant_default', {
    datasetId,
    vendor,
    datasetType = DatasetType.POINT_IN_TIME,
    methodology,
    coverage = ['US_EQUITIES'],
    updateFrequency = 'DAILY',
    survivorshipBiased = false,
    revisionPolicy = 'POINT_IN_TIME_SNAPSHOTS'
  }) {
    if (!vendor || !methodology) {
      throw new Error('registerDataset requires vendor and methodology');
    }

    const id = datasetId || `ds_${crypto.randomBytes(8).toString('hex')}`;
    const datasetRecord = {
      datasetId: id,
      vendor,
      datasetType,
      methodology,
      coverage,
      updateFrequency,
      survivorshipBiased,
      revisionPolicy,
      registeredAt: new Date().toISOString(),
      version: 1
    };

    return this.store.saveDataset(tenantId, datasetRecord);
  }

  /**
   * Compute Transparent Signal Quality Score
   * Formula: Quality = 0.35 * SourceVerification + 0.25 * ProvenanceCompleteness + 0.20 * Timeliness + 0.20 * Corroboration
   */
  evaluateSignalQuality(tenantId = 'tenant_default', observation) {
    if (!observation) return { qualityScore: 0, qualityTier: 'LOW', metrics: {} };

    const src = this.store.getEntityAsOf(tenantId, 'sources', observation.sourceId);
    const sourceVerificationScore = src?.verificationStatus?.startsWith('VERIFIED') ? 1.0 : (src?.verificationStatus === 'UNVERIFIED' ? 0.4 : 0.1);

    const hasArtifact = !!observation.artifactId;
    const hasEvidence = !!observation.evidenceId;
    const provenanceScore = (hasArtifact ? 0.5 : 0.0) + (hasEvidence ? 0.5 : 0.0);

    // Timeliness
    const pubTime = new Date(observation.publicationTimestamp || observation.dataTimestamp || 0).getTime();
    const retTime = new Date(observation.retrievalTimestamp || 0).getTime();
    const latencyHours = Math.max(0, (retTime - pubTime) / (1000 * 60 * 60));
    const timelinessScore = latencyHours <= 24 ? 1.0 : (latencyHours <= 72 ? 0.7 : 0.4);

    const corroborationScore = observation.corroborationState === 'PRIMARY_CORROBORATED' || observation.corroborationState === 'MULTI_SOURCE' ? 1.0 : 0.5;

    const compositeScore = (
      0.35 * sourceVerificationScore +
      0.25 * provenanceScore +
      0.20 * timelinessScore +
      0.20 * corroborationScore
    );

    const qualityTier = compositeScore >= 0.85 ? 'TIER_1_HIGH' : (compositeScore >= 0.60 ? 'TIER_2_MODERATE' : 'TIER_3_SPECULATIVE');

    return {
      qualityScore: parseFloat(compositeScore.toFixed(3)),
      qualityTier,
      formulaWeights: {
        sourceVerification: 0.35,
        provenanceCompleteness: 0.25,
        timeliness: 0.20,
        corroboration: 0.20
      },
      metrics: {
        sourceVerificationScore,
        provenanceScore,
        timelinessScore,
        corroborationScore,
        latencyHours: Math.round(latencyHours)
      }
    };
  }

  /**
   * Evaluate Signal Historical Performance
   * Evaluates predictions against observed realizations. Uses INSUFFICIENT_SAMPLE if N < 10.
   */
  evaluateSignalPerformance({
    signalType,
    predictions = [] // [{ predictedDirection: 'UP', actualOutcome: 'UP', leadTimeDays: 14 }]
  }) {
    const N = predictions ? predictions.length : 0;
    const methodologyVersion = '2026.1';

    if (N < 10) {
      return {
        signalType,
        N,
        sampleStatus: 'INSUFFICIENT_SAMPLE',
        minRequiredSample: 10,
        hitRate: null,
        falsePositiveRate: null,
        falseNegativeRate: null,
        leadTime: null,
        decay: null,
        methodologyVersion,
        message: 'Sample size insufficient (N < 10) to assert statistical predictive power'
      };
    }

    let hits = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    let totalLeadTime = 0;

    for (const p of predictions) {
      if (p.predictedDirection === p.actualOutcome) {
        hits++;
      } else {
        if (p.predictedDirection === 'UP' && p.actualOutcome === 'DOWN') {
          falsePositives++;
        } else if (p.predictedDirection === 'DOWN' && p.actualOutcome === 'UP') {
          falseNegatives++;
        } else {
          falsePositives++;
        }
      }
      totalLeadTime += (p.leadTimeDays || 0);
    }

    const hitRate = parseFloat((hits / N).toFixed(3));
    const falsePositiveRate = parseFloat((falsePositives / N).toFixed(3));
    const falseNegativeRate = parseFloat((falseNegatives / N).toFixed(3));
    const avgLeadTimeDays = parseFloat((totalLeadTime / N).toFixed(1));

    let sampleStatus = 'LOW_SAMPLE';
    if (N >= 30) {
      sampleStatus = 'EVALUABLE';
    }

    // Decay rate estimate: signal predictive power half-life in days
    const decay = {
      halfLifeDays: avgLeadTimeDays > 0 ? Math.round(avgLeadTimeDays * 1.5) : 30,
      decayModel: 'EXPONENTIAL_HALF_LIFE'
    };

    return {
      signalType,
      N,
      sampleStatus,
      hitRate,
      falsePositiveRate,
      falseNegativeRate,
      leadTime: {
        avgLeadTimeDays,
        unit: 'DAYS'
      },
      decay,
      methodologyVersion,
      calibrationGrade: hitRate >= 0.65 ? 'STRONG_PREDICTIVE' : (hitRate >= 0.50 ? 'MODERATE' : 'WEAK_NOISY')
    };
  }
}

export const defaultSignalEngine = new ExternalSignalEngine();
