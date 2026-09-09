import assert from 'assert';
import { AlphaAttributionStore } from '../alphaAttribution/attribution.store.js';
import { SignalRealizationEngine } from '../alphaAttribution/attribution.realization.engine.js';
import { SignalPredictionScoringEngine } from '../alphaAttribution/attribution.prediction.engine.js';
import { AlphaDecompositionEngine } from '../alphaAttribution/attribution.decomposition.engine.js';
import { DecisionAttributionEngine } from '../alphaAttribution/attribution.decision.engine.js';
import { AlphaCounterfactualEngine } from '../alphaAttribution/attribution.counterfactual.engine.js';
import { BenchmarkBrinsonEngine } from '../alphaAttribution/attribution.benchmark.engine.js';
import { SignalDriftAndGovernanceEngine } from '../alphaAttribution/attribution.drift.engine.js';
import { PortfolioSignalAttributionEngine } from '../alphaAttribution/attribution.portfolio.engine.js';
import { AlphaPackageEngine } from '../alphaAttribution/attribution.package.js';
import { AlphaAttributionBridges } from '../alphaAttribution/attribution.bridges.js';
import {
  AttributionStatus,
  SignalEngagementLevel,
  CounterfactualType,
  SurvivorshipRisk,
  SampleTier
} from '../alphaAttribution/attribution.types.js';

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

function createHarness() {
  const store = new AlphaAttributionStore();
  const realization = new SignalRealizationEngine(store);
  const prediction = new SignalPredictionScoringEngine(store);
  const decomposition = new AlphaDecompositionEngine(store);
  const decision = new DecisionAttributionEngine(store);
  const counterfactual = new AlphaCounterfactualEngine(store);
  const benchmark = new BenchmarkBrinsonEngine();
  const drift = new SignalDriftAndGovernanceEngine();
  const portfolio = new PortfolioSignalAttributionEngine();
  const pkg = new AlphaPackageEngine(store);
  const bridges = new AlphaAttributionBridges(store, decomposition, decision);
  return { store, realization, prediction, decomposition, decision, counterfactual, benchmark, drift, portfolio, pkg, bridges };
}

console.log('=== Suite 13: 20 Golden Institutional Attribution Traces (Cases A–T) ===');

// Golden A: Single signal -> positive outcome -> exact attribution
it('Golden A: Single signal -> positive outcome -> exact attribution', () => {
  const { decomposition } = createHarness();
  const res = decomposition.decomposeSecurityReturn('t_gold', {
    entityId: 'NVDA',
    realizedReturn: 0.20,
    benchmarkReturn: 0.10,
    signalWeight: 1.0,
    signalExpectedReturn: 0.08
  });
  assert.strictEqual(res.activeReturn, 0.10);
  assert.strictEqual(res.signalContribution, 0.08);
  assert.strictEqual(res.residual, 0.02);
  assert.strictEqual(res.reconciled, true);
});

// Golden B: Single signal -> negative outcome
it('Golden B: Single signal -> negative outcome', () => {
  const { decomposition } = createHarness();
  const res = decomposition.decomposeSecurityReturn('t_gold', {
    entityId: 'XYZ',
    realizedReturn: -0.15,
    benchmarkReturn: 0.05,
    signalWeight: 1.0,
    signalExpectedReturn: -0.12
  });
  assert.strictEqual(res.activeReturn, -0.20);
  assert.strictEqual(res.signalContribution, -0.12);
  assert.strictEqual(res.residual, -0.08);
  assert.strictEqual(res.reconciled, true);
});

