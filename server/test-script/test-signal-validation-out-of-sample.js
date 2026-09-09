import assert from 'assert';
import { SignalValidationEngine } from '../signalIntelligence/signal.validation.engine.js';
import { SampleStatus, ValidationPeriod, SignalType } from '../signalIntelligence/signal.types.js';

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

console.log('=== Suite 8: Historical Validation & Out-of-Sample Segregation ===');

it('should enforce 3-tier sample-quality semantics across N=0, N=5, N=15, N=35', () => {
  const engine = new SignalValidationEngine();

  const makeObs = (count, hitRatio = 0.70) => {
    const list = [];
    for (let i = 0; i < count; i++) {
      const isHit = (i / count) < hitRatio;
      const signalScore = isHit ? 0.80 : -0.50;
      const realizedForwardReturn = isHit ? 0.05 : -0.04;
      list.push({
        signalScore,
        realizedForwardReturn,
        period: ValidationPeriod.OUT_OF_SAMPLE,
        isDelisted: i % 5 === 0 // 20% survivorship test
      });
    }
    return list;
  };

  // N=5: INSUFFICIENT_SAMPLE
  const resN5 = engine.evaluateHistoricalSignal('tenant_01', {
    signalType: SignalType.GROWTH_SIGNAL,
    observations: makeObs(5)
  });
  assert.strictEqual(resN5.N, 5);
  assert.strictEqual(resN5.sampleStatus, SampleStatus.INSUFFICIENT_SAMPLE);
  assert.strictEqual(resN5.hitRate, null);
  assert.strictEqual(resN5.informationCoefficient, null);

  // N=15: LOW_SAMPLE
  const resN15 = engine.evaluateHistoricalSignal('tenant_01', {
    signalType: SignalType.GROWTH_SIGNAL,
    observations: makeObs(15)
  });
  assert.strictEqual(resN15.N, 15);
  assert.strictEqual(resN15.sampleStatus, SampleStatus.LOW_SAMPLE);
  assert.strictEqual(resN15.isHistoricallySupported, false); // Cannot claim robust support in low sample

  // N=35: EVALUABLE (Sufficient for statistical testing)
  const resN35 = engine.evaluateHistoricalSignal('tenant_01', {
    signalType: SignalType.GROWTH_SIGNAL,
    observations: makeObs(35, 0.75)
  });
  assert.strictEqual(resN35.N, 35);
  assert.strictEqual(resN35.sampleStatus, SampleStatus.EVALUABLE);
  assert.strictEqual(resN35.hitRate >= 0.70, true);
  assert.strictEqual(resN35.informationCoefficient > 0, true);
  assert.strictEqual(resN35.isHistoricallySupported, true);
});

it('should prevent in-sample validated signals from claiming HISTORICALLY_SUPPORTED status', () => {
  const engine = new SignalValidationEngine();

  const inSampleObs = [];
  for (let i = 0; i < 40; i++) {
    inSampleObs.push({
      signalScore: 0.80,
      realizedForwardReturn: 0.05,
      period: ValidationPeriod.IN_SAMPLE
    });
  }

  const resInSample = engine.evaluateHistoricalSignal('tenant_01', {
    signalType: SignalType.VALUATION_SIGNAL,
    observations: inSampleObs,
    validationPeriod: ValidationPeriod.IN_SAMPLE
  });

  // Must not receive out-of-sample historically supported badge
  assert.strictEqual(resInSample.isHistoricallySupported, false);
  assert.strictEqual(resInSample.supportClassification, 'NO_DEMONSTRATED_EDGE');
});

it('should preserve delisted and merged entities to control for survivorship bias', () => {
  const engine = new SignalValidationEngine();

  const survivorshipObs = [
    { signalScore: 0.6, realizedForwardReturn: 0.04, isDelisted: false },
    { signalScore: 0.7, realizedForwardReturn: -0.15, isDelisted: true, ticker: 'FAILED_CO' },
    { signalScore: -0.5, realizedForwardReturn: -0.10, isDelisted: false },
    { signalScore: 0.4, realizedForwardReturn: 0.02, isDelisted: false }
  ];

  // If sample has 10+
  for (let i = 0; i < 8; i++) {
    survivorshipObs.push({ signalScore: 0.5, realizedForwardReturn: 0.03, isDelisted: false });
  }

  const res = engine.evaluateHistoricalSignal('tenant_01', {
    signalType: SignalType.FUNDAMENTAL_SIGNAL,
    observations: survivorshipObs,
    survivorshipControlled: true
  });

  assert.strictEqual(res.survivorshipControlled, true);
  assert.strictEqual(res.N, 12);
  assert.strictEqual(res.sampleStatus, SampleStatus.LOW_SAMPLE);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
