/**
 * @file rbac.engine.js
 * Role-Based Access Control (RBAC) Engine for Phase 9 Institutional Security.
 */

import { Role, Permission } from './auth.types.js';

/**
 * Explicit Role-Permission Mapping Matrix.
 */
export const RolePermissions = Object.freeze({
  [Role.OWNER]: Object.freeze(Object.values(Permission)),

  [Role.ADMIN]: Object.freeze([
    // Organization
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.ORG_MEMBERS_READ,
    Permission.ORG_MEMBERS_MANAGE,
    Permission.ORG_WORKSPACES_MANAGE,
    // Workspace
    Permission.WORKSPACE_READ,
    Permission.WORKSPACE_CREATE,
    Permission.WORKSPACE_UPDATE,
    Permission.WORKSPACE_ARCHIVE,
    Permission.WORKSPACE_MEMBERS_READ,
    Permission.WORKSPACE_MEMBERS_INVITE,
    Permission.WORKSPACE_MEMBERS_REMOVE,
    Permission.WORKSPACE_ROLES_UPDATE,
    // Investments
    Permission.WATCHLIST_READ,
    Permission.WATCHLIST_WRITE,
    Permission.PORTFOLIO_READ,
    Permission.PORTFOLIO_WRITE,
    Permission.PORTFOLIO_CREATE,
    Permission.PORTFOLIO_UPDATE,
    Permission.PORTFOLIO_DELETE,
    Permission.PORTFOLIO_STATUS_MANAGE,
    Permission.PORTFOLIO_HOLDINGS_MANAGE,
    Permission.PORTFOLIO_OPTIMIZE,
    Permission.PORTFOLIO_SNAPSHOT_CREATE,
    Permission.RESEARCH_READ,
    Permission.RESEARCH_WRITE,
    Permission.THESIS_READ,
    Permission.THESIS_WRITE,
    // Decision Operations (Phase 37 Workbench)
    Permission.DECISION_CREATE,
    Permission.DECISION_READ,
    Permission.DECISION_UPDATE,
    Permission.DECISION_REVIEW,
    Permission.DECISION_CHALLENGE,
    Permission.DECISION_APPROVE,
    Permission.DECISION_REJECT,
    Permission.DECISION_IMPLEMENT,
    Permission.DECISION_CLOSE,
    Permission.DECISION_DISMISS,
    Permission.DECISION_RESOLVE,
    Permission.DECISION_APPROVE_ACTION,
    // Copilot
    Permission.COPILOT_READ,
    Permission.COPILOT_WRITE,
    Permission.COPILOT_RESEARCH,
    // Data & Ingestion
    Permission.TRUTH_READ,
    Permission.SNAPSHOT_READ,
    Permission.CHANGE_READ,
    Permission.ATTENTION_READ,
    Permission.INGESTION_READ,
    Permission.INGESTION_TRIGGER,
    // Administration
    Permission.AUDIT_READ,
    Permission.API_KEYS_READ,
    Permission.API_KEYS_CREATE,
    Permission.API_KEYS_REVOKE,
    Permission.SECURITY_READ,
    Permission.EXPORT_READ,
    Permission.DASHBOARD_READ,
    Permission.ALERTS_READ,
    Permission.ALERTS_ACKNOWLEDGE,
    Permission.ALERTS_SNOOZE,
    Permission.ALERTS_RESOLVE,
    Permission.ALERTS_CONFIGURE,
    Permission.ALERTS_ADMIN,
    // Reporting (Phase 40)
    Permission.REPORTS_READ,
    Permission.REPORTS_CREATE,
    Permission.REPORTS_GENERATE,
    Permission.REPORTS_VALIDATE,
    Permission.REPORTS_REVIEW,
    Permission.REPORTS_APPROVE,
    Permission.REPORTS_DISTRIBUTE,
    Permission.REPORTS_SUPERSEDE,
    Permission.REPORTS_ADMIN
  ]),

  [Role.ANALYST]: Object.freeze([
    Permission.WORKSPACE_READ,
    Permission.WORKSPACE_MEMBERS_READ,
    // Investments
    Permission.WATCHLIST_READ,
    Permission.WATCHLIST_WRITE,
    Permission.PORTFOLIO_READ,
    Permission.PORTFOLIO_WRITE,
    Permission.PORTFOLIO_OPTIMIZE,
    Permission.PORTFOLIO_SNAPSHOT_CREATE,
    Permission.RESEARCH_READ,
    Permission.RESEARCH_WRITE,
    Permission.THESIS_READ,
    Permission.THESIS_WRITE,
    // Decision Operations (Phase 37 Workbench)
    Permission.DECISION_CREATE,
    Permission.DECISION_READ,
    Permission.DECISION_UPDATE,
    Permission.DECISION_REVIEW,
    Permission.DECISION_CHALLENGE,
    Permission.DECISION_DISMISS,
    // Copilot
    Permission.COPILOT_READ,
    Permission.COPILOT_WRITE,
    Permission.COPILOT_RESEARCH,
    // Data & Ingestion
    Permission.TRUTH_READ,
    Permission.SNAPSHOT_READ,
    Permission.CHANGE_READ,
    Permission.ATTENTION_READ,
    Permission.INGESTION_READ,
    Permission.INGESTION_TRIGGER,
    Permission.EXPORT_READ,
    Permission.DASHBOARD_READ,
    Permission.ALERTS_READ,
    Permission.ALERTS_ACKNOWLEDGE,
    Permission.ALERTS_SNOOZE,
    Permission.ALERTS_RESOLVE,
    // Reporting (Phase 40)
    Permission.REPORTS_READ,
    Permission.REPORTS_CREATE,
    Permission.REPORTS_GENERATE,
    Permission.REPORTS_VALIDATE,
    Permission.REPORTS_REVIEW
  ]),

  [Role.VIEWER]: Object.freeze([
    Permission.WORKSPACE_READ,
    Permission.WORKSPACE_MEMBERS_READ,
    Permission.WATCHLIST_READ,
    Permission.PORTFOLIO_READ,
    Permission.RESEARCH_READ,
    Permission.THESIS_READ,
    Permission.DECISION_READ,
    Permission.COPILOT_READ,
    Permission.TRUTH_READ,
    Permission.SNAPSHOT_READ,
    Permission.CHANGE_READ,
    Permission.ATTENTION_READ,
    Permission.INGESTION_READ,
    Permission.EXPORT_READ,
    Permission.DASHBOARD_READ,
    Permission.ALERTS_READ,
    Permission.REPORTS_READ
  ]),

  [Role.AUDITOR]: Object.freeze([
    Permission.WORKSPACE_READ,
    Permission.WORKSPACE_MEMBERS_READ,
    Permission.WATCHLIST_READ,
    Permission.PORTFOLIO_READ,
    Permission.RESEARCH_READ,
    Permission.THESIS_READ,
    Permission.DECISION_READ,
    Permission.TRUTH_READ,
    Permission.SNAPSHOT_READ,
    Permission.CHANGE_READ,
    Permission.ATTENTION_READ,
    Permission.AUDIT_READ,
    Permission.SECURITY_READ,
    Permission.EXPORT_READ,
    Permission.DASHBOARD_READ,
    Permission.ALERTS_READ,
    Permission.REPORTS_READ,
    Permission.REPORTS_VALIDATE
  ])
});

/**
 * Checks if a specific role grants a required permission.
 * @param {string} role 
 * @param {string} permission 
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  if (!role || !permission) return false;
  const permissions = RolePermissions[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Checks if a role satisfies all required permissions in a list.
 * @param {string} role 
 * @param {string[]} permissions 
 * @returns {boolean}
 */
export function hasAllPermissions(role, permissions = []) {
  if (!role || !Array.isArray(permissions)) return false;
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Checks if a role satisfies at least one permission in a list.
 * @param {string} role 
 * @param {string[]} permissions 
 * @returns {boolean}
 */
export function hasAnyPermission(role, permissions = []) {
  if (!role || !Array.isArray(permissions) || permissions.length === 0) return false;
  return permissions.some(p => hasPermission(role, p));
}