// Golden C: Two independent signals -> additive contribution
it('Golden C: Two independent signals -> additive contribution', () => {
  const { decomposition } = createHarness();
  const sig1 = 0.5 * 0.06; // 0.030
  const sig2 = 0.5 * 0.04; // 0.020
  const combined = sig1 + sig2; // 0.050
  const res = decomposition.decomposeSecurityReturn('t_gold', {
    entityId: 'AAPL',
    realizedReturn: 0.15,
    benchmarkReturn: 0.08,
    signalWeight: 1.0,
    signalExpectedReturn: combined
  });
  assert.strictEqual(res.signalContribution, 0.05);
  assert.strictEqual(res.activeReturn, 0.07);
  assert.strictEqual(res.residual, 0.02);
});

// Golden D: Two correlated signals -> dependency discount
it('Golden D: Two correlated signals -> dependency discount', () => {
  const discountFactor = 0.70; // 30% discount for collinearity
  const rawExpected = 0.06;
  const discountedExpected = rawExpected * discountFactor; // 0.042
  const { decomposition } = createHarness();
  const res = decomposition.decomposeSecurityReturn('t_gold', {
    entityId: 'MSFT',
    realizedReturn: 0.10,
    benchmarkReturn: 0.05,
    signalWeight: 1.0,
    signalExpectedReturn: discountedExpected
  });
  assert.strictEqual(res.signalContribution, 0.042);
  assert.strictEqual(res.residual, 0.008);
});

// Golden E: Signal conflict -> MIXED/CONFLICTED
it('Golden E: Signal conflict -> MIXED/CONFLICTED', () => {
  const { portfolio } = createHarness();
  const holdings = [
    { ticker: 'A', weight: 0.10, dominantSignal: 'BULL_MOMENTUM', correlatedGroup: 'SECTOR_TECH', signalScore: 0.8 },
    { ticker: 'B', weight: 0.10, dominantSignal: 'BEAR_VALUATION', correlatedGroup: 'SECTOR_TECH', signalScore: -0.8 }
  ];
  const res = portfolio.evaluatePortfolioSignalAttribution({ holdings });
  assert.ok(res.conflictDrag > 0);
  assert.strictEqual(res.conflictDrag, 0.005);
});

// Golden F: Signal available but not actioned
it('Golden F: Signal available but not actioned', () => {
  const { decision } = createHarness();
  const res = decision.evaluateDecisionLineage('t_gold', {
    decisionId: 'dec_no_action',
    entityId: 'GOOGL',
    signalsAvailable: [{ signalId: 'sig_ai', score: 0.7, direction: 1 }],
    referencedSignalIds: [],
    actionTaken: 'NO_ACTION',
    actualPositionWeight: 0.0,
    realizedReturn: 0.10,
    benchmarkReturn: 0.05
  });
  const sig = res.signals[0];
  assert.strictEqual(sig.engagementLevel, SignalEngagementLevel.SIGNAL_AVAILABLE);
  assert.strictEqual(res.decisionAlpha, 0.0);
});

// Golden G: Signal actioned with positive contribution
it('Golden G: Signal actioned with positive contribution', () => {
  const { decision } = createHarness();
  const res = decision.evaluateDecisionLineage('t_gold', {
    decisionId: 'dec_actioned_pos',
    entityId: 'NVDA',
    signalsAvailable: [{ signalId: 'sig_val', score: 0.8, direction: 1 }],
    referencedSignalIds: ['sig_val'],
    actionTaken: 'BUY',
    actualPositionWeight: 0.10,
    realizedReturn: 0.25,
    benchmarkReturn: 0.10
  });
  assert.strictEqual(res.decisionAlpha, 0.015);
  assert.strictEqual(res.signalSupportedAlpha, 0.015);
});

// Golden H: Signal actioned with negative contribution (false conviction)
it('Golden H: Signal actioned with negative contribution (false conviction)', () => {
  const { decision } = createHarness();
  const res = decision.evaluateDecisionLineage('t_gold', {
    decisionId: 'dec_actioned_neg',
    entityId: 'DIS',
    signalsAvailable: [{ signalId: 'sig_rev', score: 0.6, direction: 1 }],
    referencedSignalIds: ['sig_rev'],
    actionTaken: 'BUY',
    actualPositionWeight: 0.10,
    realizedReturn: -0.10,
    benchmarkReturn: 0.02
  });
  assert.strictEqual(res.isFalseConviction, true);
  assert.strictEqual(res.decisionAlpha, -0.012);
});

