/**
 * @file infra.routes.js
 * Infrastructure Endpoints (/health, /ready, /metrics) for Phase 9.
 */

import { Router } from 'express';
import { observabilityService } from '../infrastructure/observability.service.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json(observabilityService.getLiveness());
});

router.get('/ready', (req, res) => {
  const readiness = observabilityService.getReadiness();
  const status = readiness.status === 'READY' ? 200 : 503;
  res.status(status).json(readiness);
});

router.get('/metrics', (req, res) => {
  res.json(observabilityService.getMetrics());
});

export default router;
