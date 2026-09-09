import {
  SourceType,
  VerificationStatus,
  ObservationType,
  ObservationClass,
  CorroborationState,
  RegulatoryStatus,
  DatasetType,
  ArtifactContentType,
  deepFreeze
} from './external.types.js';

export class ExternalIntelligenceValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ExternalIntelligenceValidationError';
    this.errors = errors;
  }
}

/**
 * Validate External Source Entity
 */
export function validateSource(src) {
  const errors = [];
  if (!src || typeof src !== 'object') throw new ExternalIntelligenceValidationError('Source must be an object');
  if (!src.sourceId || typeof src.sourceId !== 'string') errors.push('sourceId is required');
  if (!src.sourceType || !Object.values(SourceType).includes(src.sourceType)) errors.push(`Invalid sourceType: ${src.sourceType}`);
  if (!src.publisher || typeof src.publisher !== 'string') errors.push('publisher is required');
  if (!src.canonicalName || typeof src.canonicalName !== 'string') errors.push('canonicalName is required');
  if (!src.verificationStatus || !Object.values(VerificationStatus).includes(src.verificationStatus)) errors.push(`Invalid verificationStatus: ${src.verificationStatus}`);
  if (typeof src.version !== 'number') errors.push('version must be a number');
  if (errors.length > 0) throw new ExternalIntelligenceValidationError(`Invalid Source: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...src });
}

/**
 * Validate Raw Immutable Artifact
 */
export function validateRawArtifact(art) {
  const errors = [];
  if (!art || typeof art !== 'object') throw new ExternalIntelligenceValidationError('RawArtifact must be an object');
  if (!art.artifactId || typeof art.artifactId !== 'string') errors.push('artifactId is required');
  if (!art.sourceId || typeof art.sourceId !== 'string') errors.push('sourceId is required');
  if (!art.rawContentHash || typeof art.rawContentHash !== 'string') errors.push('rawContentHash is required');
  if (!art.contentType || !Object.values(ArtifactContentType).includes(art.contentType)) errors.push(`Invalid contentType: ${art.contentType}`);
  if (!art.retrievedAt) errors.push('retrievedAt is required');
  if (errors.length > 0) throw new ExternalIntelligenceValidationError(`Invalid RawArtifact: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...art });
}

/**
 * Validate Extracted Evidence Object
 */
export function validateExtractedEvidence(ev) {
  const errors = [];
  if (!ev || typeof ev !== 'object') throw new ExternalIntelligenceValidationError('ExtractedEvidence must be an object');
  if (!ev.evidenceId || typeof ev.evidenceId !== 'string') errors.push('evidenceId is required');
  if (!ev.artifactId || typeof ev.artifactId !== 'string') errors.push('artifactId is required');
  if (!ev.sourceId || typeof ev.sourceId !== 'string') errors.push('sourceId is required');
  if (!ev.extractedText || typeof ev.extractedText !== 'string') errors.push('extractedText is required');
  if (!ev.extractionMethod || typeof ev.extractionMethod !== 'string') errors.push('extractionMethod is required');
  if (errors.length > 0) throw new ExternalIntelligenceValidationError(`Invalid ExtractedEvidence: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...ev });
}

/**
 * Validate External Observation
 */
export function validateExternalObservation(obs) {
  const errors = [];
  if (!obs || typeof obs !== 'object') throw new ExternalIntelligenceValidationError('ExternalObservation must be an object');
  if (!obs.observationId || typeof obs.observationId !== 'string') errors.push('observationId is required');
  if (!obs.sourceId || typeof obs.sourceId !== 'string') errors.push('sourceId is required');
  if (!obs.artifactId || typeof obs.artifactId !== 'string') errors.push('artifactId is required');
  if (!obs.observationType || !Object.values(ObservationType).includes(obs.observationType)) errors.push(`Invalid observationType: ${obs.observationType}`);
  if (!obs.observationClass || !Object.values(ObservationClass).includes(obs.observationClass)) errors.push(`Invalid observationClass: ${obs.observationClass}`);
  if (!obs.subjectId || typeof obs.subjectId !== 'string') errors.push('subjectId is required');
  if (!obs.dataTimestamp) errors.push('dataTimestamp is required');
  if (!obs.publicationTimestamp) errors.push('publicationTimestamp is required');
  if (!obs.retrievalTimestamp) errors.push('retrievalTimestamp is required');
  if (!obs.knowledgeAvailableAt) errors.push('knowledgeAvailableAt is required');
  if (typeof obs.version !== 'number') errors.push('version must be a number');
  if (errors.length > 0) throw new ExternalIntelligenceValidationError(`Invalid ExternalObservation: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...obs });
}

/**
 * Validate Alternative Dataset
 */
export function validateAlternativeDataset(ds) {
  const errors = [];
  if (!ds || typeof ds !== 'object') throw new ExternalIntelligenceValidationError('AlternativeDataset must be an object');
  if (!ds.datasetId || typeof ds.datasetId !== 'string') errors.push('datasetId is required');
  if (!ds.vendor || typeof ds.vendor !== 'string') errors.push('vendor is required');
  if (!ds.datasetType || !Object.values(DatasetType).includes(ds.datasetType)) errors.push(`Invalid datasetType: ${ds.datasetType}`);
  if (!ds.methodology || typeof ds.methodology !== 'string') errors.push('methodology is required');
  if (typeof ds.version !== 'number') errors.push('version must be a number');
  if (errors.length > 0) throw new ExternalIntelligenceValidationError(`Invalid AlternativeDataset: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...ds });
}

/**
 * Validate Truth Update Promotion Candidate
 */
export function validateTruthUpdateCandidate(cand) {
  const errors = [];
  if (!cand || typeof cand !== 'object') throw new ExternalIntelligenceValidationError('TruthUpdateCandidate must be an object');
  if (!cand.candidateId || typeof cand.candidateId !== 'string') errors.push('candidateId is required');
  if (!cand.targetFactId || typeof cand.targetFactId !== 'string') errors.push('targetFactId is required');
  if (!cand.observationIds || !Array.isArray(cand.observationIds) || cand.observationIds.length === 0) errors.push('observationIds array is required');
  if (cand.proposedValue === undefined) errors.push('proposedValue is required');
  if (!cand.verificationStatus || !Object.values(VerificationStatus).includes(cand.verificationStatus)) errors.push(`Invalid verificationStatus: ${cand.verificationStatus}`);
  if (errors.length > 0) throw new ExternalIntelligenceValidationError(`Invalid TruthUpdateCandidate: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...cand });
}
