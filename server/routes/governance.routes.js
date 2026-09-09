/**
 * @file governance.routes.js
 * Express Routes for Institutional Governance, Audit Logs & Compliance in Phase 9.
 */

import { Router } from 'express';
import { auditEngine } from '../governance/audit.engine.js';
import { complianceExportService } from '../governance/complianceExport.service.js';
import { retentionEngine } from '../governance/retention.engine.js';
import { authRepository } from '../auth/auth.repository.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { Permission, Role } from '../auth/auth.types.js';

const router = Router();

// 1. GET /api/governance/audit - List audit trail
router.get('/audit', requireAuth, requirePermission(Permission.AUDIT_READ), (req, res) => {
  const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId || 'default';
  const limit = parseInt(req.query.limit, 10) || 100;
  const action = req.query.action || null;
  const actorId = req.query.actorId || null;

  const events = auditEngine.listAuditEvents({ workspaceId, limit, action, actorId });
  const integrity = auditEngine.verifyIntegrity();

  res.json({
    workspaceId,
    totalReturned: events.length,
    integrity,
    events
  });
});

// 2. GET /api/governance/members - List workspace members
router.get('/members', requireAuth, requirePermission(Permission.WORKSPACE_MEMBERS_READ), (req, res) => {
  const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId || 'default';
  const members = authRepository.listWorkspaceMembers(workspaceId);
  res.json({ workspaceId, members });
});

// 3. POST /api/governance/members/invite - Invite new member
router.post('/members/invite', requireAuth, requirePermission(Permission.WORKSPACE_MEMBERS_INVITE), (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId || 'default';
    const { userId, role = Role.ANALYST } = req.body;
    const mem = authRepository.addWorkspaceMember({
      workspaceId,
      userId,
      role,
      inviterId: req.auth.user?.userId
    });
    res.status(201).json(mem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. PUT /api/governance/members/role - Update member role
router.put('/members/role', requireAuth, requirePermission(Permission.WORKSPACE_ROLES_UPDATE), (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId || 'default';
    const { userId, role } = req.body;
    const mem = authRepository.updateMemberRole({ workspaceId, userId, role });
    res.json(mem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. DELETE /api/governance/members/:userId - Remove member
router.delete('/members/:userId', requireAuth, requirePermission(Permission.WORKSPACE_MEMBERS_REMOVE), (req, res) => {
  const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId || 'default';
  const { userId } = req.params;
  const ok = authRepository.removeWorkspaceMember({ workspaceId, userId });
  if (ok) {
    res.json({ success: true, removedUserId: userId });
  } else {
    res.status(404).json({ error: 'Member not found' });
  }
});

// 6. POST /api/governance/export - Compliance Export
router.post('/export', requireAuth, requirePermission(Permission.EXPORT_READ), (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId || 'default';
    const { exportType = 'FULL_WORKSPACE' } = req.body;
    const result = complianceExportService.generateExport({
      workspaceId,
      exportType,
      actorId: req.auth.user?.userId || 'SYSTEM'
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 7. GET /api/governance/retention - Retention Policies
router.get('/retention', requireAuth, requirePermission(Permission.AUDIT_READ), (req, res) => {
  const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId || 'default';
  const policy = retentionEngine.getWorkspacePolicy(workspaceId);
  res.json({ workspaceId, policy });
});

// 8. PUT /api/governance/retention - Update Retention Policy
router.put('/retention', requireAuth, requirePermission(Permission.RETENTION_MANAGE), (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId || 'default';
    const { category, policyUpdate } = req.body;
    const updated = retentionEngine.updateWorkspacePolicy(
      workspaceId,
      category,
      policyUpdate,
      req.auth.user?.userId || 'SYSTEM'
    );
    res.json({ success: true, category, updatedPolicy: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
