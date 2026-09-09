import assert from 'assert';
import { SignalPredictionScoringEngine } from '../alphaAttribution/attribution.prediction.engine.js';
import { AlphaAttributionStore } from '../alphaAttribution/attribution.store.js';
import { SampleTier } from '../alphaAttribution/attribution.types.js';

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

console.log('=== Suite 4: Signal Prediction Accuracy & Information Coefficient Scoring ===');

it('Evaluate directional hit rate, precision, recall and IC', () => {
  const store = new AlphaAttributionStore();
  const engine = new SignalPredictionScoringEngine(store);

  // 30 pairs to achieve EVALUABLE tier
  const pairs = [];
  for (let i = 1; i <= 30; i++) {
    const isUp = i % 3 !== 0; // 20 up, 10 down
    pairs.push({
      predictedDirection: isUp ? 1 : -1,
      predictedMagnitude: isUp ? 0.05 + (i * 0.001) : -0.05 - (i * 0.001),
      predictedProbability: isUp ? 0.70 : 0.30,
      realizedReturn: isUp ? 0.04 + (i * 0.001) : -0.03 - (i * 0.001)
    });
  }

  const res = engine.evaluatePredictionAccuracy('t_default', {
    signalId: 'sig_growth',
    pairs
  });

  assert.strictEqual(res.sampleTier, SampleTier.EVALUABLE);
  assert.strictEqual(res.sampleSize, 30);
  assert.strictEqual(res.hitRate, 1.0);
  assert.ok(res.informationCoefficient > 0.90);
  assert.ok(res.rankIC > 0.90);
  assert.ok(res.brierScore !== null && res.brierScore < 0.20);
});

it('Sample size gating (Insufficient sample for N < 10, Low sample for 10 <= N < 30)', () => {
  const store = new AlphaAttributionStore();
  const engine = new SignalPredictionScoringEngine(store);

  const smallPairs = [
    { predictedDirection: 1, realizedReturn: 0.05 },
    { predictedDirection: 1, realizedReturn: -0.02 }
  ];

  const smallRes = engine.evaluatePredictionAccuracy('t_default', {
    signalId: 'sig_small',
    pairs: smallPairs
  });
  assert.strictEqual(smallRes.sampleTier, SampleTier.INSUFFICIENT_SAMPLE);

  const medPairs = new Array(15).fill({ predictedDirection: 1, realizedReturn: 0.02 });
  const medRes = engine.evaluatePredictionAccuracy('t_default', {
    signalId: 'sig_med',
    pairs: medPairs
  });
  assert.strictEqual(medRes.sampleTier, SampleTier.LOW_SAMPLE);
});

it('Handle zero predictions and negative returns accurately', () => {
  const store = new AlphaAttributionStore();
  const engine = new SignalPredictionScoringEngine(store);

  const pairs = [
    { predictedDirection: 0, predictedMagnitude: 0, realizedReturn: 0 },
    { predictedDirection: -1, predictedMagnitude: -0.10, realizedReturn: -0.10 }
  ];

  const res = engine.evaluatePredictionAccuracy('t_default', {
    signalId: 'sig_zero_neg',
    pairs
  });

  assert.strictEqual(res.hitRate, 1.0);
  assert.strictEqual(res.meanAbsoluteError, 0.0);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
