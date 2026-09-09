import assert from 'assert';
import { SignalRealizationEngine } from '../alphaAttribution/attribution.realization.engine.js';
import { AlphaAttributionStore } from '../alphaAttribution/attribution.store.js';

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

console.log('=== Suite 3: Signal Realization & Forward Return Engine ===');

it('Compute total return with dividends and corporate actions', () => {
  const store = new AlphaAttributionStore();
  const engine = new SignalRealizationEngine(store);

  const res = engine.calculateRealizedOutcome('t_default', {
    outcomeId: 'out_real_1',
    entityId: 'NVDA',
    priceStart: 100.0,
    priceEnd: 120.0,
    dividends: 2.0,
    corporateActionFactor: 1.0,
    benchmarkReturn: 0.10,
    sectorReturn: 0.15,
    riskFreeRate: 0.02,
    outcomeStart: '2026-01-01T00:00:00Z',
    outcomeEnd: '2026-03-31T00:00:00Z'
  });

  assert.strictEqual(res.priceReturn, 0.20);
  assert.strictEqual(res.totalReturn, 0.22);
  assert.strictEqual(res.excessReturn, 0.20);
  assert.strictEqual(res.benchmarkRelativeReturn, 0.12);
  assert.strictEqual(res.sectorRelativeReturn, 0.07);
});

it('Compute Maximum Adverse Excursion (MAE) and Maximum Favorable Excursion (MFE)', () => {
  const store = new AlphaAttributionStore();
  const engine = new SignalRealizationEngine(store);

  const res = engine.calculateRealizedOutcome('t_default', {
    outcomeId: 'out_mae_1',
    entityId: 'NVDA',
    priceStart: 100.0,
    priceEnd: 110.0,
    priceTrajectory: [100.0, 92.0, 95.0, 115.0, 110.0],
    outcomeStart: '2026-01-01T00:00:00Z',
    outcomeEnd: '2026-03-31T00:00:00Z'
  });

  assert.strictEqual(res.maxAdverseExcursion, -0.08);
  assert.strictEqual(res.maxFavorableExcursion, 0.15);
  assert.strictEqual(res.priceReturn, 0.10);
});

it('Reject invalid prices and temporal ordering', () => {
  const store = new AlphaAttributionStore();
  const engine = new SignalRealizationEngine(store);

  assert.throws(() => engine.calculateRealizedOutcome('t_default', {
    entityId: 'NVDA',
    priceStart: -10,
    priceEnd: 100,
    outcomeStart: '2026-01-01T00:00:00Z',
    outcomeEnd: '2026-02-01T00:00:00Z'
  }));

  assert.throws(() => engine.calculateRealizedOutcome('t_default', {
    entityId: 'NVDA',
    priceStart: 100,
    priceEnd: 110,
    outcomeStart: '2026-02-01T00:00:00Z',
    outcomeEnd: '2026-01-01T00:00:00Z'
  }));
});

console.log(`PASSED: ${passed} assertions passed.\n`);
