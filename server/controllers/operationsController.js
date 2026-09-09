/**
 * @file operationsController.js
 * Controller handling decision review queue and follow-up workflow items.
 */

import { operationsRepository } from '../operations/operations.repository.js';
import { processDecisionOperations } from '../operations/operations.engine.js';
import { createFollowUpItem } from '../operations/followUp.engine.js';
import { attentionRepository } from '../attention/attention.repository.js';

export const operationsController = {
  /**
   * GET /api/operations/reviews
   */
  getReviews(req, res) {
    try {
      const workspaceId = req.query.workspaceId || 'DEFAULT_WORKSPACE';
      const state = operationsRepository.getState(workspaceId);
      return res.json({
        status: 'SUCCESS',
        workspaceId,
        reviews: state.reviews
      });
    } catch (e) {
      console.error('[operationsController.getReviews] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  },

  /**
   * POST /api/operations/reviews/:id/status
   */
  updateReviewStatus(req, res) {
    try {
      const workspaceId = req.body.workspaceId || 'DEFAULT_WORKSPACE';
      const reviewId = req.params.id;
      const { status, note } = req.body;

      const updated = operationsRepository.updateReviewStatus(workspaceId, reviewId, status, note);
      return res.json({
        status: 'SUCCESS',
        review: updated
      });
    } catch (e) {
      console.error('[operationsController.updateReviewStatus] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  },

  /**
   * GET /api/operations/followups
   */
  getFollowUps(req, res) {
    try {
      const workspaceId = req.query.workspaceId || 'DEFAULT_WORKSPACE';
      const state = operationsRepository.getState(workspaceId);
      return res.json({
        status: 'SUCCESS',
        workspaceId,
        followUps: state.followUps
      });
    } catch (e) {
      console.error('[operationsController.getFollowUps] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  },

  /**
   * POST /api/operations/followups
   */
  createFollowUp(req, res) {
    try {
      const { workspaceId = 'DEFAULT_WORKSPACE', ticker, attentionId, question, assignedTo } = req.body || {};
      const item = createFollowUpItem({ ticker, attentionId, question, assignedTo });
      operationsRepository.saveFollowUp(workspaceId, item);
      return res.json({
        status: 'SUCCESS',
        followUp: item
      });
    } catch (e) {
      console.error('[operationsController.createFollowUp] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  },

  /**
   * POST /api/operations/followups/:id/status
   */
  updateFollowUpStatus(req, res) {
    try {
      const workspaceId = req.body.workspaceId || 'DEFAULT_WORKSPACE';
      const followUpId = req.params.id;
      const { status, findings } = req.body;

      const updated = operationsRepository.updateFollowUpStatus(workspaceId, followUpId, status, findings);
      return res.json({
        status: 'SUCCESS',
        followUp: updated
      });
    } catch (e) {
      console.error('[operationsController.updateFollowUpStatus] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  },

  /**
   * POST /api/operations/sync
   */
  syncOperations(req, res) {
    try {
      const workspaceId = req.body.workspaceId || 'DEFAULT_WORKSPACE';
      const pkg = attentionRepository.getLatestPackage(workspaceId);
      const items = pkg?.attentionItems || [];
      const reviews = processDecisionOperations({ workspaceId, attentionItems: items });

      return res.json({
        status: 'SUCCESS',
        reviews
      });
    } catch (e) {
      console.error('[operationsController.syncOperations] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  }
};
