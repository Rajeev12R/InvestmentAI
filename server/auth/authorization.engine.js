/**
 * @file authorization.engine.js
 * Multi-Tenant Authorization Engine for Phase 35 Institutional Security.
 * Enforces strict Deny-by-Default, Organization Boundary Scoping, Workspace Scoping, and IDOR Prevention.
 */

import { authRepository } from './auth.repository.js';
import { hasPermission } from './rbac.engine.js';
import { MembershipStatus, OrganizationStatus, WorkspaceStatus, OrganizationRole, Role } from './auth.types.js';

/**
 * Authorizes a user action within an organization or workspace.
 * @param {Object} params
 * @param {Object|string} params.user - User object or userId
 * @param {string} [params.orgId] - Target Organization ID
 * @param {string} [params.workspaceId] - Target Workspace ID
 * @param {string} params.action - Required Permission (e.g. Permission.WORKSPACE_READ, Permission.ORG_UPDATE)
 * @param {Object} [params.resource] - Optional target resource for ownership/scoping checks
 * @returns {Object} { isAuthorized: boolean, reason?: string, membership?: Object, role?: string }
 */
export function authorize({ user, orgId = null, workspaceId = null, action, resource = null }) {
  // 1. Strict Deny-by-Default Checks
  if (!user) {
    return { isAuthorized: false, reason: 'DENY: Authentication required (anonymous user)' };
  }
  if (!action) {
    return { isAuthorized: false, reason: 'DENY: Target action permission is missing' };
  }

  const userId = typeof user === 'string' ? user : user.userId;
  if (!userId) {
    return { isAuthorized: false, reason: 'DENY: Invalid user identifier' };
  }

  // 2. Organization-Level Action Evaluation
  if (action.startsWith('org.')) {
    if (!orgId) {
      return { isAuthorized: false, reason: 'DENY: Target orgId is missing for organization-level action' };
    }
    const org = authRepository.getOrganizationById(orgId);
    if (!org) {
      return { isAuthorized: false, reason: `DENY: Organization ${orgId} not found` };
    }
    if (org.status !== OrganizationStatus.ACTIVE) {
      return { isAuthorized: false, reason: `DENY: Organization ${orgId} is ${org.status}` };
    }

    const orgMembership = authRepository.getOrganizationMembership(orgId, userId);
    if (!orgMembership) {
      return { isAuthorized: false, reason: `DENY: User ${userId} is not a member of organization ${orgId}` };
    }
    if (orgMembership.status !== MembershipStatus.ACTIVE) {
      return { isAuthorized: false, reason: `DENY: User membership in organization ${orgId} is ${orgMembership.status}` };
    }

    // Role check for organization action
    const hasPerm = hasPermission(orgMembership.role, action);
    if (!hasPerm) {
      return {
        isAuthorized: false,
        reason: `DENY: Organization role '${orgMembership.role}' lacks required permission '${action}' in organization ${orgId}`
      };
    }

    return {
      isAuthorized: true,
      orgMembership,
      role: orgMembership.role
    };
  }

  // 3. Workspace-Level Action Evaluation
  if (!workspaceId) {
    return { isAuthorized: false, reason: 'DENY: Target workspaceId is missing' };
  }

  const ws = authRepository.getWorkspaceById(workspaceId);
  if (!ws) {
    return { isAuthorized: false, reason: `DENY: Workspace ${workspaceId} not found` };
  }
  if (ws.status !== WorkspaceStatus.ACTIVE) {
    return { isAuthorized: false, reason: `DENY: Workspace ${workspaceId} is ${ws.status}` };
  }

  // Check Organization Match if orgId specified
  if (orgId && ws.orgId !== orgId) {
    return {
      isAuthorized: false,
      reason: `DENY: Workspace ${workspaceId} belongs to org ${ws.orgId}, not requested org ${orgId}`
    };
  }

  // Check Workspace Membership
  const membership = authRepository.getMembership(workspaceId, userId);
  if (!membership) {
    return { isAuthorized: false, reason: `DENY: User ${userId} is not a member of workspace ${workspaceId}` };
  }
  if (membership.status !== MembershipStatus.ACTIVE) {
    return { isAuthorized: false, reason: `DENY: User membership in workspace ${workspaceId} is ${membership.status}` };
  }

  // Check Workspace Role Permission
  const hasPerm = hasPermission(membership.role, action);
  if (!hasPerm) {
    return {
      isAuthorized: false,
      reason: `DENY: Role '${membership.role}' lacks required permission '${action}' in workspace ${workspaceId}`
    };
  }

  // 4. Resource Scoping Check (Strict IDOR Prevention & Lifecycle Enforcement)
  if (resource) {
    if (resource.orgId && resource.orgId !== ws.orgId) {
      return {
        isAuthorized: false,
        reason: `DENY: Resource organization mismatch (resource ${resource.orgId} !== workspace org ${ws.orgId})`
      };
    }
    if (resource.workspaceId && resource.workspaceId !== workspaceId) {
      return {
        isAuthorized: false,
        reason: `DENY: Resource workspace mismatch (resource ${resource.workspaceId} !== context ${workspaceId})`
      };
    }

    // Resource Status Lifecycle Guard
    if (resource.status) {
      if (resource.status === 'ARCHIVED' && action !== 'portfolio.read' && action !== 'workspace.read' && action !== 'portfolio.status.manage') {
        return {
          isAuthorized: false,
          reason: `DENY: Resource is ARCHIVED and read-only. Action '${action}' is not permitted.`
        };
      }
      if (resource.status === 'CLOSED' && action !== 'portfolio.read' && action !== 'workspace.read' && action !== 'portfolio.status.manage') {
        return {
          isAuthorized: false,
          reason: `DENY: Resource is CLOSED and read-only. Action '${action}' is not permitted.`
        };
      }
      if (resource.status === 'PAUSED' && (action === 'portfolio.holdings.manage' || action === 'portfolio.optimize')) {
        return {
          isAuthorized: false,
          reason: `DENY: Resource is PAUSED. Consequential action '${action}' is restricted.`
        };
      }

      // Phase 37 Decision Lifecycle & Segregation of Duties (SoD) Guards
      if (resource.decisionId) {
        if (['CLOSED', 'SUPERSEDED', 'CANCELLED', 'REJECTED'].includes(resource.status) && action !== 'decision.read' && action !== 'decision.review') {
          return {
            isAuthorized: false,
            reason: `DENY: Decision is in terminal state '${resource.status}' and cannot be modified.`
          };
        }

        if (action === 'decision.approve') {
          if (resource.enforceSoD && resource.creatorId && resource.creatorId === userId) {
            return {
              isAuthorized: false,
              reason: `DENY: Segregation of Duties violation: Decision creator (${userId}) cannot approve their own decision.`
            };
          }
        }
      }
    }
  }

  return {
    isAuthorized: true,
    membership,
    role: membership.role
  };
}

