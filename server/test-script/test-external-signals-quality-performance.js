import assert from 'assert';
import { ExternalIntelligenceStore } from '../externalIntelligence/external.store.js';
import { ExternalSignalEngine } from '../externalIntelligence/external.signal.engine.js';
import { ObservationClass, ObservationType, SourceType, VerificationStatus } from '../externalIntelligence/external.types.js';

let totalAssertions = 0;
function it(desc, fn) {
  try {
    fn();
    totalAssertions++;
  } catch (err) {
    console.error(`FAILED: ${desc}`);
    throw err;
  }
}

console.log('=== Suite 10: Signal Quality Scoring & Performance Calibration ===');

it('should evaluate each quality component independently according to the published formula', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalSignalEngine(store);

  // 1. High Quality Observation
  store.saveSource('tenant_01', {
    sourceId: 'src_sec_q',
    sourceType: SourceType.REGULATORY,
    publisher: 'SEC EDGAR',
    canonicalName: 'SEC',
    verificationStatus: VerificationStatus.VERIFIED_REGULATORY,
    version: 1
  });

  const obsHigh = store.saveObservation('tenant_01', {
    observationId: 'obs_high_qual',
    sourceId: 'src_sec_q',
    artifactId: 'art_q1',
    evidenceId: 'ev_q1',
    observationType: ObservationType.REGULATORY_SIGNAL,
    observationClass: ObservationClass.VERIFIED_REGULATORY,
    subjectId: 'NVDA',
    corroborationState: 'PRIMARY_CORROBORATED',
    dataTimestamp: '2026-03-01T00:00:00Z',
    publicationTimestamp: '2026-03-01T01:00:00Z',
    retrievalTimestamp: '2026-03-01T02:00:00Z',
    knowledgeAvailableAt: '2026-03-01T02:00:00Z',
    version: 1
  });

  const qHigh = engine.evaluateSignalQuality('tenant_01', obsHigh);
  assert.strictEqual(qHigh.formulaWeights.sourceVerification, 0.35);
  assert.strictEqual(qHigh.formulaWeights.provenanceCompleteness, 0.25);
  assert.strictEqual(qHigh.formulaWeights.timeliness, 0.20);
  assert.strictEqual(qHigh.formulaWeights.corroboration, 0.20);

  // Source=1.0, Prov=1.0, Time=1.0, Corr=1.0 -> 0.35 + 0.25 + 0.20 + 0.20 = 1.00
  assert.strictEqual(qHigh.qualityScore, 1.00);
  assert.strictEqual(qHigh.qualityTier, 'TIER_1_HIGH');

  // 2. Low Quality Observation with Missing Components
  store.saveSource('tenant_01', {
    sourceId: 'src_unver',
    sourceType: SourceType.WEB,
    publisher: 'Random Web Forum',
    canonicalName: 'Forum',
    verificationStatus: VerificationStatus.UNVERIFIED,
    version: 1
  });

  const obsLow = store.saveObservation('tenant_01', {
    observationId: 'obs_low_qual',
    sourceId: 'src_unver',
    artifactId: 'art_low',
    evidenceId: null,
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.UNVERIFIED_EXTERNAL,
    subjectId: 'NVDA',
    corroborationState: 'UNCORROBORATED',
    dataTimestamp: '2025-01-01T00:00:00Z',
    publicationTimestamp: '2025-01-01T00:00:00Z',
    retrievalTimestamp: '2026-03-01T00:00:00Z', // >72h latency
    knowledgeAvailableAt: '2026-03-01T00:00:00Z',
    version: 1
  });

  const qLow = engine.evaluateSignalQuality('tenant_01', obsLow);
  // Source=0.4, Prov=0.5, Time=0.4, Corr=0.5 -> 0.35*0.4 (0.14) + 0.25*0.5 (0.125) + 0.20*0.4 (0.08) + 0.20*0.5 (0.10) = 0.445
  assert.strictEqual(qLow.qualityScore, 0.445);
  assert.strictEqual(qLow.qualityTier, 'TIER_3_SPECULATIVE');
});

