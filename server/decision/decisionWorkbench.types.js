/**
 * @file decisionWorkbench.types.js
 * Phase 37: Investment Decision Workbench Domain Types, Enums & Utilities.
 */

import crypto from 'crypto';

export const WorkbenchDecisionStatus = Object.freeze({
  DRAFT: 'DRAFT',
  UNDER_REVIEW: 'UNDER_REVIEW',
  CHALLENGED: 'CHALLENGED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  IMPLEMENTATION_PENDING: 'IMPLEMENTATION_PENDING',
  IMPLEMENTED: 'IMPLEMENTED',
  MONITORED: 'MONITORED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  SUPERSEDED: 'SUPERSEDED'
});

export const WorkbenchDecisionType = Object.freeze({
  NEW_POSITION: 'NEW_POSITION',
  INCREASE: 'INCREASE',
  REDUCE: 'REDUCE',
  EXIT: 'EXIT',
  HOLD: 'HOLD',
  REBALANCE: 'REBALANCE',
  HEDGE: 'HEDGE',
  WATCH: 'WATCH',
  MANDATE_CHANGE: 'MANDATE_CHANGE',
  STRATEGY_CHANGE: 'STRATEGY_CHANGE'
});

export const DecisionPriority = Object.freeze({
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
});

export const EvidencePolarity = Object.freeze({
  SUPPORTING: 'SUPPORTING',
  CONTRADICTING: 'CONTRADICTING',
  NEUTRAL: 'NEUTRAL'
});

export const EvidenceType = Object.freeze({
  FUNDAMENTAL: 'FUNDAMENTAL',
  VALUATION: 'VALUATION',
  MACRO: 'MACRO',
  TECHNICAL: 'TECHNICAL',
  RISK: 'RISK',
  QUANTITATIVE: 'QUANTITATIVE',
  REGULATORY: 'REGULATORY',
  SIGNAL: 'SIGNAL',
  SCENARIO: 'SCENARIO'
});

export const ApprovalStatus = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  STALE: 'STALE',
  REVOKED: 'REVOKED'
});

export const ImplementationStatus = Object.freeze({
  NOT_STARTED: 'NOT_STARTED',
  PENDING_EXECUTION: 'PENDING_EXECUTION',
  EXECUTED: 'EXECUTED',
  CANCELLED: 'CANCELLED'
});

/**
 * Valid state transitions for WorkbenchDecisionStatus state machine.
 */
export const VALID_DECISION_TRANSITIONS = Object.freeze({
  [WorkbenchDecisionStatus.DRAFT]: [
    WorkbenchDecisionStatus.UNDER_REVIEW,
    WorkbenchDecisionStatus.CANCELLED
  ],
  [WorkbenchDecisionStatus.UNDER_REVIEW]: [
    WorkbenchDecisionStatus.CHALLENGED,
    WorkbenchDecisionStatus.APPROVED,
    WorkbenchDecisionStatus.REJECTED,
    WorkbenchDecisionStatus.CANCELLED
  ],
  [WorkbenchDecisionStatus.CHALLENGED]: [
    WorkbenchDecisionStatus.UNDER_REVIEW,
    WorkbenchDecisionStatus.REJECTED,
    WorkbenchDecisionStatus.CANCELLED
  ],
  [WorkbenchDecisionStatus.APPROVED]: [
    WorkbenchDecisionStatus.IMPLEMENTATION_PENDING,
    WorkbenchDecisionStatus.CANCELLED,
    WorkbenchDecisionStatus.SUPERSEDED
  ],
  [WorkbenchDecisionStatus.IMPLEMENTATION_PENDING]: [
    WorkbenchDecisionStatus.IMPLEMENTED,
    WorkbenchDecisionStatus.CANCELLED
  ],
  [WorkbenchDecisionStatus.IMPLEMENTED]: [
    WorkbenchDecisionStatus.MONITORED,
    WorkbenchDecisionStatus.CLOSED
  ],
  [WorkbenchDecisionStatus.MONITORED]: [
    WorkbenchDecisionStatus.CLOSED,
    WorkbenchDecisionStatus.SUPERSEDED
  ],
  [WorkbenchDecisionStatus.REJECTED]: [], // Terminal
  [WorkbenchDecisionStatus.CANCELLED]: [], // Terminal
  [WorkbenchDecisionStatus.EXPIRED]: [], // Terminal
  [WorkbenchDecisionStatus.CLOSED]: [], // Terminal
  [WorkbenchDecisionStatus.SUPERSEDED]: [] // Terminal
});

/**
 * Deterministic canonical JSON stringification.
 */
export function canonicalStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(k => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Computes deterministic SHA-256 hash of object.
 */
export function computeDeterministicHash(obj) {
  const canonical = canonicalStringify(obj);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}
