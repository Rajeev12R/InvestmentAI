import assert from 'assert';
import { ExternalIntelligenceStore } from '../externalIntelligence/external.store.js';
import { ExternalExtractionEngine } from '../externalIntelligence/external.extraction.engine.js';
import { ObservationClass, ObservationType, RegulatoryStatus, SourceType, VerificationStatus } from '../externalIntelligence/external.types.js';

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

console.log('=== Suite 6: Regulatory Signals Proposed vs Effective ===');

it('should distinguish proposed regulatory rules from legally effective enactments', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalExtractionEngine(store);

  store.saveSource('tenant_01', {
    sourceId: 'src_sec',
    sourceType: SourceType.REGULATORY,
    publisher: 'SEC EDGAR',
    canonicalName: 'SEC',
    verificationStatus: VerificationStatus.VERIFIED_REGULATORY,
    version: 1
  });

  // 1. Proposed rule
  const proposed = engine.extractRegulatorySignal('tenant_01', {
    artifactId: 'art_sec_prop',
    sourceId: 'src_sec',
    subjectId: 'NVDA',
    agency: 'SEC',
    regulatoryTitle: 'Proposed AI Disclosure Guidelines',
    summary: 'Public commentary period open for 60 days',
    status: RegulatoryStatus.PROPOSED
  });

  assert.strictEqual(proposed.regulatoryStatus, RegulatoryStatus.PROPOSED);
  assert.strictEqual(proposed.isLegallyEffective, false);
  assert.strictEqual(proposed.observationClass, ObservationClass.VERIFIED_REGULATORY);

  // 2. Final/Effective rule
  store.saveSource('tenant_01', {
    sourceId: 'src_bis',
    sourceType: SourceType.REGULATORY,
    publisher: 'Bureau of Industry and Security',
    canonicalName: 'BIS',
    verificationStatus: VerificationStatus.VERIFIED_REGULATORY,
    version: 1
  });

  const effective = engine.extractRegulatorySignal('tenant_01', {
    artifactId: 'art_bis_eff',
    sourceId: 'src_bis',
    subjectId: 'NVDA',
    agency: 'BIS',
    regulatoryTitle: 'Final Export Licensing Rule for Advanced Compute',
    summary: 'Enacted with immediate effect on designated architectures',
    status: RegulatoryStatus.EFFECTIVE,
    effectiveDate: '2026-03-01'
  });

  assert.strictEqual(effective.regulatoryStatus, RegulatoryStatus.EFFECTIVE);
  assert.strictEqual(effective.isLegallyEffective, true);
  assert.strictEqual(effective.effectiveDate, '2026-03-01');
});

it('should track regulatory lifecycle: PROPOSED -> ANNOUNCED -> EFFECTIVE -> WITHDRAWN', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalExtractionEngine(store);

  store.saveSource('tenant_01', {
    sourceId: 'src_reg_agency',
    sourceType: SourceType.REGULATORY,
    publisher: 'FTC',
    canonicalName: 'FTC',
    verificationStatus: VerificationStatus.VERIFIED_REGULATORY,
    version: 1
  });

  const sProposed = engine.extractRegulatorySignal('tenant_01', {
    artifactId: 'art_r1',
    sourceId: 'src_reg_agency',
    subjectId: 'GOOGL',
    agency: 'FTC',
    regulatoryTitle: 'Digital Advertising Remedy Rule',
    summary: 'Notice of Proposed Rulemaking',
    status: RegulatoryStatus.PROPOSED,
    dataTimestamp: '2025-06-01T00:00:00Z'
  });
  assert.strictEqual(sProposed.isLegallyEffective, false);

  const sAnnounced = engine.extractRegulatorySignal('tenant_01', {
    artifactId: 'art_r2',
    sourceId: 'src_reg_agency',
    subjectId: 'GOOGL',
    agency: 'FTC',
    regulatoryTitle: 'Digital Advertising Remedy Rule',
    summary: 'Final Rule Announced with Compliance Date',
    status: RegulatoryStatus.ANNOUNCED,
    dataTimestamp: '2025-10-01T00:00:00Z'
  });
  assert.strictEqual(sAnnounced.isLegallyEffective, false);

  const sEffective = engine.extractRegulatorySignal('tenant_01', {
    artifactId: 'art_r3',
    sourceId: 'src_reg_agency',
    subjectId: 'GOOGL',
    agency: 'FTC',
    regulatoryTitle: 'Digital Advertising Remedy Rule',
    summary: 'Rule is in active legal effect',
    status: RegulatoryStatus.EFFECTIVE,
    effectiveDate: '2026-01-01',
    dataTimestamp: '2026-01-01T00:00:00Z'
  });
  assert.strictEqual(sEffective.isLegallyEffective, true);

  const sWithdrawn = engine.extractRegulatorySignal('tenant_01', {
    artifactId: 'art_r4',
    sourceId: 'src_reg_agency',
    subjectId: 'GOOGL',
    agency: 'FTC',
    regulatoryTitle: 'Digital Advertising Remedy Rule',
    summary: 'Vacated and withdrawn per judicial review',
    status: RegulatoryStatus.WITHDRAWN,
    dataTimestamp: '2026-03-01T00:00:00Z'
  });
  assert.strictEqual(sWithdrawn.isLegallyEffective, false);
  assert.strictEqual(sWithdrawn.regulatoryStatus, RegulatoryStatus.WITHDRAWN);
});

it('should prevent proposed rules from becoming effective without explicit effective enactment', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalExtractionEngine(store);

  store.saveSource('tenant_01', {
    sourceId: 'src_epa',
    sourceType: SourceType.REGULATORY,
    publisher: 'EPA',
    canonicalName: 'EPA',
    verificationStatus: VerificationStatus.VERIFIED_REGULATORY,
    version: 1
  });

  const rule = engine.extractRegulatorySignal('tenant_01', {
    artifactId: 'art_epa_1',
    sourceId: 'src_epa',
    subjectId: 'TSLA',
    agency: 'EPA',
    regulatoryTitle: 'Draft Emissions Target Revision',
    summary: 'Draft under review',
    status: RegulatoryStatus.PROPOSED
  });

  assert.strictEqual(rule.isLegallyEffective, false);
  assert.notStrictEqual(rule.regulatoryStatus, RegulatoryStatus.EFFECTIVE);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
