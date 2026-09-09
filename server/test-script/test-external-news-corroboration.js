import assert from 'assert';
import { ExternalIntelligenceStore } from '../externalIntelligence/external.store.js';
import { ExternalCorroborationEngine } from '../externalIntelligence/external.corroboration.engine.js';
import { CorroborationState, ObservationClass, ObservationType, SourceType, VerificationStatus } from '../externalIntelligence/external.types.js';

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

console.log('=== Suite 7: News Corroboration & Syndication Deduplication ===');

it('should detect wire syndication and prevent inflating evidence from duplicated copies', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalCorroborationEngine(store);

  // Register 3 websites republishing the exact same wire story
  store.saveSource('tenant_01', { sourceId: 'src_site_1', sourceType: SourceType.NEWS, publisher: 'Site A', canonicalName: 'Site A', verificationStatus: VerificationStatus.UNVERIFIED, version: 1 });
  store.saveSource('tenant_01', { sourceId: 'src_site_2', sourceType: SourceType.NEWS, publisher: 'Site B', canonicalName: 'Site B', verificationStatus: VerificationStatus.UNVERIFIED, version: 1 });
  store.saveSource('tenant_01', { sourceId: 'src_site_3', sourceType: SourceType.NEWS, publisher: 'Site C', canonicalName: 'Site C', verificationStatus: VerificationStatus.UNVERIFIED, version: 1 });

  const rawWireHash = '0xidentical_wire_content_hash_123';
  store.saveRawArtifact('tenant_01', { artifactId: 'art_w1', sourceId: 'src_site_1', contentType: 'HTML', rawContentHash: rawWireHash, retrievedAt: '2026-03-01T00:00:00Z' });
  store.saveRawArtifact('tenant_01', { artifactId: 'art_w2', sourceId: 'src_site_2', contentType: 'HTML', rawContentHash: rawWireHash, retrievedAt: '2026-03-01T00:00:00Z' });
  store.saveRawArtifact('tenant_01', { artifactId: 'art_w3', sourceId: 'src_site_3', contentType: 'HTML', rawContentHash: rawWireHash, retrievedAt: '2026-03-01T00:00:00Z' });

  // 3 Observations citing shared original wire source
  const obs1 = store.saveObservation('tenant_01', {
    observationId: 'obs_syn_1',
    sourceId: 'src_site_1',
    artifactId: 'art_w1',
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.UNVERIFIED_EXTERNAL,
    subjectId: 'NVDA',
    payload: { originalWireSource: 'REUTERS_WIRE', text: 'GPU datacenter order backlog increases' },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  const obs2 = store.saveObservation('tenant_01', {
    observationId: 'obs_syn_2',
    sourceId: 'src_site_2',
    artifactId: 'art_w2',
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.UNVERIFIED_EXTERNAL,
    subjectId: 'NVDA',
    payload: { originalWireSource: 'REUTERS_WIRE', text: 'GPU datacenter order backlog increases' },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  // Evaluate corroboration: Must recognize identical syndicated wire copy -> SINGLE_SOURCE
  const corr = engine.evaluateCorroboration('tenant_01', {
    subjectId: 'NVDA',
    observationIds: ['obs_syn_1', 'obs_syn_2']
  });

  assert.strictEqual(corr.state, CorroborationState.SINGLE_SOURCE);
  assert.strictEqual(corr.independentSourcesCount, 1);
});

it('should establish MULTI_SOURCE and PRIMARY_CORROBORATED when independent sources confirm', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalCorroborationEngine(store);

  // Source 1: Verified Primary
  store.saveSource('tenant_01', { sourceId: 'src_nvda_primary', sourceType: SourceType.COMPANY_PRIMARY, publisher: 'NVIDIA IR', canonicalName: 'NVDA IR', verificationStatus: VerificationStatus.VERIFIED_PRIMARY, version: 1 });
  // Source 2: Independent Industry Researcher
  store.saveSource('tenant_01', { sourceId: 'src_idc_research', sourceType: SourceType.RESEARCH_PROVIDER, publisher: 'IDC Tech', canonicalName: 'IDC', verificationStatus: VerificationStatus.VERIFIED_VENDOR, version: 1 });

  store.saveRawArtifact('tenant_01', { artifactId: 'art_nvda_1', sourceId: 'src_nvda_primary', contentType: 'JSON', rawContentHash: '0xhash_nvda_1', retrievedAt: '2026-03-01T00:00:00Z' });
  store.saveRawArtifact('tenant_01', { artifactId: 'art_idc_1', sourceId: 'src_idc_research', contentType: 'PDF', rawContentHash: '0xhash_idc_1', retrievedAt: '2026-03-01T00:00:00Z' });

  store.saveObservation('tenant_01', {
    observationId: 'obs_primary_1',
    sourceId: 'src_nvda_primary',
    artifactId: 'art_nvda_1',
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.VERIFIED_PRIMARY,
    subjectId: 'NVDA',
    payload: { direction: 'POSITIVE', growthRate: 0.15 },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  store.saveObservation('tenant_01', {
    observationId: 'obs_idc_1',
    sourceId: 'src_idc_research',
    artifactId: 'art_idc_1',
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.VERIFIED_VENDOR,
    subjectId: 'NVDA',
    payload: { direction: 'POSITIVE', growthRate: 0.14 },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  const corr = engine.evaluateCorroboration('tenant_01', {
    subjectId: 'NVDA',
    observationIds: ['obs_primary_1', 'obs_idc_1']
  });

  assert.strictEqual(corr.state, CorroborationState.PRIMARY_CORROBORATED);
  assert.strictEqual(corr.isCorroborated, true);
  assert.strictEqual(corr.independentSourcesCount, 2);
});

it('should detect press-release copies and distinguish them from independent news reporting', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalCorroborationEngine(store);

  store.saveSource('tenant_01', { sourceId: 'src_pr_wire', sourceType: SourceType.NEWS, publisher: 'PR Newswire', canonicalName: 'PR Newswire', verificationStatus: VerificationStatus.UNVERIFIED, version: 1 });
  store.saveSource('tenant_01', { sourceId: 'src_news_repub', sourceType: SourceType.NEWS, publisher: 'TechPortal', canonicalName: 'TechPortal', verificationStatus: VerificationStatus.UNVERIFIED, version: 1 });

  store.saveObservation('tenant_01', {
    observationId: 'obs_pr_1',
    sourceId: 'src_pr_wire',
    artifactId: 'art_pr1',
    observationType: ObservationType.PRODUCT_SIGNAL,
    observationClass: ObservationClass.UNVERIFIED_EXTERNAL,
    subjectId: 'AAPL',
    payload: { isCompanyPressRelease: true, pressReleaseId: 'PR_2026_03_01', product: 'Vision Pro 2' },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  store.saveObservation('tenant_01', {
    observationId: 'obs_pr_2',
    sourceId: 'src_news_repub',
    artifactId: 'art_pr2',
    observationType: ObservationType.PRODUCT_SIGNAL,
    observationClass: ObservationClass.UNVERIFIED_EXTERNAL,
    subjectId: 'AAPL',
    payload: { isCompanyPressRelease: true, pressReleaseId: 'PR_2026_03_01', product: 'Vision Pro 2' },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  const corr = engine.evaluateCorroboration('tenant_01', {
    subjectId: 'AAPL',
    observationIds: ['obs_pr_1', 'obs_pr_2']
  });

  // Since both share the exact same press release identifier, it counts as SINGLE_SOURCE
  assert.strictEqual(corr.state, CorroborationState.SINGLE_SOURCE);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
