/**
 * @file report.types.js
 * Domain types, enums, transition state machines, and cryptographic hashing helpers for Phase 40 Institutional Reporting & Deliverables.
 */

import crypto from 'crypto';

export const ReportType = Object.freeze({
  // Portfolio Reports
  PORTFOLIO_OVERVIEW: 'PORTFOLIO_OVERVIEW',
  PORTFOLIO_PERFORMANCE: 'PORTFOLIO_PERFORMANCE',
  HOLDINGS_REPORT: 'HOLDINGS_REPORT',
  EXPOSURE_RISK_REPORT: 'EXPOSURE_RISK_REPORT',
  ATTRIBUTION_REPORT: 'ATTRIBUTION_REPORT',
  LIQUIDITY_REPORT: 'LIQUIDITY_REPORT',
  TAX_IMPLEMENTATION_REPORT: 'TAX_IMPLEMENTATION_REPORT',

  // Investment Decision Reports
  INVESTMENT_DECISION_MEMO: 'INVESTMENT_DECISION_MEMO',
  DECISION_REVIEW_PACKAGE: 'DECISION_REVIEW_PACKAGE',
  THESIS_EVIDENCE_PACKAGE: 'THESIS_EVIDENCE_PACKAGE',
  SCENARIO_STRESS_PACKAGE: 'SCENARIO_STRESS_PACKAGE',
  OPTIMIZATION_PROPOSAL_PACKAGE: 'OPTIMIZATION_PROPOSAL_PACKAGE',

  // Governance Reports
  COMPLIANCE_REPORT: 'COMPLIANCE_REPORT',
  MANDATE_MONITORING_REPORT: 'MANDATE_MONITORING_REPORT',
  DECISION_AUTHORIZATION_REPORT: 'DECISION_AUTHORIZATION_REPORT',
  AUDIT_LINEAGE_REPORT: 'AUDIT_LINEAGE_REPORT',
  EXCEPTION_REPORT: 'EXCEPTION_REPORT',

  // Institutional Periodic Reports
  DAILY_BRIEF: 'DAILY_BRIEF',
  WEEKLY_INVESTMENT_REVIEW: 'WEEKLY_INVESTMENT_REVIEW',
  MONTHLY_PORTFOLIO_REVIEW: 'MONTHLY_PORTFOLIO_REVIEW',
  QUARTERLY_COMMITTEE_PACKAGE: 'QUARTERLY_COMMITTEE_PACKAGE'
});

export const ReportStatus = Object.freeze({
  DRAFT: 'DRAFT',
  GENERATING: 'GENERATING',
  GENERATED: 'GENERATED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  READY_FOR_REVIEW: 'READY_FOR_REVIEW',
  APPROVED: 'APPROVED',
  DISTRIBUTED: 'DISTRIBUTED',
  SUPERSEDED: 'SUPERSEDED',
  ARCHIVED: 'ARCHIVED'
});

export const ReportValidationStatus = Object.freeze({
  PENDING: 'PENDING',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  WARNING: 'WARNING'
});

export const ApprovalStatus = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
});

export const DistributionStatus = Object.freeze({
  NOT_DISTRIBUTED: 'NOT_DISTRIBUTED',
  DISTRIBUTED: 'DISTRIBUTED',
  FAILED: 'FAILED',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  PARTIALLY_DISTRIBUTED: 'PARTIALLY_DISTRIBUTED'
});

export const DistributionChannel = Object.freeze({
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  WEBHOOK: 'WEBHOOK',
  DOWNLOAD: 'DOWNLOAD'
});

export const ReportFormat = Object.freeze({
  JSON: 'JSON',
  HTML: 'HTML',
  PDF: 'PDF',
  CSV: 'CSV'
});

export const DataFreshness = Object.freeze({
  FRESH: 'FRESH',
  STALE: 'STALE',
  PARTIAL: 'PARTIAL',
  UNAVAILABLE: 'UNAVAILABLE',
  UNKNOWN: 'UNKNOWN',
  INVALID: 'INVALID'
});

/**
 * Strict finite state machine governing report lifecycle transitions.
 */
export const VALID_REPORT_TRANSITIONS = Object.freeze({
  [ReportStatus.DRAFT]: [ReportStatus.GENERATING, ReportStatus.ARCHIVED],
  [ReportStatus.GENERATING]: [ReportStatus.GENERATED, ReportStatus.VALIDATION_FAILED, ReportStatus.DRAFT],
  [ReportStatus.VALIDATION_FAILED]: [ReportStatus.DRAFT, ReportStatus.GENERATING, ReportStatus.ARCHIVED],
  [ReportStatus.GENERATED]: [ReportStatus.READY_FOR_REVIEW, ReportStatus.VALIDATION_FAILED, ReportStatus.DRAFT],
  [ReportStatus.READY_FOR_REVIEW]: [ReportStatus.APPROVED, ReportStatus.DRAFT, ReportStatus.VALIDATION_FAILED],
  [ReportStatus.APPROVED]: [ReportStatus.DISTRIBUTED, ReportStatus.SUPERSEDED, ReportStatus.ARCHIVED],
  [ReportStatus.DISTRIBUTED]: [ReportStatus.SUPERSEDED, ReportStatus.ARCHIVED],
  [ReportStatus.SUPERSEDED]: [ReportStatus.ARCHIVED],
  [ReportStatus.ARCHIVED]: []
});

/**
 * Deterministically computes a SHA-256 hash for an object by normalizing keys.
 * @param {Object} obj 
 * @returns {string} SHA-256 hex digest
 */
export function computeDeterministicHash(obj) {
  if (!obj || typeof obj !== 'object') {
    return crypto.createHash('sha256').update(String(obj || '')).digest('hex');
  }

  function sortObject(item) {
    if (item === null || typeof item !== 'object') return item;
    if (Array.isArray(item)) return item.map(sortObject);
    const sorted = {};
    Object.keys(item).sort().forEach(key => {
      sorted[key] = sortObject(item[key]);
    });
    return sorted;
  }

  const normalized = JSON.stringify(sortObject(obj));
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function computeSnapshotHash(snapshot) {
  const { snapshotHash, isSealed, ...rest } = snapshot;
  return computeDeterministicHash(rest);
}

export function computeReportDataHash(data) {
  const { reportHash, artifactHash, ...rest } = data;
  return computeDeterministicHash(rest);
}

export function computeArtifactHash(content) {
  if (!content) return '';
  const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
