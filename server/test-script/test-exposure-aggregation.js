import assert from 'assert';
import { ExposureAggregationEngine } from '../exposureRisk/exposure.aggregation.engine.js';
import { ExposureClassification } from '../exposureRisk/exposure.types.js';

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

console.log('=== Suite 3: Direct vs Look-Through & Portfolio Aggregation ===');

it('Direct vs Look-through holding expansion and coverage', () => {
  const holdings = [
    { symbol: 'AAPL', weight: 0.50, sector: 'TECH', domicile: 'USA', currency: 'USD' },
    {
      symbol: 'QQQ',
      weight: 0.50,
      isLookThrough: true,
      underlying: [
        { symbol: 'MSFT', weight: 0.50 },
        { symbol: 'NVDA', weight: 0.50 }
      ],
      sector: 'TECH',
      domicile: 'USA'
    }
  ];

  const res = ExposureAggregationEngine.aggregatePortfolioExposure({ holdings });
  assert.strictEqual(res.grossExposure, 1.0);
  assert.strictEqual(res.lookThroughMetrics.lookThroughCoverage, 1.0);
  assert.strictEqual(res.expandedHoldings.length, 3);
  assert.strictEqual(res.expandedHoldings[1].classification, ExposureClassification.LOOK_THROUGH_EXPOSURE);
});

it('Long / short portfolio gross vs net separation', () => {
  const holdings = [
    { symbol: 'AAPL', weight: 0.70 },
    { symbol: 'MSFT', weight: 0.40 },
    { symbol: 'INTC', weight: -0.20 }
  ];

  const res = ExposureAggregationEngine.aggregatePortfolioExposure({ holdings });
  assert.strictEqual(res.grossExposure, 1.30);
  assert.strictEqual(res.netExposure, 0.90);
  assert.strictEqual(res.totalLong, 1.10);
  assert.strictEqual(res.totalShort, 0.20);
  assert.strictEqual(res.isLeveraged, true);
});

it('Revenue geography vs Domicile geography aggregation', () => {
  const holdings = [
    {
      symbol: 'NVDA',
      weight: 1.0,
      domicile: 'USA',
      revenueGeography: { USA: 0.45, CHINA: 0.25, EUROPE: 0.20, OTHER: 0.10 }
    }
  ];

  const res = ExposureAggregationEngine.aggregatePortfolioExposure({ holdings });
  assert.strictEqual(res.domicileGeographyExposures.USA, 1.0);
  assert.strictEqual(res.revenueGeographyExposures.USA, 0.45);
  assert.strictEqual(res.revenueGeographyExposures.CHINA, 0.25);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
