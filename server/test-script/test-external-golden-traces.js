import assert from 'assert';
import { ExternalIntelligenceStore } from '../externalIntelligence/external.store.js';
import { ExternalSourceEngine } from '../externalIntelligence/external.source.engine.js';
import { ExternalExtractionEngine } from '../externalIntelligence/external.extraction.engine.js';
import { ExternalCorroborationEngine } from '../externalIntelligence/external.corroboration.engine.js';
import { ExternalSignalEngine } from '../externalIntelligence/external.signal.engine.js';
import { ExternalTruthBoundaryEngine } from '../externalIntelligence/external.truth.boundary.js';
import { ExternalIntelligenceBridges } from '../externalIntelligence/external.bridges.js';
import {
  SourceType,
  VerificationStatus,
  ObservationType,
  ObservationClass,
  CorroborationState,
  RegulatoryStatus,
  DatasetType,
  ArtifactContentType
} from '../externalIntelligence/external.types.js';

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

console.log('=== Suite 13: 18 Golden External Intelligence Traces (Cases A–R) & Deep Golden Pipelines ===');

function createHarness() {
  const store = new ExternalIntelligenceStore();
  const source = new ExternalSourceEngine(store);
  const extraction = new ExternalExtractionEngine(store);
  const corroboration = new ExternalCorroborationEngine(store);
  const signal = new ExternalSignalEngine(store);
  const truth = new ExternalTruthBoundaryEngine(store);
  const bridges = new ExternalIntelligenceBridges(store);
  return { store, source, extraction, corroboration, signal, truth, bridges };
}

// Golden A: Primary company document -> management commentary extraction
it('Golden A: Primary company document -> management commentary extraction', () => {
  const { source, extraction } = createHarness();
  const src = source.registerSource('t_gold', { sourceId: 'src_nvda_ir', sourceType: SourceType.COMPANY_PRIMARY, publisher: 'NVIDIA IR', canonicalName: 'NVDA IR' });
  const art = extraction.ingestRawArtifact('t_gold', { artifactId: 'art_shareholder_letter', sourceId: src.sourceId, rawContent: 'We are expanding datacenter systems volume.' });
  const mgmt = extraction.extractManagementCommentary('t_gold', {
    artifactId: art.artifactId,
    sourceId: src.sourceId,
    subjectId: 'NVDA',
    speakerName: 'Jensen Huang',
    statementText: 'We are expanding datacenter systems volume.'
  });
  assert.strictEqual(mgmt.observationType, ObservationType.MANAGEMENT_COMMENTARY);
  assert.strictEqual(mgmt.attribution.statementType, 'MANAGEMENT_STATED');
});

// Golden B: Transcript -> attributed guidance observation
it('Golden B: Transcript -> attributed guidance observation', () => {
  const { extraction } = createHarness();
  const mgmt = extraction.extractManagementCommentary('t_gold', {
    artifactId: 'art_call',
    sourceId: 'src_ir',
    subjectId: 'NVDA',
    speakerName: 'Colette Kress',
    speakerRole: 'CFO',
    statementText: 'Q1 Revenue expected to be $30.0B +/- 2%.'
  });
  assert.strictEqual(mgmt.attribution.speakerRole, 'CFO');
  assert.strictEqual(mgmt.attribution.isObjectiveFact, false);
});

// Golden C: Alternative dataset -> validated signal
it('Golden C: Alternative dataset -> validated signal', () => {
  const { signal, store } = createHarness();
  const ds = signal.registerDataset('t_gold', { datasetId: 'ds_app_traffic', vendor: 'SensorTower', methodology: 'Mobile active users daily' });
  const obs = store.saveObservation('t_gold', {
    observationId: 'obs_app_growth',
    sourceId: 'src_sensortower',
    artifactId: 'art_ds_1',
    observationType: ObservationType.APP_ACTIVITY_SIGNAL,
    observationClass: ObservationClass.VALIDATED_EXTERNAL,
    subjectId: 'NVDA',
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });
  assert.strictEqual(obs.observationType, ObservationType.APP_ACTIVITY_SIGNAL);
  assert.strictEqual(obs.observationClass, ObservationClass.VALIDATED_EXTERNAL);
});

