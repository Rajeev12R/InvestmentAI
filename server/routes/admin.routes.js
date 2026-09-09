/**
 * @file admin.routes.js
 * Express Routes for Institutional Administration & Security Telemetry in Phase 35.
 */

import { Router } from 'express';
import { authRepository } from '../auth/auth.repository.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { Permission, Role, OrganizationRole } from '../auth/auth.types.js';
import { RolePermissions } from '../auth/rbac.engine.js';
import { auditRepository } from '../governance/audit.repository.js';

const router = Router();

// 1. GET /api/admin/overview - Administration cockpit summary
router.get('/overview', requireAuth, (req, res) => {
  try {
    const orgs = authRepository.listUserOrganizations(req.auth.user.userId);
    const workspaces = authRepository.listUserWorkspaces(req.auth.user.userId);
    const auditEvents = auditRepository.getEvents({ limit: 10 });

    res.json({
      success: true,
      data: {
        totalOrganizations: orgs.length,
        totalWorkspaces: workspaces.length,
        activeUser: req.auth.user,
        activeOrgId: req.auth.orgId,
        activeWorkspaceId: req.auth.workspaceId,
        recentAuditCount: auditEvents.length,
        systemHealth: 'OPERATIONAL'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// 2. GET /api/admin/roles - RBAC Role & Permission definitions
router.get('/roles', requireAuth, (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        workspaceRoles: Object.values(Role),
        organizationRoles: Object.values(OrganizationRole),
        permissions: Object.values(Permission),
        matrix: RolePermissions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// 3. GET /api/admin/security - Security audit events
router.get('/security', requireAuth, requirePermission(Permission.SECURITY_READ), (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const events = auditRepository.getEvents({ limit });
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

export default router;
