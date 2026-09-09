import assert from 'assert';
import { ExternalIntelligenceStore } from '../externalIntelligence/external.store.js';
import { ExternalIntelligenceBridges } from '../externalIntelligence/external.bridges.js';
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

console.log('=== Suite 12: External Intelligence Bridges Integration ===');

it('should generate Attention triggers and Workflow review tasks from critical regulatory and alternative signals', () => {
  const store = new ExternalIntelligenceStore();
  const bridges = new ExternalIntelligenceBridges(store);

  store.saveSource('tenant_01', {
    sourceId: 'src_bis_reg',
    sourceType: SourceType.REGULATORY,
    publisher: 'BIS',
    canonicalName: 'BIS',
    verificationStatus: VerificationStatus.VERIFIED_REGULATORY,
    version: 1
  });

  const obs = store.saveObservation('tenant_01', {
    observationId: 'obs_reg_critical',
    sourceId: 'src_bis_reg',
    artifactId: 'art_reg_01',
    evidenceId: 'ev_reg_01',
    observationType: ObservationType.REGULATORY_SIGNAL,
    observationClass: ObservationClass.VERIFIED_REGULATORY,
    subjectId: 'NVDA',
    payload: { severity: 'CRITICAL', rule: 'Export Restriction' },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  // Attention Trigger
  const attention = bridges.generateAttentionTrigger('tenant_01', 'obs_reg_critical');
  assert.strictEqual(attention.severity, 'HIGH');
  assert.strictEqual(attention.attentionType, 'REGULATORY_EVENT_RISK');

  // Workflow Review Task
  const task = bridges.generateWorkflowTask('tenant_01', 'obs_reg_critical');
  assert.strictEqual(task.taskType, 'REVIEW_COMPLIANCE');
  assert.strictEqual(task.priority, 'HIGH');
  assert.strictEqual(task.referencedObjectId, 'obs_reg_critical');
});

it('should synthesize external observations into Research Synthesis claims with clear provenance', () => {
  const store = new ExternalIntelligenceStore();
  const bridges = new ExternalIntelligenceBridges(store);

  store.saveEvidence('tenant_01', {
    evidenceId: 'ev_claim_01',
    artifactId: 'art_01',
    sourceId: 'src_sec',
    extractedText: 'Gross margin expanded by 180bps in Q4.',
    extractionMethod: 'DETERMINISTIC_PARSER'
  });

  store.saveObservation('tenant_01', {
    observationId: 'obs_claim_01',
    sourceId: 'src_sec',
    artifactId: 'art_01',
    evidenceId: 'ev_claim_01',
    observationType: ObservationType.COMPANY_GUIDANCE_OBSERVATION,
    observationClass: ObservationClass.VERIFIED_PRIMARY,
    subjectId: 'NVDA',
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  const claim = bridges.synthesizeExternalClaim('tenant_01', 'obs_claim_01');
  assert.strictEqual(claim.claimId, 'claim_ext_obs_claim_01');
  assert.strictEqual(claim.text, 'Gross margin expanded by 180bps in Q4.');
  assert.strictEqual(claim.isObjectiveFact, true);
  assert.strictEqual(claim.evidenceId, 'ev_claim_01');
});

it('should preserve classification semantics: Case A, Case B, Case C, Case D across synthesis bridge', () => {
  const store = new ExternalIntelligenceStore();
  const bridges = new ExternalIntelligenceBridges(store);

  // Case A: News article with evidence span -> UNVERIFIED_EXTERNAL
  store.saveEvidence('tenant_01', { evidenceId: 'ev_news_a', artifactId: 'art_news_a', sourceId: 'src_news_a', extractedText: 'Rumors of acquisition', extractionMethod: 'DETERMINISTIC_PARSER' });
  const obsA = store.saveObservation('tenant_01', {
    observationId: 'obs_case_a',
    sourceId: 'src_news_a',
    artifactId: 'art_news_a',
    evidenceId: 'ev_news_a',
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.UNVERIFIED_EXTERNAL,
    subjectId: 'AAPL',
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });
  const claimA = bridges.synthesizeExternalClaim('tenant_01', obsA.observationId);
  assert.strictEqual(claimA.classification, ObservationClass.UNVERIFIED_EXTERNAL);
  assert.strictEqual(claimA.isObjectiveFact, false);

  // Case B: Vendor dataset with valid vendor verification -> VERIFIED_VENDOR
  store.saveEvidence('tenant_01', { evidenceId: 'ev_vend_b', artifactId: 'art_vend_b', sourceId: 'src_vend_b', extractedText: 'Credit card transaction spend +8%', extractionMethod: 'DETERMINISTIC_PARSER' });
  const obsB = store.saveObservation('tenant_01', {
    observationId: 'obs_case_b',
    sourceId: 'src_vend_b',
    artifactId: 'art_vend_b',
    evidenceId: 'ev_vend_b',
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.VERIFIED_VENDOR,
    subjectId: 'AMZN',
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });
  const claimB = bridges.synthesizeExternalClaim('tenant_01', obsB.observationId);
  assert.strictEqual(claimB.classification, ObservationClass.VERIFIED_VENDOR);

  // Case C: Primary regulatory document -> VERIFIED_REGULATORY
  store.saveEvidence('tenant_01', { evidenceId: 'ev_reg_c', artifactId: 'art_reg_c', sourceId: 'src_reg_c', extractedText: 'EPA Notice of Compliance', extractionMethod: 'DETERMINISTIC_PARSER' });
  const obsC = store.saveObservation('tenant_01', {
    observationId: 'obs_case_c',
    sourceId: 'src_reg_c',
    artifactId: 'art_reg_c',
    evidenceId: 'ev_reg_c',
    observationType: ObservationType.REGULATORY_SIGNAL,
    observationClass: ObservationClass.VERIFIED_REGULATORY,
    subjectId: 'TSLA',
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });
  const claimC = bridges.synthesizeExternalClaim('tenant_01', obsC.observationId);
  assert.strictEqual(claimC.classification, ObservationClass.VERIFIED_REGULATORY);
  assert.strictEqual(claimC.isObjectiveFact, true);

  // Case D: AI-extracted candidate -> AI_EXTRACTED_CANDIDATE
  store.saveEvidence('tenant_01', { evidenceId: 'ev_ai_d', artifactId: 'art_ai_d', sourceId: 'src_ai_d', extractedText: 'AI inferred sentiment is very bullish', extractionMethod: 'AI_ASSISTED_EXTRACTION' });
  const obsD = store.saveObservation('tenant_01', {
    observationId: 'obs_case_d',
    sourceId: 'src_ai_d',
    artifactId: 'art_ai_d',
    evidenceId: 'ev_ai_d',
    observationType: ObservationType.SENTIMENT_SIGNAL,
    observationClass: ObservationClass.AI_EXTRACTED_CANDIDATE,
    subjectId: 'NVDA',
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });
  const claimD = bridges.synthesizeExternalClaim('tenant_01', obsD.observationId);
  assert.strictEqual(claimD.classification, ObservationClass.AI_EXTRACTED_CANDIDATE);
  assert.strictEqual(claimD.isObjectiveFact, false);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
