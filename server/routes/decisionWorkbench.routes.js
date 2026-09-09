/**
 * @file decisionWorkbench.routes.js
 * Express Routes for Phase 37 Investment Decision Workbench.
 */

import express from 'express';
import { decisionWorkbenchController } from '../controllers/decisionWorkbenchController.js';
import { authenticate, requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { Permission } from '../auth/auth.types.js';

export const decisionWorkbenchRouter = express.Router();

// Apply authentication middleware to all routes
decisionWorkbenchRouter.use(authenticate);
decisionWorkbenchRouter.use(requireAuth);

// Decision Registry & CRUD
decisionWorkbenchRouter.get('/', decisionWorkbenchController.listDecisions);
decisionWorkbenchRouter.post('/', requirePermission(Permission.DECISION_CREATE), decisionWorkbenchController.createDecision);

// Decision Details & Updates
decisionWorkbenchRouter.get('/:decisionId', decisionWorkbenchController.getDecision);
decisionWorkbenchRouter.put('/:decisionId', requirePermission(Permission.DECISION_UPDATE), decisionWorkbenchController.updateDecision);
decisionWorkbenchRouter.post('/:decisionId/status', requirePermission(Permission.DECISION_UPDATE), decisionWorkbenchController.updateStatus);

// Reviews & Challenges
decisionWorkbenchRouter.post('/:decisionId/review', requirePermission(Permission.DECISION_REVIEW), decisionWorkbenchController.submitReview);

// Human Authorization & Rejection
decisionWorkbenchRouter.post('/:decisionId/approve', requirePermission(Permission.DECISION_APPROVE), decisionWorkbenchController.approveDecision);
decisionWorkbenchRouter.post('/:decisionId/reject', requirePermission(Permission.DECISION_REJECT), decisionWorkbenchController.rejectDecision);

// Implementation Handoff
decisionWorkbenchRouter.post('/:decisionId/implement', requirePermission(Permission.DECISION_IMPLEMENT), decisionWorkbenchController.implementDecision);

// Multi-Domain Impact Evaluation
decisionWorkbenchRouter.get('/:decisionId/impact', decisionWorkbenchController.getDecisionImpact);

// Point-in-Time Sealed Snapshots
decisionWorkbenchRouter.get('/:decisionId/snapshots', decisionWorkbenchController.listSnapshots);
decisionWorkbenchRouter.post('/:decisionId/snapshots', requirePermission(Permission.DECISION_UPDATE), decisionWorkbenchController.createSnapshot);

export default decisionWorkbenchRouter;
