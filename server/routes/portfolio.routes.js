/**
 * @file portfolio.routes.js
 * Express Routes for Phase 36 Institutional Portfolio Operating System.
 */

import express from 'express';
import { portfolioController } from '../controllers/portfolioController.js';
import { authenticate, requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { Permission } from '../auth/auth.types.js';

export const portfolioRouter = express.Router();

// Apply authentication middleware to all routes
portfolioRouter.use(authenticate);
portfolioRouter.use(requireAuth);

// Portfolio Registry & Lifecycle
portfolioRouter.get('/', portfolioController.listPortfolios);
portfolioRouter.post('/', requirePermission(Permission.PORTFOLIO_CREATE), portfolioController.createPortfolio);

// Portfolio Details & Settings
portfolioRouter.get('/:portfolioId', portfolioController.getPortfolio);
portfolioRouter.put('/:portfolioId', requirePermission(Permission.PORTFOLIO_UPDATE), portfolioController.updatePortfolio);
portfolioRouter.post('/:portfolioId/status', requirePermission(Permission.PORTFOLIO_STATUS_MANAGE), portfolioController.updateStatus);

// Holdings & Positions
portfolioRouter.get('/:portfolioId/holdings', portfolioController.getHoldings);
portfolioRouter.put('/:portfolioId/holdings', requirePermission(Permission.PORTFOLIO_HOLDINGS_MANAGE), portfolioController.updateHoldings);

// Operating Cockpit Summary & Multi-Domain Analytics
portfolioRouter.get('/:portfolioId/summary', portfolioController.getPortfolioSummary);
portfolioRouter.get('/:portfolioId/analytics', portfolioController.getPortfolioAnalytics);

// Point-in-Time Sealed Snapshots
portfolioRouter.get('/:portfolioId/snapshots', portfolioController.listSnapshots);
portfolioRouter.post('/:portfolioId/snapshots', requirePermission(Permission.PORTFOLIO_SNAPSHOT_CREATE), portfolioController.createSnapshot);
portfolioRouter.get('/:portfolioId/snapshots/:snapshotId', portfolioController.getSnapshot);

// Phase 33 Optimization Proposals
portfolioRouter.post('/:portfolioId/optimize', requirePermission(Permission.PORTFOLIO_OPTIMIZE), portfolioController.proposeOptimization);

export default portfolioRouter;