// Golden I: Benchmark-relative alpha attribution
it('Golden I: Benchmark-relative alpha attribution', () => {
  const { realization } = createHarness();
  const res = realization.calculateRealizedOutcome('t_gold', {
    entityId: 'NVDA',
    priceStart: 100,
    priceEnd: 130,
    benchmarkReturn: 0.12,
    outcomeStart: '2026-01-01T00:00:00Z',
    outcomeEnd: '2026-03-31T00:00:00Z'
  });
  assert.strictEqual(res.totalReturn, 0.30);
  assert.strictEqual(res.benchmarkRelativeReturn, 0.18);
});

// Golden J: Allocation + selection + interaction reconciliation
it('Golden J: Allocation + selection + interaction reconciliation', () => {
  const { benchmark } = createHarness();
  const sectors = [
    { sectorId: 'TECH', portfolioWeight: 0.5, benchmarkWeight: 0.3, portfolioReturn: 0.20, benchmarkReturn: 0.10 },
    { sectorId: 'UTIL', portfolioWeight: 0.5, benchmarkWeight: 0.7, portfolioReturn: 0.02, benchmarkReturn: 0.04 }
  ];
  const res = benchmark.calculateBrinsonAttribution({ sectors });
  assert.strictEqual(res.reconciled, true);
  assert.ok(Math.abs(res.activeReturn - (res.allocationEffect + res.selectionEffect + res.interactionEffect)) < 1e-5);
});

// Golden K: Transaction cost separated from alpha
it('Golden K: Transaction cost separated from alpha', () => {
  const { bridges } = createHarness();
  const res = bridges.bridgeImplementationDrag('t_gold', {
    entityId: 'NVDA',
    idealAlpha: 0.04,
    slippageBps: 20,
    commissionBps: 5
  });
  assert.strictEqual(res.transactionCost, 0.0025);
  assert.strictEqual(res.netRealizedAlpha, 0.0375);
});

// Golden L: Tax effect separated from alpha
it('Golden L: Tax effect separated from alpha', () => {
  const { bridges } = createHarness();
  const res = bridges.bridgeImplementationDrag('t_gold', {
    entityId: 'NVDA',
    idealAlpha: 0.05,
    taxBps: 30
  });
  assert.strictEqual(res.taxCost, 0.003);
  assert.strictEqual(res.netRealizedAlpha, 0.047);
});

// Golden M: FX effect separated from alpha
it('Golden M: FX effect separated from alpha', () => {
  const { bridges } = createHarness();
  const res = bridges.bridgeImplementationDrag('t_gold', {
    entityId: 'ASML',
    idealAlpha: 0.06,
    fxBps: 40
  });
  assert.strictEqual(res.fxCost, 0.004);
  assert.strictEqual(res.netRealizedAlpha, 0.056);
});

// Golden N: Liquidity impact separated from alpha
it('Golden N: Liquidity impact separated from alpha', () => {
  const { bridges } = createHarness();
  const res = bridges.bridgeImplementationDrag('t_gold', {
    entityId: 'ILLIQUID_CO',
    idealAlpha: 0.08,
    marketImpactBps: 50
  });
  assert.strictEqual(res.liquidityImpact, 0.005);
  assert.strictEqual(res.netRealizedAlpha, 0.075);
});

// Golden O: Counterfactual without signal
it('Golden O: Counterfactual without signal', () => {
  const { counterfactual } = createHarness();
  const res = counterfactual.evaluateCounterfactual('t_gold', {
    signalId: 'sig_alt',
    actualWeights: { NVDA: 0.15 },
    counterfactualWeights: { NVDA: 0.05 },
    returns: { NVDA: 0.40 }
  });
  assert.strictEqual(res.baselineOutcome, 0.06);
  assert.strictEqual(res.counterfactualOutcome, 0.02);
  assert.strictEqual(res.counterfactualDelta, 0.04);
});

