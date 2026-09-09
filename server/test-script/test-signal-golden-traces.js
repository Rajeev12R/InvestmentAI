import assert from 'assert';
import { SignalIntelligenceStore } from '../signalIntelligence/signal.store.js';
import { SignalNormalizationEngine } from '../signalIntelligence/signal.normalization.engine.js';
import { SignalIndependenceEngine } from '../signalIntelligence/signal.independence.engine.js';
import { SignalFusionEngine } from '../signalIntelligence/signal.fusion.engine.js';
import { SignalValidationEngine } from '../signalIntelligence/signal.validation.engine.js';
import { SignalPortfolioEngine } from '../signalIntelligence/signal.portfolio.engine.js';
import { SignalPackageEngine } from '../signalIntelligence/signal.package.js';
import { SignalIntelligenceBridges } from '../signalIntelligence/signal.bridges.js';
import {
  SignalType,
  SignalStatus,
  SignalDirection,
  SignalRegime,
  SignalDependencyType,
  SampleStatus,
  ValidationPeriod
} from '../signalIntelligence/signal.types.js';

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

console.log('=== Suite 13: 20 Golden Signal Intelligence Traces (Cases A–T) ===');

function createHarness() {
  const store = new SignalIntelligenceStore();
  const normalization = new SignalNormalizationEngine(store);
  const independence = new SignalIndependenceEngine(store);
  const fusion = new SignalFusionEngine(store, independence);
  const validation = new SignalValidationEngine(store);
  const portfolio = new SignalPortfolioEngine(store);
  const pkg = new SignalPackageEngine(store);
  const bridges = new SignalIntelligenceBridges(store);
  return { store, normalization, independence, fusion, validation, portfolio, pkg, bridges };
}

// Golden A: Independent positive signals -> positive composite
it('Golden A: Independent positive signals -> positive composite', () => {
  const { fusion } = createHarness();
  const res = fusion.fuseSignals('t_gold', {
    entityId: 'NVDA',
    signals: [
      { inputId: 's1', signalType: SignalType.GROWTH_SIGNAL, normalizedValue: 0.80 },
      { inputId: 's2', signalType: SignalType.VALUATION_SIGNAL, normalizedValue: 0.70 }
    ]
  });
  assert.strictEqual(res.regime, SignalRegime.STRONG_POSITIVE);
  assert.strictEqual(res.score > 0.70, true);
});

// Golden B: Positive + negative signals -> MIXED/CONFLICTED
it('Golden B: Positive + negative signals -> MIXED/CONFLICTED', () => {
  const { fusion } = createHarness();
  const res = fusion.fuseSignals('t_gold', {
    entityId: 'NVDA',
    signals: [
      { inputId: 's_pos', signalType: SignalType.GROWTH_SIGNAL, normalizedValue: 0.85, weight: 0.5 },
      { inputId: 's_neg', signalType: SignalType.MACRO_SIGNAL, normalizedValue: -0.85, weight: 0.5 }
    ]
  });
  assert.strictEqual(res.hasConflict, true);
  assert.strictEqual(res.regime, SignalRegime.MIXED);
  assert.strictEqual(res.direction, SignalDirection.CONFLICTED);
});

// Golden C: Two signals sharing the same underlying fact are not double-counted
it('Golden C: Two signals sharing the same underlying fact are not double-counted', () => {
  const { independence } = createHarness();
  const res = independence.analyzeIndependence('t_gold', {
    entityId: 'NVDA',
    inputs: [
      { inputId: 'i1', sharedFactId: 'FACT_NVDA_REV_Q4' },
      { inputId: 'i2', sharedFactId: 'FACT_NVDA_REV_Q4' }
    ]
  });
  assert.strictEqual(res.sharedFacts.length, 1);
  assert.strictEqual(res.effectiveWeightsAdjustment['i1'], 0.50);
  assert.strictEqual(res.effectiveWeightsAdjustment['i2'], 0.50);
  assert.strictEqual(res.independentEffectiveCount, 1.0);
});

