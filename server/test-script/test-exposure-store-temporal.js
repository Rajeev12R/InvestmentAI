import assert from 'assert';
import { exposureStore } from '../exposureRisk/exposure.store.js';

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

console.log('=== Suite 2: Multi-Tenant & Point-in-Time Exposure Store ===');

exposureStore.reset();

it('Multi-tenant isolation for factor definitions and observations', () => {
  const factA = {
    factorId: 'fact_alpha',
    name: 'Alpha Factor',
    category: 'EQUITY_STYLE',
    informationCutoff: '2026-01-01T00:00:00Z'
  };
  const factB = {
    factorId: 'fact_beta',
    name: 'Beta Factor',
    category: 'MARKET',
    informationCutoff: '2026-01-01T00:00:00Z'
  };

  exposureStore.saveFactorDefinition(factA, 'tenant_alpha');
  exposureStore.saveFactorDefinition(factB, 'tenant_beta');

  assert.notStrictEqual(exposureStore.getFactorDefinition('fact_alpha', 'tenant_alpha'), null);
  assert.strictEqual(exposureStore.getFactorDefinition('fact_alpha', 'tenant_beta'), null);
  assert.notStrictEqual(exposureStore.getFactorDefinition('fact_beta', 'tenant_beta'), null);
  assert.strictEqual(exposureStore.getFactorDefinition('fact_beta', 'tenant_alpha'), null);
});

it('Point-in-Time asOf temporal filtering', () => {
  const obs1 = {
    observationId: 'obs_2024',
    entityId: 'NVDA',
    factorId: 'MARKET_BETA',
    exposureValue: 1.25,
    informationCutoff: '2024-12-31T23:59:59Z'
  };
  const obs2 = {
    observationId: 'obs_2025',
    entityId: 'NVDA',
    factorId: 'MARKET_BETA',
    exposureValue: 1.55,
    informationCutoff: '2025-12-31T23:59:59Z'
  };

  exposureStore.saveExposureObservation(obs1, 'tenant_alpha');
  exposureStore.saveExposureObservation(obs2, 'tenant_alpha');

  // Query as of 2025-01-01
  const list2024 = exposureStore.listExposureObservations('tenant_alpha', '2025-01-01T00:00:00Z');
  assert.strictEqual(list2024.length, 1);
  assert.strictEqual(list2024[0].observationId, 'obs_2024');

  // Query as of 2026-01-01
  const list2025 = exposureStore.listExposureObservations('tenant_alpha', '2026-01-01T00:00:00Z');
  assert.strictEqual(list2025.length, 2);

  // Look-ahead prevention
  assert.strictEqual(exposureStore.getExposureObservation('obs_2025', 'tenant_alpha', '2024-12-31T00:00:00Z'), null);
});

it('Store stats and deep freeze immutability', () => {
  const stats = exposureStore.getStats('tenant_alpha');
  assert.strictEqual(stats.observationsCount, 2);
  assert.strictEqual(stats.factorDefinitionsCount, 1);

  const item = exposureStore.getExposureObservation('obs_2024', 'tenant_alpha');
  assert.throws(() => { item.exposureValue = 9.99; });
});

console.log(`PASSED: ${passed} assertions passed.\n`);
