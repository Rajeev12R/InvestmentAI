import assert from 'assert';
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

console.log('=== Suite 4: Factor Exposure & Betas Engine ===');

it('Portfolio-level factor beta aggregation from security loadings', () => {
  const holdings = [
    { symbol: 'AAPL', weight: 0.60, factorBetas: { MARKET: 1.10, VALUE_HML: -0.20, MOMENTUM: 0.30 } },
    { symbol: 'XOM', weight: 0.40, factorBetas: { MARKET: 0.80, VALUE_HML: 0.60, MOMENTUM: -0.10 } }
  ];

  const res = ExposureFactorEngine.calculatePortfolioFactorExposures({ holdings });
  // Market = 0.6*1.1 + 0.4*0.8 = 0.66 + 0.32 = 0.98
  assert.strictEqual(res.portfolioFactorBetas.MARKET, 0.98);
  // Value = 0.6*(-0.2) + 0.4*0.6 = -0.12 + 0.24 = 0.12
  assert.strictEqual(res.portfolioFactorBetas.VALUE_HML, 0.12);
  // Momentum = 0.6*0.3 + 0.4*(-0.1) = 0.18 - 0.04 = 0.14
  assert.strictEqual(res.portfolioFactorBetas.MOMENTUM, 0.14);
});

it('Active factor beta calculation relative to benchmark', () => {
  const p = [
    { symbol: 'AAPL', weight: 1.0, factorBetas: { MARKET: 1.20, QUALITY: 0.50 } }
  ];
  const b = [
    { symbol: 'SP500', weight: 1.0, factorBetas: { MARKET: 1.00, QUALITY: 0.10 } }
  ];

  const res = ExposureFactorEngine.calculatePortfolioFactorExposures({ holdings: p, benchmarkHoldings: b });
  assert.strictEqual(res.activeFactorBetas.MARKET, 0.20);
  assert.strictEqual(res.activeFactorBetas.QUALITY, 0.40);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