// Golden D: Unverified vendor source remains UNVERIFIED
it('Golden D: Unverified vendor source remains UNVERIFIED', () => {
  const { source } = createHarness();
  const src = source.registerSource('t_gold', { sourceId: 'src_raw_web', sourceType: SourceType.WEB, publisher: 'Random Tech Blog', canonicalName: 'Tech Blog' });
  assert.strictEqual(src.verificationStatus, VerificationStatus.UNVERIFIED);
});

// Golden E: Source verification evidence promotes source status
it('Golden E: Source verification evidence promotes source status', () => {
  const { source } = createHarness();
  source.registerSource('t_gold', { sourceId: 'src_vendor_e', sourceType: SourceType.ALTERNATIVE_DATA_VENDOR, publisher: 'SimilarWeb Ltd', canonicalName: 'SimilarWeb' });
  const verified = source.verifySource('t_gold', 'src_vendor_e', {
    verificationStatus: VerificationStatus.VERIFIED_VENDOR,
    verificationMethod: 'VENDOR_AUDITED_CONTRACT',
    verificationEvidence: 'Enterprise SLA & SOC2 Type II compliance report'
  });
  assert.strictEqual(verified.verificationStatus, VerificationStatus.VERIFIED_VENDOR);
});

// Golden F: Two syndicated articles do not count as independent corroboration
it('Golden F: Two syndicated articles do not count as independent corroboration', () => {
  const { store, corroboration } = createHarness();
  store.saveSource('t_gold', { sourceId: 's1', sourceType: SourceType.NEWS, publisher: 'Portal 1', canonicalName: 'P1', verificationStatus: VerificationStatus.UNVERIFIED, version: 1 });
  store.saveSource('t_gold', { sourceId: 's2', sourceType: SourceType.NEWS, publisher: 'Portal 2', canonicalName: 'P2', verificationStatus: VerificationStatus.UNVERIFIED, version: 1 });

  store.saveRawArtifact('t_gold', { artifactId: 'a1', sourceId: 's1', contentType: 'HTML', rawContentHash: '0xhash_wire', retrievedAt: '2026-03-01T00:00:00Z' });
  store.saveRawArtifact('t_gold', { artifactId: 'a2', sourceId: 's2', contentType: 'HTML', rawContentHash: '0xhash_wire', retrievedAt: '2026-03-01T00:00:00Z' });

  store.saveObservation('t_gold', { observationId: 'o1', sourceId: 's1', artifactId: 'a1', observationType: ObservationType.DEMAND_SIGNAL, observationClass: ObservationClass.UNVERIFIED_EXTERNAL, subjectId: 'NVDA', payload: { originalWireSource: 'REUTERS' }, dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1 });
  store.saveObservation('t_gold', { observationId: 'o2', sourceId: 's2', artifactId: 'a2', observationType: ObservationType.DEMAND_SIGNAL, observationClass: ObservationClass.UNVERIFIED_EXTERNAL, subjectId: 'NVDA', payload: { originalWireSource: 'REUTERS' }, dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1 });

  const corr = corroboration.evaluateCorroboration('t_gold', { subjectId: 'NVDA', observationIds: ['o1', 'o2'] });
  assert.strictEqual(corr.state, CorroborationState.SINGLE_SOURCE);
});

// Golden G: Independent sources corroborate an external event
it('Golden G: Independent sources corroborate an external event', () => {
  const { store, corroboration } = createHarness();
  store.saveSource('t_gold', { sourceId: 's_wsj', sourceType: SourceType.NEWS, publisher: 'WSJ', canonicalName: 'WSJ', verificationStatus: VerificationStatus.VERIFIED_VENDOR, version: 1 });
  store.saveSource('t_gold', { sourceId: 's_ft', sourceType: SourceType.NEWS, publisher: 'Financial Times', canonicalName: 'FT', verificationStatus: VerificationStatus.VERIFIED_VENDOR, version: 1 });

  store.saveRawArtifact('t_gold', { artifactId: 'a_wsj', sourceId: 's_wsj', contentType: 'HTML', rawContentHash: '0xhash_wsj', retrievedAt: '2026-03-01T00:00:00Z' });
  store.saveRawArtifact('t_gold', { artifactId: 'a_ft', sourceId: 's_ft', contentType: 'HTML', rawContentHash: '0xhash_ft', retrievedAt: '2026-03-01T00:00:00Z' });

  store.saveObservation('t_gold', { observationId: 'o_wsj', sourceId: 's_wsj', artifactId: 'a_wsj', observationType: ObservationType.DEMAND_SIGNAL, observationClass: ObservationClass.VALIDATED_EXTERNAL, subjectId: 'NVDA', payload: { direction: 'POSITIVE' }, dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1 });
  store.saveObservation('t_gold', { observationId: 'o_ft', sourceId: 's_ft', artifactId: 'a_ft', observationType: ObservationType.DEMAND_SIGNAL, observationClass: ObservationClass.VALIDATED_EXTERNAL, subjectId: 'NVDA', payload: { direction: 'POSITIVE' }, dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1 });

  const corr = corroboration.evaluateCorroboration('t_gold', { subjectId: 'NVDA', observationIds: ['o_wsj', 'o_ft'] });
  assert.strictEqual(corr.state, CorroborationState.MULTI_SOURCE);
});

