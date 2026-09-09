import assert from 'assert';
import { performanceStore } from '../performanceSkill/performance.store.js';

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

console.log('=== Suite 2: Multi-Tenant & Point-in-Time Performance Store ===');

performanceStore.reset();

it('Multi-tenant isolation for benchmarks and evaluations', () => {
  const benchA = {
    benchmarkId: 'bench_sp500',
    name: 'S&P 500 Total Return',
    methodology: 'MARKET_CAP',
    informationCutoff: '2026-01-01T00:00:00Z'
  };
  const benchB = {
    benchmarkId: 'bench_msci_world',
    name: 'MSCI World Index',
    methodology: 'MARKET_CAP',
    informationCutoff: '2026-01-01T00:00:00Z'
  };

  performanceStore.saveBenchmark(benchA, 'tenant_alpha');
  performanceStore.saveBenchmark(benchB, 'tenant_beta');

  assert.notStrictEqual(performanceStore.getBenchmark('bench_sp500', 'tenant_alpha'), null);
  assert.strictEqual(performanceStore.getBenchmark('bench_sp500', 'tenant_beta'), null);
  assert.notStrictEqual(performanceStore.getBenchmark('bench_msci_world', 'tenant_beta'), null);
  assert.strictEqual(performanceStore.getBenchmark('bench_msci_world', 'tenant_alpha'), null);
});

it('Point-in-Time asOf temporal filtering', () => {
  const eval1 = {
    evaluationId: 'eval_2024',
    portfolioId: 'port_1',
    benchmark: 'SP500',
    portfolioReturn: 0.12,
    benchmarkReturn: 0.10,
    informationCutoff: '2024-12-31T23:59:59Z'
  };
  const eval2 = {
    evaluationId: 'eval_2025',
    portfolioId: 'port_1',
    benchmark: 'SP500',
    portfolioReturn: 0.18,
    benchmarkReturn: 0.14,
    informationCutoff: '2025-12-31T23:59:59Z'
  };

  performanceStore.saveEvaluation(eval1, 'tenant_alpha');
  performanceStore.saveEvaluation(eval2, 'tenant_alpha');

  // Query as of 2025-01-01
  const list2024 = performanceStore.listEvaluations('tenant_alpha', '2025-01-01T00:00:00Z');
  assert.strictEqual(list2024.length, 1);
  assert.strictEqual(list2024[0].evaluationId, 'eval_2024');

  // Query as of 2026-01-01
  const list2025 = performanceStore.listEvaluations('tenant_alpha', '2026-01-01T00:00:00Z');
  assert.strictEqual(list2025.length, 2);

  // Single entity asOf query
  const itemAsOf2024 = performanceStore.getEvaluation('eval_2025', 'tenant_alpha', '2024-12-31T00:00:00Z');
  assert.strictEqual(itemAsOf2024, null); // Look-ahead prevented
});

it('Store stats and deep freeze immutability', () => {
  const stats = performanceStore.getStats('tenant_alpha');
  assert.strictEqual(stats.evaluationsCount, 2);
  assert.strictEqual(stats.benchmarksCount, 1);

  const item = performanceStore.getEvaluation('eval_2024', 'tenant_alpha');
  assert.throws(() => { item.portfolioReturn = 0.99; });
});

console.log(`PASSED: ${passed} assertions passed.\n`);
