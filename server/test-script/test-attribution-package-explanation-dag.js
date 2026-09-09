import assert from 'assert';
import { AlphaPackageEngine } from '../alphaAttribution/attribution.package.js';
import { AlphaAttributionStore } from '../alphaAttribution/attribution.store.js';

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

console.log('=== Suite 11: Sealed Attribution Package & Explanation DAG Engine ===');

it('Build and cryptographically seal attribution package with Explanation DAG', () => {
  const store = new AlphaAttributionStore();
  const engine = new AlphaPackageEngine(store);

  const attributions = [
    {
      entityId: 'NVDA',
      activeReturn: 0.05,
      signalContribution: 0.03,
      decisionContribution: 0.015,
      residual: 0.005,
      evidenceIds: ['ev_sec_10k', 'ev_earn_q4']
    }
  ];

  const sealed = engine.createAndSealAttributionPackage('t_default', {
    packageId: 'pkg_attr_101',
    portfolioReturn: 0.15,
    benchmarkReturn: 0.10,
    attributions,
    evidenceIds: ['ev_sec_10k', 'ev_earn_q4'],
    informationCutoff: '2026-03-01T00:00:00Z'
  });

  assert.strictEqual(sealed.isSealed, true);
  assert.ok(sealed.packageHash);
  assert.strictEqual(sealed.explanationDAG.nodes.length >= 3, true); // Root Alpha, Security NVDA, Evidence spans
  assert.strictEqual(sealed.explanationDAG.edges.length >= 2, true);

  // Verify seal integrity
  const verification = engine.verifyAttributionSeal(sealed);
  assert.strictEqual(verification.isValid, true);
  assert.strictEqual(verification.expectedHash, sealed.packageHash);
});

it('Detect tamper attempt in sealed attribution package', () => {
  const store = new AlphaAttributionStore();
  const engine = new AlphaPackageEngine(store);

  const sealed = engine.createAndSealAttributionPackage('t_default', {
    packageId: 'pkg_tamper_test',
    portfolioReturn: 0.10,
    benchmarkReturn: 0.05,
    attributions: [],
    informationCutoff: '2026-03-01T00:00:00Z'
  });

  // Tamper with return value
  const tampered = { ...sealed, portfolioReturn: 0.99 };
  const verification = engine.verifyAttributionSeal(tampered);
  assert.strictEqual(verification.isValid, false);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
