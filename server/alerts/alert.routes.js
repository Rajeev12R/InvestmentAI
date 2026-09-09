/**
 * @file alert.routes.js
 * Express Routes for Phase 39 Institutional Alerts & Attention Center.
 */

import express from 'express';
import { alertController } from './alert.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', alertController.listAlerts);
router.get('/counts', alertController.getCounts);
router.get('/preferences', alertController.getPreferences);
router.put('/preferences', alertController.updatePreferences);
router.get('/:alertId', alertController.getAlertById);
router.post('/:alertId/acknowledge', alertController.acknowledge);
router.post('/:alertId/snooze', alertController.snooze);
router.post('/:alertId/resolve', alertController.resolve);
router.post('/:alertId/reopen', alertController.reopen);
router.post('/:alertId/assign', alertController.assign);
router.post('/:alertId/escalate', alertController.escalate);

export default router;
