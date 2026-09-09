/**
 * @file operations.routes.js
 * Express routes for Decision Operations and Review Queue.
 */

import express from 'express';
import { operationsController } from '../controllers/operationsController.js';

const router = express.Router();

router.get('/reviews', operationsController.getReviews);
router.post('/reviews/:id/status', operationsController.updateReviewStatus);
router.get('/followups', operationsController.getFollowUps);
router.post('/followups', operationsController.createFollowUp);
router.post('/followups/:id/status', operationsController.updateFollowUpStatus);
router.post('/sync', operationsController.syncOperations);

export default router;
