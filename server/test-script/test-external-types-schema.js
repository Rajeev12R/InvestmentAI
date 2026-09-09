import assert from 'assert';
import {
  SourceType,
  VerificationStatus,
  ObservationType,
  ObservationClass,
  CorroborationState,
  RegulatoryStatus,
  DatasetType,
  ArtifactContentType,
  computeExternalHash,
  computeRawContentHash,
  deepFreeze
} from '../externalIntelligence/external.types.js';
import {
  validateSource,
  validateRawArtifact,
  validateExtractedEvidence,
  validateExternalObservation,
  validateAlternativeDataset,
  validateTruthUpdateCandidate,
  ExternalIntelligenceValidationError
} from '../externalIntelligence/external.schema.js';

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

console.log('=== Suite 1: External Intelligence Types, Taxonomy & Schemas (Hardened) ===');

// 1. Source Taxonomy (16 Classes)
it('should verify all 16 SourceType taxonomy classes', () => {
  assert.strictEqual(SourceType.REGULATORY, 'REGULATORY');
  assert.strictEqual(SourceType.COMPANY_PRIMARY, 'COMPANY_PRIMARY');
  assert.strictEqual(SourceType.EXCHANGE, 'EXCHANGE');
  assert.strictEqual(SourceType.CENTRAL_BANK, 'CENTRAL_BANK');
  assert.strictEqual(SourceType.GOVERNMENT, 'GOVERNMENT');
  assert.strictEqual(SourceType.TRANSCRIPT, 'TRANSCRIPT');
  assert.strictEqual(SourceType.INVESTOR_PRESENTATION, 'INVESTOR_PRESENTATION');
  assert.strictEqual(SourceType.COMPANY_WEBSITE, 'COMPANY_WEBSITE');
  assert.strictEqual(SourceType.INDUSTRY_SOURCE, 'INDUSTRY_SOURCE');
  assert.strictEqual(SourceType.RESEARCH_PROVIDER, 'RESEARCH_PROVIDER');
  assert.strictEqual(SourceType.NEWS, 'NEWS');
  assert.strictEqual(SourceType.WEB, 'WEB');
  assert.strictEqual(SourceType.ALTERNATIVE_DATA_VENDOR, 'ALTERNATIVE_DATA_VENDOR');
  assert.strictEqual(SourceType.SOCIAL, 'SOCIAL');
  assert.strictEqual(SourceType.USER_PROVIDED, 'USER_PROVIDED');
  assert.strictEqual(SourceType.AI_GENERATED, 'AI_GENERATED');
});

// 2. Verification Statuses & Observation Classes
it('should verify VerificationStatus and ObservationClass enums', () => {
  assert.strictEqual(VerificationStatus.UNKNOWN, 'UNKNOWN');
  assert.strictEqual(VerificationStatus.UNVERIFIED, 'UNVERIFIED');
  assert.strictEqual(VerificationStatus.VERIFIED_PRIMARY, 'VERIFIED_PRIMARY');
  assert.strictEqual(VerificationStatus.VERIFIED_REGULATORY, 'VERIFIED_REGULATORY');
  assert.strictEqual(VerificationStatus.VERIFIED_VENDOR, 'VERIFIED_VENDOR');
  assert.strictEqual(VerificationStatus.REVOKED, 'REVOKED');
  assert.strictEqual(VerificationStatus.EXPIRED, 'EXPIRED');

  assert.strictEqual(ObservationClass.VERIFIED_PRIMARY, 'VERIFIED_PRIMARY');
  assert.strictEqual(ObservationClass.VERIFIED_REGULATORY, 'VERIFIED_REGULATORY');
  assert.strictEqual(ObservationClass.VERIFIED_VENDOR, 'VERIFIED_VENDOR');
  assert.strictEqual(ObservationClass.VALIDATED_EXTERNAL, 'VALIDATED_EXTERNAL');
  assert.strictEqual(ObservationClass.UNVERIFIED_EXTERNAL, 'UNVERIFIED_EXTERNAL');
  assert.strictEqual(ObservationClass.DERIVED, 'DERIVED');
  assert.strictEqual(ObservationClass.MODEL_ESTIMATE, 'MODEL_ESTIMATE');
  assert.strictEqual(ObservationClass.AI_EXTRACTED_CANDIDATE, 'AI_EXTRACTED_CANDIDATE');
  assert.strictEqual(ObservationClass.CONFLICTED, 'CONFLICTED');
  assert.strictEqual(ObservationClass.UNAVAILABLE, 'UNAVAILABLE');
});

