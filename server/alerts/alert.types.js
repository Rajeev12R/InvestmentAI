/**
 * @file alert.types.js
 * Canonical Domain Types, Enums, and Envelope Helpers for Phase 39 Institutional Alerts & Attention Center.
 */

import crypto from 'crypto';

// Backward-compatible Phase 7/12 Alert Enums
export const ALERT_TYPES = Object.freeze({
  DECISION_DOWNGRADE: 'DECISION_DOWNGRADE',
  DECISION_UPGRADE: 'DECISION_UPGRADE',
  THESIS_INVALIDATED: 'THESIS_INVALIDATED',
  THESIS_BREAKER_TRIGGERED: 'THESIS_BREAKER_TRIGGERED',
  THESIS_BREAKER_APPROACHING: 'THESIS_BREAKER_APPROACHING',
  RISK_ELEVATED: 'RISK_ELEVATED',
  RISK_CRITICAL: 'RISK_CRITICAL',
  VALUATION_DETERIORATION: 'VALUATION_DETERIORATION',
  VALUATION_EXPANSION: 'VALUATION_EXPANSION',
  MATERIAL_CHANGE: 'MATERIAL_CHANGE',
  DATA_INTEGRITY_VIOLATION: 'DATA_INTEGRITY_VIOLATION'
});

export const ALERT_SEVERITY = Object.freeze({
  INFO: 'INFO',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
});

// Phase 39 Canonical Institutional Enums
export const AlertSeverity = Object.freeze({
  CRITICAL: 'CRITICAL',
  ACTION_REQUIRED: 'ACTION_REQUIRED',
  ATTENTION: 'ATTENTION',
  INFORMATION: 'INFORMATION'
});

export const AlertStatus = Object.freeze({
  OPEN: 'OPEN',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  SNOOZED: 'SNOOZED',
  RESOLVED: 'RESOLVED',
  EXPIRED: 'EXPIRED'
});

export const AlertMateriality = Object.freeze({
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
});

export const NotificationChannel = Object.freeze({
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  PUSH: 'PUSH'
});

export const NotificationDeliveryStatus = Object.freeze({
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  SUPPRESSED: 'SUPPRESSED',
  PENDING: 'PENDING',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const VALID_ALERT_TRANSITIONS = Object.freeze({
  [AlertStatus.OPEN]: [AlertStatus.ACKNOWLEDGED, AlertStatus.SNOOZED, AlertStatus.RESOLVED, AlertStatus.EXPIRED],
  [AlertStatus.ACKNOWLEDGED]: [AlertStatus.SNOOZED, AlertStatus.RESOLVED, AlertStatus.EXPIRED],
  [AlertStatus.SNOOZED]: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED, AlertStatus.RESOLVED, AlertStatus.EXPIRED],
  [AlertStatus.RESOLVED]: [AlertStatus.OPEN], // Reopening permitted under explicit policy
  [AlertStatus.EXPIRED]: [] // Terminal
});

/**
 * Deterministically computes deduplication key for an alert.
 * Excludes transient timestamps to avoid alert storm duplicates.
 */
export function computeAlertDedupKey({
  orgId,
  workspaceId,
  sourceDomain,
  sourceEventId,
  portfolioId = null,
  securityId = null,
  alertCategory = 'GENERAL'
}) {
  const parts = [
    orgId || 'GLOBAL',
    workspaceId || 'GLOBAL',
    sourceDomain || 'UNKNOWN',
    sourceEventId || 'DEFAULT',
    portfolioId || 'ALL_PORTFOLIOS',
    securityId || 'ALL_SECURITIES',
    alertCategory || 'GENERAL'
  ];
  return parts.join(':').toUpperCase();
}

/**
 * Deterministically computes SHA-256 canonical hash of an alert object.
 */
export function computeAlertHash(alert) {
  const canonicalize = (val) => {
    if (val === null || typeof val !== 'object') return val;
    if (Array.isArray(val)) return val.map(canonicalize);
    const sorted = {};
    for (const k of Object.keys(val).sort()) {
      sorted[k] = canonicalize(val[k]);
    }
    return sorted;
  };
  const canonicalString = JSON.stringify(canonicalize(alert));
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}
