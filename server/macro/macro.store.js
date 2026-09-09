/**
 * server/macro/macro.store.js
 * 
 * Phase 22: Revision-Aware, Point-in-Time, Tenant-Isolated Macro Event Store
 * Preserves initial observations, historical revisions, and strict point-in-time query semantics.
 */

import { MacroClassification, canonicalHash, deepFreeze, SourceVerificationStatus } from './macro.types.js';
import { validateMacroObservation } from './macro.schema.js';
import { getMacroSeriesMetadata } from './macro.series.registry.js';
import crypto from 'crypto';

export class MacroDataStore {
  constructor() {
    // Map<tenantId, Map<observationId, ObservationRecord>>
    this.observationsByTenant = new Map();
    // Map<tenantId, Set<dedupKey>>
    this.dedupKeysByTenant = new Map();
  }

  _getTenantStore(tenantId) {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Valid tenantId string required for macro data operations');
    }
    if (!this.observationsByTenant.has(tenantId)) {
      this.observationsByTenant.set(tenantId, new Map());
      this.dedupKeysByTenant.set(tenantId, new Set());
    }
    return {
      observations: this.observationsByTenant.get(tenantId),
      dedupSet: this.dedupKeysByTenant.get(tenantId)
    };
  }

  /**
   * Ingests a raw macro observation immutably
   */
  ingestObservation(tenantId, obsData) {
    validateMacroObservation(obsData);

    const { observations, dedupSet } = this._getTenantStore(tenantId);
    const seriesMeta = getMacroSeriesMetadata(obsData.seriesId);

    const rawPayloadHash = crypto.createHash('sha256').update(JSON.stringify({
      seriesId: obsData.seriesId,
      value: obsData.value,
      period: obsData.observationPeriod,
      pubTime: obsData.publicationTimestamp
    })).digest('hex');

    const dedupKey = `${obsData.seriesId.toUpperCase()}#${obsData.observationPeriod}#${obsData.publicationTimestamp}#${rawPayloadHash}`;

    if (dedupSet.has(dedupKey)) {
      const existing = Array.from(observations.values()).find(o => o.dedupKey === dedupKey);
      return {
        isDuplicate: true,
        observation: existing,
        message: 'Duplicate macro observation detected; returned existing immutable record.'
      };
    }

    // Provenance Honesty Enforcement: Hashing !== External Authority Verification
    let finalVerification = obsData.sourceVerification || SourceVerificationStatus.UNVERIFIED_SOURCE;
    if (
      (finalVerification === SourceVerificationStatus.VERIFIED_DIRECT_AUTHORITY ||
       finalVerification === SourceVerificationStatus.VERIFIED_EXCHANGE_FEED) &&
      obsData.isExternalAuthorityVerified !== true
    ) {
      finalVerification = SourceVerificationStatus.UNVERIFIED_SOURCE;
    }

    const now = new Date().toISOString();
    const isVerifiedReal = finalVerification !== SourceVerificationStatus.UNVERIFIED_SOURCE;

    // Determine revision index if prior observations exist for same series and period
    const existingForPeriod = Array.from(observations.values())
      .filter(o => o.seriesId === obsData.seriesId && o.observationPeriod === obsData.observationPeriod)
      .sort((a, b) => new Date(a.publicationTimestamp) - new Date(b.publicationTimestamp));

    const revisionIndex = existingForPeriod.length;
    const isRevision = revisionIndex > 0;
    const priorObservationId = isRevision ? existingForPeriod[existingForPeriod.length - 1].observationId : null;

    const record = {
      observationId: obsData.observationId,
      tenantId,
      seriesId: obsData.seriesId,
      category: obsData.category || (seriesMeta ? seriesMeta.category : 'GROWTH'),
      seriesName: seriesMeta ? seriesMeta.name : obsData.seriesId,
      value: obsData.value,
      unit: obsData.unit || (seriesMeta ? seriesMeta.unit : 'PERCENT'),
      observationPeriod: obsData.observationPeriod,
      publicationTimestamp: obsData.publicationTimestamp,
      effectiveTimestamp: obsData.effectiveTimestamp,
      ingestedAt: now,
      source: obsData.source || (seriesMeta ? seriesMeta.sourceName : 'UNKNOWN_MACRO_SOURCE'),
      sourceTier: obsData.sourceTier || (seriesMeta ? seriesMeta.sourceTier : 'TIER_4_VENDOR_FEED'),
      sourceVerification: finalVerification,
      isExternalAuthorityVerified: obsData.isExternalAuthorityVerified === true,
      classification: isVerifiedReal ? MacroClassification.VERIFIED_REAL_DATA : MacroClassification.REAL_DATA,
      isRevision,
      revisionIndex,
      priorObservationId,
      supersededBy: null,
      dedupKey,
      rawHash: rawPayloadHash
    };

    record.canonicalHash = canonicalHash({
      observationId: record.observationId,
      tenantId: record.tenantId,
      seriesId: record.seriesId,
      value: record.value,
      period: record.observationPeriod,
      publicationTimestamp: record.publicationTimestamp,
      rawHash: record.rawHash
    });

    const frozen = deepFreeze(record);
    observations.set(frozen.observationId, frozen);
    dedupSet.add(dedupKey);

    return {
      isDuplicate: false,
      observation: frozen,
      message: 'Macro observation ingested immutably.'
    };
  }

  /**
   * Retrieves point-in-time macro snapshot at a specified information cutoff
   */
  getSnapshotAsOf(tenantId, asOfTimestamp = new Date().toISOString()) {
    const { observations } = this._getTenantStore(tenantId);
    const cutoffDate = new Date(asOfTimestamp);

    // Filter strictly to observations published on or before asOfTimestamp
    const validObs = Array.from(observations.values()).filter(o => {
      return new Date(o.publicationTimestamp) <= cutoffDate;
    });

    // Group by seriesId and observationPeriod, picking latest publicationTimestamp <= cutoffDate
    const latestBySeriesPeriod = new Map();
    for (const obs of validObs) {
      const key = `${obs.seriesId}#${obs.observationPeriod}`;
      if (!latestBySeriesPeriod.has(key)) {
        latestBySeriesPeriod.set(key, obs);
      } else {
        const existing = latestBySeriesPeriod.get(key);
        if (new Date(obs.publicationTimestamp) > new Date(existing.publicationTimestamp)) {
          latestBySeriesPeriod.set(key, obs);
        }
      }
    }

    // Now pick the latest observation for each unique seriesId
    const latestBySeries = new Map();
    for (const obs of latestBySeriesPeriod.values()) {
      if (!latestBySeries.has(obs.seriesId)) {
        latestBySeries.set(obs.seriesId, obs);
      } else {
        const existing = latestBySeries.get(obs.seriesId);
        if (new Date(obs.publicationTimestamp) > new Date(existing.publicationTimestamp)) {
          latestBySeries.set(obs.seriesId, obs);
        }
      }
    }

    const seriesArray = Array.from(latestBySeries.values());

    return Object.freeze({
      tenantId,
      asOfTimestamp,
      informationCutoff: asOfTimestamp,
      seriesCount: seriesArray.length,
      series: Object.freeze(seriesArray),
      allHistoricalObservationsCount: validObs.length,
      classification: MacroClassification.REAL_DATA
    });
  }

  /**
   * Retrieves full revision history for a specific series and period
   */
  getRevisionHistory(tenantId, seriesId, observationPeriod) {
    const { observations } = this._getTenantStore(tenantId);
    const history = Array.from(observations.values())
      .filter(o => o.seriesId === seriesId && o.observationPeriod === observationPeriod)
      .sort((a, b) => new Date(a.publicationTimestamp) - new Date(b.publicationTimestamp));
    return Object.freeze(history);
  }
}

