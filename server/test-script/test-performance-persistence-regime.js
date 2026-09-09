import assert from 'assert';
import { PerformancePersistenceEngine } from '../performanceSkill/performance.persistence.engine.js';
import { PersistenceClassification } from '../performanceSkill/performance.types.js';

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

console.log('=== Suite 8: Performance Persistence & Regime Conditionality ===');

it('Persistent alpha across 36 rolling windows', () => {
  const pReturns = Array.from({ length: 48 }, () => 0.015);
  const bReturns = Array.from({ length: 48 }, () => 0.008);

  const res = PerformancePersistenceEngine.evaluateRollingPersistence({
    portfolioReturns: pReturns,
    benchmarkReturns: bReturns,
    windowSize: 12,
    periodsPerYear: 12
  });

  assert.strictEqual(res.classification, PersistenceClassification.PERSISTENT);
  assert.strictEqual(res.positiveFraction, 1.0);
  assert(res.meanRollingAlpha > 0);
});

it('Decaying alpha trajectory detection', () => {
  // Alpha starts high and linearly decays into negative
  const pReturns = [];
  const bReturns = [];
  for (let i = 0; i < 36; i++) {
    bReturns.push(0.01);
    pReturns.push(0.01 + (0.02 - (i * 0.001))); // starts +2%, ends -1.5%
  }

  const res = PerformancePersistenceEngine.evaluateRollingPersistence({
    portfolioReturns: pReturns,
    benchmarkReturns: bReturns,
    windowSize: 12,
    periodsPerYear: 12
  });

  assert.strictEqual(res.classification, PersistenceClassification.DECAYING);
  assert(res.alphaTrendSlope < 0);
});

it('Regime-conditional performance evaluation (Bull vs Bear vs Stagflation)', () => {
  const observations = [
    { date: '2024-01', regime: 'BULL_MARKET', portfolioReturn: 0.03, benchmarkReturn: 0.02 },
    { date: '2024-02', regime: 'BULL_MARKET', portfolioReturn: 0.04, benchmarkReturn: 0.025 },
    { date: '2024-03', regime: 'STAGFLATION', portfolioReturn: -0.01, benchmarkReturn: -0.04 },
    { date: '2024-04', regime: 'HIGH_VOLATILITY', portfolioReturn: -0.05, benchmarkReturn: -0.02 }
  ];

  const regimeRes = PerformancePersistenceEngine.evaluateRegimeConditionality({
    regimeObservations: observations
  });

  assert.strictEqual(regimeRes.totalRegimes, 3);
  assert(regimeRes.regimePerformance.BULL_MARKET.outperforming);
  assert(regimeRes.regimePerformance.STAGFLATION.outperforming);
  assert(!regimeRes.regimePerformance.HIGH_VOLATILITY.outperforming);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
