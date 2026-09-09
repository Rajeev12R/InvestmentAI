/**
 * @file auth.middleware.js
 * Express Middleware for Multi-Tenant Authentication & Authorization in Phase 35.
 */

import { authService } from './auth.service.js';
import { apiKeyService } from './apiKey.service.js';
import { authorize, authorizeApiKey } from './authorization.engine.js';
import { authRepository } from './auth.repository.js';

/**
 * Extracts and attaches user session or API key to req.auth
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'];
  const orgHeader = req.headers['x-org-id'] || req.headers['x-organization-id'];
  const workspaceHeader = req.headers['x-workspace-id'] || 'default';

  req.auth = {
    isAuthenticated: false,
    user: null,
    session: null,
    apiKey: null,
    orgId: orgHeader || 'ORG-ROOT-001',
    workspaceId: workspaceHeader
  };

  // 1. Check API Key
  if (apiKeyHeader) {
    const key = apiKeyService.authenticateApiKey(apiKeyHeader);
    if (key) {
      req.auth.isAuthenticated = true;
      req.auth.apiKey = key;
      req.auth.workspaceId = key.workspaceId;
      const ws = authRepository.getWorkspaceById(key.workspaceId);
      if (ws) req.auth.orgId = ws.orgId;
      return next();
    }
  }

  // 2. Check Bearer Token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const validated = authService.validateSessionToken(token);
    if (validated) {
      req.auth.isAuthenticated = true;
      req.auth.user = validated.user;
      req.auth.session = validated.session;
      if (validated.session.orgId) {
        req.auth.orgId = orgHeader || validated.session.orgId;
      }
      if (validated.session.workspaceId) {
        req.auth.workspaceId = workspaceHeader || validated.session.workspaceId;
      }
      return next();
    }
  }

  next();
}

/**
 * Middleware requiring valid authentication (session or API key).
 */
export function requireAuth(req, res, next) {
  if (!req.auth || !req.auth.isAuthenticated) {
    return res.status(401).json({
      error: 'Unauthorized: Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  next();
}

/**
 * Middleware requiring specific granular permission in the target workspace or organization.
 * @param {string} permission
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.auth || !req.auth.isAuthenticated) {
      return res.status(401).json({
        error: 'Unauthorized: Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.params.orgId || req.body?.orgId || req.auth.orgId;
    const workspaceId = req.headers['x-workspace-id'] || req.params.workspaceId || req.body?.workspaceId || req.auth.workspaceId;

    // Check API Key scopes
    if (req.auth.apiKey) {
      const authz = authorizeApiKey({
        apiKey: req.auth.apiKey,
        workspaceId,
        action: permission
      });
      if (!authz.isAuthorized) {
        return res.status(403).json({
          error: `Forbidden: ${authz.reason}`,
          code: 'FORBIDDEN_SCOPE'
        });
      }
      return next();
    }

    // Check User Role permissions (Organization vs Workspace)
    const isOrgAction = permission.startsWith('org.');
    const authz = authorize({
      user: req.auth.user,
      orgId: isOrgAction ? orgId : undefined,
      workspaceId: !isOrgAction ? workspaceId : undefined,
      action: permission
    });

    if (!authz.isAuthorized) {
      return res.status(403).json({
        error: `Forbidden: ${authz.reason}`,
        code: 'FORBIDDEN_PERMISSION'
      });
    }

    req.auth.membership = authz.membership || authz.orgMembership;
    req.auth.role = authz.role;
    next();
  };
}

