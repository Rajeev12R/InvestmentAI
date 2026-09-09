import assert from 'assert';
import { ExposureAggregationEngine } from '../exposureRisk/exposure.aggregation.engine.js';
import { ExposureFactorEngine } from '../exposureRisk/exposure.factor.engine.js';

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

console.log('=== Suite 8: Benchmark-Relative Exposure & Active Risk ===');

it('Active sector over/underweights relative to benchmark snapshot', () => {
  const p = [
    { symbol: 'AAPL', weight: 0.40, sector: 'TECH' },
    { symbol: 'JPM', weight: 0.30, sector: 'FINANCIALS' },
    { symbol: 'XOM', weight: 0.30, sector: 'ENERGY' }
  ];
  const b = [
    { symbol: 'S_TECH', weight: 0.25, sector: 'TECH' },
    { symbol: 'S_FIN', weight: 0.20, sector: 'FINANCIALS' },
    { symbol: 'S_ENE', weight: 0.15, sector: 'ENERGY' },
    { symbol: 'S_HLT', weight: 0.40, sector: 'HEALTHCARE' }
  ];

  const res = ExposureAggregationEngine.aggregatePortfolioExposure({
    holdings: p,
    benchmarkHoldings: b
  });

  assert.strictEqual(res.activeSectorExposures.TECH, 0.15); // +15% overweight
  assert.strictEqual(res.activeSectorExposures.FINANCIALS, 0.10); // +10% overweight
  assert.strictEqual(res.activeSectorExposures.ENERGY, 0.15); // +15% overweight
  assert.strictEqual(res.activeSectorExposures.HEALTHCARE, -0.40); // -40% underweight
});

it('Active factor loadings relative to benchmark', () => {
  const p = [{ symbol: 'PORT', weight: 1.0, factorBetas: { MARKET: 1.15, VALUE: -0.25, MOMENTUM: 0.40 } }];
  const b = [{ symbol: 'BENCH', weight: 1.0, factorBetas: { MARKET: 1.00, VALUE: 0.00, MOMENTUM: 0.00 } }];

  const res = ExposureFactorEngine.calculatePortfolioFactorExposures({
    holdings: p,
    benchmarkHoldings: b
  });

  assert.strictEqual(res.activeFactorBetas.MARKET, 0.15);
  assert.strictEqual(res.activeFactorBetas.VALUE, -0.25);
  assert.strictEqual(res.activeFactorBetas.MOMENTUM, 0.40);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
