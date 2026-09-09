/**
 * @file auth.types.js
 * Institutional Security & Multi-User Governance Type Definitions for Phase 9.
 */

export const Role = Object.freeze({
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  ANALYST: 'ANALYST',
  VIEWER: 'VIEWER',
  AUDITOR: 'AUDITOR'
});

export const OrganizationRole = Object.freeze({
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER'
});

export const OrganizationStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED'
});

export const WorkspaceStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
  SUSPENDED: 'SUSPENDED'
});

export const Permission = Object.freeze({
  // Organization permissions
  ORG_READ: 'org.read',
  ORG_UPDATE: 'org.update',
  ORG_MEMBERS_READ: 'org.members.read',
  ORG_MEMBERS_MANAGE: 'org.members.manage',
  ORG_WORKSPACES_MANAGE: 'org.workspaces.manage',

  // Workspace permissions
  WORKSPACE_READ: 'workspace.read',
  WORKSPACE_CREATE: 'workspace.create',
  WORKSPACE_UPDATE: 'workspace.update',
  WORKSPACE_ARCHIVE: 'workspace.archive',
  WORKSPACE_DELETE: 'workspace.delete',
  WORKSPACE_MEMBERS_READ: 'workspace.members.read',
  WORKSPACE_MEMBERS_INVITE: 'workspace.members.invite',
  WORKSPACE_MEMBERS_REMOVE: 'workspace.members.remove',
  WORKSPACE_ROLES_UPDATE: 'workspace.roles.update',

  // Investments & Portfolio permissions
  WATCHLIST_READ: 'watchlist.read',
  WATCHLIST_WRITE: 'watchlist.write',
  PORTFOLIO_READ: 'portfolio.read',
  PORTFOLIO_WRITE: 'portfolio.write',
  PORTFOLIO_CREATE: 'portfolio.create',
  PORTFOLIO_UPDATE: 'portfolio.update',
  PORTFOLIO_DELETE: 'portfolio.delete',
  PORTFOLIO_STATUS_MANAGE: 'portfolio.status.manage',
  PORTFOLIO_HOLDINGS_MANAGE: 'portfolio.holdings.manage',
  PORTFOLIO_OPTIMIZE: 'portfolio.optimize',
  PORTFOLIO_SNAPSHOT_CREATE: 'portfolio.snapshot.create',
  RESEARCH_READ: 'research.read',
  RESEARCH_WRITE: 'research.write',
  THESIS_READ: 'thesis.read',
  THESIS_WRITE: 'thesis.write',

  // Decision Operations (Phase 37 Workbench)
  DECISION_CREATE: 'decision.create',
  DECISION_READ: 'decision.read',
  DECISION_UPDATE: 'decision.update',
  DECISION_REVIEW: 'decision.review',
  DECISION_CHALLENGE: 'decision.challenge',
  DECISION_APPROVE: 'decision.approve',
  DECISION_REJECT: 'decision.reject',
  DECISION_IMPLEMENT: 'decision.implement',
  DECISION_CLOSE: 'decision.close',
  DECISION_DISMISS: 'decision.dismiss',
  DECISION_RESOLVE: 'decision.resolve',
  DECISION_APPROVE_ACTION: 'decision.approve_action',

  // Copilot permissions
  COPILOT_READ: 'copilot.read',
  COPILOT_WRITE: 'copilot.write',
  COPILOT_RESEARCH: 'copilot.research',

  // Data & Ingestion permissions
  TRUTH_READ: 'truth.read',
  SNAPSHOT_READ: 'snapshot.read',
  CHANGE_READ: 'change.read',
  ATTENTION_READ: 'attention.read',
  INGESTION_READ: 'ingestion.read',
  INGESTION_TRIGGER: 'ingestion.trigger',

  // Administration & Governance
  AUDIT_READ: 'audit.read',
  API_KEYS_READ: 'api_keys.read',
  API_KEYS_CREATE: 'api_keys.create',
  API_KEYS_REVOKE: 'api_keys.revoke',
  SECURITY_READ: 'security.read',
  EXPORT_READ: 'export.read',
  RETENTION_MANAGE: 'retention.manage',

  // Dashboard & Cockpit permissions (Phase 38)
  DASHBOARD_READ: 'dashboard.read',

  // Alerts & Attention Center permissions (Phase 39)
  ALERTS_READ: 'alerts.read',
  ALERTS_ACKNOWLEDGE: 'alerts.acknowledge',
  ALERTS_SNOOZE: 'alerts.snooze',
  ALERTS_RESOLVE: 'alerts.resolve',
  ALERTS_CONFIGURE: 'alerts.configure',
  ALERTS_ADMIN: 'alerts.admin',

  // Reporting & Deliverables permissions (Phase 40)
  REPORTS_READ: 'reports.read',
  REPORTS_CREATE: 'reports.create',
  REPORTS_GENERATE: 'reports.generate',
  REPORTS_VALIDATE: 'reports.validate',
  REPORTS_REVIEW: 'reports.review',
  REPORTS_APPROVE: 'reports.approve',
  REPORTS_DISTRIBUTE: 'reports.distribute',
  REPORTS_SUPERSEDE: 'reports.supersede',
  REPORTS_ADMIN: 'reports.admin'
});

export const MembershipStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  INVITED: 'INVITED',
  SUSPENDED: 'SUSPENDED',
  REVOKED: 'REVOKED'
});

export const ApiKeyStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED'
});

export const SecurityEventSeverity = Object.freeze({
  INFO: 'INFO',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
});

export const SessionStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED'
});
