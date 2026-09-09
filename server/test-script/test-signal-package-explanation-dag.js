import assert from 'assert';
import { SignalIntelligenceStore } from '../signalIntelligence/signal.store.js';
import { SignalPackageEngine } from '../signalIntelligence/signal.package.js';
import { SignalRegime, SignalDirection } from '../signalIntelligence/signal.types.js';

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

console.log('=== Suite 10: Signal Explanation DAG & Package Sealing ===');

it('should build complete Explanation DAG connecting composite signals to inputs and evidence spans', () => {
  const store = new SignalIntelligenceStore();
  const engine = new SignalPackageEngine(store);

  const compositeSignals = {
    'NVDA': {
      entityId: 'NVDA',
      score: 0.75,
      regime: SignalRegime.STRONG_POSITIVE,
      direction: SignalDirection.STRONGLY_POSITIVE,
      contributors: [
        {
          inputId: 'norm_rev_01',
          signalType: 'GROWTH_SIGNAL',
          normalizedValue: 0.85,
          weight: 0.50,
          contribution: 0.425,
          evidenceIds: ['ev_10k_mda']
        },
        {
          inputId: 'norm_dcf_01',
          signalType: 'VALUATION_SIGNAL',
          normalizedValue: 0.65,
          weight: 0.50,
          contribution: 0.325,
          evidenceIds: ['ev_dcf_model']
        }
      ]
    }
  };

  const pkg = engine.createAndSealPackage('tenant_01', {
    packageId: 'pkg_sig_nvda_2026',
    entityId: 'NVDA',
    compositeSignals
  });

  assert.strictEqual(pkg.packageId, 'pkg_sig_nvda_2026');
  assert.strictEqual(pkg.isSealed, true);
  assert.strictEqual(typeof pkg.packageHash, 'string');
  assert.strictEqual(pkg.packageHash.length, 64);

  // Validate Explanation DAG Structure
  assert.ok(pkg.explanationDAG);
  assert.strictEqual(pkg.explanationDAG.rootEntityId, 'NVDA');
  assert.strictEqual(pkg.explanationDAG.nodes.length >= 5, true); // Root + 2 inputs + 2 evidence nodes
  assert.strictEqual(pkg.explanationDAG.edges.length >= 4, true);

  // Validate Package Seal Integrity
  const verifyRes = engine.verifyPackageSeal(pkg);
  assert.strictEqual(verifyRes.isValid, true);
});

it('should detect package tampering and reject invalid hashes', () => {
  const store = new SignalIntelligenceStore();
  const engine = new SignalPackageEngine(store);

  const pkg = engine.createAndSealPackage('tenant_01', {
    packageId: 'pkg_tamper_test',
    entityId: 'TSLA',
    compositeSignals: { 'TSLA': { entityId: 'TSLA', score: 0.5, regime: SignalRegime.POSITIVE, contributors: [] } }
  });

  // Tamper with package content
  const tampered = {
    ...pkg,
    compositeSignals: { 'TSLA': { entityId: 'TSLA', score: 0.99, regime: SignalRegime.STRONG_POSITIVE, contributors: [] } }
  };

  const verifyTampered = engine.verifyPackageSeal(tampered);
  assert.strictEqual(verifyTampered.isValid, false);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
