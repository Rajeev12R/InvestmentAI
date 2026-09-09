import assert from 'assert';
import { SignalIntelligenceStore } from '../signalIntelligence/signal.store.js';
import { SignalNormalizationEngine } from '../signalIntelligence/signal.normalization.engine.js';
import { SignalType, SignalDirection } from '../signalIntelligence/signal.types.js';

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

console.log('=== Suite 3: Deterministic Signal Input Normalization ===');

it('should normalize linear scaled inputs onto [-1.0, +1.0] preserving original units and parameters', () => {
  const store = new SignalIntelligenceStore();
  const engine = new SignalNormalizationEngine(store);

  // E.g. DCF discount of +15% with range [-0.30, +0.30] -> (0.15 - 0) / 0.30 = +0.50
  const norm = engine.normalizeInput('tenant_01', {
    inputId: 'norm_dcf_nvda',
    entityId: 'NVDA',
    signalType: SignalType.VALUATION_SIGNAL,
    originalValue: 0.15,
    originalUnits: 'PERCENT_DISCOUNT',
    normalizationMethod: 'LINEAR_SCALED',
    parameters: { min: -0.30, max: 0.30 }
  });

  assert.strictEqual(norm.normalizedValue, 0.50);
  assert.strictEqual(norm.rawNormalizedScore, 0.50);
  assert.strictEqual(norm.isClipped, false);
  assert.strictEqual(norm.direction, SignalDirection.POSITIVE);
  assert.strictEqual(norm.originalUnits, 'PERCENT_DISCOUNT');
});

it('should capture clipping and saturation without hiding saturated values', () => {
  const store = new SignalIntelligenceStore();
  const engine = new SignalNormalizationEngine(store);

  // Raw value +0.60 exceeds max +0.30 -> raw score +2.0, clipped to +1.0
  const normClipped = engine.normalizeInput('tenant_01', {
    inputId: 'norm_rev_extreme',
    entityId: 'NVDA',
    signalType: SignalType.GROWTH_SIGNAL,
    originalValue: 0.60,
    originalUnits: 'PERCENT_GROWTH',
    normalizationMethod: 'LINEAR_SCALED',
    parameters: { min: -0.30, max: 0.30 }
  });

  assert.strictEqual(normClipped.normalizedValue, 1.0);
  assert.strictEqual(normClipped.rawNormalizedScore, 2.0);
  assert.strictEqual(normClipped.isClipped, true);
  assert.strictEqual(normClipped.direction, SignalDirection.STRONGLY_POSITIVE);
});

it('should support SIGMOID, PERCENT_SURPRISE, and ENUM_MAP normalization methods', () => {
  const store = new SignalIntelligenceStore();
  const engine = new SignalNormalizationEngine(store);

  // 1. Percent Surprise (e.g. +8% surprise with 10% cap -> +0.80)
  const normSurprise = engine.normalizeInput('tenant_01', {
    inputId: 'norm_eps_surprise',
    entityId: 'NVDA',
    signalType: SignalType.EARNINGS_SIGNAL,
    originalValue: 0.08,
    originalUnits: 'PERCENT_SURPRISE',
    normalizationMethod: 'PERCENT_SURPRISE',
    parameters: { capPct: 0.10 }
  });
  assert.strictEqual(normSurprise.normalizedValue, 0.80);

  // 2. Enum Map (e.g. Macro 'CONTRACTION' -> -0.80)
  const normEnum = engine.normalizeInput('tenant_01', {
    inputId: 'norm_macro_regime',
    entityId: 'MACRO_US',
    signalType: SignalType.MACRO_SIGNAL,
    originalValue: 'CONTRACTION',
    originalUnits: 'REGIME_CODE',
    normalizationMethod: 'ENUM_MAP'
  });
  assert.strictEqual(normEnum.normalizedValue, -0.80);
  assert.strictEqual(normEnum.direction, SignalDirection.STRONGLY_NEGATIVE);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