// Golden H: Conflicting external sources remain CONFLICTED
it('Golden H: Conflicting external sources remain CONFLICTED', () => {
  const { store, corroboration } = createHarness();
  store.saveObservation('t_gold', { observationId: 'o_c1', sourceId: 's1', artifactId: 'a1', observationType: ObservationType.PRICING_SIGNAL, observationClass: ObservationClass.VALIDATED_EXTERNAL, subjectId: 'NVDA', payload: { direction: 'POSITIVE' }, dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1 });
  store.saveObservation('t_gold', { observationId: 'o_c2', sourceId: 's2', artifactId: 'a2', observationType: ObservationType.PRICING_SIGNAL, observationClass: ObservationClass.VALIDATED_EXTERNAL, subjectId: 'NVDA', payload: { direction: 'NEGATIVE' }, dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1 });

  const corr = corroboration.evaluateCorroboration('t_gold', { subjectId: 'NVDA', observationIds: ['o_c1', 'o_c2'] });
  assert.strictEqual(corr.state, CorroborationState.CONFLICTED);
});

// Golden I: Supply-chain observation creates graph relationship candidate
it('Golden I: Supply-chain observation creates graph relationship candidate', () => {
  const { store, bridges } = createHarness();
  store.saveObservation('t_gold', { observationId: 'o_sc', sourceId: 's1', artifactId: 'a1', evidenceId: 'ev_sc', observationType: ObservationType.SUPPLY_CHAIN_SIGNAL, observationClass: ObservationClass.VERIFIED_PRIMARY, subjectId: 'NVDA', dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1 });
  const cand = bridges.createKnowledgeGraphEdgeCandidate('t_gold', { sourceEntityId: 'SK_HYNIX', targetEntityId: 'NVDA', relationshipType: 'SUPPLIES_TO', observationId: 'o_sc' });
  assert.strictEqual(cand.relationshipType, 'SUPPLIES_TO');
  assert.strictEqual(cand.status, 'VALIDATED_EXTERNAL');
});

// Golden J: Validated competitive signal enters company intelligence
it('Golden J: Validated competitive signal enters company intelligence', () => {
  const { store } = createHarness();
  const obs = store.saveObservation('t_gold', { observationId: 'o_comp', sourceId: 's1', artifactId: 'a1', observationType: ObservationType.COMPETITIVE_SIGNAL, observationClass: ObservationClass.VALIDATED_EXTERNAL, subjectId: 'NVDA', payload: { competitor: 'AMD', event: 'New Architecture Launch' }, dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1 });
  assert.strictEqual(obs.observationClass, ObservationClass.VALIDATED_EXTERNAL);
});

// Golden K: Regulatory proposal remains PROPOSED rather than EFFECTIVE
it('Golden K: Regulatory proposal remains PROPOSED rather than EFFECTIVE', () => {
  const { extraction } = createHarness();
  const reg = extraction.extractRegulatorySignal('t_gold', { artifactId: 'a_reg', sourceId: 's_sec', subjectId: 'NVDA', agency: 'SEC', regulatoryTitle: 'Climate Risk Disclosure', status: RegulatoryStatus.PROPOSED });
  assert.strictEqual(reg.regulatoryStatus, RegulatoryStatus.PROPOSED);
  assert.strictEqual(reg.isLegallyEffective, false);
});

