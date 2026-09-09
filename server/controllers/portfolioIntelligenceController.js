/**
 * @file portfolioIntelligenceController.js
 * Controller handling portfolio intelligence, exposure metrics, drift, and daily states.
 */

import { buildPortfolioDailyState } from '../portfolioIntelligence/portfolioIntelligence.engine.js';
import { calculatePortfolioExposure } from '../portfolioIntelligence/exposure.engine.js';
import { calculatePortfolioStateChange } from '../portfolioIntelligence/portfolioChange.engine.js';

// In-memory cache of daily states per workspace
const workspaceStateStore = new Map();

export const portfolioIntelligenceController = {
  /**
   * POST /api/portfolio-intelligence/build-state
   */
  buildDailyState(req, res) {
    try {
      const {
        workspaceId = 'DEFAULT_WORKSPACE',
        totalValue = 0,
        holdings = [],
        correlationMatrix = null,
        tickers = []
      } = req.body || {};

      const prevState = workspaceStateStore.get(workspaceId) || null;
      const state = buildPortfolioDailyState({
        workspaceId,
        totalValue,
        holdings,
        correlationMatrix,
        tickers,
        previousState: prevState
      });

      workspaceStateStore.set(workspaceId, state);

      return res.json({
        status: 'SUCCESS',
        state
      });
    } catch (e) {
      console.error('[portfolioIntelligenceController.buildDailyState] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  },

  /**
   * GET /api/portfolio-intelligence/state
   */
  getState(req, res) {
    try {
      const workspaceId = req.query.workspaceId || 'DEFAULT_WORKSPACE';
      const state = workspaceStateStore.get(workspaceId) || null;
      return res.json({
        status: 'SUCCESS',
        workspaceId,
        state
      });
    } catch (e) {
      console.error('[portfolioIntelligenceController.getState] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  },

  /**
   * POST /api/portfolio-intelligence/exposure
   */
  getExposure(req, res) {
    try {
      const { holdings = [], correlationMatrix = null, tickers = [] } = req.body || {};
      const exposure = calculatePortfolioExposure(holdings, correlationMatrix, tickers);
      return res.json({
        status: 'SUCCESS',
        exposure
      });
    } catch (e) {
      console.error('[portfolioIntelligenceController.getExposure] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  },

  /**
   * POST /api/portfolio-intelligence/changes
   */
  getChanges(req, res) {
    try {
      const { stateT0, stateT1 } = req.body || {};
      const changes = calculatePortfolioStateChange(stateT0, stateT1);
      return res.json({
        status: 'SUCCESS',
        changes
      });
    } catch (e) {
      console.error('[portfolioIntelligenceController.getChanges] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  }
};
