/**
 * server/forecasting/forecast.schema.js
 * 
 * Phase 20: Institutional Forecasting Schemas & Validation
 */

import { ForecastMethod, ForecastHorizon, ForecastCase } from './forecast.types.js';
import { FORECAST_CONFIG } from './forecast.config.js';

export class ForecastValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ForecastValidationError';
    this.details = details;
  }
}

/**
 * Validates an assumption object
 */
export function validateAssumption(assumption, index = 0) {
  const errors = [];
  const prefix = `Assumption[${index}]: `;

  if (!assumption || typeof assumption !== 'object') {
    errors.push(`${prefix}Must be a non-null object`);
    return errors;
  }

  if (typeof assumption.assumptionId !== 'string' || assumption.assumptionId.trim() === '') {
    errors.push(`${prefix}assumptionId is required`);
  }

  if (typeof assumption.metric !== 'string' || assumption.metric.trim() === '') {
    errors.push(`${prefix}metric is required`);
  }

  if (typeof assumption.value !== 'number' || !Number.isFinite(assumption.value)) {
    errors.push(`${prefix}value must be a finite number`);
  }

  if (typeof assumption.rationale !== 'string' || assumption.rationale.trim() === '') {
    errors.push(`${prefix}rationale is required to ensure explicit analyst assumptions`);
  }

  return errors;
}

/**
 * Validates a forecast generation request
 */
export function validateForecastRequest(request) {
  const errors = [];

  if (!request || typeof request !== 'object') {
    throw new ForecastValidationError('Forecast request must be a valid non-null object');
  }

  if (typeof request.ticker !== 'string' || request.ticker.trim() === '') {
    errors.push('ticker is required');
  }

  if (typeof request.metric !== 'string' || request.metric.trim() === '') {
    errors.push('metric is required (e.g. REVENUE, EPS, EBITDA, FCF)');
  }

  const validMethods = Object.values(ForecastMethod);
  if (!request.method || !validMethods.includes(request.method)) {
    errors.push(`method is required and must be one of: ${validMethods.join(', ')}`);
  }

  const validHorizons = Object.values(ForecastHorizon);
  if (!request.horizon || !validHorizons.includes(request.horizon)) {
    errors.push(`horizon is required and must be one of: ${validHorizons.join(', ')}`);
  }

  if (request.assumptions) {
    if (!Array.isArray(request.assumptions)) {
      errors.push('assumptions if provided must be an array');
    } else {
      request.assumptions.forEach((assump, idx) => {
        const aErrors = validateAssumption(assump, idx);
        errors.push(...aErrors);
      });
    }
  }

  if (errors.length > 0) {
    throw new ForecastValidationError(`Forecast request validation failed: ${errors.join('; ')}`, errors);
  }

  return true;
}

/**
 * Validates an external consensus input object
 */
export function validateConsensusInput(consensus) {
  const errors = [];

  if (!consensus || typeof consensus !== 'object') {
    throw new ForecastValidationError('Consensus input must be a valid object');
  }

  if (typeof consensus.ticker !== 'string' || consensus.ticker.trim() === '') {
    errors.push('Consensus ticker is required');
  }

  if (typeof consensus.metric !== 'string' || consensus.metric.trim() === '') {
    errors.push('Consensus metric is required');
  }

  if (typeof consensus.meanEstimate !== 'number' || !Number.isFinite(consensus.meanEstimate)) {
    errors.push('Consensus meanEstimate must be a finite number');
  }

  if (typeof consensus.sourceProvider !== 'string' || consensus.sourceProvider.trim() === '') {
    errors.push('Consensus sourceProvider is required for source provenance');
  }

  if (consensus.highEstimate !== undefined && consensus.lowEstimate !== undefined && consensus.highEstimate !== null && consensus.lowEstimate !== null) {
    if (consensus.highEstimate < consensus.lowEstimate) {
      errors.push(`highEstimate (${consensus.highEstimate}) cannot be less than lowEstimate (${consensus.lowEstimate})`);
    }
  }

  if (errors.length > 0) {
    throw new ForecastValidationError(`Consensus input validation failed: ${errors.join('; ')}`, errors);
  }

  return true;
}