/**
 * Privilege Escalation Guard for managing roles.
 * Ensures an actor cannot grant permissions or roles higher than their own authority.
 */
export function canAssignRole(actorRole, targetRole) {
  const roleHierarchy = {
    [Role.OWNER]: 100,
    [Role.ADMIN]: 80,
    [Role.ANALYST]: 50,
    [Role.AUDITOR]: 40,
    [Role.VIEWER]: 20
  };
  const actorScore = roleHierarchy[actorRole] || 0;
  const targetScore = roleHierarchy[targetRole] || 0;
  return actorScore >= targetScore && actorScore >= 80; // Only Owner or Admin can assign roles
}

/**
 * Validates that an API key is authorized for a specific action in a workspace.
 * @param {Object} apiKey
 * @param {string} workspaceId
 * @param {string} action
 * @returns {Object}
 */
export function authorizeApiKey({ apiKey, workspaceId, action }) {
  if (!apiKey || !workspaceId || !action) {
    return { isAuthorized: false, reason: 'DENY: Incomplete API key authorization parameters' };
  }
  if (apiKey.workspaceId !== workspaceId) {
    return { isAuthorized: false, reason: 'DENY: API key does not belong to target workspace' };
  }
  if (!apiKey.scopes.includes(action) && !apiKey.scopes.includes('*')) {
    return { isAuthorized: false, reason: `DENY: API key lacks required scope '${action}'` };
  }
  return { isAuthorized: true, apiKey };
}

