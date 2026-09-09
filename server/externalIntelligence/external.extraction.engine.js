import crypto from 'crypto';
import {
  ArtifactContentType,
  ObservationType,
  ObservationClass,
  RegulatoryStatus,
  computeRawContentHash,
  deepFreeze
} from './external.types.js';
import { defaultExternalStore } from './external.store.js';

export class ExternalExtractionEngine {
  constructor(store = defaultExternalStore) {
    this.store = store;
  }

  /**
   * Ingest Raw Immutable Artifact
   */
  ingestRawArtifact(tenantId = 'tenant_default', {
    artifactId,
    sourceId,
    contentType = ArtifactContentType.HTML,
    rawContent,
    canonicalUri = '',
    retrievedAt = new Date().toISOString(),
    publishedAt = null,
    observedAt = null
  }) {
    if (!sourceId || rawContent === undefined || rawContent === null) {
      throw new Error('ingestRawArtifact requires sourceId and rawContent');
    }

    const id = artifactId || `art_${crypto.randomBytes(8).toString('hex')}`;
    const rawContentHash = computeRawContentHash(rawContent);

    const artifactRecord = {
      artifactId: id,
      sourceId,
      contentType,
      canonicalUri,
      rawContent,
      rawContentHash,
      sizeBytes: typeof rawContent === 'string' ? Buffer.byteLength(rawContent, 'utf-8') : JSON.stringify(rawContent).length,
      retrievedAt,
      publishedAt: publishedAt || retrievedAt,
      observedAt: observedAt || retrievedAt,
      extractionVersion: 1
    };

    return this.store.saveRawArtifact(tenantId, artifactRecord);
  }

  /**
   * Extract Span-Level Evidence from an Artifact
   */
  extractEvidence(tenantId = 'tenant_default', {
    artifactId,
    sourceId,
    extractedText,
    page = 1,
    section = 'MAIN',
    charSpan = [0, 100],
    extractionMethod = 'DETERMINISTIC_PARSER' // or 'AI_ASSISTED_EXTRACTION'
  }) {
    if (!artifactId || !sourceId || !extractedText) {
      throw new Error('extractEvidence requires artifactId, sourceId, and extractedText');
    }

    const evidenceId = `ev_ext_${crypto.randomBytes(8).toString('hex')}`;
    const evidenceRecord = {
      evidenceId,
      artifactId,
      sourceId,
      extractedText,
      page,
      section,
      charSpan,
      extractionMethod,
      extractedAt: new Date().toISOString()
    };

    return this.store.saveEvidence(tenantId, evidenceRecord);
  }

  /**
   * Extract Management Commentary from Transcripts/Presentations
   * Management statements are classified as MANAGEMENT_STATED, not objective facts.
   */
  extractManagementCommentary(tenantId = 'tenant_default', {
    artifactId,
    sourceId,
    subjectId, // Ticker e.g. 'NVDA'
    speakerName,
    speakerRole = 'CEO',
    statementText,
    topic = 'DEMAND_OUTLOOK',
    dataTimestamp = new Date().toISOString(),
    publicationTimestamp = new Date().toISOString(),
    knowledgeAvailableAt = new Date().toISOString()
  }) {
    // 1. Create Evidence Span
    const evidence = this.extractEvidence(tenantId, {
      artifactId,
      sourceId,
      extractedText: `[${speakerName} (${speakerRole})]: ${statementText}`,
      section: 'MANAGEMENT_COMMENTARY',
      extractionMethod: 'TRANSCRIPT_PARSER'
    });

    // Check source status to determine observationClass
    const src = this.store.getEntityAsOf(tenantId, 'sources', sourceId);
    let observationClass = ObservationClass.UNVERIFIED_EXTERNAL;
    if (src && src.verificationStatus === 'VERIFIED_PRIMARY') {
      observationClass = ObservationClass.VERIFIED_PRIMARY;
    } else if (src && src.verificationStatus === 'VERIFIED_REGULATORY') {
      observationClass = ObservationClass.VERIFIED_REGULATORY;
    } else if (src && src.verificationStatus === 'VERIFIED_VENDOR') {
      observationClass = ObservationClass.VERIFIED_VENDOR;
    } else if (src && src.verificationStatus === 'VALIDATED_EXTERNAL') {
      observationClass = ObservationClass.VALIDATED_EXTERNAL;
    }

    // 2. Create Observation
    const observationId = `obs_mgmt_${crypto.randomBytes(8).toString('hex')}`;
    const observationRecord = {
      observationId,
      sourceId,
      artifactId,
      evidenceId: evidence.evidenceId,
      subjectId,
      observationType: ObservationType.MANAGEMENT_COMMENTARY,
      observationClass: observationClass === ObservationClass.UNVERIFIED_EXTERNAL ? ObservationClass.UNVERIFIED_EXTERNAL : ObservationClass.VALIDATED_EXTERNAL,
      attribution: {
        speakerName,
        speakerRole,
        statementType: 'MANAGEMENT_STATED',
        isObjectiveFact: false // Invariant: Management statements are not objective facts
      },
      topic,
      payload: {
        statementText
      },
      dataTimestamp,
      publicationTimestamp,
      retrievalTimestamp: new Date().toISOString(),
      knowledgeAvailableAt,
      version: 1
    };

    return this.store.saveObservation(tenantId, observationRecord);
  }

