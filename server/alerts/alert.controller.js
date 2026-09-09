/**
 * @file alert.controller.js
 * REST Controller for Phase 39 Institutional Alerts & Attention Center.
 */

import { alertRepository } from './alert.repository.js';
import { AlertEngine } from './alert.engine.js';
import { authorize } from '../auth/authorization.engine.js';
import { Permission } from '../auth/auth.types.js';

export const alertController = {
  /**
   * GET /api/alerts
   */
  async listAlerts(req, res) {
    try {
      const orgId = req.headers['x-org-id'] || req.user?.orgId || req.auth?.orgId || 'ORG-ROOT-001';
      const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId || req.user?.workspaceId || req.auth?.workspaceId || 'WS-DEFAULT-001';
      const userId = req.user?.userId || req.auth?.user?.userId || 'USR-ROOT-001';

      const authResult = authorize({
        user: req.user || req.auth?.user,
        orgId,
        workspaceId,
        action: Permission.ALERTS_READ
      });
      if (!authResult.isAuthorized) {
        return res.status(403).json({ success: false, error: 'Forbidden', message: authResult.reason });
      }

      const {
        severity,
        status,
        portfolioId,
        securityId,
        query,
        scope,
        page = 1,
        limit = 50,
        sort = 'severity'
      } = req.query;

      const result = alertRepository.listAlerts({
        orgId,
        workspaceId,
        severity,
        status,
        portfolioId,
        securityId,
        assignedTo: userId,
        query,
        scope,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      console.error('[AlertController] listAlerts error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/alerts/counts
   */
  async getCounts(req, res) {
    try {
      const orgId = req.headers['x-org-id'] || req.user?.orgId || req.auth?.orgId || 'ORG-ROOT-001';
      const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId || req.user?.workspaceId || req.auth?.workspaceId || 'WS-DEFAULT-001';
      const userId = req.user?.userId || req.auth?.user?.userId || 'USR-ROOT-001';

      const authResult = authorize({
        user: req.user || req.auth?.user,
        orgId,
        workspaceId,
        action: Permission.ALERTS_READ
      });
      if (!authResult.isAuthorized) {
        return res.status(403).json({ success: false, error: 'Forbidden', message: authResult.reason });
      }

      const counts = alertRepository.countAlerts({ orgId, workspaceId, userId });
      return res.status(200).json({ success: true, data: counts });
    } catch (err) {
      console.error('[AlertController] getCounts error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/alerts/:alertId
   */
  async getAlertById(req, res) {
    try {
      const orgId = req.headers['x-org-id'] || req.user?.orgId || req.auth?.orgId || 'ORG-ROOT-001';
      const workspaceId = req.headers['x-workspace-id'] || req.user?.workspaceId || req.auth?.workspaceId || 'WS-DEFAULT-001';
      const { alertId } = req.params;

      const authResult = authorize({
        user: req.user || req.auth?.user,
        orgId,
        workspaceId,
        action: Permission.ALERTS_READ
      });
      if (!authResult.isAuthorized) {
        return res.status(403).json({ success: false, error: 'Forbidden', message: authResult.reason });
      }

      const alert = alertRepository.getAlertById(alertId, workspaceId, orgId);
      if (!alert) {
        return res.status(404).json({ success: false, error: 'Alert not found' });
      }

      const history = alertRepository.getAlertHistory(alertId);

      return res.status(200).json({
        success: true,
        data: {
          ...alert,
          history
        }
      });
    } catch (err) {
      console.error('[AlertController] getAlertById error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/alerts/:alertId/acknowledge
   */
  async acknowledge(req, res) {
    try {
      const orgId = req.headers['x-org-id'] || req.user?.orgId || req.auth?.orgId || 'ORG-ROOT-001';
      const workspaceId = req.headers['x-workspace-id'] || req.user?.workspaceId || req.auth?.workspaceId || 'WS-DEFAULT-001';
      const actorId = req.user?.userId || req.auth?.user?.userId || 'USR-ROOT-001';
      const { alertId } = req.params;
      const { comment, expectedVersion } = req.body || {};

      const authResult = authorize({
        user: req.user || req.auth?.user,
        orgId,
        workspaceId,
        action: Permission.ALERTS_ACKNOWLEDGE
      });
      if (!authResult.isAuthorized) {
        return res.status(403).json({ success: false, error: 'Forbidden', message: authResult.reason });
      }

      const updated = alertRepository.acknowledgeAlert(alertId, {
        actorId,
        comment,
        expectedVersion,
        workspaceId,
        orgId
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      const isConflict = err.message?.includes('Concurrency Conflict');
      const isIllegal = err.message?.includes('Illegal Transition');
      const isIdor = err.message?.includes('IDOR');
      const status = isIdor ? 403 : (isConflict ? 409 : (isIllegal ? 400 : 500));
      return res.status(status).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/alerts/:alertId/snooze
   */
  async snooze(req, res) {
    try {
      const orgId = req.headers['x-org-id'] || req.user?.orgId || req.auth?.orgId || 'ORG-ROOT-001';
      const workspaceId = req.headers['x-workspace-id'] || req.user?.workspaceId || req.auth?.workspaceId || 'WS-DEFAULT-001';
      const actorId = req.user?.userId || req.auth?.user?.userId || 'USR-ROOT-001';
      const { alertId } = req.params;
      const { snoozeUntil, reason, expectedVersion } = req.body || {};

      const authResult = authorize({
        user: req.user || req.auth?.user,
        orgId,
        workspaceId,
        action: Permission.ALERTS_SNOOZE
      });
      if (!authResult.isAuthorized) {
        return res.status(403).json({ success: false, error: 'Forbidden', message: authResult.reason });
      }

      const updated = alertRepository.snoozeAlert(alertId, {
        actorId,
        snoozeUntil,
        reason,
        expectedVersion,
        workspaceId,
        orgId
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      const isConflict = err.message?.includes('Concurrency Conflict');
      const isIllegal = err.message?.includes('Illegal Transition');
      const isIdor = err.message?.includes('IDOR');
      const status = isIdor ? 403 : (isConflict ? 409 : (isIllegal ? 400 : 500));
      return res.status(status).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/alerts/:alertId/resolve
   */
  async resolve(req, res) {
    try {
      const orgId = req.headers['x-org-id'] || req.user?.orgId || req.auth?.orgId || 'ORG-ROOT-001';
      const workspaceId = req.headers['x-workspace-id'] || req.user?.workspaceId || req.auth?.workspaceId || 'WS-DEFAULT-001';
      const actorId = req.user?.userId || req.auth?.user?.userId || 'USR-ROOT-001';
      const { alertId } = req.params;
      const { resolutionReason, resolutionComment, relatedDecisionId, expectedVersion } = req.body || {};

      const authResult = authorize({
        user: req.user || req.auth?.user,
        orgId,
        workspaceId,
        action: Permission.ALERTS_RESOLVE
      });
      if (!authResult.isAuthorized) {
        return res.status(403).json({ success: false, error: 'Forbidden', message: authResult.reason });
      }

      const updated = alertRepository.resolveAlert(alertId, {
        actorId,
        resolutionReason,
        resolutionComment,
        relatedDecisionId,
        expectedVersion,
        workspaceId,
        orgId
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      const isConflict = err.message?.includes('Concurrency Conflict');
      const isIllegal = err.message?.includes('Illegal Transition');
      const isIdor = err.message?.includes('IDOR');
      const status = isIdor ? 403 : (isConflict ? 409 : (isIllegal ? 400 : 500));
      return res.status(status).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/alerts/:alertId/reopen
   */
  async reopen(req, res) {
    try {
      const orgId = req.headers['x-org-id'] || req.user?.orgId || req.auth?.orgId || 'ORG-ROOT-001';
      const workspaceId = req.headers['x-workspace-id'] || req.user?.workspaceId || req.auth?.workspaceId || 'WS-DEFAULT-001';
      const actorId = req.user?.userId || req.auth?.user?.userId || 'USR-ROOT-001';
      const { alertId } = req.params;
      const { reason, expectedVersion } = req.body || {};

      const authResult = authorize({
        user: req.user || req.auth?.user,
        orgId,
        workspaceId,
        action: Permission.ALERTS_RESOLVE
      });
      if (!authResult.isAuthorized) {
        return res.status(403).json({ success: false, error: 'Forbidden', message: authResult.reason });
      }

      const updated = alertRepository.reopenAlert(alertId, {
        actorId,
        reason,
        expectedVersion,
        workspaceId,
        orgId
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/alerts/:alertId/assign
   */
  async assign(req, res) {
    try {
      const orgId = req.headers['x-org-id'] || req.user?.orgId || req.auth?.orgId || 'ORG-ROOT-001';
      const workspaceId = req.headers['x-workspace-id'] || req.user?.workspaceId || req.auth?.workspaceId || 'WS-DEFAULT-001';
      const actorId = req.user?.userId || req.auth?.user?.userId || 'USR-ROOT-001';
      const { alertId } = req.params;
      const { assignedTo, ownerRole, expectedVersion } = req.body || {};

      const authResult = authorize({
        user: req.user || req.auth?.user,
        orgId,
        workspaceId,
        action: Permission.ALERTS_ACKNOWLEDGE
      });
      if (!authResult.isAuthorized) {
        return res.status(403).json({ success: false, error: 'Forbidden', message: authResult.reason });
      }

      const updated = alertRepository.assignAlert(alertId, {
        actorId,
        assignedTo,
        ownerRole,
        expectedVersion,
        workspaceId,
        orgId
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/alerts/:alertId/escalate
   */
  async escalate(req, res) {
    try {
      const orgId = req.headers['x-org-id'] || req.user?.orgId || req.auth?.orgId || 'ORG-ROOT-001';
      const workspaceId = req.headers['x-workspace-id'] || req.user?.workspaceId || req.auth?.workspaceId || 'WS-DEFAULT-001';
      const actorId = req.user?.userId || req.auth?.user?.userId || 'USR-ROOT-001';
      const { alertId } = req.params;
      const { escalationReason, escalatedToRole, expectedVersion } = req.body || {};

      const authResult = authorize({
        user: req.user || req.auth?.user,
        orgId,
        workspaceId,
        action: Permission.ALERTS_ACKNOWLEDGE
      });
      if (!authResult.isAuthorized) {
        return res.status(403).json({ success: false, error: 'Forbidden', message: authResult.reason });
      }

      const updated = alertRepository.escalateAlert(alertId, {
        actorId,
        escalationReason,
        escalatedToRole,
        expectedVersion,
        workspaceId,
        orgId
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/alerts/preferences
   */
  async getPreferences(req, res) {
    try {
      const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId || req.user?.workspaceId || req.auth?.workspaceId || 'WS-DEFAULT-001';
      const userId = req.user?.userId || req.auth?.user?.userId || 'USR-ROOT-001';

      const prefs = alertRepository.getPreferences(workspaceId, userId);
      return res.status(200).json({ success: true, data: prefs });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * PUT /api/alerts/preferences
   */
  async updatePreferences(req, res) {
    try {
      const orgId = req.headers['x-org-id'] || req.user?.orgId || req.auth?.orgId || 'ORG-ROOT-001';
      const workspaceId = req.headers['x-workspace-id'] || req.user?.workspaceId || req.auth?.workspaceId || 'WS-DEFAULT-001';
      const userId = req.user?.userId || req.auth?.user?.userId || 'USR-ROOT-001';

      const authResult = authorize({
        user: req.user || req.auth?.user,
        orgId,
        workspaceId,
        action: Permission.ALERTS_CONFIGURE
      });
      if (!authResult.isAuthorized) {
        return res.status(403).json({ success: false, error: 'Forbidden', message: authResult.reason });
      }

      const updated = alertRepository.updatePreferences(workspaceId, userId, req.body || {});
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
};

export default alertController;
