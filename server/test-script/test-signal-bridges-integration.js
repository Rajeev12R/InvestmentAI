import assert from 'assert';
import { SignalIntelligenceStore } from '../signalIntelligence/signal.store.js';
import { SignalIntelligenceBridges } from '../signalIntelligence/signal.bridges.js';
import { SignalRegime, SignalDirection, SignalStatus, DivergenceType } from '../signalIntelligence/signal.types.js';

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

console.log('=== Suite 11: Cross-Platform Signal Intelligence Bridges ===');

it('should synthesize research signal section for Phase 24 Research Briefs', () => {
  const store = new SignalIntelligenceStore();
  const bridges = new SignalIntelligenceBridges(store);

  const comp = store.saveCompositeSignal('tenant_01', {
    compositeSignalId: 'comp_synth_01',
    entityId: 'NVDA',
    score: 0.72,
    regime: SignalRegime.STRONG_POSITIVE,
    direction: SignalDirection.STRONGLY_POSITIVE,
    confidence: 0.88,
    status: SignalStatus.VALIDATED,
    contributors: [
      { inputId: 'norm_rev', signalType: 'GROWTH_SIGNAL', contribution: 0.40, evidenceIds: ['ev_sec_10k'] },
      { inputId: 'norm_dcf', signalType: 'VALUATION_SIGNAL', contribution: 0.32, evidenceIds: ['ev_dcf'] }
    ],
    divergences: [],
    knowledgeCutoff: '2026-03-01T00:00:00Z'
  });

  const section = bridges.synthesizeResearchSignalSection('tenant_01', comp.compositeSignalId);
  assert.strictEqual(section.compositeScore, 0.72);
  assert.strictEqual(section.regime, SignalRegime.STRONG_POSITIVE);
  assert.strictEqual(section.dominantFactors.length, 2);
  assert.strictEqual(section.provenanceLinkage.includes('ev_sec_10k'), true);
});

it('should generate Attention Triggers for Phase 7 Attention Engine on signal conflicts and high divergences', () => {
  const store = new SignalIntelligenceStore();
  const bridges = new SignalIntelligenceBridges(store);

  const compConflicted = store.saveCompositeSignal('tenant_01', {
    compositeSignalId: 'comp_att_01',
    entityId: 'TSLA',
    score: 0.05,
    regime: SignalRegime.MIXED,
    direction: SignalDirection.CONFLICTED,
    hasConflict: true,
    confidence: 0.45,
    status: SignalStatus.CONFLICTED,
    contributors: [{ inputId: 'c1', signalType: 'GROWTH_SIGNAL', normalizedValue: 0.05, weight: 1.0, contribution: 0.05 }],
    divergences: [
      {
        divergenceId: 'div_att_01',
        divergenceType: DivergenceType.VALUATION_VS_FUNDAMENTALS,
        severity: 'HIGH',
        description: 'Severe valuation divergence'
      }
    ],
    knowledgeCutoff: '2026-03-01T00:00:00Z'
  });

  const triggers = bridges.generateAttentionTriggers('tenant_01', compConflicted.compositeSignalId);
  assert.strictEqual(triggers.length, 2); // 1 conflict trigger + 1 divergence trigger
  assert.strictEqual(triggers[0].attentionType, 'SIGNAL_CONFLICT_DETECTED');
  assert.strictEqual(triggers[1].attentionType, 'SIGNAL_DIVERGENCE_ALERT');
  assert.strictEqual(triggers[1].severity, 'HIGH');
});

it('should evaluate forecast alignment vs composite signal direction for Phase 20 Forecasting', () => {
  const store = new SignalIntelligenceStore();
  const bridges = new SignalIntelligenceBridges(store);

  const comp = store.saveCompositeSignal('tenant_01', {
    compositeSignalId: 'comp_fore_01',
    entityId: 'AAPL',
    score: 0.65,
    regime: SignalRegime.STRONG_POSITIVE,
    direction: SignalDirection.STRONGLY_POSITIVE,
    contributors: [{ inputId: 'c1', signalType: 'GROWTH_SIGNAL', normalizedValue: 0.65, weight: 1.0, contribution: 0.65 }],
    knowledgeCutoff: '2026-03-01T00:00:00Z'
  });

  // 1. Positive Signal + Positive Forecast -> Aligned
  const aligned = bridges.compareForecastAlignment('tenant_01', {
    entityId: 'AAPL',
    compositeSignalId: comp.compositeSignalId,
    forecastDirection: 'POSITIVE'
  });
  assert.strictEqual(aligned.alignmentStatus, 'ALIGNED');
  assert.strictEqual(aligned.isAligned, true);

  // 2. Positive Signal + Negative Forecast -> Divergent
  const divergent = bridges.compareForecastAlignment('tenant_01', {
    entityId: 'AAPL',
    compositeSignalId: comp.compositeSignalId,
    forecastDirection: 'NEGATIVE'
  });
  assert.strictEqual(divergent.alignmentStatus, 'FORECAST_SIGNAL_DIVERGENCE');
  assert.strictEqual(divergent.isAligned, false);
});

it('should create immutable Decision Signal Snapshot for Phase 13 Decision Intelligence', () => {
  const store = new SignalIntelligenceStore();
  const bridges = new SignalIntelligenceBridges(store);

  const comp = store.saveCompositeSignal('tenant_01', {
    compositeSignalId: 'comp_dec_01',
    entityId: 'NVDA',
    score: 0.85,
    regime: SignalRegime.STRONG_POSITIVE,
    direction: SignalDirection.STRONGLY_POSITIVE,
    confidence: 0.92,
    contributors: [{ inputId: 'i1', weight: 1.0, contribution: 0.85 }],
    knowledgeCutoff: '2026-03-01T00:00:00Z'
  });

  const snap = bridges.createDecisionSignalSnapshot('tenant_01', {
    decisionId: 'DEC_2026_03_01_NVDA',
    entityId: 'NVDA',
    compositeSignalId: comp.compositeSignalId,
    decisionType: 'BUY_ALLOCATION_INCREASE',
    analystRationale: 'Strong composite growth signal confirmed by out-of-sample data'
  });

  assert.strictEqual(snap.decisionId, 'DEC_2026_03_01_NVDA');
  assert.strictEqual(snap.score, 0.85);
  assert.strictEqual(snap.regime, SignalRegime.STRONG_POSITIVE);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
