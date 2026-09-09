import { DashboardEngine } from '../dashboard/dashboard.engine.js';
import { auditRepository } from '../governance/audit.repository.js';

export const dashboardController = {
  /**
   * GET /api/dashboard/overview
   * Comprehensive workspace-scoped executive dashboard package.
   */
  async getOverview(req, res) {
    try {
      const workspaceId = req.query.workspaceId || req.user?.workspaceId || req.auth?.workspaceId || 'WS-DEFAULT-001';
      const orgId = req.user?.orgId || req.auth?.orgId || 'ORG-ROOT-001';
      const asOf = req.query.asOf || null;
      const roleView = req.query.roleView || 'PORTFOLIO_MANAGER';
      const actorId = req.user?.userId || req.auth?.user?.userId || 'USR-ROOT-001';

      const overview = await DashboardEngine.getDashboardOverview({
        orgId,
        workspaceId,
        asOf,
        roleView,
        actorId
      });

      // Audit read event
      if (auditRepository && typeof auditRepository.appendEvent === 'function') {
        auditRepository.appendEvent({
          action: 'dashboard.overview.read',
          actorId,
          actorType: 'USER',
          workspaceId,
          resourceType: 'DASHBOARD',
          resourceId: overview.cockpitId,
          result: 'SUCCESS',
          metadata: { asOf: overview.asOf, roleView, orgId }
        });
      }

      return res.status(200).json({
        success: true,
        data: overview
      });
    } catch (error) {
      console.error('[DashboardController] getOverview error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal error aggregating dashboard overview'
      });
    }
  },

  /**
   * GET /api/dashboard/portfolios
   * Portfolio universe summary and comparison list.
   */
  async getPortfolios(req, res) {
    try {
      const workspaceId = req.query.workspaceId || req.user?.workspaceId || 'WS-DEFAULT-001';
      const orgId = req.user?.orgId || 'ORG-ROOT-001';
      const asOf = req.query.asOf || null;

      const universe = DashboardEngine.getPortfolioUniverseSummary({
        orgId,
        workspaceId,
        asOf
      });

      return res.status(200).json({
        success: true,
        data: universe
      });
    } catch (error) {
      console.error('[DashboardController] getPortfolios error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal error retrieving portfolio universe summary'
      });
    }
  },

  /**
   * GET /api/dashboard/risk
   * Risk and Exposure aggregation summary.
   */
  async getRisk(req, res) {
    try {
      const workspaceId = req.query.workspaceId || req.user?.workspaceId || 'WS-DEFAULT-001';
      const orgId = req.user?.orgId || 'ORG-ROOT-001';
      const asOf = req.query.asOf || null;

      const riskExposure = DashboardEngine.getRiskAndExposureSummary({
        orgId,
        workspaceId,
        asOf
      });

      return res.status(200).json({
        success: true,
        data: riskExposure
      });
    } catch (error) {
      console.error('[DashboardController] getRisk error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal error retrieving risk and exposure summary'
      });
    }
  },

  /**
   * GET /api/dashboard/attention
   * Material attention feed items.
   */
  async getAttention(req, res) {
    try {
      const workspaceId = req.query.workspaceId || req.user?.workspaceId || 'WS-DEFAULT-001';
      const orgId = req.user?.orgId || 'ORG-ROOT-001';
      const asOf = req.query.asOf || null;

      const attention = DashboardEngine.getMaterialAttentionSummary({
        orgId,
        workspaceId,
        asOf
      });

      return res.status(200).json({
        success: true,
        data: attention
      });
    } catch (error) {
      console.error('[DashboardController] getAttention error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal error retrieving attention summary'
      });
    }
  },

  /**
   * GET /api/dashboard/decisions
   * Decision queue and backlog summary.
   */
  async getDecisions(req, res) {
    try {
      const workspaceId = req.query.workspaceId || req.user?.workspaceId || 'WS-DEFAULT-001';
      const orgId = req.user?.orgId || 'ORG-ROOT-001';
      const actorId = req.user?.userId || null;

      const decisions = DashboardEngine.getDecisionQueueSummary({
        orgId,
        workspaceId,
        actorId
      });

      return res.status(200).json({
        success: true,
        data: decisions
      });
    } catch (error) {
      console.error('[DashboardController] getDecisions error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal error retrieving decision queue summary'
      });
    }
  },

  /**
   * GET /api/dashboard/compliance
   * Governance and mandate compliance summary.
   */
  async getCompliance(req, res) {
    try {
      const workspaceId = req.query.workspaceId || req.user?.workspaceId || 'WS-DEFAULT-001';
      const orgId = req.user?.orgId || 'ORG-ROOT-001';
      const asOf = req.query.asOf || null;

      const compliance = DashboardEngine.getComplianceGovernanceSummary({
        orgId,
        workspaceId,
        asOf
      });

      return res.status(200).json({
        success: true,
        data: compliance
      });
    } catch (error) {
      console.error('[DashboardController] getCompliance error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal error retrieving compliance summary'
      });
    }
  },

  /**
   * GET /api/dashboard/changes
   * "What Changed?" material delta feed.
   */
  async getChanges(req, res) {
    try {
      const workspaceId = req.query.workspaceId || req.user?.workspaceId || 'WS-DEFAULT-001';
      const orgId = req.user?.orgId || 'ORG-ROOT-001';
      const asOf = req.query.asOf || null;

      const changes = DashboardEngine.getWhatChangedSummary({
        orgId,
        workspaceId,
        asOf
      });

      return res.status(200).json({
        success: true,
        data: changes
      });
    } catch (error) {
      console.error('[DashboardController] getChanges error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal error retrieving change summary'
      });
    }
  }
};

export default dashboardController;