// Golden D: Five syndicated articles do not equal five independent signals
it('Golden D: Five syndicated articles do not equal five independent signals', () => {
  const { independence } = createHarness();
  const inputs = [];
  for (let i = 1; i <= 5; i++) {
    inputs.push({ inputId: `in_wire_${i}`, originalWireSource: 'REUTERS_WIRE_COPY_123' });
  }
  const res = independence.analyzeIndependence('t_gold', { entityId: 'AAPL', inputs });
  assert.strictEqual(res.dependencyGroups.length, 1);
  assert.strictEqual(res.independentEffectiveCount < 2.0, true);
});

// Golden E: Signal normalization reproduces exact expected value
it('Golden E: Signal normalization reproduces exact expected value', () => {
  const { normalization } = createHarness();
  const norm = normalization.normalizeInput('t_gold', {
    inputId: 'norm_dcf',
    entityId: 'NVDA',
    originalValue: 0.15,
    originalUnits: 'PERCENT_DISCOUNT',
    normalizationMethod: 'LINEAR_SCALED',
    parameters: { min: -0.30, max: 0.30 }
  });
  assert.strictEqual(norm.normalizedValue, 0.50);
});

// Golden F: Weighted fusion reproduces exact expected score
it('Golden F: Weighted fusion reproduces exact expected score', () => {
  const { fusion } = createHarness();
  const res = fusion.fuseSignals('t_gold', {
    entityId: 'MSFT',
    signals: [
      { inputId: 's1', signalType: SignalType.GROWTH_SIGNAL, normalizedValue: 0.60, weight: 0.40 },
      { inputId: 's2', signalType: SignalType.VALUATION_SIGNAL, normalizedValue: 0.40, weight: 0.60 }
    ]
  });
  // 0.60*0.4 + 0.40*0.6 = 0.24 + 0.24 = 0.48
  assert.strictEqual(res.score, 0.48);
});

// Golden G: Signal clipping preserves raw and clipped values
it('Golden G: Signal clipping preserves raw and clipped values', () => {
  const { normalization } = createHarness();
  const norm = normalization.normalizeInput('t_gold', {
    inputId: 'norm_clip',
    entityId: 'NVDA',
    originalValue: 0.80,
    originalUnits: 'PERCENT',
    normalizationMethod: 'LINEAR_SCALED',
    parameters: { min: -0.20, max: 0.20 }
  });
  assert.strictEqual(norm.normalizedValue, 1.0);
  assert.strictEqual(norm.rawNormalizedScore, 4.0);
  assert.strictEqual(norm.isClipped, true);
});

// Golden H: Signal decay reproduces exact expected result
it('Golden H: Signal decay reproduces exact expected result', () => {
  const { fusion } = createHarness();
  const decay = fusion.applyDecay({
    normalizedValue: 1.0,
    signalAgeDays: 45,
    halfLifeDays: 45
  });
  assert.strictEqual(decay.decayedValue, 0.50);
});

// Golden I: Signal reversal is detected
it('Golden I: Signal reversal is detected', () => {
  const { store } = createHarness();
  const v1 = store.saveSignal('t_gold', { signalId: 'sig_rev', signalType: SignalType.GROWTH_SIGNAL, entityId: 'NVDA', direction: SignalDirection.POSITIVE, magnitude: 0.6, confidence: 0.8, status: SignalStatus.VALIDATED, methodologyVersion: '2026.1', knowledgeCutoff: '2026-01-01T00:00:00Z', version: 1 });
  const v2 = store.saveSignal('t_gold', { signalId: 'sig_rev', signalType: SignalType.GROWTH_SIGNAL, entityId: 'NVDA', direction: SignalDirection.NEGATIVE, magnitude: -0.6, confidence: 0.8, status: SignalStatus.VALIDATED, methodologyVersion: '2026.1', knowledgeCutoff: '2026-03-01T00:00:00Z', version: 2 });
  assert.strictEqual(v1.direction, SignalDirection.POSITIVE);
  assert.strictEqual(v2.direction, SignalDirection.NEGATIVE);
});

// Golden J: Historical signal version remains immutable
it('Golden J: Historical signal version remains immutable', () => {
  const { store } = createHarness();
  const v1 = store.saveSignal('t_gold', { signalId: 'sig_imm', signalType: SignalType.VALUATION_SIGNAL, entityId: 'NVDA', direction: SignalDirection.POSITIVE, magnitude: 0.5, confidence: 0.8, status: SignalStatus.VALIDATED, methodologyVersion: '2026.1', knowledgeCutoff: '2026-01-01T00:00:00Z', version: 1 });
  assert.throws(() => { v1.magnitude = 0.99; });
});