export const defaultMacroDataStore = new MacroDataStore();

export function createMacroStore() {
  const store = new Map(); // tenantId -> Map(seriesId -> array of obs)

  return {
    ingestObservation(obs = {}) {
      const { tenantId, seriesId, timestamp, value, unit, provenance } = obs;
      if (!tenantId || typeof tenantId !== 'string') {
        throw new Error('Tenant ID is required and must be a non-empty string');
      }
      if (!seriesId || typeof seriesId !== 'string') {
        throw new Error('Series ID is required and must be a non-empty string');
      }
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error('value must be a finite number');
      }
      if (!timestamp || typeof timestamp !== 'string' || new Date(timestamp).toString() === 'Invalid Date') {
        throw new Error('valid ISO timestamp required');
      }

      if (!store.has(tenantId)) {
        store.set(tenantId, new Map());
      }
      const tenantMap = store.get(tenantId);
      if (!tenantMap.has(seriesId)) {
        tenantMap.set(seriesId, []);
      }

      const seriesObsList = tenantMap.get(seriesId);
      const asOf = provenance?.asOf || timestamp;
      const revision = seriesObsList.filter(o => o.timestamp === timestamp).length + 1;

      let tier = 'TIER_1_DIRECT_AUTHORITY';
      if (provenance && provenance.verified === false) {
        tier = 'UNVERIFIED_SOURCE';
      }

      const storedObs = deepFreeze({
        tenantId,
        seriesId,
        timestamp,
        value,
        unit: unit || '%',
        asOf,
        revision,
        classification: 'REAL_DATA',
        provenance: {
          sourceId: provenance?.sourceId || 'UNKNOWN',
          verified: provenance?.verified ?? true,
          authority: provenance?.authority || 'AUTHORITY',
          asOf,
          tier
        }
      });

      seriesObsList.push(storedObs);
      return storedObs;
    },

    getPointInTime(tenantId, seriesId, timestamp, asOfCutoff) {
      if (!store.has(tenantId)) return null;
      const tenantMap = store.get(tenantId);
      if (!tenantMap.has(seriesId)) return null;

      const seriesObsList = tenantMap.get(seriesId);
      const cutoffTime = asOfCutoff ? new Date(asOfCutoff).getTime() : Date.now();

      const matching = seriesObsList
        .filter(o => o.timestamp === timestamp && new Date(o.asOf).getTime() <= cutoffTime)
        .sort((a, b) => new Date(b.asOf).getTime() - new Date(a.asOf).getTime());

      return matching.length > 0 ? matching[0] : null;
    },

    getLatestSnapshot(tenantId) {
      if (!store.has(tenantId)) return {};
      const tenantMap = store.get(tenantId);
      const snapshot = {};

      for (const [seriesId, obsList] of tenantMap.entries()) {
        if (obsList.length > 0) {
          snapshot[seriesId] = obsList[obsList.length - 1];
        }
      }
      return deepFreeze(snapshot);
    }
  };
}

