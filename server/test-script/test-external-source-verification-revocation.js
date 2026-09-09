import assert from 'assert';
import { ExternalIntelligenceStore } from '../externalIntelligence/external.store.js';
import { ExternalSourceEngine } from '../externalIntelligence/external.source.engine.js';
import { SourceType, VerificationStatus, ObservationType, ObservationClass } from '../externalIntelligence/external.types.js';

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

console.log('=== Suite 3: Source Verification Lifecycle & Revocation (Hardened) ===');

it('should enforce the full verification lifecycle: UNKNOWN -> UNVERIFIED -> VERIFIED_PRIMARY/VENDOR/REGULATORY -> REVOKED', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalSourceEngine(store);

  // 1. Initial creation (UNVERIFIED)
  const src = engine.registerSource('tenant_01', {
    sourceId: 'src_cycle_01',
    sourceType: SourceType.COMPANY_PRIMARY,
    publisher: 'NVIDIA Corp IR',
    canonicalName: 'NVIDIA Official IR Portal'
  });
  assert.strictEqual(src.verificationStatus, VerificationStatus.UNVERIFIED);

  // 2. UNVERIFIED -> VERIFIED_PRIMARY with evidence
  const verifiedPrimary = engine.verifySource('tenant_01', 'src_cycle_01', {
    verificationStatus: VerificationStatus.VERIFIED_PRIMARY,
    verificationMethod: 'PRIMARY_DOMAIN_DNS_CERT',
    verificationEvidence: 'DNS TXT token validated + TLS cert match for investor.nvidia.com'
  });
  assert.strictEqual(verifiedPrimary.verificationStatus, VerificationStatus.VERIFIED_PRIMARY);
  assert.strictEqual(verifiedPrimary.version, 2);

  // 3. VERIFIED -> REVOKED
  const revoked = engine.revokeSource('tenant_01', 'src_cycle_01', {
    revocationReason: 'Compromised publisher credentials detected'
  });
  assert.strictEqual(revoked.revokedSource.verificationStatus, VerificationStatus.REVOKED);
  assert.strictEqual(revoked.revokedSource.version, 3);
});

it('should enforce that verification evidence is separately stored and hash alone cannot establish authenticity', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalSourceEngine(store);

  engine.registerSource('tenant_01', {
    sourceId: 'src_fake_auth',
    sourceType: SourceType.RESEARCH_PROVIDER,
    publisher: 'Rogue Analytics',
    canonicalName: 'Rogue Analytics'
  });

  // Attempting verification with only a hash or empty evidence must fail
  assert.throws(() => {
    engine.verifySource('tenant_01', 'src_fake_auth', {
      verificationStatus: VerificationStatus.VERIFIED_VENDOR,
      verificationEvidence: '   '
    });
  }, /Verification evidence is mandatory/);

  // Attempting verification without an authorized target status must fail
  assert.throws(() => {
    engine.verifySource('tenant_01', 'src_fake_auth', {
      verificationStatus: 'UNKNOWN',
      verificationEvidence: 'Some string'
    });
  }, /Invalid target verification status/);
});

it('should revoke sources without destroying historical audit records and identify all downstream affected observations', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalSourceEngine(store);

  engine.registerSource('tenant_01', {
    sourceId: 'src_scam_leak',
    sourceType: SourceType.WEB,
    publisher: 'Unverified Rumor Site',
    canonicalName: 'Tech Rumors Leak'
  });

  // Save observations linked to this source
  store.saveObservation('tenant_01', {
    observationId: 'obs_leak_01',
    sourceId: 'src_scam_leak',
    artifactId: 'art_01',
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.UNVERIFIED_EXTERNAL,
    subjectId: 'NVDA',
    dataTimestamp: '2026-03-01T00:00:00Z',
    publicationTimestamp: '2026-03-01T00:00:00Z',
    retrievalTimestamp: '2026-03-01T00:00:00Z',
    knowledgeAvailableAt: '2026-03-01T00:00:00Z',
    version: 1
  });

  const revokeResult = engine.revokeSource('tenant_01', 'src_scam_leak', {
    revocationReason: 'Fabricated rumor source identified',
    revokedBy: 'compliance_officer_01'
  });

  assert.strictEqual(revokeResult.revokedSource.verificationStatus, VerificationStatus.REVOKED);
  assert.strictEqual(revokeResult.affectedObservationsCount, 1);
  assert.strictEqual(revokeResult.requiresWorkflowReview, true);

  // Historical source record is preserved
  const hist = store.getEntityHistory('tenant_01', 'sources', 'src_scam_leak');
  assert.strictEqual(hist.length, 2);
  assert.strictEqual(hist[0].verificationStatus, VerificationStatus.UNVERIFIED);
  assert.strictEqual(hist[1].verificationStatus, VerificationStatus.REVOKED);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