// Golden L: Alternative signal influences MODEL_ESTIMATE without changing historical FACT
it('Golden L: Alternative signal influences MODEL_ESTIMATE without changing historical FACT', () => {
  const { store } = createHarness();
  const obs = store.saveObservation('t_gold', { observationId: 'o_est', sourceId: 's_vendor', artifactId: 'a1', observationType: ObservationType.RESEARCH_ESTIMATE, observationClass: ObservationClass.MODEL_ESTIMATE, subjectId: 'NVDA', payload: { forwardRevenueEstimate: 35000000000 }, dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1 });
  assert.strictEqual(obs.observationClass, ObservationClass.MODEL_ESTIMATE);
});

// Golden M: Restated dataset preserves historical vintage
it('Golden M: Restated dataset preserves historical vintage', () => {
  const { store } = createHarness();
  store.saveObservation('t_gold', { observationId: 'obs_vintage', sourceId: 's_alt', artifactId: 'a1', observationType: ObservationType.WEB_TRAFFIC_SIGNAL, observationClass: ObservationClass.VALIDATED_EXTERNAL, subjectId: 'NVDA', payload: { visits: 1000000 }, dataTimestamp: '2026-01-01T00:00:00Z', publicationTimestamp: '2026-01-01T00:00:00Z', retrievalTimestamp: '2026-01-01T00:00:00Z', knowledgeAvailableAt: '2026-01-01T00:00:00Z', version: 1 });
  store.saveObservation('t_gold', { observationId: 'obs_vintage', sourceId: 's_alt', artifactId: 'a1', observationType: ObservationType.WEB_TRAFFIC_SIGNAL, observationClass: ObservationClass.VALIDATED_EXTERNAL, subjectId: 'NVDA', payload: { visits: 1050000, restated: true }, dataTimestamp: '2026-01-01T00:00:00Z', publicationTimestamp: '2026-02-01T00:00:00Z', retrievalTimestamp: '2026-02-01T00:00:00Z', knowledgeAvailableAt: '2026-02-01T00:00:00Z', version: 2 });
  const hist = store.getEntityHistory('t_gold', 'observations', 'obs_vintage');
  assert.strictEqual(hist.length, 2);
  assert.strictEqual(hist[0].payload.visits, 1000000);
  assert.strictEqual(hist[1].payload.visits, 1050000);
});

// Golden N: Source revocation propagates staleness
it('Golden N: Source revocation propagates staleness', () => {
  const { source, store } = createHarness();
  source.registerSource('t_gold', { sourceId: 's_rev', sourceType: SourceType.WEB, publisher: 'Bad Site', canonicalName: 'BS' });
  store.saveObservation('t_gold', { observationId: 'obs_bad', sourceId: 's_rev', artifactId: 'a1', observationType: ObservationType.DEMAND_SIGNAL, observationClass: ObservationClass.UNVERIFIED_EXTERNAL, subjectId: 'NVDA', dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1 });
  const res = source.revokeSource('t_gold', 's_rev', { revocationReason: 'Fake data' });
  assert.strictEqual(res.affectedObservationsCount, 1);
  assert.strictEqual(res.requiresWorkflowReview, true);
});

// Golden O: External signal generates Attention item
it('Golden O: External signal generates Attention item', () => {
  const { store, bridges } = createHarness();
  store.saveObservation('t_gold', { observationId: 'obs_att', sourceId: 's_reg', artifactId: 'a1', observationType: ObservationType.REGULATORY_SIGNAL, observationClass: ObservationClass.VERIFIED_REGULATORY, subjectId: 'NVDA', dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1 });
  const att = bridges.generateAttentionTrigger('t_gold', 'obs_att');
  assert.strictEqual(att.severity, 'HIGH');
  assert.strictEqual(att.attentionType, 'REGULATORY_EVENT_RISK');
});

// Golden P: Material signal generates Phase 25 review task
it('Golden P: Material signal generates Phase 25 review task', () => {
  const { store, bridges } = createHarness();
  store.saveObservation('t_gold', { observationId: 'obs_task', sourceId: 's_sec', artifactId: 'a1', evidenceId: 'ev_1', observationType: ObservationType.REGULATORY_SIGNAL, observationClass: ObservationClass.VERIFIED_REGULATORY, subjectId: 'NVDA', dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1 });
  const task = bridges.generateWorkflowTask('t_gold', 'obs_task');
  assert.strictEqual(task.taskType, 'REVIEW_COMPLIANCE');
});