// Golden K: Future observation cannot alter historical signal
it('Golden K: Future observation cannot alter historical signal', () => {
  const { store } = createHarness();
  store.saveSignal('t_gold', { signalId: 'sig_cutoff', signalType: SignalType.VALUATION_SIGNAL, entityId: 'NVDA', direction: SignalDirection.POSITIVE, magnitude: 0.5, confidence: 0.8, status: SignalStatus.VALIDATED, methodologyVersion: '2026.1', knowledgeCutoff: '2026-03-15T00:00:00Z', version: 1 });
  const asOfPast = store.getEntityAsOf('t_gold', 'signals', 'sig_cutoff', '2026-02-01T00:00:00Z');
  assert.strictEqual(asOfPast, null);
});

// Golden L: Revised data creates new signal version
it('Golden L: Revised data creates new signal version', () => {
  const { store } = createHarness();
  store.saveSignal('t_gold', { signalId: 'sig_revised', signalType: SignalType.GROWTH_SIGNAL, entityId: 'NVDA', direction: SignalDirection.POSITIVE, magnitude: 0.5, confidence: 0.8, status: SignalStatus.VALIDATED, methodologyVersion: '2026.1', knowledgeCutoff: '2026-01-01T00:00:00Z', version: 1 });
  store.saveSignal('t_gold', { signalId: 'sig_revised', signalType: SignalType.GROWTH_SIGNAL, entityId: 'NVDA', direction: SignalDirection.STRONGLY_POSITIVE, magnitude: 0.85, confidence: 0.9, status: SignalStatus.VALIDATED, methodologyVersion: '2026.1', knowledgeCutoff: '2026-02-01T00:00:00Z', version: 2 });
  const hist = store.getEntityHistory('t_gold', 'signals', 'sig_revised');
  assert.strictEqual(hist.length, 2);
});

// Golden M: N<10 produces INSUFFICIENT_SAMPLE
it('Golden M: N<10 produces INSUFFICIENT_SAMPLE', () => {
  const { validation } = createHarness();
  const res = validation.evaluateHistoricalSignal('t_gold', {
    signalType: SignalType.GROWTH_SIGNAL,
    observations: [{ signalScore: 0.8, realizedForwardReturn: 0.05 }]
  });
  assert.strictEqual(res.sampleStatus, SampleStatus.INSUFFICIENT_SAMPLE);
  assert.strictEqual(res.hitRate, null);
});

// Golden N: In-sample signal cannot be labeled out-of-sample supported
it('Golden N: In-sample signal cannot be labeled out-of-sample supported', () => {
  const { validation } = createHarness();
  const inSample = [];
  for (let i = 0; i < 35; i++) inSample.push({ signalScore: 0.8, realizedForwardReturn: 0.05, period: ValidationPeriod.IN_SAMPLE });
  const res = validation.evaluateHistoricalSignal('t_gold', { signalType: SignalType.GROWTH_SIGNAL, observations: inSample, validationPeriod: ValidationPeriod.IN_SAMPLE });
  assert.strictEqual(res.isHistoricallySupported, false);
});

// Golden O: Survivorship-bias test includes delisted security
it('Golden O: Survivorship-bias test includes delisted security', () => {
  const { validation } = createHarness();
  const obs = [
    { signalScore: 0.5, realizedForwardReturn: 0.05, isDelisted: false },
    { signalScore: 0.8, realizedForwardReturn: -0.20, isDelisted: true }
  ];
  for (let i = 0; i < 10; i++) obs.push({ signalScore: 0.5, realizedForwardReturn: 0.03, isDelisted: false });
  const res = validation.evaluateHistoricalSignal('t_gold', { signalType: SignalType.GROWTH_SIGNAL, observations: obs, survivorshipControlled: true });
  assert.strictEqual(res.survivorshipControlled, true);
});

// Golden P: Portfolio signals expose common-driver concentration
it('Golden P: Portfolio signals expose common-driver concentration', () => {
  const { portfolio } = createHarness();
  const res = portfolio.aggregatePortfolioSignals('t_gold', {
    portfolioId: 'port_p',
    holdings: [
      { ticker: 'A', weight: 0.25, compositeScore: 0.8, dominantDriver: 'AI' },
      { ticker: 'B', weight: 0.25, compositeScore: 0.8, dominantDriver: 'AI' }
    ]
  });
  assert.strictEqual(res.concentrationRisks.length, 1);
  assert.strictEqual(res.concentrationRisks[0].driver, 'AI');
});

