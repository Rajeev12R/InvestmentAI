/**
 * server/knowledgeGraph/kg.entityResolution.js
 * 
 * Phase 23: Deterministic Entity Resolution Engine
 * Handles ticker renames, security ID mutations, mergers, acquisitions, spin-offs, delistings, dual-class shares, and ADRs.
 */

import { deepFreeze } from './kg.types.js';

export class EntityResolutionEngine {
  constructor() {
    // Map<alias, Array<{ canonicalId, effectiveFrom, effectiveTo, eventType }>>
    this.aliasRegistry = new Map();
    // Pre-populate canonical corporate lineage
    this._initializeDefaultLineage();
  }

  _initializeDefaultLineage() {
    this.registerEntityAlias('FB', 'META_CORP', '2012-05-18T00:00:00.000Z', '2022-06-09T00:00:00.000Z', 'TICKER_CHANGE');
    this.registerEntityAlias('META', 'META_CORP', '2022-06-09T00:00:00.000Z', null, 'TICKER_CHANGE');
    
    this.registerEntityAlias('GOOG', 'ALPHABET_CLASS_C', '2014-04-03T00:00:00.000Z', null, 'DUAL_CLASS');
    this.registerEntityAlias('GOOGL', 'ALPHABET_CLASS_A', '2004-08-19T00:00:00.000Z', null, 'DUAL_CLASS');

    // Acquisition example: Acquirer A acquired Target B in 2024
    this.registerEntityAlias('TARGET_B', 'TARGET_B_CORP', '2015-01-01T00:00:00.000Z', '2024-06-30T00:00:00.000Z', 'INDEPENDENT');
    this.registerEntityAlias('TARGET_B', 'ACQUIRER_A_CORP_SUBSIDIARY_B', '2024-07-01T00:00:00.000Z', null, 'ACQUISITION');
  }

  registerEntityAlias(alias, canonicalId, effectiveFrom, effectiveTo = null, eventType = 'ALIAS') {
    const normAlias = alias.trim().toUpperCase();
    if (!this.aliasRegistry.has(normAlias)) {
      this.aliasRegistry.set(normAlias, []);
    }
    const entry = {
      alias: normAlias,
      canonicalId,
      effectiveFrom: effectiveFrom || '1970-01-01T00:00:00.000Z',
      effectiveTo: effectiveTo || null,
      eventType
    };
    this.aliasRegistry.get(normAlias).push(entry);
  }

  /**
   * Resolves an alias/ticker to its canonical entity as of a specific point-in-time
   */
  resolveEntity(alias, asOfTimestamp = new Date().toISOString()) {
    if (!alias || typeof alias !== 'string') return null;
    const normAlias = alias.trim().toUpperCase();
    const records = this.aliasRegistry.get(normAlias);

    if (!records || records.length === 0) {
      return deepFreeze({
        queryAlias: normAlias,
        canonicalId: normAlias,
        asOfTimestamp,
        isResolved: false,
        resolutionType: 'EXACT_NAME_FALLBACK'
      });
    }

    const queryTime = new Date(asOfTimestamp).getTime();
    const matching = records.filter(r => {
      const fromT = new Date(r.effectiveFrom).getTime();
      if (fromT > queryTime) return false;
      if (r.effectiveTo) {
        const toT = new Date(r.effectiveTo).getTime();
        if (toT < queryTime) return false;
      }
      return true;
    });

    if (matching.length === 0) {
      // If historical query is before the earliest known alias or after expiration
      const prior = records.find(r => new Date(r.effectiveFrom).getTime() <= queryTime);
      return deepFreeze({
        queryAlias: normAlias,
        canonicalId: prior ? prior.canonicalId : normAlias,
        asOfTimestamp,
        isResolved: prior !== undefined,
        resolutionType: prior ? prior.eventType : 'UNRESOLVED_TEMPORAL'
      });
    }

    const primary = matching[matching.length - 1];
    return deepFreeze({
      queryAlias: normAlias,
      canonicalId: primary.canonicalId,
      asOfTimestamp,
      isResolved: true,
      resolutionType: primary.eventType,
      effectiveFrom: primary.effectiveFrom,
      effectiveTo: primary.effectiveTo
    });
  }
}

export const defaultEntityResolutionEngine = new EntityResolutionEngine();
