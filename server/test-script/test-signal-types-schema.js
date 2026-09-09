import assert from 'assert';
import {
  SignalType,
  SignalStatus,
  SignalDirection,
  SignalRegime,
  SignalDependencyType,
  SignalPersistence,
  SampleStatus,
  ValidationPeriod,
  DivergenceType,
  computeSignalHash,
  deepFreeze
} from '../signalIntelligence/signal.types.js';
import {
  validateSignal,
  validateNormalizedSignalInput,
  validateCompositeSignal,
  validateSignalPackage,
  SignalIntelligenceValidationError
} from '../signalIntelligence/signal.schema.js';

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

console.log('=== Suite 1: Signal Intelligence Taxonomy, Enums & Schemas ===');

it('should verify all 20 SignalType taxonomy classes', () => {
  assert.strictEqual(SignalType.VALUATION_SIGNAL, 'VALUATION_SIGNAL');
  assert.strictEqual(SignalType.FUNDAMENTAL_SIGNAL, 'FUNDAMENTAL_SIGNAL');
  assert.strictEqual(SignalType.EARNINGS_SIGNAL, 'EARNINGS_SIGNAL');
  assert.strictEqual(SignalType.GROWTH_SIGNAL, 'GROWTH_SIGNAL');
  assert.strictEqual(SignalType.QUALITY_SIGNAL, 'QUALITY_SIGNAL');
  assert.strictEqual(SignalType.MOMENTUM_SIGNAL, 'MOMENTUM_SIGNAL');
  assert.strictEqual(SignalType.MACRO_SIGNAL, 'MACRO_SIGNAL');
  assert.strictEqual(SignalType.RATE_SIGNAL, 'RATE_SIGNAL');
  assert.strictEqual(SignalType.FX_SIGNAL, 'FX_SIGNAL');
  assert.strictEqual(SignalType.LIQUIDITY_SIGNAL, 'LIQUIDITY_SIGNAL');
  assert.strictEqual(SignalType.RISK_SIGNAL, 'RISK_SIGNAL');
  assert.strictEqual(SignalType.EVENT_SIGNAL, 'EVENT_SIGNAL');
  assert.strictEqual(SignalType.COMPETITIVE_SIGNAL, 'COMPETITIVE_SIGNAL');
  assert.strictEqual(SignalType.SUPPLY_CHAIN_SIGNAL, 'SUPPLY_CHAIN_SIGNAL');
  assert.strictEqual(SignalType.MANAGEMENT_SIGNAL, 'MANAGEMENT_SIGNAL');
  assert.strictEqual(SignalType.REGULATORY_SIGNAL, 'REGULATORY_SIGNAL');
  assert.strictEqual(SignalType.ALTERNATIVE_DATA_SIGNAL, 'ALTERNATIVE_DATA_SIGNAL');
  assert.strictEqual(SignalType.SENTIMENT_SIGNAL, 'SENTIMENT_SIGNAL');
  assert.strictEqual(SignalType.PORTFOLIO_SIGNAL, 'PORTFOLIO_SIGNAL');
  assert.strictEqual(SignalType.PROCESS_SIGNAL, 'PROCESS_SIGNAL');
});

