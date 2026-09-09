import assert from 'assert';
import { SignalIntelligenceStore } from '../signalIntelligence/signal.store.js';
import { SignalType, SignalStatus, SignalDirection, SignalRegime } from '../signalIntelligence/signal.types.js';

let totalAssertions = 0;
function it(desc, fn) {
  try {
    fn();
    totalAssertions++;
  } catch (err) {
    console.error(`FAILED: ${desc}`);
    throw err;
  }
}

console.log('=== Suite 2: Multi-Tenant Signal Store & Point-in-Time Cutoff ===');

it('should save signals with immutable versioning and canonical hash', () => {
  const store = new SignalIntelligenceStore();

  const sig1 = store.saveSignal('tenant_01', {
    signalId: 'sig_nvda_growth',
    signalType: SignalType.GROWTH_SIGNAL,
    entityId: 'NVDA',
    direction: SignalDirection.POSITIVE,
    magnitude: 0.65,
    confidence: 0.85,
    status: SignalStatus.VALIDATED,
    methodologyVersion: '2026.1',
    knowledgeCutoff: '2026-01-15T00:00:00Z'
  });

  assert.strictEqual(sig1.version, 1);
  assert.strictEqual(typeof sig1.contentHash, 'string');
  assert.strictEqual(sig1.contentHash.length, 64);

  // Update signal vintage (version 2)
  const sig2 = store.saveSignal('tenant_01', {
    signalId: 'sig_nvda_growth',
    signalType: SignalType.GROWTH_SIGNAL,
    entityId: 'NVDA',
    direction: SignalDirection.STRONGLY_POSITIVE,
    magnitude: 0.88,
    confidence: 0.90,
    status: SignalStatus.VALIDATED,
    methodologyVersion: '2026.1',
    knowledgeCutoff: '2026-02-15T00:00:00Z',
    version: 2
  });

  assert.strictEqual(sig2.version, 2);
  assert.strictEqual(sig2.magnitude, 0.88);

  const history = store.getEntityHistory('tenant_01', 'signals', 'sig_nvda_growth');
  assert.strictEqual(history.length, 2);
});

it('should enforce strict point-in-time knowledge cutoff querying', () => {
  const store = new SignalIntelligenceStore();

  // Version 1 as of Jan 15
  store.saveSignal('tenant_01', {
    signalId: 'sig_tsla_val',
    signalType: SignalType.VALUATION_SIGNAL,
    entityId: 'TSLA',
    direction: SignalDirection.NEGATIVE,
    magnitude: -0.40,
    confidence: 0.70,
    status: SignalStatus.VALIDATED,
    methodologyVersion: '2026.1',
    knowledgeCutoff: '2026-01-15T00:00:00Z',
    version: 1
  });

  // Version 2 as of March 01
  store.saveSignal('tenant_01', {
    signalId: 'sig_tsla_val',
    signalType: SignalType.VALUATION_SIGNAL,
    entityId: 'TSLA',
    direction: SignalDirection.POSITIVE,
    magnitude: 0.25,
    confidence: 0.80,
    status: SignalStatus.VALIDATED,
    methodologyVersion: '2026.1',
    knowledgeCutoff: '2026-03-01T00:00:00Z',
    version: 2
  });

  // Query as of Feb 01: MUST return version 1
  const asOfFeb = store.getEntityAsOf('tenant_01', 'signals', 'sig_tsla_val', '2026-02-01T00:00:00Z');
  assert.ok(asOfFeb);
  assert.strictEqual(asOfFeb.version, 1);
  assert.strictEqual(asOfFeb.magnitude, -0.40);

  // Query as of March 15: returns version 2
  const asOfMarch = store.getEntityAsOf('tenant_01', 'signals', 'sig_tsla_val', '2026-03-15T00:00:00Z');
  assert.ok(asOfMarch);
  assert.strictEqual(asOfMarch.version, 2);
  assert.strictEqual(asOfMarch.magnitude, 0.25);
});

it('should enforce absolute tenant isolation across all signal entities', () => {
  const store = new SignalIntelligenceStore();

  store.saveSignal('tenant_alpha', {
    signalId: 'sig_alpha_prop',
    signalType: SignalType.PORTFOLIO_SIGNAL,
    entityId: 'NVDA',
    direction: SignalDirection.STRONGLY_POSITIVE,
    magnitude: 0.95,
    confidence: 0.99,
    status: SignalStatus.VALIDATED,
    methodologyVersion: '2026.1',
    knowledgeCutoff: '2026-03-01T00:00:00Z'
  });

  const queryAlpha = store.getEntityAsOf('tenant_alpha', 'signals', 'sig_alpha_prop');
  const queryBeta = store.getEntityAsOf('tenant_beta', 'signals', 'sig_alpha_prop');

  assert.ok(queryAlpha !== null);
  assert.strictEqual(queryBeta, null);
  assert.strictEqual(store.listEntities('tenant_beta', 'signals').length, 0);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
