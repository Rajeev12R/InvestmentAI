/**
 * @file observability.service.js
 * Observability, Metrics & Health Service for Phase 9 Institutional Infrastructure.
 */

import crypto from 'crypto';
import { jobQueue } from '../jobs/job.queue.js';
import { auditRepository } from '../governance/audit.repository.js';

class ObservabilityService {
  constructor() {
    this.metrics = {
      httpRequestsTotal: 0,
      httpErrorsTotal: 0,
      authFailuresTotal: 0,
      rateLimitExceededTotal: 0,
      copilotRequestsTotal: 0,
      ingestionJobsTotal: 0,
      latenciesMs: []
    };
  }

  recordRequest({ durationMs, isError = false, isAuthFailure = false, isRateLimit = false, isCopilot = false, isIngestion = false }) {
    this.metrics.httpRequestsTotal++;
    if (isError) this.metrics.httpErrorsTotal++;
    if (isAuthFailure) this.metrics.authFailuresTotal++;
    if (isRateLimit) this.metrics.rateLimitExceededTotal++;
    if (isCopilot) this.metrics.copilotRequestsTotal++;
    if (isIngestion) this.metrics.ingestionJobsTotal++;

    if (this.metrics.latenciesMs.length > 500) {
      this.metrics.latenciesMs.shift();
    }
    this.metrics.latenciesMs.push(durationMs);
  }

  getMetrics() {
    const lats = this.metrics.latenciesMs;
    const avgLatency = lats.length > 0 ? lats.reduce((a, b) => a + b, 0) / lats.length : 0;
    const p95Latency = lats.length > 0 ? [...lats].sort((a, b) => a - b)[Math.floor(lats.length * 0.95)] : 0;
    const queueStats = jobQueue.getQueueStats();

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      requests: {
        total: this.metrics.httpRequestsTotal,
        errors: this.metrics.httpErrorsTotal,
        authFailures: this.metrics.authFailuresTotal,
        rateLimitExceeded: this.metrics.rateLimitExceededTotal,
        copilotQueries: this.metrics.copilotRequestsTotal,
        ingestionJobs: this.metrics.ingestionJobsTotal
      },
      latencyMs: {
        avg: Math.round(avgLatency * 100) / 100,
        p95: Math.round(p95Latency * 100) / 100
      },
      jobQueue: queueStats,
      auditLog: {
        totalEvents: auditRepository.events.length,
        chainIntegrity: auditRepository.verifyChainIntegrity().isValid
      }
    };
  }

  getLiveness() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  getReadiness() {
    const queueStats = jobQueue.getQueueStats();
    const auditStatus = auditRepository.verifyChainIntegrity();

    const isReady = auditStatus.isValid;
    return {
      status: isReady ? 'READY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      checks: {
        jobQueue: queueStats ? 'OK' : 'FAIL',
        auditTrail: auditStatus.isValid ? 'OK' : 'CORRUPTED'
      }
    };
  }

  middleware() {
    return (req, res, next) => {
      req.requestId = req.headers['x-request-id'] || `REQ-${crypto.randomUUID()}`;
      res.setHeader('X-Request-Id', req.requestId);

      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        const isError = res.statusCode >= 400;
        const isAuth = res.statusCode === 401 || res.statusCode === 403;
        const isRate = res.statusCode === 429;
        const isCop = req.path?.includes('/copilot');
        const isIng = req.path?.includes('/ingestion');

        this.recordRequest({
          durationMs: duration,
          isError,
          isAuthFailure: isAuth,
          isRateLimit: isRate,
          isCopilot: isCop,
          isIngestion: isIng
        });
      });
      next();
    };
  }
}

export const observabilityService = new ObservabilityService();