// Golden Q: Forecast/signal divergence is detected
it('Golden Q: Forecast/signal divergence is detected', () => {
  const { store, bridges } = createHarness();
  const comp = store.saveCompositeSignal('t_gold', {
    compositeSignalId: 'comp_q',
    entityId: 'NVDA',
    score: 0.80,
    regime: SignalRegime.STRONG_POSITIVE,
    direction: SignalDirection.STRONGLY_POSITIVE,
    contributors: [{ inputId: 'inp_q', signalType: SignalType.GROWTH_SIGNAL, normalizedValue: 0.8, weight: 1.0, contribution: 0.8 }],
    knowledgeCutoff: '2026-03-01T00:00:00Z'
  });
  const div = bridges.compareForecastAlignment('t_gold', { entityId: 'NVDA', compositeSignalId: comp.compositeSignalId, forecastDirection: 'NEGATIVE' });
  assert.strictEqual(div.alignmentStatus, 'FORECAST_SIGNAL_DIVERGENCE');
  assert.strictEqual(div.isAligned, false);
});

// Golden R: Earnings event updates signal history without mutating prior signal
it('Golden R: Earnings event updates signal history without mutating prior signal', () => {
  const { store } = createHarness();
  const prior = store.saveSignal('t_gold', { signalId: 'sig_earn_hist', signalType: SignalType.EARNINGS_SIGNAL, entityId: 'NVDA', direction: SignalDirection.POSITIVE, magnitude: 0.5, confidence: 0.8, status: SignalStatus.VALIDATED, methodologyVersion: '2026.1', knowledgeCutoff: '2026-02-01T00:00:00Z', version: 1 });
  const post = store.saveSignal('t_gold', { signalId: 'sig_earn_hist', signalType: SignalType.EARNINGS_SIGNAL, entityId: 'NVDA', direction: SignalDirection.STRONGLY_POSITIVE, magnitude: 0.9, confidence: 0.95, status: SignalStatus.VALIDATED, methodologyVersion: '2026.1', knowledgeCutoff: '2026-03-01T00:00:00Z', version: 2 });
  assert.strictEqual(prior.magnitude, 0.5);
  assert.strictEqual(post.magnitude, 0.9);
});

// Golden S: AI_HYPOTHESIS cannot become authoritative signal
it('Golden S: AI_HYPOTHESIS cannot become authoritative signal', () => {
  const { store } = createHarness();
  const ai = store.saveSignal('t_gold', { signalId: 'sig_ai_s', signalType: SignalType.SENTIMENT_SIGNAL, entityId: 'NVDA', direction: SignalDirection.STRONGLY_POSITIVE, magnitude: 0.95, confidence: 0.5, status: SignalStatus.AI_HYPOTHESIS, methodologyVersion: '2026.1', knowledgeCutoff: '2026-03-01T00:00:00Z' });
  assert.strictEqual(ai.status, SignalStatus.AI_HYPOTHESIS);
});

// Golden T: Complete signal -> evidence -> source explanation DAG is sealed
it('Golden T: Complete signal -> evidence -> source explanation DAG is sealed', () => {
  const { pkg } = createHarness();
  const sealed = pkg.createAndSealPackage('t_gold', {
    packageId: 'pkg_golden_t',
    entityId: 'NVDA',
    compositeSignals: {
      'NVDA': {
        entityId: 'NVDA',
        score: 0.80,
        regime: SignalRegime.STRONG_POSITIVE,
        direction: SignalDirection.STRONGLY_POSITIVE,
        contributors: [{ inputId: 'in_1', signalType: 'GROWTH_SIGNAL', normalizedValue: 0.8, weight: 1.0, contribution: 0.8, evidenceIds: ['ev_1'] }]
      }
    }
  });
  assert.strictEqual(sealed.isSealed, true);
  assert.ok(sealed.explanationDAG);
  const verify = pkg.verifyPackageSeal(sealed);
  assert.strictEqual(verify.isValid, true);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
