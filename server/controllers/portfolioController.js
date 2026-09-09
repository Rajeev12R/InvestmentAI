/**
 * @file portfolioController.js
 * Express Controller for Phase 36 Institutional Portfolio Operating System.
 */

import { portfolioRepository } from '../portfolio/portfolio.repository.js';
import { PortfolioOperatingEngine } from '../portfolio/portfolioOperating.engine.js';
import { auditRepository } from '../governance/audit.repository.js';
import { authorize } from '../auth/authorization.engine.js';
import { Permission } from '../auth/auth.types.js';
import { PortfolioStatus } from '../portfolio/portfolio.types.js';

export const portfolioController = {
  /**
   * GET /api/portfolios
   * List portfolios scoped to the active organization and workspace.
   */
  listPortfolios: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.PORTFOLIO_READ
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden',
          message: authResult.reason,
          code: 'FORBIDDEN_PERMISSION'
        });
      }

      const { status, strategy, query } = req.query;
      const portfolios = portfolioRepository.listPortfolios({
        workspaceId,
        orgId,
        status: status || null,
        strategy: strategy || null,
        query: query || null
      });

      return res.status(200).json({
        success: true,
        count: portfolios.length,
        workspaceId,
        orgId,
        data: portfolios
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/portfolios/:portfolioId
   */
  getPortfolio: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { portfolioId } = req.params;

      const portfolio = portfolioRepository.getPortfolioById(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.PORTFOLIO_READ,
        resource: portfolio
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden',
          message: authResult.reason,
          code: 'FORBIDDEN_PERMISSION'
        });
      }

      return res.status(200).json({
        success: true,
        portfolio
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/portfolios
   */
  createPortfolio: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.body.orgId || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.body.workspaceId || req.auth.workspaceId;

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.PORTFOLIO_CREATE
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden',
          message: authResult.reason,
          code: 'FORBIDDEN_PERMISSION'
        });
      }

      const portfolio = portfolioRepository.createPortfolio({
        ...req.body,
        orgId,
        workspaceId,
        ownerId: req.auth.user.userId
      });

      auditRepository.appendEvent({
        action: 'portfolio.create',
        actorId: req.auth.user.userId,
        actorType: 'USER',
        workspaceId,
        resourceType: 'PORTFOLIO',
        resourceId: portfolio.portfolioId,
        result: 'SUCCESS',
        metadata: { name: portfolio.name, strategy: portfolio.strategy, aum: portfolio.aum, orgId }
      });

      return res.status(201).json({
        success: true,
        portfolio
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * PUT /api/portfolios/:portfolioId
   */
  updatePortfolio: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { portfolioId } = req.params;

      const portfolio = portfolioRepository.getPortfolioById(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.PORTFOLIO_UPDATE,
        resource: portfolio
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden',
          message: authResult.reason,
          code: 'FORBIDDEN_PERMISSION'
        });
      }

      const updated = portfolioRepository.updatePortfolio(portfolioId, req.body, workspaceId, orgId);

      auditRepository.appendEvent({
        action: 'portfolio.update',
        actorId: req.auth.user.userId,
        actorType: 'USER',
        workspaceId,
        resourceType: 'PORTFOLIO',
        resourceId: portfolioId,
        result: 'SUCCESS',
        metadata: { updates: Object.keys(req.body), orgId }
      });

      return res.status(200).json({
        success: true,
        portfolio: updated
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/portfolios/:portfolioId/status
   */
  updateStatus: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { portfolioId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Target status is required' });
      }

      const portfolio = portfolioRepository.getPortfolioById(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.PORTFOLIO_STATUS_MANAGE,
        resource: portfolio
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden',
          message: authResult.reason,
          code: 'FORBIDDEN_PERMISSION'
        });
      }

      const updated = portfolioRepository.updateStatus(portfolioId, status, workspaceId, orgId);

      auditRepository.appendEvent({
        action: 'portfolio.status_change',
        actorId: req.auth.user.userId,
        actorType: 'USER',
        workspaceId,
        resourceType: 'PORTFOLIO',
        resourceId: portfolioId,
        result: 'SUCCESS',
        metadata: { oldStatus: portfolio.status, newStatus: status, orgId }
      });

      return res.status(200).json({
        success: true,
        portfolio: updated
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/portfolios/:portfolioId/holdings
   */
  getHoldings: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { portfolioId } = req.params;

      const portfolio = portfolioRepository.getPortfolioById(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.PORTFOLIO_READ,
        resource: portfolio
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden',
          message: authResult.reason,
          code: 'FORBIDDEN_PERMISSION'
        });
      }

      return res.status(200).json({
        success: true,
        portfolioId,
        aum: portfolio.aum,
        cashBalance: portfolio.cashBalance,
        holdingsCount: portfolio.holdings.length,
        asOf: portfolio.asOf,
        holdings: portfolio.holdings
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * PUT /api/portfolios/:portfolioId/holdings
   */
  updateHoldings: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { portfolioId } = req.params;
      const { holdings, cashBalance } = req.body;

      if (!Array.isArray(holdings)) {
        return res.status(400).json({ error: 'Holdings must be an array' });
      }

      const portfolio = portfolioRepository.getPortfolioById(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.PORTFOLIO_HOLDINGS_MANAGE,
        resource: portfolio
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden',
          message: authResult.reason,
          code: 'FORBIDDEN_PERMISSION'
        });
      }

      const updated = portfolioRepository.updateHoldings(portfolioId, holdings, cashBalance, workspaceId, orgId);

      auditRepository.appendEvent({
        action: 'portfolio.holdings_update',
        actorId: req.auth.user.userId,
        actorType: 'USER',
        workspaceId,
        resourceType: 'PORTFOLIO',
        resourceId: portfolioId,
        result: 'SUCCESS',
        metadata: { count: holdings.length, newAum: updated.aum, orgId }
      });

      return res.status(200).json({
        success: true,
        portfolio: updated
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/portfolios/:portfolioId/summary
   */
  getPortfolioSummary: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { portfolioId } = req.params;

      const portfolio = portfolioRepository.getPortfolioById(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.PORTFOLIO_READ,
        resource: portfolio
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden',
          message: authResult.reason,
          code: 'FORBIDDEN_PERMISSION'
        });
      }

      const summary = PortfolioOperatingEngine.getOperatingSummary(portfolioId, workspaceId, orgId);
      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/portfolios/:portfolioId/analytics
   */
  getPortfolioAnalytics: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { portfolioId } = req.params;

      const portfolio = portfolioRepository.getPortfolioById(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.PORTFOLIO_READ,
        resource: portfolio
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden',
          message: authResult.reason,
          code: 'FORBIDDEN_PERMISSION'
        });
      }

      const exposure = PortfolioOperatingEngine.evaluateExposure(portfolio);
      const risk = PortfolioOperatingEngine.evaluateRisk(portfolio);
      const compliance = PortfolioOperatingEngine.evaluateCompliance(portfolio);

      return res.status(200).json({
        success: true,
        portfolioId,
        exposure,
        risk,
        compliance
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/portfolios/:portfolioId/snapshots
   */
  createSnapshot: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { portfolioId } = req.params;

      const portfolio = portfolioRepository.getPortfolioById(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.PORTFOLIO_SNAPSHOT_CREATE,
        resource: portfolio
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden',
          message: authResult.reason,
          code: 'FORBIDDEN_PERMISSION'
        });
      }

      const snapshot = portfolioRepository.saveSnapshot(portfolioId, req.body, workspaceId, orgId);

      auditRepository.appendEvent({
        action: 'portfolio.snapshot_create',
        actorId: req.auth.user.userId,
        actorType: 'USER',
        workspaceId,
        resourceType: 'PORTFOLIO',
        resourceId: portfolioId,
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
   * GET /api/portfolios/:portfolioId/snapshots
   */
  listSnapshots: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { portfolioId } = req.params;

      const portfolio = portfolioRepository.getPortfolioById(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.PORTFOLIO_READ,
        resource: portfolio
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden',
          message: authResult.reason,
          code: 'FORBIDDEN_PERMISSION'
        });
      }

      const snapshots = portfolioRepository.listSnapshots(portfolioId, workspaceId, orgId);
      return res.status(200).json({
        success: true,
        count: snapshots.length,
        snapshots
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/portfolios/:portfolioId/snapshots/:snapshotId
   */
  getSnapshot: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { portfolioId, snapshotId } = req.params;

      const snapshot = portfolioRepository.getSnapshotById(portfolioId, snapshotId, workspaceId, orgId);
      if (!snapshot) {
        return res.status(404).json({ error: 'Snapshot not found', code: 'NOT_FOUND' });
      }

      return res.status(200).json({
        success: true,
        snapshot
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/portfolios/:portfolioId/optimize
   * Generates a Phase 33 analytical optimization proposal without mutating holdings.
   */
  proposeOptimization: async (req, res) => {
    try {
      const orgId = req.headers['x-org-id'] || req.headers['x-organization-id'] || req.auth.orgId;
      const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId;
      const { portfolioId } = req.params;

      const portfolio = portfolioRepository.getPortfolioById(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found', code: 'NOT_FOUND' });
      }

      const authResult = authorize({
        user: req.auth.user,
        orgId,
        workspaceId,
        action: Permission.PORTFOLIO_OPTIMIZE,
        resource: portfolio
      });

      if (!authResult.isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden',
          message: authResult.reason,
          code: 'FORBIDDEN_PERMISSION'
        });
      }

      const proposal = PortfolioOperatingEngine.proposeOptimization({
        portfolioId,
        workspaceId,
        orgId,
        targetObjective: req.body.objective || 'MAX_SHARPE',
        customConstraints: req.body.constraints || {}
      });

      auditRepository.appendEvent({
        action: 'portfolio.optimization_proposal',
        actorId: req.auth.user.userId,
        actorType: 'USER',
        workspaceId,
        resourceType: 'PORTFOLIO',
        resourceId: portfolioId,
        result: 'SUCCESS',
        metadata: { proposalId: proposal.proposalId, objective: proposal.objective, orgId }
      });

      return res.status(200).json({
        success: true,
        proposal
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
};

export default portfolioController;
