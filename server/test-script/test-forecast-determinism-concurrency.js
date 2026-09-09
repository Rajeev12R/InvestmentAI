/**
 * server/test-script/test-forecast-determinism-concurrency.js
 * 
 * Phase 20: 100-Run Determinism & 20-Job Concurrency Unit Tests
 */

import assert from 'assert';
import { defaultForecastEngine } from '../forecasting/forecast.engine.js';
import { canonicalHash, ForecastMethod, ForecastHorizon } from '../forecasting/forecast.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 20 DETERMINISM & CONCURRENCY TESTS ---');

const testReq = {
  ticker: 'MSFT',
  metric: 'EPS',
  method: ForecastMethod.FUNDAMENTAL_INTEGRATED,
  horizon: ForecastHorizon.HORIZON_3Y,
  baseFinancials: { baseRevenue: 250000, baseShares: 7500 },
  drivers: {
    revenueGrowthRates: [0.12, 0.10, 0.08],
    operatingMargins: [0.42, 0.43, 0.43],
    effectiveTaxRate: 0.19
  }
};

// ==========================================
// 1. 100-Run Determinism Test
// ==========================================
console.log('Testing 100-run mathematical determinism...');
const initialForecast = defaultForecastEngine.generateForecast(testReq);
const baseHash = canonicalHash({
  ticker: initialForecast.ticker,
  metric: initialForecast.metric,
  value: initialForecast.value,
  periods: initialForecast.output.periods.map(p => ({ year: p.year, eps: p.eps, revenue: p.revenue, fcf: p.fcf }))
});

for (let i = 0; i < 100; i++) {
  const currentForecast = defaultForecastEngine.generateForecast(testReq);
  const currentHash = canonicalHash({
    ticker: currentForecast.ticker,
    metric: currentForecast.metric,
    value: currentForecast.value,
    periods: currentForecast.output.periods.map(p => ({ year: p.year, eps: p.eps, revenue: p.revenue, fcf: p.fcf }))
  });

  if (currentHash !== baseHash) {
    throw new Error(`Determinism failure at iteration ${i}! Base: ${baseHash}, Current: ${currentHash}`);
  }
}
testAssert(true, '100 iterations of identical fundamental forecast produced 100% deterministic results');

// ==========================================
// ==========================================
// 2. 50-Job Concurrency Test
// ==========================================
console.log('Testing 50-job asynchronous concurrency...');
async function runConcurrentJob(jobId) {
  const jobReq = {
    ...testReq,
    baseFinancials: {
      baseRevenue: 250000 + (jobId * 1000),
      baseShares: 7500
    }
  };
  const res = defaultForecastEngine.generateForecast(jobReq);
  return { jobId, y1Rev: res.output.periods[0].revenue, y1EPS: res.output.periods[0].eps };
}

const jobPromises = [];
for (let j = 0; j < 50; j++) {
  jobPromises.push(runConcurrentJob(j));
}

const jobResults = await Promise.all(jobPromises);
testAssert(jobResults.length === 50, 'All 50 concurrent forecast jobs resolved');

for (let j = 0; j < 50; j++) {
  const jobRes = jobResults.find(r => r.jobId === j);
  testAssert(jobRes !== undefined, `Job ${j} found in results`);
  const expectedRev = (250000 + j * 1000) * 1.12;
  testAssert(Math.abs(jobRes.y1Rev - expectedRev) < 1e-6, `Job ${j} revenue matches without race conditions`);
}

console.log(`[PASS] Phase 20 Determinism & Concurrency tests passed: ${assertionCount} assertions`);

export default { assertionCount };
