import assert from 'assert';
import { ExternalIntelligenceStore } from '../externalIntelligence/external.store.js';
import { ExternalExtractionEngine } from '../externalIntelligence/external.extraction.engine.js';
import { ObservationClass, ObservationType, ArtifactContentType } from '../externalIntelligence/external.types.js';

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

console.log('=== Suite 2: Immutable Raw Artifact Store & Temporal Hardening ===');

it('should store raw artifacts immutably with deterministic SHA-256 hashes', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalExtractionEngine(store);

  const rawHtml = '<html><body><h1>SEC 10-K Excerpt</h1><p>Revenue: $50B</p></body></html>';
  const art = engine.ingestRawArtifact('tenant_01', {
    artifactId: 'art_100',
    sourceId: 'src_sec',
    contentType: ArtifactContentType.HTML,
    rawContent: rawHtml,
    retrievedAt: '2026-03-01T10:00:00Z'
  });

  assert.strictEqual(art.artifactId, 'art_100');
  assert.strictEqual(typeof art.rawContentHash, 'string');
  assert.strictEqual(art.rawContentHash.length, 64);

  // Ingesting identical content produces identical hash
  const art2 = engine.ingestRawArtifact('tenant_01', {
    artifactId: 'art_101',
    sourceId: 'src_sec',
    contentType: ArtifactContentType.HTML,
    rawContent: rawHtml,
    retrievedAt: '2026-03-01T11:00:00Z'
  });
  assert.strictEqual(art.rawContentHash, art2.rawContentHash);
});

it('should support multiple artifact formats with metadata preservation', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalExtractionEngine(store);

  const formats = [
    { type: ArtifactContentType.PDF, content: '%PDF-1.4 ... binary data ...' },
    { type: ArtifactContentType.JSON, content: JSON.stringify({ revenue: 1000000, margin: 0.65 }) },
    { type: ArtifactContentType.CSV, content: 'date,ticker,volume\n2026-03-01,NVDA,50000000' },
    { type: ArtifactContentType.TRANSCRIPT_TEXT, content: 'Operator: Welcome to the call. Jensen: We are seeing strong compute demand.' }
  ];

  for (const fmt of formats) {
    const art = engine.ingestRawArtifact('tenant_01', {
      sourceId: 'src_multi',
      contentType: fmt.type,
      rawContent: fmt.content,
      canonicalUri: `https://example.com/data.${fmt.type.toLowerCase()}`
    });
    assert.strictEqual(art.contentType, fmt.type);
    assert.strictEqual(typeof art.rawContentHash, 'string');
  }
});

it('should enforce strict tenant isolation for raw artifacts and observations', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalExtractionEngine(store);

  engine.ingestRawArtifact('tenant_A', {
    artifactId: 'art_secret_a',
    sourceId: 'src_priv',
    contentType: ArtifactContentType.JSON,
    rawContent: '{"secret": "fund_a_data"}'
  });

  const queryA = store.getEntityAsOf('tenant_A', 'rawArtifacts', 'art_secret_a');
  const queryB = store.getEntityAsOf('tenant_B', 'rawArtifacts', 'art_secret_a');

  assert.ok(queryA !== null);
  assert.strictEqual(queryB, null);
});

it('should enforce point-in-time knowledge cutoff and prevent look-ahead leakage', () => {
  const store = new ExternalIntelligenceStore();

  // Observation 1: Known on 2026-01-15
  store.saveObservation('tenant_01', {
    observationId: 'obs_past',
    sourceId: 'src_vendor',
    artifactId: 'art_01',
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.VALIDATED_EXTERNAL,
    subjectId: 'NVDA',
    dataTimestamp: '2026-01-10T00:00:00Z',
    publicationTimestamp: '2026-01-14T00:00:00Z',
    retrievalTimestamp: '2026-01-15T00:00:00Z',
    knowledgeAvailableAt: '2026-01-15T00:00:00Z',
    version: 1
  });

  // Observation 2: Known on 2026-03-01
  store.saveObservation('tenant_01', {
    observationId: 'obs_future',
    sourceId: 'src_vendor',
    artifactId: 'art_02',
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.VALIDATED_EXTERNAL,
    subjectId: 'NVDA',
    dataTimestamp: '2026-02-25T00:00:00Z',
    publicationTimestamp: '2026-02-28T00:00:00Z',
    retrievalTimestamp: '2026-03-01T00:00:00Z',
    knowledgeAvailableAt: '2026-03-01T00:00:00Z',
    version: 1
  });

  // Historical query as of 2026-02-01: should only see obs_past
  const asOfFeb = store.listEntities('tenant_01', 'observations', null, '2026-02-01T00:00:00Z');
  assert.strictEqual(asOfFeb.length, 1);
  assert.strictEqual(asOfFeb[0].observationId, 'obs_past');

  // Query as of 2026-03-15: sees both
  const asOfMarch = store.listEntities('tenant_01', 'observations', null, '2026-03-15T00:00:00Z');
  assert.strictEqual(asOfMarch.length, 2);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
