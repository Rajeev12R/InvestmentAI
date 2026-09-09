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

console.log('=== Suite 9: Competitive Signals & Supply Chain Dependencies ===');

it('should create supply chain candidate edge without bypassing Knowledge Graph provenance', () => {
  const store = new ExternalIntelligenceStore();
  const bridges = new ExternalIntelligenceBridges(store);

  // Ingest supply chain observation from Primary source
  const obs = store.saveObservation('tenant_01', {
    observationId: 'obs_tsmc_supply',
    sourceId: 'src_primary_sec',
    artifactId: 'art_10k',
    observationType: ObservationType.SUPPLY_CHAIN_SIGNAL,
    observationClass: ObservationClass.VERIFIED_PRIMARY,
    subjectId: 'NVDA',
    evidenceId: 'ev_10k_footnote',
    payload: { supplier: 'TSMC', component: 'CoWoS_Packaging', allocationPct: 0.85 },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  const edgeCandidate = bridges.createKnowledgeGraphEdgeCandidate('tenant_01', {
    sourceEntityId: 'TSMC',
    targetEntityId: 'NVDA',
    relationshipType: 'SUPPLIES_TO',
    observationId: 'obs_tsmc_supply',
    confidence: 0.95
  });

  assert.strictEqual(edgeCandidate.sourceEntityId, 'TSMC');
  assert.strictEqual(edgeCandidate.targetEntityId, 'NVDA');
  assert.strictEqual(edgeCandidate.relationshipType, 'SUPPLIES_TO');
  assert.strictEqual(edgeCandidate.status, 'VALIDATED_EXTERNAL');
  assert.strictEqual(edgeCandidate.evidenceIds[0], 'ev_10k_footnote');
  // Must NOT be an automatic VERIFIED internal graph edge
  assert.notStrictEqual(edgeCandidate.status, 'VERIFIED');
});

it('should create competitor and customer candidate relationships with evidence linkage', () => {
  const store = new ExternalIntelligenceStore();
  const bridges = new ExternalIntelligenceBridges(store);

  // Competitor relationship candidate
  const obsComp = store.saveObservation('tenant_01', {
    observationId: 'obs_amd_comp',
    sourceId: 'src_idc',
    artifactId: 'art_idc_rep',
    observationType: ObservationType.COMPETITIVE_SIGNAL,
    observationClass: ObservationClass.VERIFIED_VENDOR,
    subjectId: 'NVDA',
    evidenceId: 'ev_idc_mi300',
    payload: { competitor: 'AMD', productLine: 'MI300X', marketSegment: 'DATA_CENTER_ACCELERATOR' },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  const compEdge = bridges.createKnowledgeGraphEdgeCandidate('tenant_01', {
    sourceEntityId: 'AMD',
    targetEntityId: 'NVDA',
    relationshipType: 'COMPETES_WITH',
    observationId: 'obs_amd_comp',
    confidence: 0.90
  });

  assert.strictEqual(compEdge.sourceEntityId, 'AMD');
  assert.strictEqual(compEdge.targetEntityId, 'NVDA');
  assert.strictEqual(compEdge.relationshipType, 'COMPETES_WITH');
  assert.strictEqual(compEdge.evidenceIds[0], 'ev_idc_mi300');

  // Customer relationship candidate
  const obsCust = store.saveObservation('tenant_01', {
    observationId: 'obs_msft_cust',
    sourceId: 'src_idc',
    artifactId: 'art_idc_rep',
    observationType: ObservationType.CUSTOMER_SIGNAL,
    observationClass: ObservationClass.VERIFIED_VENDOR,
    subjectId: 'NVDA',
    evidenceId: 'ev_idc_azure_spend',
    payload: { customer: 'MSFT', spendPctOfRevenue: 0.15 },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  const custEdge = bridges.createKnowledgeGraphEdgeCandidate('tenant_01', {
    sourceEntityId: 'MSFT',
    targetEntityId: 'NVDA',
    relationshipType: 'CUSTOMER_OF',
    observationId: 'obs_msft_cust',
    confidence: 0.88
  });

  assert.strictEqual(custEdge.sourceEntityId, 'MSFT');
  assert.strictEqual(custEdge.targetEntityId, 'NVDA');
  assert.strictEqual(custEdge.relationshipType, 'CUSTOMER_OF');
  assert.strictEqual(custEdge.evidenceIds[0], 'ev_idc_azure_spend');
});

it('should classify unverified competitive claims as UNVERIFIED_EXTERNAL candidate edges', () => {
  const store = new ExternalIntelligenceStore();
  const bridges = new ExternalIntelligenceBridges(store);

  const obsUnver = store.saveObservation('tenant_01', {
    observationId: 'obs_unver_comp',
    sourceId: 'src_blog',
    artifactId: 'art_blog_1',
    observationType: ObservationType.COMPETITIVE_SIGNAL,
    observationClass: ObservationClass.UNVERIFIED_EXTERNAL,
    subjectId: 'NVDA',
    evidenceId: 'ev_blog_rumor',
    payload: { competitor: 'STARTUP_X', claim: 'New chip matches Blackwell' },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  const candEdge = bridges.createKnowledgeGraphEdgeCandidate('tenant_01', {
    sourceEntityId: 'STARTUP_X',
    targetEntityId: 'NVDA',
    relationshipType: 'COMPETES_WITH',
    observationId: 'obs_unver_comp',
    confidence: 0.40
  });

  assert.strictEqual(candEdge.status, 'UNVERIFIED_EXTERNAL');
  assert.notStrictEqual(candEdge.status, 'VALIDATED_EXTERNAL');
  assert.notStrictEqual(candEdge.status, 'VERIFIED');
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
