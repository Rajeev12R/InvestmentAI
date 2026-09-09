/**
 * @file dashboard.types.js
 * Domain Models, Enums, and Envelope Helpers for Phase 38 Institutional Dashboard & Intelligence Cockpit.
 */

import crypto from 'crypto';

export const MetricFreshness = Object.freeze({
  FRESH: 'FRESH',
  STALE: 'STALE',
  PARTIAL: 'PARTIAL',
  UNAVAILABLE: 'UNAVAILABLE',
  UNKNOWN: 'UNKNOWN',
  INVALID: 'INVALID'
});

export const MetricStatus = Object.freeze({
  VALID: 'VALID',
  OK: 'OK',
  WARNING: 'WARNING',
  BREACH: 'BREACH',
  UNAVAILABLE: 'UNAVAILABLE',
  PENDING: 'PENDING'
});

export const AttentionSeverity = Object.freeze({
  INFORMATION: 'INFORMATION',
  ATTENTION: 'ATTENTION',
  ACTION_REQUIRED: 'ACTION_REQUIRED',
  BLOCKED: 'BLOCKED',
  CRITICAL: 'CRITICAL'
});

export const AttentionMateriality = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
});

export const DashboardRoleView = Object.freeze({
  PORTFOLIO_MANAGER: 'PORTFOLIO_MANAGER',
  RISK_OFFICER: 'RISK_OFFICER',
  COMPLIANCE_AUDITOR: 'COMPLIANCE_AUDITOR',
  ORG_ADMIN: 'ORG_ADMIN'
});

export const DomainStatus = Object.freeze({
  HEALTHY: 'HEALTHY',
  PARTIAL: 'PARTIAL',
  DEGRADED: 'DEGRADED',
  UNAVAILABLE: 'UNAVAILABLE'
});

/**
 * Creates a normalized institutional dashboard metric envelope.
 * Guarantees value, status, asOf, freshness, and source are never omitted.
 * 
 * @param {any} value 
 * @param {Object} opts 
 * @returns {Object}
 */
export function createDashboardMetric(value, opts = {}) {
  const now = new Date().toISOString();
  return {
    value: value !== undefined ? value : null,
    status: opts.status || (value !== null && value !== undefined ? MetricStatus.VALID : MetricStatus.UNAVAILABLE),
    asOf: opts.asOf || now,
    freshness: opts.freshness || (value !== null && value !== undefined ? MetricFreshness.FRESH : MetricFreshness.UNAVAILABLE),
    source: opts.source || 'system.operating_engine',
    unit: opts.unit || null,
    formatted: opts.formatted || null,
    metadata: opts.metadata || {}
  };
}

/**
 * Computes deterministic SHA-256 hash of a payload for replay/integrity verification.
 * @param {any} data 
 * @returns {string}
 */
export function computeDashboardHash(data) {
  const json = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(json).digest('hex');
}