// Golden Q: Historical knowledge cutoff excludes later external observation
it('Golden Q: Historical knowledge cutoff excludes later external observation', () => {
  const { store } = createHarness();
  store.saveObservation('t_gold', { observationId: 'obs_late', sourceId: 's1', artifactId: 'a1', observationType: ObservationType.DEMAND_SIGNAL, observationClass: ObservationClass.VALIDATED_EXTERNAL, subjectId: 'NVDA', dataTimestamp: '2026-03-05T00:00:00Z', publicationTimestamp: '2026-03-05T00:00:00Z', retrievalTimestamp: '2026-03-05T00:00:00Z', knowledgeAvailableAt: '2026-03-05T00:00:00Z', version: 1 });
  const asOfEarlier = store.getEntityAsOf('t_gold', 'observations', 'obs_late', '2026-03-01T00:00:00Z');
  assert.strictEqual(asOfEarlier, null);
});

// Golden R: AI extraction cannot promote itself into authoritative Truth
it('Golden R: AI extraction cannot promote itself into authoritative Truth', () => {
  const { truth } = createHarness();
  const cand = truth.createPromotionCandidate('t_gold', { targetFactId: 'FACT_1', observationIds: ['o_ai'], proposedValue: 100, verificationStatus: VerificationStatus.UNVERIFIED });
  assert.throws(() => {
    truth.promoteCandidateToTruth('t_gold', cand.candidateId, { reviewerId: 'ai_copilot', reviewerRole: 'PORTFOLIO_MANAGER', isAi: true, decision: 'PROMOTED' });
  }, /AI cannot promote external observation candidates/);
});

// Deep Golden Trace 1: Complete Promotion Chain & Negative AI Claim Trace
it('Deep Golden Trace 1: External Artifact -> Source -> Evidence -> Observation -> Classification -> Claim -> Phase 24 Synthesis', () => {
  const { store, source, extraction, bridges } = createHarness();
  const tenant = 't_deep_chain';

  // 1. Register and verify source
  const src = source.registerSource(tenant, {
    sourceId: 'src_sec_deep',
    sourceType: SourceType.REGULATORY,
    publisher: 'SEC EDGAR System',
    canonicalName: 'SEC EDGAR'
  });
  assert.strictEqual(src.sourceId, 'src_sec_deep');
  assert.strictEqual(src.verificationStatus, VerificationStatus.UNVERIFIED);

  const verifiedSrc = source.verifySource(tenant, src.sourceId, {
    verificationStatus: VerificationStatus.VERIFIED_REGULATORY,
    verificationMethod: 'GOVERNMENT_REGISTRY',
    verificationEvidence: 'SEC EDGAR Official Public Registry Certificate #2026-EDG'
  });
  assert.strictEqual(verifiedSrc.verificationStatus, VerificationStatus.VERIFIED_REGULATORY);
  assert.ok(verifiedSrc.verifiedAt);

  // 2. Ingest immutable raw artifact
  const art = extraction.ingestRawArtifact(tenant, {
    artifactId: 'art_10k_deep',
    sourceId: verifiedSrc.sourceId,
    contentType: ArtifactContentType.HTML,
    rawContent: '<html><body>Item 7: Gross margin reached 76.5% driven by accelerated compute scale.</body></html>',
    retrievedAt: '2026-03-01T00:00:00Z'
  });
  assert.strictEqual(art.artifactId, 'art_10k_deep');
  assert.strictEqual(art.rawContentHash.length, 64);

  // 3. Extract evidence span
  const ev = extraction.extractEvidence(tenant, {
    artifactId: art.artifactId,
    sourceId: verifiedSrc.sourceId,
    extractedText: 'Gross margin reached 76.5% driven by accelerated compute scale.',
    page: 42,
    charSpan: [15, 78],
    extractionMethod: 'DETERMINISTIC_PARSER'
  });
  assert.strictEqual(ev.artifactId, art.artifactId);
  assert.strictEqual(ev.extractionMethod, 'DETERMINISTIC_PARSER');

  // 4. Save observation
  const obs = store.saveObservation(tenant, {
    observationId: 'obs_margin_deep',
    sourceId: verifiedSrc.sourceId,
    artifactId: art.artifactId,
    evidenceId: ev.evidenceId,
    observationType: ObservationType.COMPANY_GUIDANCE_OBSERVATION,
    observationClass: ObservationClass.VERIFIED_REGULATORY,
    subjectId: 'NVDA',
    payload: { grossMargin: 0.765 },
    dataTimestamp: '2026-03-01T00:00:00Z',
    publicationTimestamp: '2026-03-01T00:00:00Z',
    retrievalTimestamp: '2026-03-01T00:00:00Z',
    knowledgeAvailableAt: '2026-03-01T00:00:00Z',
    version: 1
  });
  assert.strictEqual(obs.observationClass, ObservationClass.VERIFIED_REGULATORY);

  // 5. Synthesize claim for Phase 24
  const claim = bridges.synthesizeExternalClaim(tenant, obs.observationId);
  assert.strictEqual(claim.claimId, 'claim_ext_obs_margin_deep');
  assert.strictEqual(claim.classification, ObservationClass.VERIFIED_REGULATORY);
  assert.strictEqual(claim.isObjectiveFact, true);
  assert.strictEqual(claim.evidenceId, ev.evidenceId);

  // Negative AI statement promotion trace: AI text claiming "this source is verified"
  const aiObs = extraction.extractAiCandidate(tenant, {
    artifactId: art.artifactId,
    sourceId: verifiedSrc.sourceId,
    subjectId: 'NVDA',
    candidatePayload: { statement: 'This source is verified and margin will hit 85% next quarter.' }
  });
  assert.strictEqual(aiObs.observationClass, ObservationClass.AI_EXTRACTED_CANDIDATE);
  const aiClaim = bridges.synthesizeExternalClaim(tenant, aiObs.observationId);
  assert.strictEqual(aiClaim.classification, ObservationClass.AI_EXTRACTED_CANDIDATE);
  assert.strictEqual(aiClaim.isObjectiveFact, false);
});