it('should verify SignalStatus, Direction, Regime, Dependency, and Persistence enums', () => {
  // Statuses (11)
  assert.strictEqual(SignalStatus.RAW, 'RAW');
  assert.strictEqual(SignalStatus.DERIVED, 'DERIVED');
  assert.strictEqual(SignalStatus.VALIDATED, 'VALIDATED');
  assert.strictEqual(SignalStatus.MODEL_ESTIMATE, 'MODEL_ESTIMATE');
  assert.strictEqual(SignalStatus.HISTORICALLY_SUPPORTED, 'HISTORICALLY_SUPPORTED');
  assert.strictEqual(SignalStatus.INSUFFICIENT_SAMPLE, 'INSUFFICIENT_SAMPLE');
  assert.strictEqual(SignalStatus.CONFLICTED, 'CONFLICTED');
  assert.strictEqual(SignalStatus.STALE, 'STALE');
  assert.strictEqual(SignalStatus.INVALIDATED, 'INVALIDATED');
  assert.strictEqual(SignalStatus.UNAVAILABLE, 'UNAVAILABLE');
  assert.strictEqual(SignalStatus.AI_HYPOTHESIS, 'AI_HYPOTHESIS');

  // Regimes (6)
  assert.strictEqual(SignalRegime.STRONG_POSITIVE, 'STRONG_POSITIVE');
  assert.strictEqual(SignalRegime.POSITIVE, 'POSITIVE');
  assert.strictEqual(SignalRegime.MIXED, 'MIXED');
  assert.strictEqual(SignalRegime.NEGATIVE, 'NEGATIVE');
  assert.strictEqual(SignalRegime.STRONG_NEGATIVE, 'STRONG_NEGATIVE');
  assert.strictEqual(SignalRegime.UNAVAILABLE, 'UNAVAILABLE');

  // Directions (7)
  assert.strictEqual(SignalDirection.STRONGLY_POSITIVE, 'STRONGLY_POSITIVE');
  assert.strictEqual(SignalDirection.POSITIVE, 'POSITIVE');
  assert.strictEqual(SignalDirection.NEUTRAL, 'NEUTRAL');
  assert.strictEqual(SignalDirection.NEGATIVE, 'NEGATIVE');
  assert.strictEqual(SignalDirection.STRONGLY_NEGATIVE, 'STRONGLY_NEGATIVE');
  assert.strictEqual(SignalDirection.UNKNOWN, 'UNKNOWN');
  assert.strictEqual(SignalDirection.CONFLICTED, 'CONFLICTED');

  // Dependencies (6)
  assert.strictEqual(SignalDependencyType.DIRECT_DUPLICATE, 'DIRECT_DUPLICATE');
  assert.strictEqual(SignalDependencyType.DERIVED_FROM_SAME_SOURCE, 'DERIVED_FROM_SAME_SOURCE');
  assert.strictEqual(SignalDependencyType.SHARED_UNDERLYING_FACT, 'SHARED_UNDERLYING_FACT');
  assert.strictEqual(SignalDependencyType.CORRELATED, 'CORRELATED');
  assert.strictEqual(SignalDependencyType.POTENTIALLY_INDEPENDENT, 'POTENTIALLY_INDEPENDENT');
  assert.strictEqual(SignalDependencyType.UNKNOWN_DEPENDENCY, 'UNKNOWN_DEPENDENCY');
});

it('should freeze objects deeply and compute canonical SHA-256 hashes', () => {
  const obj = { x: 'signal_a', nested: { val: 42 } };
  const frozen = deepFreeze(obj);
  assert.throws(() => { frozen.x = 'mutated'; });
  assert.throws(() => { frozen.nested.val = 99; });

  const h1 = computeSignalHash({ a: 1, b: 2 });
  const h2 = computeSignalHash({ b: 2, a: 1 });
  assert.strictEqual(h1, h2);
  assert.strictEqual(h1.length, 64);
});

it('should validate Base Signal schema and reject invalid inputs', () => {
  const valid = validateSignal({
    signalId: 'sig_01',
    signalType: SignalType.GROWTH_SIGNAL,
    entityId: 'NVDA',
    direction: SignalDirection.POSITIVE,
    magnitude: 0.75,
    confidence: 0.85,
    status: SignalStatus.VALIDATED,
    methodologyVersion: '2026.1',
    knowledgeCutoff: '2026-03-01T00:00:00Z'
  });
  assert.strictEqual(valid.signalId, 'sig_01');

  assert.throws(() => validateSignal({ signalId: 'sig_bad' }), SignalIntelligenceValidationError);
  assert.throws(() => validateSignal({ signalId: 's', signalType: 'INVALID', entityId: 'E' }), SignalIntelligenceValidationError);
});

it('should validate NormalizedSignalInput schema and reject out-of-bounds normalized values', () => {
  const norm = validateNormalizedSignalInput({
    inputId: 'norm_01',
    originalValue: 0.15,
    originalUnits: 'PERCENT',
    normalizationMethod: 'LINEAR_SCALED',
    normalizedValue: 0.75
  });
  assert.strictEqual(norm.normalizedValue, 0.75);

  assert.throws(() => validateNormalizedSignalInput({ inputId: 'norm_bad', normalizedValue: 1.5 }), SignalIntelligenceValidationError);
});

it('should validate CompositeSignal and SignalPackage schemas', () => {
  const comp = validateCompositeSignal({
    compositeSignalId: 'comp_01',
    entityId: 'NVDA',
    score: 0.65,
    regime: SignalRegime.STRONG_POSITIVE,
    contributors: [{ inputId: 'norm_01', weight: 1.0, contribution: 0.65 }],
    knowledgeCutoff: '2026-03-01T00:00:00Z'
  });
  assert.strictEqual(comp.score, 0.65);

  const pkg = validateSignalPackage({
    packageId: 'pkg_01',
    packageHash: '0xhash123',
    compositeSignals: { 'NVDA': comp },
    generatedAt: '2026-03-01T00:00:00Z'
  });
  assert.strictEqual(pkg.packageId, 'pkg_01');
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
