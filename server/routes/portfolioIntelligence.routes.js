/**
 * @file portfolioIntelligence.routes.js
 * Express routes for Portfolio Intelligence.
 */

import express from 'express';
import { portfolioIntelligenceController } from '../controllers/portfolioIntelligenceController.js';

const router = express.Router();

router.get('/state', portfolioIntelligenceController.getState);
router.post('/build-state', portfolioIntelligenceController.buildDailyState);
router.post('/exposure', portfolioIntelligenceController.getExposure);
router.post('/changes', portfolioIntelligenceController.getChanges);

export default router;
