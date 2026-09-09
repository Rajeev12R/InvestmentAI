import assert from 'assert';
import { BenchmarkBrinsonEngine } from '../alphaAttribution/attribution.benchmark.engine.js';

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

console.log('=== Suite 8: Benchmark & Brinson Allocation/Selection Engine ===');

it('Compute Brinson-Fachler allocation, selection, interaction effects with exact reconciliation', () => {
  const engine = new BenchmarkBrinsonEngine();

  const sectors = [
    { sectorId: 'TECH', portfolioWeight: 0.40, benchmarkWeight: 0.25, portfolioReturn: 0.20, benchmarkReturn: 0.15 },
    { sectorId: 'FIN', portfolioWeight: 0.30, benchmarkWeight: 0.35, portfolioReturn: 0.08, benchmarkReturn: 0.06 },
    { sectorId: 'HLTH', portfolioWeight: 0.30, benchmarkWeight: 0.40, portfolioReturn: 0.04, benchmarkReturn: 0.05 }
  ];

  const res = engine.calculateBrinsonAttribution({
    sectors,
    methodology: 'BRINSON_FACHLER'
  });

  // Portfolio return: 0.40*0.20 + 0.30*0.08 + 0.30*0.04 = 0.08 + 0.024 + 0.012 = 0.116
  // Benchmark return: 0.25*0.15 + 0.35*0.06 + 0.40*0.05 = 0.0375 + 0.021 + 0.02 = 0.0785
  // Active return = 0.116 - 0.0785 = 0.0375
  assert.strictEqual(res.portfolioReturn, 0.116);
  assert.strictEqual(res.benchmarkReturn, 0.0785);
  assert.strictEqual(res.activeReturn, 0.0375);
  assert.strictEqual(res.reconciled, true);
  assert.ok(Math.abs(res.activeReturn - (res.allocationEffect + res.selectionEffect + res.interactionEffect)) < 1e-5);
});

it('Brinson Hood Beebower methodology handles single sector allocation', () => {
  const engine = new BenchmarkBrinsonEngine();

  const sectors = [
    { sectorId: 'ENERGY', portfolioWeight: 1.0, benchmarkWeight: 1.0, portfolioReturn: 0.10, benchmarkReturn: 0.05 }
  ];

  const res = engine.calculateBrinsonAttribution({
    sectors,
    methodology: 'BRINSON_HOOD_BEEBOWER'
  });

  assert.strictEqual(res.activeReturn, 0.05);
  assert.strictEqual(res.allocationEffect, 0.0);
  assert.strictEqual(res.selectionEffect, 0.05);
  assert.strictEqual(res.interactionEffect, 0.0);
  assert.strictEqual(res.reconciled, true);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
