import crypto from 'crypto';
import { defaultWorkflowStore } from './workflow.store.js';
import { computeWorkflowHash, deepFreeze } from './workflow.types.js';
import { validateWorkflowEvent } from './workflow.schema.js';

export class WorkflowAuditEngine {
  constructor(store = defaultWorkflowStore) {
    this.store = store;
    // Map of tenantId -> latestEventHash
    this.lastHashByTenant = new Map();
  }

  /**
   * Log an immutable workflow event with cryptographic chain link
   */
  logEvent({
    tenantId,
    action,
    actorId,
    targetEntity,
    targetId,
    details = {},
    researchProductId = null,
    researchVersion = null,
    timestamp = new Date().toISOString()
  }) {
    if (!tenantId || !action || !actorId || !targetEntity || !targetId) {
      throw new Error('Audit logging requires tenantId, action, actorId, targetEntity, and targetId');
    }

    const previousHash = this.lastHashByTenant.get(tenantId) || 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
    const eventId = `wf_evt_${crypto.randomBytes(8).toString('hex')}`;

    const rawPayload = {
      eventId,
      tenantId,
      action,
      actorId,
      targetEntity,
      targetId,
      researchProductId,
      researchVersion,
      details,
      timestamp,
      previousHash
    };

    const eventHash = computeWorkflowHash(rawPayload);
    const eventRecord = {
      ...rawPayload,
      eventHash
    };

    // Save to store
    const saved = this.store.saveEvent(eventRecord);
    this.lastHashByTenant.set(tenantId, eventHash);
    return saved;
  }

  /**
   * Verify audit trail integrity for a tenant.
   * Detects any tampering, deletion, or modification in the chain.
   */
  verifyAuditTrail(tenantId) {
    const events = this.store.listEntities(tenantId, 'events');
    // Sort chronologically
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let expectedPrevHash = 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
    const violations = [];

    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.previousHash !== expectedPrevHash) {
        violations.push({
          index: i,
          eventId: e.eventId,
          issue: 'Broken previousHash link',
          expected: expectedPrevHash,
          actual: e.previousHash
        });
      }

      const { eventHash, _storeVersion, _savedAt, ...payload } = e;
      const computedHash = computeWorkflowHash(payload);
      if (computedHash !== eventHash) {
        violations.push({
          index: i,
          eventId: e.eventId,
          issue: 'Hash mismatch / modified payload',
          expected: eventHash,
          actual: computedHash
        });
      }

      expectedPrevHash = e.eventHash;
    }

    return {
      valid: violations.length === 0,
      totalEvents: events.length,
      violations
    };
  }

  /**
   * Reconstruct historical state of an entity or workflow as of timestamp T
   */
  reconstructHistoricalState(tenantId, asOf) {
    const cutoff = new Date(asOf).getTime();
    const events = this.store.listEntities(tenantId, 'events')
      .filter(e => new Date(e.timestamp).getTime() <= cutoff)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      asOf,
      tenantId,
      eventsCount: events.length,
      events
    };
  }
}

export const defaultAuditEngine = new WorkflowAuditEngine();
