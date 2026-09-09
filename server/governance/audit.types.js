/**
 * @file audit.types.js
 * Governance, Immutable Audit Logging & Compliance Type Definitions for Phase 9.
 */

export const AuditAction = Object.freeze({
  // Auth & Workspace
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_REGISTER: 'user.register',
  WORKSPACE_CREATE: 'workspace.create',
  MEMBER_INVITED: 'member.invited',
  MEMBER_ROLE_UPDATED: 'member.role_updated',
  MEMBER_REMOVED: 'member.removed',
  API_KEY_CREATED: 'api_key.created',
  API_KEY_REVOKED: 'api_key.revoked',

  // Investments & Operations
  WATCHLIST_MODIFIED: 'watchlist.modified',
  PORTFOLIO_MODIFIED: 'portfolio.modified',
  THESIS_MODIFIED: 'thesis.modified',
  DECISION_REVIEW_RESOLVED: 'decision_review.resolved',
  DECISION_ACTION_APPROVED: 'decision_action.approved',
  INGESTION_TRIGGERED: 'ingestion.triggered',
  TRUTH_UPDATED: 'truth.updated',
  SNAPSHOT_CREATED: 'snapshot.created',
  COPILOT_QUERY_EXECUTED: 'copilot.query_executed',
  RESEARCH_REPORT_GENERATED: 'research.report_generated',
  COMPLIANCE_EXPORT_GENERATED: 'compliance.export_generated',
  RETENTION_POLICY_EXECUTED: 'retention.policy_executed'
});

export const AuditResult = Object.freeze({
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  DENIED: 'DENIED'
});

export const RetentionCategory = Object.freeze({
  FINANCIAL_TRUTH: 'FINANCIAL_TRUTH',
  RAW_SOURCE_RECORDS: 'RAW_SOURCE_RECORDS',
  RESEARCH_CONVERSATIONS: 'RESEARCH_CONVERSATIONS',
  AUDIT_LOGS: 'AUDIT_LOGS',
  JOB_RECORDS: 'JOB_RECORDS',
  TEMPORARY_ARTIFACTS: 'TEMPORARY_ARTIFACTS'
});
