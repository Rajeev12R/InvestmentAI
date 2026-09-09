import assert from 'assert';
import { ExternalIntelligenceStore } from '../externalIntelligence/external.store.js';
import { ExternalTruthBoundaryEngine } from '../externalIntelligence/external.truth.boundary.js';
import { ExternalExtractionEngine } from '../externalIntelligence/external.extraction.engine.js';
import { ObservationClass, ObservationType, SourceType, VerificationStatus } from '../externalIntelligence/external.types.js';

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

console.log('=== Suite 11: Truth Promotion Boundary & Human Authorization Gate ===');

it('should prevent AI promotion of external observations to Truth facts', () => {
  const store = new ExternalIntelligenceStore();
  const boundary = new ExternalTruthBoundaryEngine(store);

  const cand = boundary.createPromotionCandidate('tenant_01', {
    targetFactId: 'FACT_NVDA_CAPEX_2026',
    observationIds: ['obs_test_01'],
    proposedValue: 5000000000,
    verificationStatus: VerificationStatus.VERIFIED_PRIMARY
  });

  assert.throws(() => {
    boundary.promoteCandidateToTruth('tenant_01', cand.candidateId, {
      reviewerId: 'ai_copilot_assistant',
      reviewerRole: 'PORTFOLIO_MANAGER',
      isAi: true,
      decision: 'PROMOTED'
    });
  }, /AI cannot promote external observation candidates/);
});

it('should permit authorized human reviewer to promote verified primary candidates to Truth', () => {
  const store = new ExternalIntelligenceStore();
  const boundary = new ExternalTruthBoundaryEngine(store);

  store.saveSource('tenant_01', {
    sourceId: 'src_sec_prom',
    sourceType: SourceType.REGULATORY,
    publisher: 'SEC',
    canonicalName: 'SEC',
    verificationStatus: VerificationStatus.VERIFIED_REGULATORY,
    version: 1
  });

  store.saveObservation('tenant_01', {
    observationId: 'obs_prom_01',
    sourceId: 'src_sec_prom',
    artifactId: 'art_01',
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.VERIFIED_REGULATORY,
    subjectId: 'NVDA',
    dataTimestamp: '2026-03-01T00:00:00Z',
    publicationTimestamp: '2026-03-01T00:00:00Z',
    retrievalTimestamp: '2026-03-01T00:00:00Z',
    knowledgeAvailableAt: '2026-03-01T00:00:00Z',
    version: 1
  });

  const cand = boundary.createPromotionCandidate('tenant_01', {
    targetFactId: 'FACT_NVDA_CAPEX_2026',
    observationIds: ['obs_prom_01'],
    proposedValue: 5000000000,
    verificationStatus: VerificationStatus.VERIFIED_REGULATORY
  });

  const promoted = boundary.promoteCandidateToTruth('tenant_01', cand.candidateId, {
    reviewerId: 'pm_lead_01',
    reviewerRole: 'PORTFOLIO_MANAGER',
    isAi: false,
    decision: 'PROMOTED',
    rationale: 'Confirmed against 10-K schedule'
  });

  assert.strictEqual(promoted.reviewStatus, 'PROMOTED');
  assert.strictEqual(promoted.promotedBy, 'pm_lead_01');
  assert.strictEqual(promoted.targetFactId, 'FACT_NVDA_CAPEX_2026');
});

it('should deny Truth promotion for unverified external sources and observations', () => {
  const store = new ExternalIntelligenceStore();
  const boundary = new ExternalTruthBoundaryEngine(store);
  const extraction = new ExternalExtractionEngine(store);

  // 1. Unverified external web source
  store.saveSource('tenant_01', {
    sourceId: 'src_unver_web',
    sourceType: SourceType.WEB,
    publisher: 'Retail Blog',
    canonicalName: 'Blog',
    verificationStatus: VerificationStatus.UNVERIFIED,
    version: 1
  });

  const art = extraction.ingestRawArtifact('tenant_01', {
    artifactId: 'art_unver_1',
    sourceId: 'src_unver_web',
    rawContent: 'Company will announce $10B buyback'
  });

  const obs = store.saveObservation('tenant_01', {
    observationId: 'obs_unver_01',
    sourceId: 'src_unver_web',
    artifactId: art.artifactId,
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.UNVERIFIED_EXTERNAL,
    subjectId: 'NVDA',
    payload: { buybackAmount: 10000000000 },
    dataTimestamp: '2026-03-01T00:00:00Z',
    publicationTimestamp: '2026-03-01T00:00:00Z',
    retrievalTimestamp: '2026-03-01T00:00:00Z',
    knowledgeAvailableAt: '2026-03-01T00:00:00Z',
    version: 1
  });

  // Candidate may exist in draft stage
  const cand = boundary.createPromotionCandidate('tenant_01', {
    targetFactId: 'FACT_NVDA_BUYBACK',
    observationIds: [obs.observationId],
    proposedValue: 10000000000,
    verificationStatus: VerificationStatus.UNVERIFIED
  });

  assert.ok(cand);
  assert.strictEqual(cand.reviewStatus, 'PENDING_HUMAN_REVIEW');

  // Attempting promotion to Truth must be DENIED
  assert.throws(() => {
    boundary.promoteCandidateToTruth('tenant_01', cand.candidateId, {
      reviewerId: 'pm_lead_01',
      reviewerRole: 'PORTFOLIO_MANAGER',
      isAi: false,
      decision: 'PROMOTED',
      rationale: 'Looks plausible'
    });
  }, /Promotion rejected: Candidate lacks VERIFIED_PRIMARY or VERIFIED_REGULATORY/);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
