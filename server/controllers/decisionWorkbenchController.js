/**
 * @file decisionWorkbenchController.js
 * Express Controller for Phase 37 Investment Decision Workbench.
 */

import { decisionWorkbenchRepository } from '../decision/decisionWorkbench.repository.js';
import { DecisionWorkbenchEngine } from '../decision/decisionWorkbench.engine.js';
import { auditRepository } from '../governance/audit.repository.js';
import { authorize } from '../auth/authorization.engine.js';
import { Permission } from '../auth/auth.types.js';
import { WorkbenchDecisionStatus } from '../decision/decisionWorkbench.types.js';

export const decisionWorkbenchController = {
  /**
   * GET /api/decisions
   */
  listDecisions: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.DECISION_READ
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({ error: 'Forbidden', message: authResult.reason });
      }

      const { status, ticker, portfolioId, query } = req.query;
      const decisions = decisionWorkbenchRepository.listDecisions({
        workspaceId,
        orgId,
        status: status || null,
        ticker: ticker || null,
        portfolioId: portfolioId || null,
        query: query || null
      });

      return res.status(200).json({
        success: true,
        count: decisions.length,
        workspaceId,
        orgId,
        data: decisions
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/decisions/:decisionId
   */
  getDecision: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { decisionId } = req.params;

      const decision = decisionWorkbenchRepository.getDecisionById(decisionId);
      if (!decision) {
        return res.status(404).json({ error: 'Decision not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.DECISION_READ,
        resource: decision
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({ error: 'Forbidden', message: authResult.reason });
      }

      return res.status(200).json({
        success: true,
        decision
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/decisions
   */
  createDecision: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.body.orgId || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.body.workspaceId || req.auth.workspaceId;

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.DECISION_CREATE
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({ error: 'Forbidden', message: authResult.reason });
      }

      const decision = decisionWorkbenchRepository.createDecision({
        ...req.body,
        orgId,
        workspaceId,
        creatorId: req.auth.user.userId
      });

      auditRepository.appendEvent({
        action: 'decision.create',
        actorId: req.auth.user.userId,
        actorType: 'USER',
        workspaceId,
        resourceType: 'DECISION',
        resourceId: decision.decisionId,
        result: 'SUCCESS',
        metadata: { ticker: decision.ticker, title: decision.title, portfolioId: decision.portfolioId, orgId }
      });

      return res.status(201).json({
        success: true,
        decision
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * PUT /api/decisions/:decisionId
   */
  updateDecision: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { decisionId } = req.params;

      const decision = decisionWorkbenchRepository.getDecisionById(decisionId);
      if (!decision) {
        return res.status(404).json({ error: 'Decision not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.DECISION_UPDATE,
        resource: decision
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({ error: 'Forbidden', message: authResult.reason });
      }

      const updated = decisionWorkbenchRepository.updateDecision(decisionId, req.body, workspaceId, orgId, req.auth.user.userId);

      auditRepository.appendEvent({
        action: 'decision.update',
        actorId: req.auth.user.userId,
        actorType: 'USER',
        workspaceId,
        resourceType: 'DECISION',
        resourceId: decisionId,
        result: 'SUCCESS',
        metadata: { version: updated.currentVersion, updates: Object.keys(req.body), orgId }
      });

      return res.status(200).json({
        success: true,
        decision: updated
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/decisions/:decisionId/status
   */
  updateStatus: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { decisionId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Target status is required' });
      }

      const decision = decisionWorkbenchRepository.getDecisionById(decisionId);
      if (!decision) {
        return res.status(404).json({ error: 'Decision not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.DECISION_UPDATE,
        resource: decision
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({ error: 'Forbidden', message: authResult.reason });
      }

      const updated = decisionWorkbenchRepository.updateStatus(decisionId, status, workspaceId, orgId, req.auth.user.userId);

      auditRepository.appendEvent({
        action: 'decision.status_change',
        actorId: req.auth.user.userId,
        actorType: 'USER',
        workspaceId,
        resourceType: 'DECISION',
        resourceId: decisionId,
        result: 'SUCCESS',
        metadata: { oldStatus: decision.status, newStatus: status, orgId }
      });

      return res.status(200).json({
        success: true,
        decision: updated
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/decisions/:decisionId/review
   */
  submitReview: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { decisionId } = req.params;

      const decision = decisionWorkbenchRepository.getDecisionById(decisionId);
      if (!decision) {
        return res.status(404).json({ error: 'Decision not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.DECISION_REVIEW,
        resource: decision
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({ error: 'Forbidden', message: authResult.reason });
      }

      const review = decisionWorkbenchRepository.submitReview(decisionId, {
        ...req.body,
        reviewerId: req.auth.user.userId
      }, workspaceId, orgId);

      auditRepository.appendEvent({
        action: review.isChallenge ? 'decision.challenge' : 'decision.review',
        actorId: req.auth.user.userId,
        actorType: 'USER',
        workspaceId,
        resourceType: 'DECISION',
        resourceId: decisionId,
        result: 'SUCCESS',
        metadata: { reviewId: review.reviewId, isChallenge: review.isChallenge, orgId }
      });

      return res.status(201).json({
        success: true,
        review
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/decisions/:decisionId/approve
   */
  approveDecision: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { decisionId } = req.params;

      const decision = decisionWorkbenchRepository.getDecisionById(decisionId);
      if (!decision) {
        return res.status(404).json({ error: 'Decision not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.DECISION_APPROVE,
        resource: decision
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({ error: 'Forbidden', message: authResult.reason });
      }

      const approval = decisionWorkbenchRepository.recordApproval(decisionId, {
        approverId: req.auth.user.userId,
        approverRole: authResult.role || 'ADMIN',
        conditions: req.body.conditions || []
      }, workspaceId, orgId);

      auditRepository.appendEvent({
        action: 'decision.approve',
        actorId: req.auth.user.userId,
        actorType: 'USER',
        workspaceId,
        resourceType: 'DECISION',
        resourceId: decisionId,
        result: approval.isStale ? 'WARNING_STALE' : 'SUCCESS',
        metadata: { approvalId: approval.approvalId, isStale: approval.isStale, orgId }
      });

      return res.status(200).json({
        success: true,
        approval,
        isStale: approval.isStale
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/decisions/:decisionId/reject
   */
  rejectDecision: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { decisionId } = req.params;

      const decision = decisionWorkbenchRepository.getDecisionById(decisionId);
      if (!decision) {
        return res.status(404).json({ error: 'Decision not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.DECISION_REJECT,
        resource: decision
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({ error: 'Forbidden', message: authResult.reason });
      }

      const updated = decisionWorkbenchRepository.updateStatus(decisionId, WorkbenchDecisionStatus.REJECTED, workspaceId, orgId, req.auth.user.userId);

      auditRepository.appendEvent({
        action: 'decision.reject',
        actorId: req.auth.user.userId,
        actorType: 'USER',
        workspaceId,
        resourceType: 'DECISION',
        resourceId: decisionId,
        result: 'SUCCESS',
        metadata: { reason: req.body.reason || 'No reason specified', orgId }
      });

      return res.status(200).json({
        success: true,
        decision: updated
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/decisions/:decisionId/implement
   */
  implementDecision: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { decisionId } = req.params;

      const decision = decisionWorkbenchRepository.getDecisionById(decisionId);
      if (!decision) {
        return res.status(404).json({ error: 'Decision not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.DECISION_IMPLEMENT,
        resource: decision
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({ error: 'Forbidden', message: authResult.reason });
      }

      const updated = decisionWorkbenchRepository.recordImplementation(decisionId, {
        actorId: req.auth.user.userId,
        executionNotes: req.body.executionNotes || ''
      }, workspaceId, orgId);

      auditRepository.appendEvent({
        action: 'decision.implement',
        actorId: req.auth.user.userId,
        actorType: 'USER',
        workspaceId,
        resourceType: 'DECISION',
        resourceId: decisionId,
        result: 'SUCCESS',
        metadata: { orgId }
      });

      return res.status(200).json({
        success: true,
        decision: updated
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/decisions/:decisionId/impact
   */
  getDecisionImpact: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { decisionId } = req.params;

      const decision = decisionWorkbenchRepository.getDecisionById(decisionId);
      if (!decision) {
        return res.status(404).json({ error: 'Decision not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.DECISION_READ,
        resource: decision
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({ error: 'Forbidden', message: authResult.reason });
      }

      const impact = DecisionWorkbenchEngine.evaluateDecisionImpact(decisionId, workspaceId, orgId);

      return res.status(200).json({
        success: true,
        data: impact
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/decisions/:decisionId/snapshots
   */
  createSnapshot: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { decisionId } = req.params;

      const decision = decisionWorkbenchRepository.getDecisionById(decisionId);
      if (!decision) {
        return res.status(404).json({ error: 'Decision not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.DECISION_UPDATE,
        resource: decision
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({ error: 'Forbidden', message: authResult.reason });
      }

      const snapshot = decisionWorkbenchRepository.saveSnapshot(decisionId, req.body, workspaceId, orgId);

      auditRepository.appendEvent({
        action: 'decision.snapshot_create',
        actorId: req.auth.user.userId,
        actorType: 'USER',
        workspaceId,
        resourceType: 'DECISION',
        resourceId: decisionId,
        result: 'SUCCESS',
        metadata: { snapshotId: snapshot.snapshotId, integrityHash: snapshot.integrityHash, orgId }
      });

      return res.status(201).json({
        success: true,
        snapshot
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/decisions/:decisionId/snapshots
   */
  listSnapshots: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { decisionId } = req.params;

      const snapshots = decisionWorkbenchRepository.listSnapshots(decisionId, workspaceId, orgId);
      return res.status(200).json({
        success: true,
        count: snapshots.length,
        snapshots
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
};

export default decisionWorkbenchController;
