/**
 * @file dashboard.routes.js
 * Express Routes for Phase 38 Institutional Dashboard & Intelligence Cockpit.
 */

import express from 'express';
import { dashboardController } from '../controllers/dashboardController.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { Permission } from '../auth/auth.types.js';

const router = express.Router();

router.use(requireAuth);
router.use(requirePermission(Permission.DASHBOARD_READ));

router.get('/overview', dashboardController.getOverview);
router.get('/portfolios', dashboardController.getPortfolios);
router.get('/risk', dashboardController.getRisk);
router.get('/attention', dashboardController.getAttention);
router.get('/decisions', dashboardController.getDecisions);
router.get('/compliance', dashboardController.getCompliance);
router.get('/changes', dashboardController.getChanges);

export default router;
