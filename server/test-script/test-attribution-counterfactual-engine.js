import assert from 'assert';
import { AlphaCounterfactualEngine } from '../alphaAttribution/attribution.counterfactual.engine.js';
import { AlphaAttributionStore } from '../alphaAttribution/attribution.store.js';
import { CounterfactualType, AttributionStatus } from '../alphaAttribution/attribution.types.js';

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

console.log('=== Suite 7: Deterministic Counterfactual Attribution Engine ===');

it('Simulate counterfactual: Portfolio without specified signal exposure', () => {
  const store = new AlphaAttributionStore();
  const engine = new AlphaCounterfactualEngine(store);

  // Actual portfolio has NVDA at 10% weight; counterfactual has NVDA at 2% weight
  const actualWeights = { NVDA: 0.10, AAPL: 0.10, MSFT: 0.10 };
  const counterfactualWeights = { NVDA: 0.02, AAPL: 0.10, MSFT: 0.10 };
  const returns = { NVDA: 0.30, AAPL: 0.05, MSFT: 0.10 };

  const res = engine.evaluateCounterfactual('t_default', {
    counterfactualId: 'cf_nvda_sig',
    counterfactualType: CounterfactualType.PORTFOLIO_WITHOUT_SIGNAL,
    signalId: 'sig_nvda_ai',
    actualWeights,
    counterfactualWeights,
    returns
  });

  // Baseline outcome = 0.10*0.30 + 0.10*0.05 + 0.10*0.10 = 0.030 + 0.005 + 0.010 = 0.045
  // Counterfactual outcome = 0.02*0.30 + 0.10*0.05 + 0.10*0.10 = 0.006 + 0.005 + 0.010 = 0.021
  // Delta = 0.045 - 0.021 = +0.024 (+240 bps)
  assert.strictEqual(res.baselineOutcome, 0.045);
  assert.strictEqual(res.counterfactualOutcome, 0.021);
  assert.strictEqual(res.counterfactualDelta, 0.024);
  assert.strictEqual(res.isModelledCounterfactual, true);
  assert.strictEqual(res.status, AttributionStatus.MODELLED);
});

it('Counterfactual metadata documents unaltered variables and validity conditions', () => {
  const store = new AlphaAttributionStore();
  const engine = new AlphaCounterfactualEngine(store);

  const res = engine.evaluateCounterfactual('t_default', {
    actualWeights: { A: 0.5, B: 0.5 },
    counterfactualWeights: { A: 0.0, B: 1.0 },
    returns: { A: -0.10, B: 0.05 }
  });

  assert.ok(Array.isArray(res.unchangedVariables));
  assert.ok(Array.isArray(res.validityConditions));
  assert.ok(Array.isArray(res.limitations));
  assert.strictEqual(res.counterfactualDelta, -0.075); // Actual = -0.025, CF = 0.05, Delta = -0.075
});

console.log(`PASSED: ${passed} assertions passed.\n`);
