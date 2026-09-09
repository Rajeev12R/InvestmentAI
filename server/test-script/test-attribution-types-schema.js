import assert from 'assert';
import {
  AttributionStatus,
  SignalEngagementLevel,
  AttributionConfidenceLevel,
  EvaluationPeriodType,
  PerformanceTrend,
  EffectType,
  SurvivorshipRisk,
  CounterfactualType,
  SampleTier,
  computeAttributionHash,
  deepFreeze
} from '../alphaAttribution/attribution.types.js';
import {
  validateSignalObservation,
  validateSignalPrediction,
  validateSignalOutcome,
  validateSignalPerformanceRecord,
  validateSignalAttribution,
  validateDecisionSignalContribution,
  validateCounterfactualResult,
  validateAlphaAttributionPackage,
  AlphaAttributionValidationError
} from '../alphaAttribution/attribution.schema.js';

let passed = 0;
function it(desc, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAILED: ${desc}`);
    throw err;
  }
}

console.log('=== Suite 1: Alpha Attribution Types, Taxonomy & Schemas ===');

it('Enums and Taxonomy integrity', () => {
  assert.strictEqual(AttributionStatus.ATTRIBUTED, 'ATTRIBUTED');
  assert.strictEqual(SignalEngagementLevel.SIGNAL_ACTIONED, 'SIGNAL_ACTIONED');
  assert.strictEqual(AttributionConfidenceLevel.HIGH_CONFIDENCE, 'HIGH_CONFIDENCE');
  assert.strictEqual(EffectType.SIGNAL_EFFECT, 'SIGNAL_EFFECT');
  assert.strictEqual(SurvivorshipRisk.HIGH, 'HIGH');
});

it('Deterministic canonical hashing and deep freeze', () => {
  const obj = { b: 2, a: 1, c: { y: 20, x: 10 } };
  const h1 = computeAttributionHash(obj);
  const h2 = computeAttributionHash({ a: 1, c: { x: 10, y: 20 }, b: 2 });
  assert.strictEqual(h1, h2);

  const frozen = deepFreeze({ x: 1, nested: { y: 2 } });
  assert.throws(() => { frozen.x = 10; });
  assert.throws(() => { frozen.nested.y = 20; });
});

it('Validate SignalObservation schema', () => {
  const valid = {
    observationId: 'obs_1',
    signalId: 'sig_1',
    entityId: 'NVDA',
    observedValue: 0.75,
    informationCutoff: '2026-03-01T00:00:00Z'
  };
  assert.strictEqual(validateSignalObservation(valid), true);
  assert.throws(() => validateSignalObservation({ observationId: 'obs_1' }), AlphaAttributionValidationError);
});

it('Validate SignalPrediction schema', () => {
  const valid = {
    predictionId: 'pred_1',
    signalId: 'sig_1',
    entityId: 'NVDA',
    predictedDirection: 1,
    predictionHorizon: '30D',
    informationCutoff: '2026-03-01T00:00:00Z'
  };
  assert.strictEqual(validateSignalPrediction(valid), true);
  assert.throws(() => validateSignalPrediction({ predictionId: 'pred_1' }), AlphaAttributionValidationError);
});

it('Validate SignalOutcome schema with temporal ordering', () => {
  const valid = {
    outcomeId: 'out_1',
    entityId: 'NVDA',
    realizedReturn: 0.12,
    outcomeStart: '2026-03-01T00:00:00Z',
    outcomeEnd: '2026-03-31T00:00:00Z'
  };
  assert.strictEqual(validateSignalOutcome(valid), true);
  assert.throws(() => validateSignalOutcome({
    outcomeId: 'out_1',
    entityId: 'NVDA',
    realizedReturn: 0.12,
    outcomeStart: '2026-03-31T00:00:00Z',
    outcomeEnd: '2026-03-01T00:00:00Z'
  }), AlphaAttributionValidationError);
});

it('Validate AlphaAttributionPackage schema', () => {
  const valid = {
    packageId: 'pkg_1',
    evaluationPeriod: 'HISTORICAL',
    informationCutoff: '2026-03-01T00:00:00Z',
    explanationDAG: { rootId: 'root', nodes: [], edges: [] }
  };
  assert.strictEqual(validateAlphaAttributionPackage(valid), true);
  assert.throws(() => validateAlphaAttributionPackage({ packageId: 'pkg_1' }), AlphaAttributionValidationError);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
