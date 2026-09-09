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

console.log('=== Suite 8: Source Conflicts & Disagreement Preservation ===');

it('should preserve conflicting observations as CONFLICTED without artificial averaging', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalCorroborationEngine(store);

  // Source A reports growth +12%
  store.saveObservation('tenant_01', {
    observationId: 'obs_conflict_a',
    sourceId: 'src_vendor_a',
    artifactId: 'art_a',
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.VALIDATED_EXTERNAL,
    subjectId: 'NVDA',
    payload: { direction: 'POSITIVE', numericValue: 112 },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  // Source B reports contraction -10%
  store.saveObservation('tenant_01', {
    observationId: 'obs_conflict_b',
    sourceId: 'src_vendor_b',
    artifactId: 'art_b',
    observationType: ObservationType.DEMAND_SIGNAL,
    observationClass: ObservationClass.VALIDATED_EXTERNAL,
    subjectId: 'NVDA',
    payload: { direction: 'NEGATIVE', numericValue: 90 },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  const corr = engine.evaluateCorroboration('tenant_01', {
    subjectId: 'NVDA',
    observationIds: ['obs_conflict_a', 'obs_conflict_b']
  });

  assert.strictEqual(corr.state, CorroborationState.CONFLICTED);
  assert.strictEqual(corr.hasConflicts, true);
  assert.strictEqual(corr.isCorroborated, false);
  // No synthetic averaged value
  assert.strictEqual(corr.syntheticAverage, undefined);
});

it('should detect qualitative contradictions between sources', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalCorroborationEngine(store);

  store.saveObservation('tenant_01', {
    observationId: 'obs_qual_1',
    sourceId: 'src_analyst_1',
    artifactId: 'art_q1',
    observationType: ObservationType.CHANNEL_CHECK,
    observationClass: ObservationClass.VALIDATED_EXTERNAL,
    subjectId: 'TSLA',
    payload: { direction: 'POSITIVE', qualitativeThesis: 'INVENTORY_DRAINING_FAST' },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  store.saveObservation('tenant_01', {
    observationId: 'obs_qual_2',
    sourceId: 'src_analyst_2',
    artifactId: 'art_q2',
    observationType: ObservationType.CHANNEL_CHECK,
    observationClass: ObservationClass.VALIDATED_EXTERNAL,
    subjectId: 'TSLA',
    payload: { direction: 'NEGATIVE', qualitativeThesis: 'INVENTORY_ACCUMULATING_LOTS' },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  const corr = engine.evaluateCorroboration('tenant_01', {
    subjectId: 'TSLA',
    observationIds: ['obs_qual_1', 'obs_qual_2']
  });

  assert.strictEqual(corr.state, CorroborationState.CONFLICTED);
  assert.strictEqual(corr.hasConflicts, true);
});

it('should preserve source quality differences and timestamp precedence while flagging conflict', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalCorroborationEngine(store);

  store.saveSource('tenant_01', { sourceId: 'src_tier1', sourceType: SourceType.COMPANY_PRIMARY, publisher: 'Issuer IR', canonicalName: 'Issuer', verificationStatus: VerificationStatus.VERIFIED_PRIMARY, version: 1 });
  store.saveSource('tenant_01', { sourceId: 'src_tier3', sourceType: SourceType.WEB, publisher: 'Web Forum', canonicalName: 'Forum', verificationStatus: VerificationStatus.UNVERIFIED, version: 1 });

  store.saveObservation('tenant_01', {
    observationId: 'obs_high_qual',
    sourceId: 'src_tier1',
    artifactId: 'art_t1',
    observationType: ObservationType.PRICING_SIGNAL,
    observationClass: ObservationClass.VERIFIED_PRIMARY,
    subjectId: 'MSFT',
    payload: { direction: 'POSITIVE', priceChangePct: 0.10 },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  store.saveObservation('tenant_01', {
    observationId: 'obs_low_qual',
    sourceId: 'src_tier3',
    artifactId: 'art_t3',
    observationType: ObservationType.PRICING_SIGNAL,
    observationClass: ObservationClass.UNVERIFIED_EXTERNAL,
    subjectId: 'MSFT',
    payload: { direction: 'NEGATIVE', priceChangePct: -0.05 },
    dataTimestamp: '2026-03-01T00:00:00Z', publicationTimestamp: '2026-03-01T00:00:00Z', retrievalTimestamp: '2026-03-01T00:00:00Z', knowledgeAvailableAt: '2026-03-01T00:00:00Z', version: 1
  });

  const corr = engine.evaluateCorroboration('tenant_01', {
    subjectId: 'MSFT',
    observationIds: ['obs_high_qual', 'obs_low_qual']
  });

  assert.strictEqual(corr.state, CorroborationState.CONFLICTED);
  assert.strictEqual(corr.hasConflicts, true);
  assert.strictEqual(corr.observationIds.length, 2);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
