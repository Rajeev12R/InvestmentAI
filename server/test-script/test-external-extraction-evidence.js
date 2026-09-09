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

console.log('=== Suite 4: Document Segmentation, Span Evidence & AI Boundary (Hardened) ===');

it('should extract span-level evidence retaining page, section, and character offset lineage', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalExtractionEngine(store);

  const art = engine.ingestRawArtifact('tenant_01', {
    artifactId: 'art_filing_10k',
    sourceId: 'src_sec',
    contentType: ArtifactContentType.PDF,
    rawContent: 'Section 7: MD&A. Cloud datacenter revenue grew 125% YoY to $47.5B.'
  });

  const ev = engine.extractEvidence('tenant_01', {
    artifactId: art.artifactId,
    sourceId: 'src_sec',
    extractedText: 'Cloud datacenter revenue grew 125% YoY to $47.5B.',
    page: 42,
    section: 'ITEM_7_MDA',
    charSpan: [18, 68],
    extractionMethod: 'DETERMINISTIC_PARSER'
  });

  assert.strictEqual(ev.page, 42);
  assert.strictEqual(ev.section, 'ITEM_7_MDA');
  assert.strictEqual(ev.extractedText, 'Cloud datacenter revenue grew 125% YoY to $47.5B.');
  assert.deepStrictEqual(ev.charSpan, [18, 68]);
});

it('should reject extraction with missing mandatory fields or invalid artifact references', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalExtractionEngine(store);

  assert.throws(() => {
    engine.extractEvidence('tenant_01', {
      artifactId: '',
      sourceId: 'src_1',
      extractedText: 'Some text'
    });
  }, /extractEvidence requires artifactId, sourceId, and extractedText/);

  assert.throws(() => {
    engine.extractEvidence('tenant_01', {
      artifactId: 'art_1',
      sourceId: 'src_1',
      extractedText: ''
    });
  }, /extractEvidence requires artifactId, sourceId, and extractedText/);
});

it('should enforce AI extraction boundary tagging outputs strictly as AI_EXTRACTED_CANDIDATE', () => {
  const store = new ExternalIntelligenceStore();
  const engine = new ExternalExtractionEngine(store);

  const aiCandidate = engine.extractAiCandidate('tenant_01', {
    artifactId: 'art_doc_01',
    sourceId: 'src_web',
    subjectId: 'NVDA',
    observationType: ObservationType.COMPETITIVE_SIGNAL,
    candidatePayload: {
      competitor: 'AMD',
      claim: 'Potential GPU accelerator market share shift of 2% in 2026'
    },
    modelName: 'gemini-1.5-pro'
  });

  assert.strictEqual(aiCandidate.observationClass, ObservationClass.AI_EXTRACTED_CANDIDATE);
  assert.strictEqual(aiCandidate.isAiGenerated, true);
  assert.strictEqual(aiCandidate.aiModel, 'gemini-1.5-pro');
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
