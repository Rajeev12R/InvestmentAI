/**
 * server/earnings/earnings.schema.js
 * 
 * Phase 21: JSON Schema & Payload Validators
 */

import { CorporateEventType } from './earnings.types.js';

export class EarningsValidationError extends Error {
  constructor(message, validationErrors = []) {
    super(message);
    this.name = 'EarningsValidationError';
    this.validationErrors = validationErrors;
  }
}

/**
 * Validates an incoming corporate event record
 */
export function validateCorporateEvent(event) {
  const errors = [];

  if (!event || typeof event !== 'object') {
    throw new EarningsValidationError('Corporate event must be a non-null object');
  }

  if (typeof event.eventId !== 'string' || event.eventId.trim() === '') {
    errors.push('eventId is required and must be a non-empty string');
  }

  if (typeof event.securityId !== 'string' || event.securityId.trim() === '') {
    errors.push('securityId (ticker) is required and must be a non-empty string');
  }

  if (!event.eventType || !Object.values(CorporateEventType).includes(event.eventType)) {
    // Unsupported event types are flagged
    errors.push(`eventType '${event.eventType}' is invalid or unsupported`);
  }

  if (typeof event.eventTimestamp !== 'string' || isNaN(Date.parse(event.eventTimestamp))) {
    errors.push('eventTimestamp must be a valid ISO-8601 date string');
  }

  if (typeof event.publicationTimestamp !== 'string' || isNaN(Date.parse(event.publicationTimestamp))) {
    errors.push('publicationTimestamp must be a valid ISO-8601 date string');
  }

  if (typeof event.reportingPeriod !== 'string' || event.reportingPeriod.trim() === '') {
    errors.push('reportingPeriod (e.g. FY2026, Q3-2025) is required');
  }

  if (typeof event.sourceId !== 'string' || event.sourceId.trim() === '') {
    errors.push('sourceId is required for provenance tracking');
  }

  if (errors.length > 0) {
    throw new EarningsValidationError(`Event validation failed: ${errors.join('; ')}`, errors);
  }

  return true;
}

/**
 * Validates guidance update payload
 */
export function validateGuidancePayload(guidance) {
  const errors = [];

  if (!guidance || typeof guidance !== 'object') {
    throw new EarningsValidationError('Guidance payload must be an object');
  }

  if (typeof guidance.metric !== 'string' || guidance.metric.trim() === '') {
    errors.push('Guidance metric is required');
  }

  if (typeof guidance.period !== 'string' || guidance.period.trim() === '') {
    errors.push('Guidance period is required');
  }

  if (guidance.low !== undefined && guidance.high !== undefined && guidance.low !== null && guidance.high !== null) {
    if (typeof guidance.low !== 'number' || typeof guidance.high !== 'number') {
      errors.push('Guidance low and high bounds must be numbers');
    } else if (guidance.low > guidance.high) {
      errors.push(`Guidance low bound (${guidance.low}) cannot exceed high bound (${guidance.high})`);
    }
  }

  if (errors.length > 0) {
    throw new EarningsValidationError(`Guidance validation failed: ${errors.join('; ')}`, errors);
  }

  return true;
}
