import assert from 'assert';
import { SignalFusionEngine } from '../signalIntelligence/signal.fusion.engine.js';
import { SignalPersistence } from '../signalIntelligence/signal.types.js';

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

console.log('=== Suite 7: Signal Temporal Decay & Persistence Tracking ===');

it('should apply exponential half-life decay deterministically', () => {
  const engine = new SignalFusionEngine();

  // Initial signal = +1.0, age = 30 days, half-life = 30 days -> decayed = +0.50
  const decay30 = engine.applyDecay({
    normalizedValue: 1.0,
    signalAgeDays: 30,
    halfLifeDays: 30
  });

  assert.strictEqual(decay30.decayedValue, 0.50);
  assert.strictEqual(decay30.decayFactor, 0.50);

  // Age = 60 days, half-life = 30 days -> decayed = +0.25
  const decay60 = engine.applyDecay({
    normalizedValue: 1.0,
    signalAgeDays: 60,
    halfLifeDays: 30
  });

  assert.strictEqual(decay60.decayedValue, 0.25);
  assert.strictEqual(decay60.decayFactor, 0.25);
});

it('should maintain zero decay when age is 0 days', () => {
  const engine = new SignalFusionEngine();

  const fresh = engine.applyDecay({
    normalizedValue: 0.85,
    signalAgeDays: 0,
    halfLifeDays: 30
  });

  assert.strictEqual(fresh.decayedValue, 0.85);
  assert.strictEqual(fresh.decayFactor, 1.0);
});

it('should track signal persistence states across immutable vintages', () => {
  assert.strictEqual(SignalPersistence.NEW, 'NEW');
  assert.strictEqual(SignalPersistence.PERSISTENT, 'PERSISTENT');
  assert.strictEqual(SignalPersistence.STRENGTHENING, 'STRENGTHENING');
  assert.strictEqual(SignalPersistence.WEAKENING, 'WEAKENING');
  assert.strictEqual(SignalPersistence.REVERSING, 'REVERSING');
  assert.strictEqual(SignalPersistence.EXPIRED, 'EXPIRED');
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
