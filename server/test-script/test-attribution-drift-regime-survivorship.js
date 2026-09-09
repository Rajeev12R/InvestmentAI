import assert from 'assert';
import { SignalDriftAndGovernanceEngine } from '../alphaAttribution/attribution.drift.engine.js';
import { PerformanceTrend, SurvivorshipRisk } from '../alphaAttribution/attribution.types.js';

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

console.log('=== Suite 9: Signal Drift, Regime Dependence, Survivorship & Multiple Testing ===');

it('Detect performance decay over signal age buckets', () => {
  const engine = new SignalDriftAndGovernanceEngine();

  const ageBuckets = [
    { minDays: 0, maxDays: 30, hitRate: 0.70, ic: 0.15 },
    { minDays: 31, maxDays: 60, hitRate: 0.58, ic: 0.07 },
    { minDays: 61, maxDays: 90, hitRate: 0.50, ic: 0.01 }
  ];

  const res = engine.evaluatePerformanceDrift({
    signalId: 'sig_decaying',
    ageBuckets
  });

  assert.strictEqual(res.trend, PerformanceTrend.PERFORMANCE_DECAY);
  assert.strictEqual(res.isDecaying, true);
  assert.strictEqual(res.icDrop, 0.14);
  assert.strictEqual(res.hitRateDrop, 0.20);
});

it('Detect regime-conditional performance spread', () => {
  const engine = new SignalDriftAndGovernanceEngine();

  const res = engine.evaluateRegimePerformance({
    signalId: 'sig_macro_cyclical',
    regimePerformance: {
      'EXPANSION': { hitRate: 0.75, ic: 0.18 },
      'CONTRACTION': { hitRate: 0.40, ic: -0.05 }
    }
  });

  assert.strictEqual(res.isRegimeDependent, true);
  assert.strictEqual(res.dominantRegime, 'EXPANSION');
  assert.strictEqual(res.spread, 0.35);
});

it('Assess survivorship bias and multiple testing risk', () => {
  const engine = new SignalDriftAndGovernanceEngine();

  // Survivorship test with 0 delisted entities in a large universe
  const survRes = engine.assessSurvivorshipBias({
    universeCount: 100,
    delistedEntitiesIncluded: 0,
    historicalPointInTimeConstituents: true
  });
  assert.strictEqual(survRes.survivorshipRisk, SurvivorshipRisk.HIGH);

  // Survivorship test with point-in-time delisted constituents included
  const survSafe = engine.assessSurvivorshipBias({
    universeCount: 100,
    delistedEntitiesIncluded: 8,
    historicalPointInTimeConstituents: true
  });
  assert.strictEqual(survSafe.survivorshipRisk, SurvivorshipRisk.LOW);
  assert.strictEqual(survSafe.isSurvivorshipSafe, true);

  // Multiple testing / data mining test (testing 20 signals with 5 parameter searches = 100 hypotheses)
  const fwerRes = engine.calculateMultipleTestingRisk({
    signalsTestedCount: 20,
    nominalAlpha: 0.05,
    parameterSearchCount: 5
  });
  assert.strictEqual(fwerRes.totalHypotheses, 100);
  assert.ok(fwerRes.familyWiseErrorRate > 0.99); // ~99.4% chance of false positive
  assert.strictEqual(fwerRes.dataMiningRisk, 'HIGH');
  assert.strictEqual(fwerRes.bonferroniAlpha, 0.0005);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