  /**
   * Extract Regulatory Development / Signal
   * Distinguishes between PROPOSED and EFFECTIVE regulatory statuses.
   */
  extractRegulatorySignal(tenantId = 'tenant_default', {
    artifactId,
    sourceId,
    subjectId,
    agency = 'SEC',
    regulatoryTitle,
    summary,
    status = RegulatoryStatus.PROPOSED,
    effectiveDate = null,
    dataTimestamp = new Date().toISOString(),
    publicationTimestamp = new Date().toISOString(),
    knowledgeAvailableAt = new Date().toISOString()
  }) {
    const evidence = this.extractEvidence(tenantId, {
      artifactId,
      sourceId,
      extractedText: `[${agency} - ${status}]: ${regulatoryTitle} - ${summary}`,
      section: 'REGULATORY_FILING',
      extractionMethod: 'REGULATORY_PARSER'
    });

    const src = this.store.getEntityAsOf(tenantId, 'sources', sourceId);
    let observationClass = ObservationClass.UNVERIFIED_EXTERNAL;
    if (src && src.verificationStatus === 'VERIFIED_REGULATORY') {
      observationClass = ObservationClass.VERIFIED_REGULATORY;
    } else if (src && src.verificationStatus === 'VERIFIED_PRIMARY') {
      observationClass = ObservationClass.VERIFIED_PRIMARY;
    } else if (src && src.verificationStatus === 'VERIFIED_VENDOR') {
      observationClass = ObservationClass.VERIFIED_VENDOR;
    }

    const observationId = `obs_reg_${crypto.randomBytes(8).toString('hex')}`;
    const observationRecord = {
      observationId,
      sourceId,
      artifactId,
      evidenceId: evidence.evidenceId,
      subjectId,
      observationType: ObservationType.REGULATORY_SIGNAL,
      observationClass,
      agency,
      regulatoryTitle,
      regulatoryStatus: status, // PROPOSED, ANNOUNCED, EFFECTIVE, etc.
      isLegallyEffective: status === RegulatoryStatus.EFFECTIVE || status === RegulatoryStatus.FINAL,
      effectiveDate,
      payload: {
        summary
      },
      dataTimestamp,
      publicationTimestamp,
      retrievalTimestamp: new Date().toISOString(),
      knowledgeAvailableAt,
      version: 1
    };

    return this.store.saveObservation(tenantId, observationRecord);
  }

  /**
   * AI-Assisted Extraction Boundary
   * Ensures all AI extractions enter as AI_EXTRACTED_CANDIDATE.
   */
  extractAiCandidate(tenantId = 'tenant_default', {
    artifactId,
    sourceId,
    subjectId,
    observationType = ObservationType.COMPETITIVE_SIGNAL,
    candidatePayload = {},
    modelName = 'gemini-1.5-pro',
    dataTimestamp = new Date().toISOString(),
    publicationTimestamp = new Date().toISOString(),
    knowledgeAvailableAt = new Date().toISOString()
  }) {
    const evidence = this.extractEvidence(tenantId, {
      artifactId,
      sourceId,
      extractedText: JSON.stringify(candidatePayload),
      section: 'AI_EXTRACTION_BUFFER',
      extractionMethod: `AI_MODEL_${modelName}`
    });

    const observationId = `obs_ai_${crypto.randomBytes(8).toString('hex')}`;
    const observationRecord = {
      observationId,
      sourceId,
      artifactId,
      evidenceId: evidence.evidenceId,
      subjectId,
      observationType,
      observationClass: ObservationClass.AI_EXTRACTED_CANDIDATE, // Invariant: AI extractions are candidates
      isAiGenerated: true,
      aiModel: modelName,
      payload: candidatePayload,
      dataTimestamp,
      publicationTimestamp,
      retrievalTimestamp: new Date().toISOString(),
      knowledgeAvailableAt,
      version: 1
    };

    return this.store.saveObservation(tenantId, observationRecord);
  }
}

export const defaultExtractionEngine = new ExternalExtractionEngine();
