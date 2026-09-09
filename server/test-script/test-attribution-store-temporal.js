import assert from 'assert';
import { AlphaAttributionStore } from '../alphaAttribution/attribution.store.js';
import { AttributionStatus } from '../alphaAttribution/attribution.types.js';

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

console.log('=== Suite 2: Multi-Tenant Attribution Store & Point-in-Time Cutoff ===');

it('Multi-tenant isolation across funds', () => {
  const store = new AlphaAttributionStore();
  const tenantA = 'fund_alpha';
  const tenantB = 'fund_beta';

  store.saveAttribution(tenantA, {
    attributionId: 'attr_1',
    entityId: 'NVDA',
    attributedReturn: 0.05,
    status: AttributionStatus.ATTRIBUTED,
    informationCutoff: '2026-03-01T00:00:00Z'
  });

  const listA = store.listEntities(tenantA, 'attributions');
  const listB = store.listEntities(tenantB, 'attributions');
  assert.strictEqual(listA.length, 1);
  assert.strictEqual(listB.length, 0);
  assert.strictEqual(store.getEntityAsOf(tenantB, 'attributions', 'attr_1'), null);
});

it('Point-in-Time temporal cutoff queries', () => {
  const store = new AlphaAttributionStore();
  const tenant = 't_temporal';

  // Version 1 as of Jan 15
  store.saveAttribution(tenant, {
    attributionId: 'attr_nvda',
    entityId: 'NVDA',
    attributedReturn: 0.02,
    status: AttributionStatus.ATTRIBUTED,
    informationCutoff: '2026-01-15T00:00:00.000Z',
    version: 1
  });

  // Version 2 as of Feb 15
  store.saveAttribution(tenant, {
    attributionId: 'attr_nvda',
    entityId: 'NVDA',
    attributedReturn: 0.08,
    status: AttributionStatus.ATTRIBUTED,
    informationCutoff: '2026-02-15T00:00:00.000Z',
    version: 2
  });

  // Query as of Feb 01: MUST return version 1
  const asOfFeb = store.getEntityAsOf(tenant, 'attributions', 'attr_nvda', '2026-02-01T00:00:00.000Z');
  assert.strictEqual(asOfFeb.version, 1);
  assert.strictEqual(asOfFeb.attributedReturn, 0.02);

  // Query as of March 01: MUST return version 2
  const asOfMarch = store.getEntityAsOf(tenant, 'attributions', 'attr_nvda', '2026-03-01T00:00:00.000Z');
  assert.strictEqual(asOfMarch.version, 2);
  assert.strictEqual(asOfMarch.attributedReturn, 0.08);
});

it('Entity history version tracking', () => {
  const store = new AlphaAttributionStore();
  const tenant = 't_hist';

  store.saveObservation(tenant, {
    observationId: 'obs_1',
    signalId: 'sig_1',
    entityId: 'AAPL',
    observedValue: 0.40,
    informationCutoff: '2026-01-01T00:00:00Z',
    version: 1
  });

  store.saveObservation(tenant, {
    observationId: 'obs_1',
    signalId: 'sig_1',
    entityId: 'AAPL',
    observedValue: 0.60,
    informationCutoff: '2026-02-01T00:00:00Z',
    version: 2
  });

  const history = store.getEntityHistory(tenant, 'observations', 'obs_1');
  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0].observedValue, 0.40);
  assert.strictEqual(history[1].observedValue, 0.60);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
