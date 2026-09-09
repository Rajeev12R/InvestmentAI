import assert from 'assert';
import { DecisionAttributionEngine } from '../alphaAttribution/attribution.decision.engine.js';
import { AlphaAttributionStore } from '../alphaAttribution/attribution.store.js';
import { SignalEngagementLevel } from '../alphaAttribution/attribution.types.js';

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

console.log('=== Suite 6: Decision Lineage & Signal Engagement Attribution ===');

it('Distinguish available vs actioned signals and calculate signal-supported alpha', () => {
  const store = new AlphaAttributionStore();
  const engine = new DecisionAttributionEngine(store);

  const signals = [
    { signalId: 'sig_val', direction: 1, score: 0.8, confidence: 0.9 },
    { signalId: 'sig_alt', direction: -1, score: -0.4, confidence: 0.7 }
  ];

  const res = engine.evaluateDecisionLineage('t_default', {
    decisionId: 'dec_buy_1',
    entityId: 'NVDA',
    signalsAvailable: signals,
    referencedSignalIds: ['sig_val'],
    actionTaken: 'BUY',
    targetPositionWeight: 0.05,
    actualPositionWeight: 0.08,
    realizedReturn: 0.20,
    benchmarkReturn: 0.10 // Active = 0.10
  });

  assert.strictEqual(res.decisionAlpha, 0.008); // 0.08 * 0.10
  assert.strictEqual(res.signalSupportedAlpha, 0.008);
  assert.strictEqual(res.sizingContribution, 0.003); // (0.08 - 0.05) * 0.10 = 0.003
  assert.strictEqual(res.baseAllocationAlpha, 0.005); // 0.05 * 0.10 = 0.005

  const valSig = res.signals.find(s => s.signalId === 'sig_val');
  const altSig = res.signals.find(s => s.signalId === 'sig_alt');
  assert.strictEqual(valSig.engagementLevel, SignalEngagementLevel.SIGNAL_ACTIONED);
  assert.strictEqual(altSig.engagementLevel, SignalEngagementLevel.SIGNAL_AVAILABLE);
});

it('Identify missed opportunity when positive signals are ignored', () => {
  const store = new AlphaAttributionStore();
  const engine = new DecisionAttributionEngine(store);

  const signals = [
    { signalId: 'sig_bull', direction: 1, score: 0.85, confidence: 0.9 }
  ];

  const res = engine.evaluateDecisionLineage('t_default', {
    decisionId: 'dec_miss_1',
    entityId: 'NVDA',
    signalsAvailable: signals,
    referencedSignalIds: [],
    actionTaken: 'NO_ACTION',
    actualPositionWeight: 0.0,
    realizedReturn: 0.25,
    benchmarkReturn: 0.05
  });

  assert.strictEqual(res.isMissedOpportunity, true);
  assert.strictEqual(res.decisionAlpha, 0.0);
});

it('Identify correct rejection when negative signals are avoided and asset drops', () => {
  const store = new AlphaAttributionStore();
  const engine = new DecisionAttributionEngine(store);

  const signals = [
    { signalId: 'sig_bear', direction: -1, score: -0.75, confidence: 0.85 }
  ];

  const res = engine.evaluateDecisionLineage('t_default', {
    decisionId: 'dec_reject_1',
    entityId: 'XYZ',
    signalsAvailable: signals,
    referencedSignalIds: ['sig_bear'],
    actionTaken: 'REJECT',
    actualPositionWeight: 0.0,
    realizedReturn: -0.30,
    benchmarkReturn: 0.02
  });

  assert.strictEqual(res.isCorrectRejection, true);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
