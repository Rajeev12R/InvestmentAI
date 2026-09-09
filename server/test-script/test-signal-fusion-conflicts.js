import assert from 'assert';
import { SignalFusionEngine } from '../signalIntelligence/signal.fusion.engine.js';
import { SignalRegime, SignalDirection, SignalStatus, SignalType } from '../signalIntelligence/signal.types.js';

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

console.log('=== Suite 5: Signal Fusion & Conflict Preservation ===');

it('should fuse unconflicted positive signals into STRONG_POSITIVE composite score', () => {
  const engine = new SignalFusionEngine();

  const signals = [
    { inputId: 's1', signalType: SignalType.GROWTH_SIGNAL, normalizedValue: 0.80, weight: 0.35 },
    { inputId: 's2', signalType: SignalType.FUNDAMENTAL_SIGNAL, normalizedValue: 0.70, weight: 0.35 },
    { inputId: 's3', signalType: SignalType.VALUATION_SIGNAL, normalizedValue: 0.60, weight: 0.30 }
  ];

  const res = engine.fuseSignals('tenant_01', {
    entityId: 'NVDA',
    signals
  });

  assert.strictEqual(res.regime, SignalRegime.STRONG_POSITIVE);
  assert.strictEqual(res.direction, SignalDirection.STRONGLY_POSITIVE);
  assert.strictEqual(res.score >= 0.65, true);
  assert.strictEqual(res.hasConflict, false);
  assert.strictEqual(res.status, SignalStatus.VALIDATED);
  assert.strictEqual(res.contributors.length, 3);
});

it('should detect direct signal contradictions and produce MIXED regime without silent averaging', () => {
  const engine = new SignalFusionEngine();

  // Positive Valuation & Earnings (+0.80) vs Negative Macro & Liquidity (-0.80)
  const conflictingSignals = [
    { inputId: 's_val', signalType: SignalType.VALUATION_SIGNAL, normalizedValue: 0.80, weight: 0.30 },
    { inputId: 's_earn', signalType: SignalType.EARNINGS_SIGNAL, normalizedValue: 0.75, weight: 0.25 },
    { inputId: 's_macro', signalType: SignalType.MACRO_SIGNAL, normalizedValue: -0.80, weight: 0.25 },
    { inputId: 's_liq', signalType: SignalType.LIQUIDITY_SIGNAL, normalizedValue: -0.75, weight: 0.20 }
  ];

  const res = engine.fuseSignals('tenant_01', {
    entityId: 'TSLA',
    signals: conflictingSignals
  });

  assert.strictEqual(res.hasConflict, true);
  assert.strictEqual(res.regime, SignalRegime.MIXED);
  assert.strictEqual(res.direction, SignalDirection.CONFLICTED);
  assert.strictEqual(res.status, SignalStatus.CONFLICTED);
  assert.strictEqual(res.positiveWeightSum >= 0.25, true);
  assert.strictEqual(res.negativeWeightSum >= 0.25, true);
});

it('should handle empty or missing signals returning UNAVAILABLE regime', () => {
  const engine = new SignalFusionEngine();

  const emptyRes = engine.fuseSignals('tenant_01', {
    entityId: 'UNKNOWN_TICKER',
    signals: []
  });

  assert.strictEqual(emptyRes.score, 0.0);
  assert.strictEqual(emptyRes.regime, SignalRegime.UNAVAILABLE);
  assert.strictEqual(emptyRes.direction, SignalDirection.UNKNOWN);
  assert.strictEqual(emptyRes.status, SignalStatus.UNAVAILABLE);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