// 3. Deep Freeze & Hashing
it('should freeze objects deeply and compute canonical hashes', () => {
  const obj = { a: 'test', b: { c: 123 } };
  const frozen = deepFreeze(obj);
  assert.throws(() => { frozen.a = 'mutated'; });
  assert.throws(() => { frozen.b.c = 456; });

  const hash1 = computeExternalHash({ x: 1, y: 2 });
  const hash2 = computeExternalHash({ y: 2, x: 1 });
  assert.strictEqual(hash1, hash2);

  const rawHash = computeRawContentHash('<html><body>Content</body></html>');
  assert.strictEqual(typeof rawHash, 'string');
  assert.strictEqual(rawHash.length, 64);
});

// 4. Schema Validation & Error Rejections
it('should validate Source schema and reject missing/invalid fields', () => {
  const src = validateSource({
    sourceId: 'src_sec_01',
    sourceType: SourceType.REGULATORY,
    publisher: 'SEC',
    canonicalName: 'Securities and Exchange Commission',
    verificationStatus: VerificationStatus.VERIFIED_REGULATORY,
    version: 1
  });
  assert.strictEqual(src.sourceId, 'src_sec_01');
  assert.throws(() => validateSource({ sourceId: 'src_invalid' }), ExternalIntelligenceValidationError);
  assert.throws(() => validateSource({ sourceId: 'src_2', sourceType: 'INVALID_TYPE', publisher: 'P', canonicalName: 'C', verificationStatus: 'UNVERIFIED', version: 1 }), ExternalIntelligenceValidationError);
});

it('should validate RawArtifact schema across formats', () => {
  const art = validateRawArtifact({
    artifactId: 'art_01',
    sourceId: 'src_sec_01',
    rawContentHash: '0xhash123',
    contentType: ArtifactContentType.PDF,
    retrievedAt: '2026-03-01T00:00:00Z'
  });
  assert.strictEqual(art.contentType, 'PDF');
  assert.throws(() => validateRawArtifact({ artifactId: 'art_invalid' }), ExternalIntelligenceValidationError);
});

it('should validate ExtractedEvidence schema and reject missing fields', () => {
  const ev = validateExtractedEvidence({
    evidenceId: 'ev_01',
    artifactId: 'art_01',
    sourceId: 'src_sec_01',
    extractedText: 'Gross margin expanded by 150bps',
    extractionMethod: 'DETERMINISTIC_PARSER'
  });
  assert.strictEqual(ev.evidenceId, 'ev_01');
  assert.throws(() => validateExtractedEvidence({ evidenceId: 'ev_2' }), ExternalIntelligenceValidationError);
});

it('should validate ExternalObservation schema with 5 timestamps', () => {
  const obs = validateExternalObservation({
    observationId: 'obs_01',
    sourceId: 'src_sec_01',
    artifactId: 'art_01',
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.VALIDATED_EXTERNAL,
    subjectId: 'NVDA',
    dataTimestamp: '2026-03-01T00:00:00Z',
    publicationTimestamp: '2026-03-01T00:00:00Z',
    retrievalTimestamp: '2026-03-01T00:00:00Z',
    knowledgeAvailableAt: '2026-03-01T00:00:00Z',
    version: 1
  });
  assert.strictEqual(obs.observationType, 'DEMAND_SIGNAL');
  assert.throws(() => validateExternalObservation({ observationId: 'obs_bad', subjectId: 'NVDA' }), ExternalIntelligenceValidationError);
});

it('should validate AlternativeDataset and TruthUpdateCandidate schemas', () => {
  const ds = validateAlternativeDataset({
    datasetId: 'ds_01',
    vendor: 'SimilarWeb',
    datasetType: DatasetType.POINT_IN_TIME,
    methodology: 'Search keyword volume aggregated daily',
    version: 1
  });
  assert.strictEqual(ds.vendor, 'SimilarWeb');

  const cand = validateTruthUpdateCandidate({
    candidateId: 'cand_01',
    targetFactId: 'FACT_NVDA_REV_Q4',
    observationIds: ['obs_01'],
    proposedValue: 120000000,
    verificationStatus: VerificationStatus.VERIFIED_PRIMARY
  });
  assert.strictEqual(cand.proposedValue, 120000000);
  assert.throws(() => validateTruthUpdateCandidate({ candidateId: 'cand_bad', observationIds: [] }), ExternalIntelligenceValidationError);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
