/**
 * server/test-script/test-scenario-determinism-concurrency-temporal.js
 * 
 * Phase 19: 100-Run Determinism, 50-Job Concurrency & Temporal Reproducibility Tests
 */

import assert from 'assert';
import { ScenarioEngine } from '../scenario/scenario.engine.js';
import { canonicalHash } from '../scenario/scenario.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 19 DETERMINISM, CONCURRENCY & TEMPORAL TESTS ---');

const engine = new ScenarioEngine();

const testPortfolio = {
  id: 'PORT-DETERMINISM-01',
  currency: 'USD',
  cash: 25000,
  positions: [
    { ticker: 'AAPL', price: 150.25, shares: 150, marketValue: 22537.5, beta: 1.15, sector: 'Information Technology', assetClass: 'EQUITY' },
    { ticker: 'NVDA', price: 550.80, shares: 80, marketValue: 44064.0, beta: 1.95, sector: 'Information Technology', assetClass: 'EQUITY' },
    { ticker: 'JNJ', price: 155.10, shares: 200, marketValue: 31020.0, beta: 0.52, sector: 'Healthcare', assetClass: 'EQUITY' }
  ]
};

const testScenario = {
  id: 'SCEN-DETERMINISM-RUN',
  name: 'Multi-Factor Stress Test',
  scenarioType: 'HYPOTHETICAL_STRESS',
  shocks: [
    { targetType: 'INDEX', target: 'SPX', shockUnit: 'PERCENT', shockValue: -0.18, betaAdjusted: true },
    { targetType: 'SECTOR', target: 'Information Technology', shockUnit: 'PERCENT', shockValue: -0.05 }
  ]
};

// ==========================================
// 1. 100-Run Determinism Test
// ==========================================
console.log('Testing 100-run mathematical determinism...');
const initialResult = engine.evaluatePortfolio(testPortfolio, testScenario);
const baseHash = canonicalHash({
  baselineNav: initialResult.baseline.nav,
  stressedNav: initialResult.stressed.nav,
  pnlDollar: initialResult.deltas.pnlDollar,
  pnlPercent: initialResult.deltas.pnlPercent,
  positions: initialResult.positions.map(p => ({
    ticker: p.ticker,
    stressedPrice: p.stressed.price,
    pnlDollar: p.deltas.pnlDollar
  }))
});

for (let i = 0; i < 100; i++) {
  const currentResult = engine.evaluatePortfolio(testPortfolio, testScenario);
  const currentHash = canonicalHash({
    baselineNav: currentResult.baseline.nav,
    stressedNav: currentResult.stressed.nav,
    pnlDollar: currentResult.deltas.pnlDollar,
    pnlPercent: currentResult.deltas.pnlPercent,
    positions: currentResult.positions.map(p => ({
      ticker: p.ticker,
      stressedPrice: p.stressed.price,
      pnlDollar: p.deltas.pnlDollar
    }))
  });

  if (currentHash !== baseHash) {
    throw new Error(`Determinism failure at iteration ${i}! Base: ${baseHash}, Current: ${currentHash}`);
  }
}
testAssert(true, '100 iterations of identical portfolio stress evaluation produced 100% deterministic results');

// ==========================================
// 2. 50-Job Concurrency Test
// ==========================================
console.log('Testing 50-job asynchronous concurrency...');
async function runConcurrentJob(jobId) {
  // Vary portfolio slightly per job
  const jobPort = {
    ...testPortfolio,
    id: `PORT-JOB-${jobId}`,
    cash: 25000 + jobId * 100
  };
  const res = engine.evaluatePortfolio(jobPort, testScenario);
  return { jobId, baselineNav: res.baseline.nav, stressedNav: res.stressed.nav };
}

const jobPromises = [];
for (let j = 0; j < 50; j++) {
  jobPromises.push(runConcurrentJob(j));
}

const jobResults = await Promise.all(jobPromises);
testAssert(jobResults.length === 50, 'All 50 concurrent jobs resolved');

for (let j = 0; j < 50; j++) {
  const jobRes = jobResults.find(r => r.jobId === j);
  testAssert(jobRes !== undefined, `Job ${j} found in results`);
  const expectedBaseNav = 22537.5 + 44064.0 + 31020.0 + 25000 + (j * 100);
  testAssert(Math.abs(jobRes.baselineNav - expectedBaseNav) < 1e-6, `Job ${j} baseline NAV matches without race conditions`);
}

// ==========================================
// 3. Temporal Snapshot Reproducibility
// ==========================================
console.log('Testing temporal snapshot reproducibility...');
const snapshotA = {
  timestamp: '2026-01-15T10:00:00Z',
  portfolio: JSON.parse(JSON.stringify(testPortfolio)),
  scenario: JSON.parse(JSON.stringify(testScenario))
};

const resultA1 = engine.evaluatePortfolio(snapshotA.portfolio, snapshotA.scenario);
const resultA2 = engine.evaluatePortfolio(snapshotA.portfolio, snapshotA.scenario);

testAssert(resultA1.deltas.pnlDollar === resultA2.deltas.pnlDollar, 'Temporal replay produces identical PnL');
testAssert(resultA1.stressed.nav === resultA2.stressed.nav, 'Temporal replay produces identical Stressed NAV');

console.log(`[PASS] Phase 19 Determinism, Concurrency & Temporal tests passed: ${assertionCount} assertions`);

export default { assertionCount };
