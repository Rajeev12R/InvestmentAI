import assert from 'assert';
import { ExposureAggregationEngine } from '../exposureRisk/exposure.aggregation.engine.js';

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

console.log('=== Suite 10: Liquidity, Currency & Duration Exposures ===');

it('Multi-currency exposure aggregation', () => {
  const holdings = [
    { symbol: 'US_STOCK', weight: 0.60, currency: 'USD' },
    { symbol: 'EU_STOCK', weight: 0.25, currency: 'EUR' },
    { symbol: 'JP_STOCK', weight: 0.15, currency: 'JPY' }
  ];

  const res = ExposureAggregationEngine.aggregatePortfolioExposure({
    holdings,
    baseCurrency: 'USD'
  });

  assert.strictEqual(res.currencyExposures.USD, 0.60);
  assert.strictEqual(res.currencyExposures.EUR, 0.25);
  assert.strictEqual(res.currencyExposures.JPY, 0.15);
});

it('Effective duration, DV01 and liquidity spread metrics', () => {
  const holdings = [
    { symbol: 'BOND_5Y', weight: 0.70, duration: 4.5, spreadBps: 15, advParticipation: 0.02 },
    { symbol: 'BOND_10Y', weight: 0.30, duration: 8.5, spreadBps: 25, advParticipation: 0.04 }
  ];

  const res = ExposureAggregationEngine.aggregatePortfolioExposure({ holdings });
  // Weighted duration = 0.7*4.5 + 0.3*8.5 = 3.15 + 2.55 = 5.70 yrs
  assert.strictEqual(res.durationMetrics.effectiveDuration, 5.70);
  // DV01 = 5.70 * 0.0001 = 0.00057
  assert.strictEqual(res.durationMetrics.portfolioDV01, 0.00057);
  // Weighted spread = 0.7*15 + 0.3*25 = 10.5 + 7.5 = 18.0 bps
  assert.strictEqual(res.liquidityMetrics.weightedSpreadBps, 18.0);
  // Weighted ADV = 0.7*0.02 + 0.3*0.04 = 0.014 + 0.012 = 0.026
  assert.strictEqual(res.liquidityMetrics.weightedAdvParticipation, 0.026);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
