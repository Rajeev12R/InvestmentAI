/**
 * @file audit.repository.js
 * Immutable, Append-Only Audit Event Storage with Cryptographic Chaining for Phase 9.
 */

import crypto from 'crypto';

class AuditRepository {
  constructor() {
    this.events = []; // Ordered append-only list of AuditEvent
    this.eventsByWorkspace = new Map(); // workspaceId -> array of event indices
    this.lastEventHash = '0000000000000000000000000000000000000000000000000000000000000000';
  }

  appendEvent({
    workspaceId = 'default',
    actorId = 'SYSTEM',
    actorType = 'USER',
    action,
    resourceType,
    resourceId,
    result = 'SUCCESS',
    metadata = {},
    requestId = null
  }) {
    if (!action) throw new Error('action is required for audit event');

    const id = `AUD-${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();
    const prevHash = this.lastEventHash;
    const effectiveRequestId = requestId || `REQ-${crypto.randomUUID()}`;

    // Build event object (without hash)
    const rawPayload = JSON.stringify({
      id,
      timestamp,
      workspaceId,
      actorId,
      actorType,
      action,
      resourceType,
      resourceId,
      result,
      metadata,
      requestId: effectiveRequestId,
      prevHash
    });

    const hash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    const event = Object.freeze({
      id,
      timestamp,
      orgId: metadata.orgId || 'ORG-ROOT-001',
      workspaceId,
      actorId,
      actorType,
      action,
      eventType: action,
      resourceType,
      resourceId,
      result,
      metadata: Object.freeze({ ...metadata }),
      requestId: effectiveRequestId,
      prevHash,
      hash
    });

    this.events.push(event);
    this.lastEventHash = hash;

    if (!this.eventsByWorkspace.has(workspaceId)) {
      this.eventsByWorkspace.set(workspaceId, []);
    }
    this.eventsByWorkspace.get(workspaceId).push(event);

    return event;
  }

  listEvents({ workspaceId, limit = 100, action = null, actorId = null }) {
    if (!workspaceId) return [];
    const wsEvents = this.eventsByWorkspace.get(workspaceId) || [];
    let filtered = wsEvents;
    if (action) {
      filtered = filtered.filter(e => e.action === action);
    }
    if (actorId) {
      filtered = filtered.filter(e => e.actorId === actorId);
    }
    return filtered.slice(-limit).reverse();
  }

  getEvents({ limit = 100, orgId = null, workspaceId = null } = {}) {
    let list = [...this.events];
    if (orgId) {
      list = list.filter(e => e.orgId === orgId);
    }
    if (workspaceId) {
      list = list.filter(e => e.workspaceId === workspaceId);
    }
    return list.slice(-limit).reverse();
  }

  getEventById(workspaceId, eventId) {
    const wsEvents = this.eventsByWorkspace.get(workspaceId) || [];
    return wsEvents.find(e => e.id === eventId) || null;
  }

  verifyChainIntegrity() {
    let prev = '0000000000000000000000000000000000000000000000000000000000000000';
    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i];
      if (e.prevHash !== prev) {
        return { isValid: false, brokenIndex: i, eventId: e.id, reason: 'Broken prevHash chain' };
      }
      const rawPayload = JSON.stringify({
        id: e.id,
        timestamp: e.timestamp,
        workspaceId: e.workspaceId,
        actorId: e.actorId,
        actorType: e.actorType,
        action: e.action,
        resourceType: e.resourceType,
        resourceId: e.resourceId,
        result: e.result,
        metadata: e.metadata,
        requestId: e.requestId,
        prevHash: e.prevHash
      });
      const calculatedHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
      if (calculatedHash !== e.hash) {
        return { isValid: false, brokenIndex: i, eventId: e.id, reason: 'Tampered event hash' };
      }
      prev = e.hash;
    }
    return { isValid: true, totalEvents: this.events.length };
  }
}

export const auditRepository = new AuditRepository();
