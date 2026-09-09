import crypto from 'crypto';

/**
 * Phase 25 — Canonical Workflow Roles (RBAC)
 */
export const WorkflowRole = Object.freeze({
  VIEWER: 'VIEWER',
  ANALYST: 'ANALYST',
  EDITOR: 'EDITOR',
  PORTFOLIO_MANAGER: 'PORTFOLIO_MANAGER',
  ADMIN: 'ADMIN',
  AUDITOR: 'AUDITOR'
});

/**
 * Institutional Teams
 */
export const TeamType = Object.freeze({
  EQUITY_RESEARCH: 'EQUITY_RESEARCH',
  PORTFOLIO_MANAGEMENT: 'PORTFOLIO_MANAGEMENT',
  RISK: 'RISK',
  COMPLIANCE: 'COMPLIANCE',
  INVESTMENT_COMMITTEE: 'INVESTMENT_COMMITTEE',
  OPERATIONS: 'OPERATIONS',
  AUDIT: 'AUDIT'
});

/**
 * Research Assignment Statuses
 */
export const AssignmentStatus = Object.freeze({
  UNASSIGNED: 'UNASSIGNED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  BLOCKED: 'BLOCKED',
  READY_FOR_REVIEW: 'READY_FOR_REVIEW',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
});

/**
 * Research Task Types & Statuses
 */
export const TaskType = Object.freeze({
  VERIFY_CLAIM: 'VERIFY_CLAIM',
  REVIEW_EVIDENCE: 'REVIEW_EVIDENCE',
  INVESTIGATE_EVENT: 'INVESTIGATE_EVENT',
  UPDATE_THESIS: 'UPDATE_THESIS',
  REVIEW_FORECAST: 'REVIEW_FORECAST',
  REVIEW_VALUATION: 'REVIEW_VALUATION',
  REVIEW_RISK: 'REVIEW_RISK',
  REVIEW_LIQUIDITY: 'REVIEW_LIQUIDITY',
  REVIEW_COMPLIANCE: 'REVIEW_COMPLIANCE',
  PREPARE_IC_BRIEF: 'PREPARE_IC_BRIEF',
  FOLLOW_UP: 'FOLLOW_UP'
});

export const TaskStatus = Object.freeze({
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
});

/**
 * Review State Machine Statuses
 */
export const ReviewStatus = Object.freeze({
  DRAFT: 'DRAFT',
  VALIDATED: 'VALIDATED',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  RESUBMITTED: 'RESUBMITTED',
  HUMAN_APPROVED: 'HUMAN_APPROVED',
  PUBLISHED: 'PUBLISHED',
  SUPERSEDED: 'SUPERSEDED',
  REJECTED: 'REJECTED'
});

/**
 * Comment Statuses
 */
export const CommentStatus = Object.freeze({
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
  REOPENED: 'REOPENED',
  WONT_FIX: 'WONT_FIX'
});

/**
 * Question Statuses
 */
export const QuestionStatus = Object.freeze({
  OPEN: 'OPEN',
  ASSIGNED: 'ASSIGNED',
  ANSWERED: 'ANSWERED',
  VERIFIED: 'VERIFIED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED'
});

/**
 * Priority Levels
 */
export const PriorityLevel = Object.freeze({
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
});

/**
 * Freshness States
 */
export const FreshnessState = Object.freeze({
  CURRENT: 'CURRENT',
  AGING: 'AGING',
  STALE: 'STALE',
  INVALIDATED: 'INVALIDATED',
  SUPERSEDED: 'SUPERSEDED',
  UNKNOWN: 'UNKNOWN'
});

/**
 * Distribution Channels
 */
export const DistributionChannel = Object.freeze({
  TEAM: 'TEAM',
  USER: 'USER',
  PORTFOLIO: 'PORTFOLIO',
  WATCHLIST: 'WATCHLIST',
  INVESTMENT_COMMITTEE: 'INVESTMENT_COMMITTEE'
});

/**
 * Acknowledgement States
 */
export const AcknowledgementStatus = Object.freeze({
  REQUIRED: 'REQUIRED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  ESCALATED: 'ESCALATED',
  EXPIRED: 'EXPIRED'
});

/**
 * Deterministic Object Deep Freeze
 */
export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach(prop => {
    if (obj[prop] !== null && (typeof obj[prop] === 'object' || typeof obj[prop] === 'function') && !Object.isFrozen(obj[prop])) {
      deepFreeze(obj[prop]);
    }
  });
  return obj;
}

/**
 * Deterministic Canonical Hashing (SHA-256)
 */
export function computeWorkflowHash(obj) {
  const normalize = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'object') return val;
    if (Array.isArray(val)) return val.map(normalize);
    const sorted = {};
    Object.keys(val).sort().forEach(k => {
      sorted[k] = normalize(val[k]);
    });
    return sorted;
  };
  const json = JSON.stringify(normalize(obj));
  return crypto.createHash('sha256').update(json).digest('hex');
}
