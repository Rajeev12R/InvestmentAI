/**
 * Phase 15 — Canonical Deterministic Types for Portfolio Implementation, Monitoring & Rebalancing
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

export const ImplementationStatus = Object.freeze({
  PROPOSED: 'PROPOSED',
  PLAN_GENERATED: 'PLAN_GENERATED',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  HUMAN_APPROVED: 'HUMAN_APPROVED',
  IMPLEMENTATION_REPORTED: 'IMPLEMENTATION_REPORTED',
  RECONCILED: 'RECONCILED',
  DRIFTED: 'DRIFTED',
  REBALANCE_RECOMMENDED: 'REBALANCE_RECOMMENDED',
  INVALIDATED: 'INVALIDATED',
  UNAVAILABLE: 'UNAVAILABLE',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  INVALID_INPUT: 'INVALID_INPUT',
  STALE_DATA: 'STALE_DATA',
  CONFLICT: 'CONFLICT',
  INCOMPLETE_RECONCILIATION: 'INCOMPLETE_RECONCILIATION',
  INFEASIBLE_CONSTRAINTS: 'INFEASIBLE_CONSTRAINTS',
  NUMERICAL_FAILURE: 'NUMERICAL_FAILURE',
  AUTHORIZATION_FAILURE: 'AUTHORIZATION_FAILURE'
});

export const TransactionStatus = Object.freeze({
  REPORTED: 'REPORTED',
  SETTLED: 'SETTLED',
  PENDING_SETTLEMENT: 'PENDING_SETTLEMENT',
  CANCELLED: 'CANCELLED',
  RECONCILED: 'RECONCILED',
  UNRECONCILED: 'UNRECONCILED',
  UNAVAILABLE: 'UNAVAILABLE',
  CONFLICT: 'CONFLICT'
});

export const ReconciliationStatus = Object.freeze({
  MATCHED: 'MATCHED',
  DRIFTED: 'DRIFTED',
  MISSING: 'MISSING',
  UNEXPECTED_POSITION: 'UNEXPECTED_POSITION',
  OVER_IMPLEMENTED: 'OVER_IMPLEMENTED',
  UNDER_IMPLEMENTED: 'UNDER_IMPLEMENTED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  CONFLICT: 'CONFLICT'
});

export const DriftStatus = Object.freeze({
  IN_TOLERANCE: 'IN_TOLERANCE',
  WARNING: 'WARNING',
  BREACH: 'BREACH',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const ConstraintStatus = Object.freeze({
  PASS: 'PASS',
  WARNING: 'WARNING',
  BREACH: 'BREACH',
  UNAVAILABLE: 'UNAVAILABLE',
  CONFLICT: 'CONFLICT'
});

export const RebalanceStatus = Object.freeze({
  NO_REBALANCE: 'NO_REBALANCE',
  REBALANCE_RECOMMENDED: 'REBALANCE_RECOMMENDED',
  REBALANCE_REQUIRED: 'REBALANCE_REQUIRED',
  INFEASIBLE_CONSTRAINTS: 'INFEASIBLE_CONSTRAINTS',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA'
});

export const RebalanceTrigger = Object.freeze({
  NONE: 'NONE',
  THRESHOLD_DRIFT: 'THRESHOLD_DRIFT',
  CONSTRAINT_BREACH: 'CONSTRAINT_BREACH',
  RISK_BUDGET_BREACH: 'RISK_BUDGET_BREACH',
  CALENDAR_SCHEDULED: 'CALENDAR_SCHEDULED',
  DECISION_CHANGE: 'DECISION_CHANGE',
  THESIS_CHANGE: 'THESIS_CHANGE',
  DATA_QUALITY_DEGRADATION: 'DATA_QUALITY_DEGRADATION'
});

export const ImplementationQualityStatus = Object.freeze({
  EXCELLENT: 'EXCELLENT',
  ACCEPTABLE: 'ACCEPTABLE',
  DEGRADED: 'DEGRADED',
  FAILED: 'FAILED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA'
});

export const ImplementationAction = Object.freeze({
  BUY: 'BUY',
  SELL: 'SELL',
  HOLD: 'HOLD',
  NO_DATA: 'NO_DATA'
});

export const ApprovalStatus = Object.freeze({
  PROPOSED: 'PROPOSED',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  INVALIDATED: 'INVALIDATED'
});