it('should test boundary values and null observation handling in signal quality scoring', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalSignalEngine(store);

  const qNull = engine.evaluateSignalQuality('tenant_01', null);
  assert.strictEqual(qNull.qualityScore, 0);
  assert.strictEqual(qNull.qualityTier, 'LOW');
});

it('should enforce 3-tier sample-quality semantics across N=0, N=1, N=9, N=10, N=29, N=30', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalSignalEngine(store);

  const makePreds = (count, hits = count, falsePos = 0, falseNeg = 0) => {
    const list = [];
    for (let i = 0; i < count; i++) {
      if (i < hits) {
        list.push({ predictedDirection: 'UP', actualOutcome: 'UP', leadTimeDays: 14 });
      } else if (i < hits + falsePos) {
        list.push({ predictedDirection: 'UP', actualOutcome: 'DOWN', leadTimeDays: 10 });
      } else {
        list.push({ predictedDirection: 'DOWN', actualOutcome: 'UP', leadTimeDays: 8 });
      }
    }
    return list;
  };

  // N=0
  const perfN0 = engine.evaluateSignalPerformance({ signalType: 'HIRING_SIGNAL', predictions: [] });
  assert.strictEqual(perfN0.N, 0);
  assert.strictEqual(perfN0.sampleStatus, 'INSUFFICIENT_SAMPLE');
  assert.strictEqual(perfN0.hitRate, null);
  assert.strictEqual(perfN0.falsePositiveRate, null);
  assert.strictEqual(perfN0.falseNegativeRate, null);
  assert.strictEqual(perfN0.leadTime, null);
  assert.strictEqual(perfN0.decay, null);
  assert.strictEqual(perfN0.methodologyVersion, '2026.1');

  // N=1
  const perfN1 = engine.evaluateSignalPerformance({ signalType: 'HIRING_SIGNAL', predictions: makePreds(1) });
  assert.strictEqual(perfN1.N, 1);
  assert.strictEqual(perfN1.sampleStatus, 'INSUFFICIENT_SAMPLE');

  // N=9
  const perfN9 = engine.evaluateSignalPerformance({ signalType: 'HIRING_SIGNAL', predictions: makePreds(9) });
  assert.strictEqual(perfN9.N, 9);
  assert.strictEqual(perfN9.sampleStatus, 'INSUFFICIENT_SAMPLE');

  // N=10 (LOW_SAMPLE boundary)
  const perfN10 = engine.evaluateSignalPerformance({ signalType: 'HIRING_SIGNAL', predictions: makePreds(10, 8, 1, 1) });
  assert.strictEqual(perfN10.N, 10);
  assert.strictEqual(perfN10.sampleStatus, 'LOW_SAMPLE');
  assert.strictEqual(perfN10.hitRate, 0.8);
  assert.strictEqual(perfN10.falsePositiveRate, 0.1);
  assert.strictEqual(perfN10.falseNegativeRate, 0.1);
  assert.strictEqual(perfN10.leadTime.avgLeadTimeDays, 13);
  assert.strictEqual(perfN10.decay.halfLifeDays > 0, true);
  assert.strictEqual(perfN10.calibrationGrade, 'STRONG_PREDICTIVE');

  // N=29 (LOW_SAMPLE upper boundary)
  const perfN29 = engine.evaluateSignalPerformance({ signalType: 'HIRING_SIGNAL', predictions: makePreds(29, 20, 5, 4) });
  assert.strictEqual(perfN29.N, 29);
  assert.strictEqual(perfN29.sampleStatus, 'LOW_SAMPLE');

  // N=30 (EVALUABLE boundary)
  const perfN30 = engine.evaluateSignalPerformance({ signalType: 'HIRING_SIGNAL', predictions: makePreds(30, 24, 3, 3) });
  assert.strictEqual(perfN30.N, 30);
  assert.strictEqual(perfN30.sampleStatus, 'EVALUABLE');
  assert.strictEqual(perfN30.hitRate, 0.8);
  assert.strictEqual(perfN30.falsePositiveRate, 0.1);
  assert.strictEqual(perfN30.falseNegativeRate, 0.1);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
