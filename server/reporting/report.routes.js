/**
 * @file report.routes.js
 * Express Router for Phase 40 Institutional Reporting & Deliverables.
 * All routes require authentication and workspace RBAC context.
 */

import express from 'express';
import {
  listReportTemplates,
  listReports,
  getReportsSummary,
  getReport,
  createReportDraft,
  generateReport,
  validateReport,
  submitForReview,
  approveReport,
  rejectReport,
  distributeReport,
  supersedeReport,
  verifyReport,
  downloadReportArtifact,
  getReportAudit
} from './report.controller.js';
import { authenticate, requireAuth } from '../auth/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(requireAuth);

// Template discovery
router.get('/templates', listReportTemplates);

// Report library
router.get('/', listReports);
router.get('/summary', getReportsSummary);
router.get('/:reportId', getReport);

// Report lifecycle
router.post('/', createReportDraft);
router.post('/:reportId/generate', generateReport);
router.post('/:reportId/validate', validateReport);
router.post('/:reportId/submit-review', submitForReview);
router.post('/:reportId/approve', approveReport);
router.post('/:reportId/reject', rejectReport);
router.post('/:reportId/distribute', distributeReport);
router.post('/:reportId/supersede', supersedeReport);

// Verification, artifacts, and audit
router.get('/:reportId/verification', verifyReport);
router.get('/:reportId/artifact', downloadReportArtifact);
router.get('/:reportId/audit', getReportAudit);

export default router;
