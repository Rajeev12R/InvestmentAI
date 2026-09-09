/**
 * Phase 13 - Investment Process Intelligence & Decision Performance Types & Enums
 * 
 * Strict deterministic enums, schemas, validation helpers, deep freeze utilities.
 */

import crypto from 'crypto';

export const DecisionType = Object.freeze({
  BUY: 'BUY',
  SELL: 'SELL',
  HOLD: 'HOLD',
  INCREASE: 'INCREASE',
  REDUCE: 'REDUCE',
  EXIT: 'EXIT',
  PASS: 'PASS'
});

export const DecisionStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  REBALANCED: 'REBALANCED',
  SUPERSEDED: 'SUPERSEDED'
});

export const DriverDirection = Object.freeze({
  IMPROVE: 'IMPROVE',
  DECLINE: 'DECLINE',
  STABLE: 'STABLE',
  ABOVE_THRESHOLD: 'ABOVE_THRESHOLD',
  BELOW_THRESHOLD: 'BELOW_THRESHOLD',
  REALIZE: 'REALIZE',
  NOT_REALIZE: 'NOT_REALIZE'
});

export const ForecastType = Object.freeze({
  NUMERIC_POINT: 'NUMERIC_POINT',
  NUMERIC_RANGE: 'NUMERIC_RANGE',
  DIRECTIONAL: 'DIRECTIONAL',
  THRESHOLD: 'THRESHOLD',
  EVENT: 'EVENT'
});

export const ForecastStatus = Object.freeze({
  PENDING: 'PENDING',
  PARTIALLY_VALIDATED: 'PARTIALLY_VALIDATED',
  VALIDATED: 'VALIDATED',
  FALSIFIED: 'FALSIFIED',
  EXPIRED: 'EXPIRED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  CONFLICT: 'CONFLICT'
});

export const CalibrationStatus = Object.freeze({
  WELL_CALIBRATED: 'WELL_CALIBRATED',
  OVERCONFIDENT: 'OVERCONFIDENT',
  UNDERCONFIDENT: 'UNDERCONFIDENT',
  INSUFFICIENT_SAMPLE: 'INSUFFICIENT_SAMPLE'
});

export const ThesisState = Object.freeze({
  WORKING: 'WORKING',
  STRENGTHENING: 'STRENGTHENING',
  WEAKENING: 'WEAKENING',
  BROKEN: 'BROKEN',
  VALIDATED: 'VALIDATED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA'
});

export const ThesisBreakerStatus = Object.freeze({
  BREAKER_NOT_TRIGGERED: 'BREAKER_NOT_TRIGGERED',
  BREAKER_TRIGGERED: 'BREAKER_TRIGGERED',
  BREAKER_TRIGGERED_LATE: 'BREAKER_TRIGGERED_LATE',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA'
});

export const CatalystStatus = Object.freeze({
  EXPECTED: 'EXPECTED',
  REALIZED: 'REALIZED',
  PARTIALLY_REALIZED: 'PARTIALLY_REALIZED',
  DELAYED: 'DELAYED',
  FAILED: 'FAILED',
  UNKNOWN: 'UNKNOWN'
});

export const DecisionOutcomeClassification = Object.freeze({
  GOOD_DECISION_GOOD_OUTCOME: 'GOOD_DECISION_GOOD_OUTCOME',
  GOOD_DECISION_BAD_OUTCOME: 'GOOD_DECISION_BAD_OUTCOME',
  BAD_DECISION_GOOD_OUTCOME: 'BAD_DECISION_GOOD_OUTCOME',
  BAD_DECISION_BAD_OUTCOME: 'BAD_DECISION_BAD_OUTCOME',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA'
});

export const RiskDisciplineClassification = Object.freeze({
  OVERSIZED_POSITION: 'OVERSIZED_POSITION',
  APPROPRIATE_SIZE: 'APPROPRIATE_SIZE',
  UNDERSIZED_POSITION: 'UNDERSIZED_POSITION',
  EXCESS_CONCENTRATION: 'EXCESS_CONCENTRATION',
  RISK_LIMIT_BREACH: 'RISK_LIMIT_BREACH',
  APPROPRIATE_RISK: 'APPROPRIATE_RISK',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA'
});

export const ReviewState = Object.freeze({
  REVIEW: 'REVIEW',
  INVESTIGATING: 'INVESTIGATING',
  DISMISSED: 'DISMISSED',
  RESOLVED: 'RESOLVED'
});

/**
 * Deep freeze object recursively
 */
export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Object.isFrozen(obj[key])) {
      deepFreeze(obj[key]);
    }
  });
  return obj;
}

/**
 * Deterministic JSON stringify with sorted keys
 */
export function canonicalStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(key => JSON.stringify(key) + ':' + canonicalStringify(obj[key])).join(',') + '}';
}

/**
 * Deterministic SHA-256 hash calculation
 */
export function computeDeterministicHash(obj) {
  const canonical = canonicalStringify(obj);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}
