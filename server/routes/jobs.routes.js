/**
 * @file jobs.routes.js
 * Express Routes for Background Job Queue Management in Phase 9.
 */

import { Router } from 'express';
import { jobQueue } from '../jobs/job.queue.js';
import { ingestionWorker } from '../jobs/job.worker.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { Permission } from '../auth/auth.types.js';

const router = Router();

// 1. GET /api/jobs - List jobs
router.get('/', requireAuth, requirePermission(Permission.INGESTION_READ), (req, res) => {
  const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId || 'default';
  const status = req.query.status || null;
  const list = jobQueue.listJobs({ workspaceId, status });
  res.json({ workspaceId, jobs: list });
});

// 2. GET /api/jobs/stats - Get Queue Statistics
router.get('/stats', requireAuth, requirePermission(Permission.INGESTION_READ), (req, res) => {
  const stats = jobQueue.getQueueStats();
  res.json(stats);
});

// 3. GET /api/jobs/:jobId - Get job by ID
router.get('/:jobId', requireAuth, requirePermission(Permission.INGESTION_READ), (req, res) => {
  const job = jobQueue.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// 4. POST /api/jobs/drain - Process/drain queue (for manual/worker trigger)
router.post('/drain', requireAuth, requirePermission(Permission.INGESTION_TRIGGER), async (req, res) => {
  try {
    const processed = await ingestionWorker.drainQueue();
    res.json({ success: true, processedJobs: processed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
