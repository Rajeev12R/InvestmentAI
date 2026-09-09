/**
 * @file attentionController.js
 * Controller handling attention packages, filtering by ticker, and item queries.
 */

import { attentionRepository } from '../attention/attention.repository.js';
import { generateAttentionPackage } from '../attention/attention.engine.js';
import { buildAIAttentionContext } from '../attention/attentionAI.boundary.js';

export const attentionController = {
  /**
   * GET /api/attention
   * Query params: workspaceId
   */
  getLatestAttention(req, res) {
    try {
      const workspaceId = req.query.workspaceId || 'DEFAULT_WORKSPACE';
      const pkg = attentionRepository.getLatestPackage(workspaceId);
      if (!pkg) {
        return res.json({
          status: 'NO_ATTENTION_PACKAGE',
          workspaceId,
          package: null,
          prioritySummary: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFORMATIONAL: 0 },
          attentionItems: []
        });
      }
      return res.json({
        status: 'SUCCESS',
        workspaceId,
        package: pkg,
        prioritySummary: pkg.prioritySummary,
        attentionItems: pkg.attentionItems
      });
    } catch (e) {
      console.error('[attentionController.getLatestAttention] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  },

  /**
   * GET /api/attention/:ticker
   */
  getAttentionByTicker(req, res) {
    try {
      const workspaceId = req.query.workspaceId || 'DEFAULT_WORKSPACE';
      const ticker = req.params.ticker;
      const items = attentionRepository.getItemsByTicker(workspaceId, ticker);
      return res.json({
        status: 'SUCCESS',
        workspaceId,
        ticker,
        items
      });
    } catch (e) {
      console.error('[attentionController.getAttentionByTicker] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  },

  /**
   * GET /api/attention/item/:attentionId
   */
  getAttentionItemById(req, res) {
    try {
      const workspaceId = req.query.workspaceId || 'DEFAULT_WORKSPACE';
      const attentionId = req.params.attentionId;
      const item = attentionRepository.getItemById(workspaceId, attentionId);
      if (!item) {
        return res.status(404).json({ error: `Attention item not found: ${attentionId}` });
      }
      return res.json({
        status: 'SUCCESS',
        workspaceId,
        item
      });
    } catch (e) {
      console.error('[attentionController.getAttentionItemById] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  },

  /**
   * POST /api/attention/generate
   */
  generatePackage(req, res) {
    try {
      const { workspaceId = 'DEFAULT_WORKSPACE', companyTransitions = [], portfolioState = null } = req.body || {};
      const pkg = generateAttentionPackage({ workspaceId, companyTransitions, portfolioState });
      attentionRepository.savePackage(pkg);
      return res.json({
        status: 'SUCCESS',
        package: pkg
      });
    } catch (e) {
      console.error('[attentionController.generatePackage] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  },

  /**
   * GET /api/attention/ai-context
   */
  getAIContext(req, res) {
    try {
      const workspaceId = req.query.workspaceId || 'DEFAULT_WORKSPACE';
      const pkg = attentionRepository.getLatestPackage(workspaceId);
      if (!pkg) {
        return res.status(404).json({ error: 'No sealed attention package found' });
      }
      const aiContext = buildAIAttentionContext(pkg);
      return res.json({
        status: 'SUCCESS',
        aiContext
      });
    } catch (e) {
      console.error('[attentionController.getAIContext] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  }
};
