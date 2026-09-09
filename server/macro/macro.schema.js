/**
 * server/macro/macro.schema.js
 * 
 * Phase 22: Schema Validation for Macro Observations, Releases, Series, Facts, Regimes, and Packages.
 */

import { MacroClassification, MacroMetricCategory, MacroRegimeType } from './macro.types.js';

export function validateMacroObservation(obs) {
  const errors = [];
  if (!obs || typeof obs !== 'object') {
    errors.push('Macro observation must be a non-null object');
    return { isValid: false, errors };
  }
  if (!obs.tenantId && !obs.observationId) {
    errors.push('tenantId or observationId is required');
  }
  if (!obs.seriesId || typeof obs.seriesId !== 'string') {
    errors.push('seriesId is required and must be a string');
  }
  if (obs.value === undefined || obs.value === null || typeof obs.value !== 'number' || !Number.isFinite(obs.value)) {
    errors.push('Valid finite numeric value is required for MacroObservation');
  }
  if (obs.timestamp && new Date(obs.timestamp).toString() === 'Invalid Date') {
    errors.push('timestamp must be a valid ISO date string');
  }
  if (obs.publicationTimestamp && new Date(obs.publicationTimestamp).toString() === 'Invalid Date') {
    errors.push('publicationTimestamp must be a valid ISO date string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateMacroRegimeRule(rule) {
  if (!rule || typeof rule !== 'object') {
    return { isValid: false, errors: ['Rule must be an object'] };
  }
  return { isValid: true, errors: [] };
}

export function validateTransmissionRule(rule) {
  if (!rule || typeof rule !== 'object') {
    throw new Error('Transmission rule must be an object');
  }
  if (!rule.ruleId || typeof rule.ruleId !== 'string') {
    throw new Error('ruleId is required');
  }
  if (!rule.channel || typeof rule.channel !== 'string') {
    throw new Error('channel is required');
  }
  if (typeof rule.elasticity !== 'number' || !Number.isFinite(rule.elasticity)) {
    throw new Error('elasticity must be a finite number');
  }
  return true;
}

export function validateMacroPackage(pkg) {
  if (!pkg || typeof pkg !== 'object') {
    return { isValid: false, errors: ['Macro package must be an object'] };
  }
  return { isValid: true, errors: [] };
}

