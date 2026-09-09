import {
  SignalType,
  SignalStatus,
  SignalDirection,
  SignalRegime,
  SignalDependencyType,
  SignalPersistence,
  SampleStatus,
  ValidationPeriod
} from './signal.types.js';

export class SignalIntelligenceValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'SignalIntelligenceValidationError';
    this.errors = errors;
  }
}

/**
 * Validate Base Signal Object
 */
export function validateSignal(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') throw new SignalIntelligenceValidationError('Signal must be an object');

  if (!obj.signalId || typeof obj.signalId !== 'string') errors.push('signalId is required');
  if (!obj.signalType || !Object.values(SignalType).includes(obj.signalType)) {
    errors.push(`Invalid signalType: ${obj.signalType}`);
  }
  if (!obj.entityId || typeof obj.entityId !== 'string') errors.push('entityId is required');
  if (!obj.direction || !Object.values(SignalDirection).includes(obj.direction)) {
    errors.push(`Invalid direction: ${obj.direction}`);
  }
  if (typeof obj.magnitude !== 'number' || isNaN(obj.magnitude)) {
    errors.push('magnitude must be a valid number');
  }
  if (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 1) {
    errors.push('confidence must be a number between 0.0 and 1.0');
  }
  if (!obj.status || !Object.values(SignalStatus).includes(obj.status)) {
    errors.push(`Invalid status: ${obj.status}`);
  }
  if (!obj.methodologyVersion || typeof obj.methodologyVersion !== 'string') {
    errors.push('methodologyVersion is required');
  }
  if (!obj.knowledgeCutoff || typeof obj.knowledgeCutoff !== 'string') {
    errors.push('knowledgeCutoff timestamp is required');
  }

  if (errors.length > 0) {
    throw new SignalIntelligenceValidationError(`Invalid Signal: ${errors.join(', ')}`, errors);
  }
  return obj;
}

/**
 * Validate Normalized Signal Input
 */
export function validateNormalizedSignalInput(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') throw new SignalIntelligenceValidationError('NormalizedSignalInput must be an object');

  if (!obj.inputId || typeof obj.inputId !== 'string') errors.push('inputId is required');
  if (obj.originalValue === undefined || obj.originalValue === null) errors.push('originalValue is required');
  if (!obj.originalUnits || typeof obj.originalUnits !== 'string') errors.push('originalUnits is required');
  if (!obj.normalizationMethod || typeof obj.normalizationMethod !== 'string') errors.push('normalizationMethod is required');
  if (typeof obj.normalizedValue !== 'number' || isNaN(obj.normalizedValue) || obj.normalizedValue < -1.0 || obj.normalizedValue > 1.0) {
    errors.push('normalizedValue must be a number between -1.0 and +1.0');
  }

  if (errors.length > 0) {
    throw new SignalIntelligenceValidationError(`Invalid NormalizedSignalInput: ${errors.join(', ')}`, errors);
  }
  return obj;
}

/**
 * Validate Composite Signal
 */
export function validateCompositeSignal(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') throw new SignalIntelligenceValidationError('CompositeSignal must be an object');

  if (!obj.compositeSignalId || typeof obj.compositeSignalId !== 'string') errors.push('compositeSignalId is required');
  if (!obj.entityId || typeof obj.entityId !== 'string') errors.push('entityId is required');
  if (typeof obj.score !== 'number' || isNaN(obj.score) || obj.score < -1.0 || obj.score > 1.0) {
    errors.push('score must be a number between -1.0 and +1.0');
  }
  if (!obj.regime || !Object.values(SignalRegime).includes(obj.regime)) {
    errors.push(`Invalid regime: ${obj.regime}`);
  }
  if (!Array.isArray(obj.contributors) || obj.contributors.length === 0) {
    errors.push('contributors array cannot be empty');
  }
  if (!obj.knowledgeCutoff || typeof obj.knowledgeCutoff !== 'string') {
    errors.push('knowledgeCutoff is required');
  }

  if (errors.length > 0) {
    throw new SignalIntelligenceValidationError(`Invalid CompositeSignal: ${errors.join(', ')}`, errors);
  }
  return obj;
}

/**
 * Validate Signal Intelligence Package
 */
export function validateSignalPackage(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') throw new SignalIntelligenceValidationError('SignalPackage must be an object');

  if (!obj.packageId || typeof obj.packageId !== 'string') errors.push('packageId is required');
  if (!obj.packageHash || typeof obj.packageHash !== 'string') errors.push('packageHash is required');
  if (!obj.compositeSignals || typeof obj.compositeSignals !== 'object') errors.push('compositeSignals map is required');
  if (!obj.generatedAt || typeof obj.generatedAt !== 'string') errors.push('generatedAt timestamp is required');

  if (errors.length > 0) {
    throw new SignalIntelligenceValidationError(`Invalid SignalPackage: ${errors.join(', ')}`, errors);
  }
  return obj;
}
