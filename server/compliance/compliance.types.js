/**
 * Phase 16 — Institutional Compliance, Governance & Audit Intelligence
 * Canonical Deterministic Types, Enums & Cryptographic Utilities
 */

import crypto from 'crypto';

export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

export function canonicalStringify(data) {
  if (data === null || typeof data !== 'object') {
    return JSON.stringify(data);
  }
  if (Array.isArray(data)) {
    return '[' + data.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(data).sort();
  const pairs = keys.map(k => JSON.stringify(k) + ':' + canonicalStringify(data[k]));
  return '{' + pairs.join(',') + '}';
}

export function canonicalHash(data) {
  const jsonStr = canonicalStringify(data);
  return crypto.createHash('sha256').update(jsonStr).digest('hex');
}

export const ComplianceStatus = Object.freeze({
  PASS: 'PASS',
  WARNING: 'WARNING',
  BREACH: 'BREACH',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  UNAVAILABLE: 'UNAVAILABLE',
  STALE_DATA: 'STALE_DATA',
  CONFLICT: 'CONFLICT',
  INVALID_INPUT: 'INVALID_INPUT',
  POLICY_NOT_FOUND: 'POLICY_NOT_FOUND',
  POLICY_VERSION_INVALID: 'POLICY_VERSION_INVALID',
  TEMPORAL_VIOLATION: 'TEMPORAL_VIOLATION',
  AUTHORIZATION_FAILURE: 'AUTHORIZATION_FAILURE',
  NUMERICAL_FAILURE: 'NUMERICAL_FAILURE',
  INFEASIBLE_CONSTRAINTS: 'INFEASIBLE_CONSTRAINTS'
});

export const SeverityLevel = Object.freeze({
  INFO: 'INFO',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
});

export const BreachStatus = Object.freeze({
  DETECTED: 'DETECTED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  REMEDIATION_REQUIRED: 'REMEDIATION_REQUIRED',
  REMEDIATION_IN_PROGRESS: 'REMEDIATION_IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
});

export const ExceptionStatus = Object.freeze({
  REQUESTED: 'REQUESTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CLOSED: 'CLOSED',
  REJECTED: 'REJECTED'
});

export const PolicyPrecedence = Object.freeze({
  REGULATORY_HARD: 1,
  FIRM_MANDATE: 2,
  PORTFOLIO_MANDATE: 3,
  STRATEGY_POLICY: 4,
  SOFT_PREFERENCE: 5
});

export const PolicyStatus = Object.freeze({
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  SUPERSEDED: 'SUPERSEDED',
  RETIRED: 'RETIRED'
});

export const EvaluationPhase = Object.freeze({
  PRE_ACTION: 'PRE_ACTION',
  POST_ACTION: 'POST_ACTION',
  CONTINUOUS_MONITORING: 'CONTINUOUS_MONITORING',
  HISTORICAL_REPLAY: 'HISTORICAL_REPLAY'
});

export const ActionType = Object.freeze({
  PORTFOLIO_CONSTRUCTION: 'PORTFOLIO_CONSTRUCTION',
  IMPLEMENTATION_PLAN: 'IMPLEMENTATION_PLAN',
  REBALANCE_PROPOSAL: 'REBALANCE_PROPOSAL',
  INVESTMENT_DECISION: 'INVESTMENT_DECISION',
  HOLDINGS_STATE: 'HOLDINGS_STATE',
  TRANSACTION_EXECUTION_PROPOSAL: 'TRANSACTION_EXECUTION_PROPOSAL'
});

export const OperatorType = Object.freeze({
  LTE: '<=',
  GTE: '>=',
  LT: '<',
  GT: '>',
  EQ: '==',
  NEQ: '!=',
  IN: 'IN',
  NOT_IN: 'NOT_IN',
  BETWEEN: 'BETWEEN',
  PROHIBITED: 'PROHIBITED'
});
