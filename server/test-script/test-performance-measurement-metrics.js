import assert from 'assert';
import { PerformanceMeasurementEngine } from '../performanceSkill/performance.measurement.engine.js';

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

console.log('=== Suite 3: Deterministic Performance & Risk-Adjusted Metrics ===');

it('Compute TWR correctly across sub-periods', () => {
  const returns = [0.10, -0.05, 0.20];
  // (1 + 0.10) * (1 - 0.05) * (1 + 0.20) - 1 = 1.10 * 0.95 * 1.20 - 1 = 1.254 - 1 = 0.254
  const twr = PerformanceMeasurementEngine.computeTWR(returns);
  assert.strictEqual(Number(twr.toFixed(4)), 0.254);
});

it('Compute MWR / IRR for cash flows', () => {
  // Cash flow: -100 at t0, +110 at t1 => IRR = 0.10
  const cashFlows = [
    { date: 0, amount: -100 },
    { date: 1, amount: 110 }
  ];
  const irr = PerformanceMeasurementEngine.computeMWR(cashFlows);
  assert(Math.abs(irr - 0.10) < 1e-4);
});

it('Compute Max Drawdown accurately', () => {
  // 1.0 -> 1.2 (+20%) -> 0.9 (-25% from peak) -> 1.1 (+22.2%)
  const returns = [0.20, -0.25, 0.2222];
  const ddResult = PerformanceMeasurementEngine.computeMaxDrawdown(returns);
  assert.strictEqual(Number(ddResult.maxDrawdown.toFixed(2)), 0.25);
  assert.strictEqual(ddResult.peakIndex, 0);
  assert.strictEqual(ddResult.troughIndex, 1);
});

it('Compute Full Risk-Adjusted Suite (Sharpe, Sortino, Calmar, Info Ratio, Capture Ratios)', () => {
  const pReturns = [0.02, 0.01, -0.01, 0.03, 0.02, -0.005, 0.015, 0.025, -0.01, 0.03, 0.01, 0.02];
  const bReturns = [0.01, 0.015, -0.02, 0.02, 0.01, -0.01, 0.01, 0.02, -0.015, 0.02, 0.005, 0.01];

  const metrics = PerformanceMeasurementEngine.measureRiskAdjustedMetrics({
    portfolioReturns: pReturns,
    benchmarkReturns: bReturns,
    riskFreeRate: 0.03,
    periodsPerYear: 12
  });

  assert(metrics.sharpeRatio > 0);
  assert(metrics.sortinoRatio > 0);
  assert(metrics.maxDrawdown >= 0);
  assert(metrics.calmarRatio > 0);
  assert(metrics.trackingError > 0);
  assert(metrics.informationRatio > 0);
  assert(metrics.battingAverage >= 0.5);
  assert(metrics.upsideCapture > 0);
  assert(metrics.downsideCapture >= 0);
  assert.notStrictEqual(metrics.hash, undefined);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