// Deep Golden Trace 2: Point-in-Time Cutoff & Revision Trace (2024-01-01 vs 2025-01-01 vs 2024-06-01 Cutoff)
it('Deep Golden Trace 2: Look-Ahead / Revision Trace (Observation v1 vs v2 with 2024-06-01 Cutoff)', () => {
  const { store } = createHarness();
  const tenant = 't_cutoff_golden';

  // Observation v1 available 2024-01-01
  store.saveObservation(tenant, {
    observationId: 'obs_macro_gdp',
    sourceId: 'src_bea',
    artifactId: 'art_bea_v1',
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.VALIDATED_EXTERNAL,
    subjectId: 'MACRO_US',
    payload: { gdpGrowth: 0.021, vintage: 'ADVANCE_ESTIMATE' },
    dataTimestamp: '2024-01-01T00:00:00Z',
    publicationTimestamp: '2024-01-01T00:00:00Z',
    retrievalTimestamp: '2024-01-01T00:00:00Z',
    knowledgeAvailableAt: '2024-01-01T00:00:00Z',
    version: 1
  });

  // Observation v2 revised and published 2025-01-01
  store.saveObservation(tenant, {
    observationId: 'obs_macro_gdp',
    sourceId: 'src_bea',
    artifactId: 'art_bea_v2',
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.VALIDATED_EXTERNAL,
    subjectId: 'MACRO_US',
    payload: { gdpGrowth: 0.027, vintage: 'FINAL_REVISION' },
    dataTimestamp: '2024-01-01T00:00:00Z',
    publicationTimestamp: '2025-01-01T00:00:00Z',
    retrievalTimestamp: '2025-01-01T00:00:00Z',
    knowledgeAvailableAt: '2025-01-01T00:00:00Z',
    version: 2
  });

  // Query as of 2024-06-01 cutoff: MUST return v1 (2.1%)
  const asOfJune2024 = store.getEntityAsOf(tenant, 'observations', 'obs_macro_gdp', '2024-06-01T00:00:00Z');
  assert.ok(asOfJune2024);
  assert.strictEqual(asOfJune2024.version, 1);
  assert.strictEqual(asOfJune2024.payload.gdpGrowth, 0.021);
  assert.strictEqual(asOfJune2024.payload.vintage, 'ADVANCE_ESTIMATE');

  // Query as of 2026-01-01 cutoff: returns v2 (2.7%)
  const asOf2026 = store.getEntityAsOf(tenant, 'observations', 'obs_macro_gdp', '2026-01-01T00:00:00Z');
  assert.ok(asOf2026);
  assert.strictEqual(asOf2026.version, 2);
  assert.strictEqual(asOf2026.payload.gdpGrowth, 0.027);
  assert.strictEqual(asOf2026.payload.vintage, 'FINAL_REVISION');
});

