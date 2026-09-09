/**
 * @file organization.routes.js
 * Express Routes for Multi-Tenant Organization Management in Phase 35.
 */

import { Router } from 'express';
import { authRepository } from '../auth/auth.repository.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { Permission, OrganizationRole, OrganizationStatus, Role } from '../auth/auth.types.js';
import { auditRepository } from '../governance/audit.repository.js';

const router = Router();

// 1. GET /api/organizations - List user's authorized organizations
router.get('/', requireAuth, (req, res) => {
  try {
    const list = authRepository.listUserOrganizations(req.auth.user.userId);
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// 2. POST /api/organizations - Create new organization
router.post('/', requireAuth, (req, res) => {
  try {
    const { name, slug, settings } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Organization name is required', code: 'INVALID_INPUT' });
    }

    const org = authRepository.createOrganization({
      name: name.trim(),
      slug,
      ownerId: req.auth.user.userId,
      settings
    });

    auditRepository.appendEvent({
      orgId: org.orgId,
      actorId: req.auth.user.userId,
      actorType: 'USER',
      action: 'organization.create',
      resourceType: 'ORGANIZATION',
      resourceId: org.orgId,
      result: 'SUCCESS',
      metadata: { name: org.name, slug: org.slug }
    });

    res.status(201).json({ success: true, data: org });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' });
  }
});

// 3. GET /api/organizations/:orgId - Get organization details
router.get('/:orgId', requireAuth, requirePermission(Permission.ORG_READ), (req, res) => {
  try {
    const { orgId } = req.params;
    const org = authRepository.getOrganizationById(orgId);
    if (!org) {
      return res.status(404).json({ success: false, error: `Organization ${orgId} not found`, code: 'NOT_FOUND' });
    }
    res.json({ success: true, data: org });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// 4. PATCH /api/organizations/:orgId - Update organization metadata/settings
router.patch('/:orgId', requireAuth, requirePermission(Permission.ORG_UPDATE), (req, res) => {
  try {
    const { orgId } = req.params;
    const { name, slug, status, settings } = req.body || {};

    const updated = authRepository.updateOrganization(orgId, { name, slug, status, settings });

    auditRepository.appendEvent({
      orgId,
      actorId: req.auth.user.userId,
      actorType: 'USER',
      action: 'organization.update',
      resourceType: 'ORGANIZATION',
      resourceId: orgId,
      result: 'SUCCESS',
      metadata: { name, slug, status }
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' });
  }
});

// 5. GET /api/organizations/:orgId/members - List organization members
router.get('/:orgId/members', requireAuth, requirePermission(Permission.ORG_MEMBERS_READ), (req, res) => {
  try {
    const { orgId } = req.params;
    const members = authRepository.listOrganizationMembers(orgId);
    res.json({ success: true, data: members });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// 6. POST /api/organizations/:orgId/members - Add/invite organization member
router.post('/:orgId/members', requireAuth, requirePermission(Permission.ORG_MEMBERS_MANAGE), (req, res) => {
  try {
    const { orgId } = req.params;
    const { email, userId, role = OrganizationRole.MEMBER } = req.body || {};

    let targetUserId = userId;
    if (!targetUserId && email) {
      const u = authRepository.getUserWithCredentialsByEmail(email);
      if (!u) {
        return res.status(404).json({ success: false, error: `User with email ${email} not found`, code: 'USER_NOT_FOUND' });
      }
      targetUserId = u.userId;
    }

    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'Target userId or email is required', code: 'INVALID_INPUT' });
    }

    const membership = authRepository.addOrganizationMember({
      orgId,
      userId: targetUserId,
      role,
      inviterId: req.auth.user.userId
    });

    auditRepository.appendEvent({
      orgId,
      actorId: req.auth.user.userId,
      actorType: 'USER',
      action: 'organization.member_add',
      resourceType: 'MEMBERSHIP',
      resourceId: membership.membershipId,
      result: 'SUCCESS',
      metadata: { targetUserId, role }
    });

    res.status(201).json({ success: true, data: membership });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message, code: 'MEMBERSHIP_ERROR' });
  }
});

// 7. PATCH /api/organizations/:orgId/members/:userId - Update organization member role
router.patch('/:orgId/members/:userId', requireAuth, requirePermission(Permission.ORG_MEMBERS_MANAGE), (req, res) => {
  try {
    const { orgId, userId } = req.params;
    const { role } = req.body || {};

    if (!role || !Object.values(OrganizationRole).includes(role)) {
      return res.status(400).json({ success: false, error: 'Valid OrganizationRole is required', code: 'INVALID_ROLE' });
    }

    const updated = authRepository.updateOrganizationMemberRole({ orgId, userId, role });

    auditRepository.appendEvent({
      orgId,
      actorId: req.auth.user.userId,
      actorType: 'USER',
      action: 'organization.member_role_update',
      resourceType: 'MEMBERSHIP',
      resourceId: updated.membershipId,
      result: 'SUCCESS',
      metadata: { targetUserId: userId, newRole: role }
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message, code: 'MEMBERSHIP_ERROR' });
  }
});

// 8. DELETE /api/organizations/:orgId/members/:userId - Remove/deactivate organization member
router.delete('/:orgId/members/:userId', requireAuth, requirePermission(Permission.ORG_MEMBERS_MANAGE), (req, res) => {
  try {
    const { orgId, userId } = req.params;

    // Prevent removing organization owner
    const org = authRepository.getOrganizationById(orgId);
    if (org && org.ownerId === userId) {
      return res.status(400).json({ success: false, error: 'Cannot remove organization primary owner', code: 'CANNOT_REMOVE_OWNER' });
    }

    const ok = authRepository.removeOrganizationMember({ orgId, userId });
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Membership not found', code: 'NOT_FOUND' });
    }

    auditRepository.appendEvent({
      orgId,
      actorId: req.auth.user.userId,
      actorType: 'USER',
      action: 'organization.member_remove',
      resourceType: 'MEMBERSHIP',
      resourceId: `MBR-${orgId}-${userId}`,
      result: 'SUCCESS',
      metadata: { targetUserId: userId }
    });

    res.json({ success: true, message: `Member ${userId} deactivated from organization ${orgId}` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message, code: 'MEMBERSHIP_ERROR' });
  }
});

// 9. GET /api/organizations/:orgId/workspaces - List workspaces belonging to organization
router.get('/:orgId/workspaces', requireAuth, requirePermission(Permission.ORG_READ), (req, res) => {
  try {
    const { orgId } = req.params;
    const workspaces = authRepository.listOrganizationWorkspaces(orgId);
    res.json({ success: true, data: workspaces });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// 10. POST /api/organizations/:orgId/workspaces - Create workspace inside organization
router.post('/:orgId/workspaces', requireAuth, requirePermission(Permission.ORG_WORKSPACES_MANAGE), (req, res) => {
  try {
    const { orgId } = req.params;
    const { name, description, settings } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Workspace name is required', code: 'INVALID_INPUT' });
    }

    const ws = authRepository.createWorkspace({
      orgId,
      name: name.trim(),
      description,
      ownerId: req.auth.user.userId,
      settings
    });

    auditRepository.appendEvent({
      orgId,
      workspaceId: ws.workspaceId,
      actorId: req.auth.user.userId,
      actorType: 'USER',
      action: 'workspace.create',
      resourceType: 'WORKSPACE',
      resourceId: ws.workspaceId,
      result: 'SUCCESS',
      metadata: { name: ws.name, orgId }
    });

    res.status(201).json({ success: true, data: ws });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' });
  }
});

export default router;
