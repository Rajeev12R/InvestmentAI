import assert from 'assert';
import { ExternalIntelligenceStore } from '../externalIntelligence/external.store.js';
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

console.log('=== Suite 5: Transcripts & Attributed Management Commentary ===');

it('should extract management commentary preserving speaker attribution and stating non-objective fact status', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalExtractionEngine(store);

  store.saveSource('tenant_01', {
    sourceId: 'src_ir_portal',
    sourceType: SourceType.TRANSCRIPT,
    publisher: 'NVIDIA IR',
    canonicalName: 'NVDA IR Portal',
    verificationStatus: VerificationStatus.VERIFIED_PRIMARY,
    version: 1
  });

  const commentary = engine.extractManagementCommentary('tenant_01', {
    artifactId: 'art_q4_transcript',
    sourceId: 'src_ir_portal',
    subjectId: 'NVDA',
    speakerName: 'Colette Kress',
    speakerRole: 'CFO',
    statementText: 'We expect gross margins to be in the mid-70s for the upcoming fiscal year.',
    topic: 'MARGIN_GUIDANCE',
    dataTimestamp: '2026-02-25T21:00:00Z',
    publicationTimestamp: '2026-02-25T21:30:00Z',
    knowledgeAvailableAt: '2026-02-25T21:30:00Z'
  });

  assert.strictEqual(commentary.observationType, ObservationType.MANAGEMENT_COMMENTARY);
  assert.strictEqual(commentary.attribution.speakerName, 'Colette Kress');
  assert.strictEqual(commentary.attribution.speakerRole, 'CFO');
  assert.strictEqual(commentary.attribution.statementType, 'MANAGEMENT_STATED');
  assert.strictEqual(commentary.attribution.isObjectiveFact, false); // Invariant: Management statements are not objective facts
  assert.strictEqual(commentary.observationClass, ObservationClass.VALIDATED_EXTERNAL);
  assert.strictEqual(commentary.topic, 'MARGIN_GUIDANCE');
  assert.strictEqual(commentary.dataTimestamp, '2026-02-25T21:00:00Z');
});

it('should support multiple speakers with distinct roles and topics across executive remarks', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalExtractionEngine(store);

  store.saveSource('tenant_01', {
    sourceId: 'src_transcript_call',
    sourceType: SourceType.TRANSCRIPT,
    publisher: 'S&P Capital IQ Transcripts',
    canonicalName: 'Capital IQ',
    verificationStatus: VerificationStatus.VERIFIED_VENDOR,
    version: 1
  });

  const ceoRemark = engine.extractManagementCommentary('tenant_01', {
    artifactId: 'art_call_2026',
    sourceId: 'src_transcript_call',
    subjectId: 'NVDA',
    speakerName: 'Jensen Huang',
    speakerRole: 'CEO',
    statementText: 'Accelerated computing and generative AI have hit the tipping point worldwide.',
    topic: 'INDUSTRY_DEMAND'
  });

  const cooRemark = engine.extractManagementCommentary('tenant_01', {
    artifactId: 'art_call_2026',
    sourceId: 'src_transcript_call',
    subjectId: 'NVDA',
    speakerName: 'Debora Shoquist',
    speakerRole: 'EVP_OPERATIONS',
    statementText: 'Supply constraints for advanced packaging are easing on track with our wafer allocations.',
    topic: 'SUPPLY_CHAIN'
  });

  assert.strictEqual(ceoRemark.attribution.speakerName, 'Jensen Huang');
  assert.strictEqual(ceoRemark.attribution.speakerRole, 'CEO');
  assert.strictEqual(ceoRemark.attribution.isObjectiveFact, false);

  assert.strictEqual(cooRemark.attribution.speakerName, 'Debora Shoquist');
  assert.strictEqual(cooRemark.attribution.speakerRole, 'EVP_OPERATIONS');
  assert.strictEqual(cooRemark.attribution.isObjectiveFact, false);
});

it('should preserve evidence spans and character offsets linking commentary to raw transcript artifact', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalExtractionEngine(store);

  const rawText = 'Operator: Please welcome CFO Colette Kress. Colette Kress: Next quarter revenue is expected to be $28.0 billion, plus or minus 2%.';
  const art = engine.ingestRawArtifact('tenant_01', {
    artifactId: 'art_raw_trans',
    sourceId: 'src_ir',
    contentType: 'TRANSCRIPT_TEXT',
    rawContent: rawText
  });

  const commentary = engine.extractManagementCommentary('tenant_01', {
    artifactId: art.artifactId,
    sourceId: 'src_ir',
    subjectId: 'NVDA',
    speakerName: 'Colette Kress',
    speakerRole: 'CFO',
    statementText: 'Next quarter revenue is expected to be $28.0 billion, plus or minus 2%.',
    topic: 'REVENUE_GUIDANCE'
  });

  const ev = store.getEntityAsOf('tenant_01', 'extractedEvidences', commentary.evidenceId);
  assert.ok(ev);
  assert.strictEqual(ev.artifactId, art.artifactId);
  assert.strictEqual(ev.extractionMethod, 'TRANSCRIPT_PARSER');
  assert.strictEqual(ev.extractedText.includes('Colette Kress (CFO)'), true);
});

it('should classify unverified transcript commentary as UNVERIFIED_EXTERNAL', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalExtractionEngine(store);

  store.saveSource('tenant_01', {
    sourceId: 'src_unverified_blog',
    sourceType: SourceType.WEB,
    publisher: 'Unverified Retail Blog',
    canonicalName: 'Blog',
    verificationStatus: VerificationStatus.UNVERIFIED,
    version: 1
  });

  const commentary = engine.extractManagementCommentary('tenant_01', {
    artifactId: 'art_blog_trans',
    sourceId: 'src_unverified_blog',
    subjectId: 'NVDA',
    speakerName: 'Anonymous Executive',
    speakerRole: 'VP_SALES',
    statementText: 'Orders are accelerating beyond public estimates.',
    topic: 'DEMAND_RUMOR'
  });

  assert.strictEqual(commentary.observationClass, ObservationClass.UNVERIFIED_EXTERNAL);
  assert.strictEqual(commentary.attribution.isObjectiveFact, false);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