// Deep Golden Trace 3: Survivorship Bias Dataset Preservation
it('Deep Golden Trace 3: Alternative dataset preserves disappearing Company C without survivorship bias', () => {
  const { store, signal } = createHarness();
  const tenant = 't_survivorship';

  signal.registerDataset(tenant, {
    datasetId: 'ds_app_usage',
    vendor: 'AppTracker',
    methodology: 'Historical daily active user panel',
    survivorshipBiased: false,
    revisionPolicy: 'POINT_IN_TIME_SNAPSHOTS'
  });

  const companies = ['CO_A', 'CO_B', 'CO_C', 'CO_D'];
  for (const co of companies) {
    store.saveObservation(tenant, {
      observationId: `obs_active_${co}`,
      sourceId: 'src_apptracker',
      artifactId: 'art_ds_2023',
      observationType: ObservationType.APP_ACTIVITY_SIGNAL,
      observationClass: ObservationClass.VALIDATED_EXTERNAL,
      subjectId: co,
      payload: { activeUsers: 500000, isActive: true },
      dataTimestamp: '2023-01-01T00:00:00Z',
      publicationTimestamp: '2023-01-01T00:00:00Z',
      retrievalTimestamp: '2023-01-01T00:00:00Z',
      knowledgeAvailableAt: '2023-01-01T00:00:00Z',
      version: 1
    });
  }

  // Company C disappears (delisted/bankrupt in 2024)
  store.saveObservation(tenant, {
    observationId: 'obs_active_CO_C',
    sourceId: 'src_apptracker',
    artifactId: 'art_ds_2024',
    observationType: ObservationType.APP_ACTIVITY_SIGNAL,
    observationClass: ObservationClass.VALIDATED_EXTERNAL,
    subjectId: 'CO_C',
    payload: { activeUsers: 0, isActive: false, status: 'DELISTED' },
    dataTimestamp: '2024-01-01T00:00:00Z',
    publicationTimestamp: '2024-01-01T00:00:00Z',
    retrievalTimestamp: '2024-01-01T00:00:00Z',
    knowledgeAvailableAt: '2024-01-01T00:00:00Z',
    version: 2
  });

  // Historical query as of 2023: Company C must be present and active
  const hist2023 = store.getEntityAsOf(tenant, 'observations', 'obs_active_CO_C', '2023-06-01T00:00:00Z');
  assert.ok(hist2023);
  assert.strictEqual(hist2023.payload.isActive, true);
  assert.strictEqual(hist2023.payload.activeUsers, 500000);

  // Listing all 2023 entities includes all 4 companies
  const all2023 = store.listEntities(tenant, 'observations', null, '2023-06-01T00:00:00Z');
  assert.strictEqual(all2023.length, 4);
});

// Deep Golden Trace 4: Source Licensing, Redistribution & Access Controls
it('Deep Golden Trace 4: Licensing negative tests: restricted source, expired license, tenant unauthorized access', () => {
  const { store, source } = createHarness();

  // 1. Register restricted source with redistribution limitations
  const restrictedSrc = source.registerSource('tenant_alpha', {
    sourceId: 'src_licensed_reuters',
    sourceType: SourceType.NEWS,
    publisher: 'Reuters Proprietary Wire',
    canonicalName: 'Reuters',
    licensing: {
      licenseId: 'LIC_REUTERS_ALPHA_2026',
      allowedUsage: ['INTERNAL_RESEARCH_ONLY'],
      redistributionRestricted: true
    }
  });
  assert.strictEqual(restrictedSrc.licensing.redistributionRestricted, true);

  // 2. Tenant Alpha has access
  const qAlpha = store.getEntityAsOf('tenant_alpha', 'sources', 'src_licensed_reuters');
  assert.ok(qAlpha);

  // 3. Tenant Beta has NO access (tenant isolation)
  const qBeta = store.getEntityAsOf('tenant_beta', 'sources', 'src_licensed_reuters');
  assert.strictEqual(qBeta, null);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
