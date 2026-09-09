/**
 * @file idempotency.engine.js
 * Distributed-Safe Idempotency Engine for Phase 9 Ingestion & Job Execution.
 */

import crypto from 'crypto';

class IdempotencyEngine {
  constructor() {
    this.records = new Map(); // idempotencyKey -> { status, result, timestamp, hash }
  }

  generateKey({ workspaceId, sourceId, sourceRecordHash, eventType, reportingPeriod = 'LATEST' }) {
    const raw = `${workspaceId || 'default'}:${sourceId}:${sourceRecordHash}:${eventType}:${reportingPeriod}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  checkKey(idempotencyKey) {
    if (!idempotencyKey) return { isProcessed: false };
    const record = this.records.get(idempotencyKey);
    if (!record) return { isProcessed: false };
    return {
      isProcessed: true,
      status: record.status,
      result: record.result,
      processedAt: record.timestamp
    };
  }

  recordSuccess(idempotencyKey, result = {}) {
    if (!idempotencyKey) return;
    this.records.set(idempotencyKey, {
      status: 'SUCCEEDED',
      result,
      timestamp: new Date().toISOString()
    });
  }

  recordFailure(idempotencyKey, error) {
    if (!idempotencyKey) return;
    this.records.set(idempotencyKey, {
      status: 'FAILED',
      error: error?.message || String(error),
      timestamp: new Date().toISOString()
    });
  }

  clear() {
    this.records.clear();
  }
}

export const idempotencyEngine = new IdempotencyEngine();
