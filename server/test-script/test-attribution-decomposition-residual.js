import assert from 'assert';
import { AlphaDecompositionEngine } from '../alphaAttribution/attribution.decomposition.engine.js';
import { AlphaAttributionStore } from '../alphaAttribution/attribution.store.js';
import { EffectType } from '../alphaAttribution/attribution.types.js';

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

console.log('=== Suite 5: Active Return Decomposition & Residual Preservation ===');

it('Security active return decomposition with explicit residual', () => {
  const store = new AlphaAttributionStore();
  const engine = new AlphaDecompositionEngine(store);

  const res = engine.decomposeSecurityReturn('t_default', {
    entityId: 'NVDA',
    realizedReturn: 0.15,
    benchmarkReturn: 0.10, // Active = 0.05
    signalWeight: 0.8,
    signalExpectedReturn: 0.04, // Signal contribution = 0.032
    decisionAdjustment: 0.01,
    implementationDrag: 0.002, // -0.002
    transactionCost: 0.001, // -0.001
    taxEffect: 0.0,
    fxEffect: 0.0
  });

  assert.strictEqual(res.activeReturn, 0.05);
  assert.strictEqual(res.signalContribution, 0.032);
  assert.strictEqual(res.decisionContribution, 0.01);
  assert.strictEqual(res.implementationContribution, -0.002);
  assert.strictEqual(res.transactionCostEffect, -0.001);
  assert.strictEqual(res.residual, 0.011);
  assert.strictEqual(res.reconciled, true);
  assert.strictEqual(res.components[EffectType.RESIDUAL_EFFECT], 0.011);
});

it('Portfolio active return decomposition and multi-position aggregation', () => {
  const store = new AlphaAttributionStore();
  const engine = new AlphaDecompositionEngine(store);

  const holdings = [
    { entityId: 'A', weight: 0.6, signalContribution: 0.04, decisionContribution: 0.01, residual: 0.005 },
    { entityId: 'B', weight: 0.4, signalContribution: -0.01, decisionContribution: 0.00, residual: 0.002 }
  ];

  const res = engine.decomposePortfolioReturn('t_default', {
    portfolioId: 'port_1',
    portfolioReturn: 0.12,
    benchmarkReturn: 0.08, // Active = 0.04
    holdings,
    systematicEffects: {
      transactionCosts: 0.002,
      liquidityDrag: 0.001
    }
  });

  assert.strictEqual(res.activeReturn, 0.04);
  assert.strictEqual(res.signalAttributedReturn, 0.02); // 0.6*0.04 + 0.4*(-0.01) = 0.024 - 0.004 = 0.020
  assert.strictEqual(res.decisionAttributedReturn, 0.006); // 0.6*0.01 = 0.006
  assert.strictEqual(res.transactionCosts, -0.002);
  assert.strictEqual(res.liquidityDrag, -0.001);
  assert.strictEqual(res.residualReturn, 0.017); // 0.04 - (0.02 + 0.006 - 0.002 - 0.001) = 0.04 - 0.023 = 0.017
  assert.strictEqual(res.reconciled, true);
});

it('Zero-tolerance reconciliation check guarantees active return equality', () => {
  const store = new AlphaAttributionStore();
  const engine = new AlphaDecompositionEngine(store);

  const res = engine.decomposeSecurityReturn('t_default', {
    entityId: 'AAPL',
    realizedReturn: -0.05,
    benchmarkReturn: 0.02,
    signalWeight: 1.0,
    signalExpectedReturn: -0.04
  });

  const sum = res.signalContribution + res.decisionContribution + res.implementationContribution + res.transactionCostEffect + res.taxEffect + res.fxEffect + res.residual;
  assert.ok(Math.abs(res.activeReturn - sum) < 1e-5);
  assert.strictEqual(res.reconciled, true);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
