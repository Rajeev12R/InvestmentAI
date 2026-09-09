/**
 * server/earnings/earnings.eventStore.js
 * 
 * Phase 21: Raw Corporate Event Storage & Deduplication Engine
 * Enforces raw event immutability, cryptographic hashing, deduplication, and tenant-isolated timeline indexing.
 */

import { EventClassification, canonicalHash, deepFreeze } from './earnings.types.js';
import { validateCorporateEvent } from './earnings.schema.js';
import crypto from 'crypto';

export class CorporateEventStore {
  constructor() {
    // Map<tenantId, Map<eventId, EventRecord>>
    this.eventsByTenant = new Map();
    // Map<tenantId, Set<dedupKey>>
    this.dedupKeysByTenant = new Map();
  }

  _getTenantStore(tenantId) {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Valid tenantId is required for event operations');
    }
    if (!this.eventsByTenant.has(tenantId)) {
      this.eventsByTenant.set(tenantId, new Map());
      this.dedupKeysByTenant.set(tenantId, new Set());
    }
    return {
      events: this.eventsByTenant.get(tenantId),
      dedupSet: this.dedupKeysByTenant.get(tenantId)
    };
  }

  _getDedupKey(event) {
    const rawDocHash = event.rawDocumentHash || crypto.createHash('sha256').update(JSON.stringify(event.payload || {})).digest('hex');
    return `${event.securityId.toUpperCase()}#${event.sourceId}#${event.reportingPeriod.toUpperCase()}#${event.publicationTimestamp}#${rawDocHash}`;
  }

  /**
   * Ingests and immutably stores a corporate event
   */
  ingestEvent(tenantId, eventData) {
    validateCorporateEvent(eventData);

    const { events, dedupSet } = this._getTenantStore(tenantId);
    const dedupKey = this._getDedupKey(eventData);

    if (dedupSet.has(dedupKey)) {
      // Return existing duplicate record to avoid duplicate truth updates
      const existing = Array.from(events.values()).find(e => e.dedupKey === dedupKey);
      return {
        isDuplicate: true,
        event: existing,
        message: 'Duplicate event detected; existing record returned without mutation.'
      };
    }

    const now = new Date().toISOString();
    const rawPayloadHash = crypto.createHash('sha256').update(JSON.stringify(eventData.payload || {})).digest('hex');
    
    const docIdentity = `${eventData.securityId.toUpperCase()}#${eventData.reportingPeriod.toUpperCase()}#${rawPayloadHash}`;
    const sourceObsIdentity = `${eventData.sourceId}#${eventData.publicationTimestamp}#${rawPayloadHash}`;
    const eventIdentity = `${eventData.securityId.toUpperCase()}#${eventData.eventType}#${eventData.reportingPeriod.toUpperCase()}`;
    const ingestionIdentity = `${tenantId}#${now}#${eventData.eventId}`;

    // Honor Source Classification honesty: Hashing does NOT equal external verification!
    let finalSourceClassification = eventData.sourceClassification || 'UNVERIFIED_SOURCE';
    if (finalSourceClassification === 'VERIFIED_DIRECT_EXCHANGE' && eventData.isExternalAuthorityVerified !== true) {
      finalSourceClassification = 'UNVERIFIED_SOURCE';
    }

    const eventRecord = {
      eventId: eventData.eventId,
      tenantId,
      securityId: eventData.securityId.toUpperCase(),
      eventType: eventData.eventType,
      eventTimestamp: eventData.eventTimestamp,
      reportingPeriod: eventData.reportingPeriod.toUpperCase(),
      publicationTimestamp: eventData.publicationTimestamp,
      ingestedAt: now,
      sourceId: eventData.sourceId,
      sourceTier: eventData.sourceTier || 'TIER_2_REGULATORY_DISCLOSURE',
      sourceClassification: finalSourceClassification,
      evidenceId: eventData.evidenceId || `EVID-${eventData.eventId}`,
      evidenceHash: eventData.evidenceHash || rawPayloadHash,
      rawDocumentHash: rawPayloadHash,
      identities: {
        documentIdentity: docIdentity,
        sourceObservationIdentity: sourceObsIdentity,
        eventIdentity,
        ingestionIdentity
      },
      payload: eventData.payload || {},
      dedupKey,
      classification: EventClassification.REAL_DATA,
      version: 1
    };

    eventRecord.canonicalHash = canonicalHash({
      eventId: eventRecord.eventId,
      tenantId: eventRecord.tenantId,
      securityId: eventRecord.securityId,
      eventType: eventRecord.eventType,
      reportingPeriod: eventRecord.reportingPeriod,
      publicationTimestamp: eventRecord.publicationTimestamp,
      rawDocumentHash: eventRecord.rawDocumentHash
    });

    const frozen = deepFreeze(eventRecord);
    events.set(frozen.eventId, frozen);
    dedupSet.add(dedupKey);

    return {
      isDuplicate: false,
      event: frozen,
      message: 'Event ingested and stored immutably.'
    };
  }

  /**
   * Retrieves single event by ID
   */
  getEvent(tenantId, eventId) {
    const { events } = this._getTenantStore(tenantId);
    return events.get(eventId) || null;
  }

  /**
   * Retrieves chronological event timeline for a security
   */
  getTimeline(tenantId, securityId) {
    const { events } = this._getTenantStore(tenantId);
    const targetTicker = securityId.toUpperCase();
    return Array.from(events.values())
      .filter(e => e.securityId === targetTicker)
      .sort((a, b) => new Date(a.publicationTimestamp) - new Date(b.publicationTimestamp));
  }

  clear() {
    this.eventsByTenant.clear();
    this.dedupKeysByTenant.clear();
  }
}

export const defaultCorporateEventStore = new CorporateEventStore();
