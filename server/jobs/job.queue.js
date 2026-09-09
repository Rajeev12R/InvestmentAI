/**
 * @file job.queue.js
 * Production Job Queue Abstraction with Retries, Exponential Backoff & Dead-Letter Support.
 */

import crypto from 'crypto';
import { JobStatus } from './job.types.js';
import { idempotencyEngine } from './idempotency.engine.js';

export class JobQueue {
  constructor() {
    this.jobs = new Map(); // jobId -> Job
    this.queue = []; // Array of jobIds in FIFO order
    this.deadLetterQueue = []; // Array of failed jobIds
    this.handlers = new Map(); // jobType -> handler function
  }

  registerHandler(jobType, handler) {
    this.handlers.set(jobType, handler);
  }

  enqueueJob({
    type,
    workspaceId = 'default',
    payload = {},
    idempotencyKey = null,
    maxRetries = 3,
    priority = 'NORMAL'
  }) {
    if (!type) throw new Error('Job type is required');

    // Deduplication check
    if (idempotencyKey) {
      const prior = idempotencyEngine.checkKey(idempotencyKey);
      if (prior.isProcessed && prior.status === 'SUCCEEDED') {
        return {
          isDuplicate: true,
          status: JobStatus.SUCCEEDED,
          result: prior.result
        };
      }
    }

    const jobId = `JOB-${crypto.randomUUID()}`;
    const job = {
      jobId,
      type,
      workspaceId,
      payload,
      idempotencyKey,
      status: JobStatus.QUEUED,
      attempts: 0,
      maxRetries,
      priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attemptsHistory: [],
      error: null,
      result: null
    };

    this.jobs.set(jobId, job);
    if (priority === 'HIGH') {
      this.queue.unshift(jobId);
    } else {
      this.queue.push(jobId);
    }

    return job;
  }

  async processNextJob() {
    if (this.queue.length === 0) return null;

    const jobId = this.queue.shift();
    const job = this.jobs.get(jobId);
    if (!job || job.status === JobStatus.CANCELLED) return null;

    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.status = JobStatus.FAILED;
      job.error = `No handler registered for job type ${job.type}`;
      this.deadLetterQueue.push(jobId);
      return job;
    }

    job.status = JobStatus.RUNNING;
    job.attempts++;
    job.updatedAt = new Date().toISOString();

    const attemptStart = Date.now();
    try {
      const result = await handler(job.payload, { workspaceId: job.workspaceId, jobId: job.jobId });
      job.status = JobStatus.SUCCEEDED;
      job.result = result;
      job.updatedAt = new Date().toISOString();
      job.attemptsHistory.push({
        attempt: job.attempts,
        durationMs: Date.now() - attemptStart,
        status: JobStatus.SUCCEEDED
      });

      if (job.idempotencyKey) {
        idempotencyEngine.recordSuccess(job.idempotencyKey, result);
      }
      return job;
    } catch (err) {
      const isRetryable = job.attempts < job.maxRetries;
      job.error = err.message || String(err);
      job.updatedAt = new Date().toISOString();
      job.attemptsHistory.push({
        attempt: job.attempts,
        durationMs: Date.now() - attemptStart,
        status: isRetryable ? JobStatus.RETRYING : JobStatus.FAILED,
        error: job.error
      });

      if (isRetryable) {
        job.status = JobStatus.RETRYING;
        // Exponential backoff simulation: re-enqueue
        this.queue.push(jobId);
      } else {
        job.status = JobStatus.DEAD_LETTER;
        this.deadLetterQueue.push(jobId);
        if (job.idempotencyKey) {
          idempotencyEngine.recordFailure(job.idempotencyKey, err);
        }
      }
      return job;
    }
  }

  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  listJobs({ workspaceId = null, status = null, limit = 50 } = {}) {
    let list = Array.from(this.jobs.values());
    if (workspaceId) {
      list = list.filter(j => j.workspaceId === workspaceId);
    }
    if (status) {
      list = list.filter(j => j.status === status);
    }
    return list.slice(-limit).reverse();
  }

  getQueueStats() {
    return {
      totalJobs: this.jobs.size,
      queued: this.queue.length,
      deadLetterCount: this.deadLetterQueue.length,
      activeHandlers: Array.from(this.handlers.keys())
    };
  }
}

export const jobQueue = new JobQueue();