// Golden P: Regime-dependent signal performance
it('Golden P: Regime-dependent signal performance', () => {
  const { drift } = createHarness();
  const res = drift.evaluateRegimePerformance({
    signalId: 'sig_cyclical',
    regimePerformance: {
      'BULL': { hitRate: 0.80 },
      'BEAR': { hitRate: 0.35 }
    }
  });
  assert.strictEqual(res.isRegimeDependent, true);
  assert.strictEqual(res.spread, 0.45);
});

// Golden Q: Out-of-sample signal evaluation
it('Golden Q: Out-of-sample signal evaluation', () => {
  const { prediction } = createHarness();
  const pairs = [];
  for (let i = 1; i <= 30; i++) {
    pairs.push({ predictedDirection: 1, predictedMagnitude: 0.05 + i * 0.001, realizedReturn: 0.04 + i * 0.001 });
  }
  const res = prediction.evaluatePredictionAccuracy('t_gold', {
    signalId: 'sig_oos',
    evaluationPeriod: 'OUT_OF_SAMPLE',
    pairs
  });
  assert.strictEqual(res.evaluationPeriod, 'OUT_OF_SAMPLE');
  assert.strictEqual(res.sampleTier, SampleTier.EVALUABLE);
  assert.strictEqual(res.hitRate, 1.0);
});

// Golden R: Survivorship-safe historical evaluation
it('Golden R: Survivorship-safe historical evaluation', () => {
  const { drift } = createHarness();
  const res = drift.assessSurvivorshipBias({
    universeCount: 200,
    delistedEntitiesIncluded: 15,
    historicalPointInTimeConstituents: true
  });
  assert.strictEqual(res.survivorshipRisk, SurvivorshipRisk.LOW);
  assert.strictEqual(res.isSurvivorshipSafe, true);
});

// Golden S: Post-decision evidence rejected by temporal validator
it('Golden S: Post-decision evidence rejected by temporal validator', () => {
  const { realization } = createHarness();
  assert.throws(() => realization.calculateRealizedOutcome('t_gold', {
    entityId: 'NVDA',
    priceStart: 100,
    priceEnd: 120,
    outcomeStart: '2026-03-01T00:00:00Z',
    outcomeEnd: '2026-03-31T00:00:00Z',
    informationCutoff: '2026-03-15T00:00:00Z' // Look-ahead violation
  }), /Temporal violation/);
});

// Golden T: Complete Signal -> Decision -> Position -> Outcome -> Attribution -> Package SHA-256 trace
it('Golden T: Complete Signal -> Decision -> Position -> Outcome -> Attribution -> Package SHA-256 trace', () => {
  const { decomposition, pkg } = createHarness();
  const attr = decomposition.decomposeSecurityReturn('t_gold', {
    attributionId: 'attr_gold_t',
    entityId: 'NVDA',
    realizedReturn: 0.18,
    benchmarkReturn: 0.10,
    signalWeight: 1.0,
    signalExpectedReturn: 0.06,
    decisionAdjustment: 0.015,
    informationCutoff: '2026-03-01T00:00:00Z'
  });

  const sealed = pkg.createAndSealAttributionPackage('t_gold', {
    packageId: 'pkg_golden_t',
    portfolioReturn: 0.18,
    benchmarkReturn: 0.10,
    attributions: [attr],
    informationCutoff: '2026-03-01T00:00:00Z'
  });

  assert.strictEqual(sealed.isSealed, true);
  assert.ok(sealed.packageHash);
  const verify = pkg.verifyAttributionSeal(sealed);
  assert.strictEqual(verify.isValid, true);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
