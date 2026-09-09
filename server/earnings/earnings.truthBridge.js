/**
 * server/earnings/earnings.truthBridge.js
 * 
 * Phase 21: Truth Layer Bridge & Conflict Preservation Engine
 * Routes TruthUpdateCandidate objects through Truth Layer validation and immutable versioning.
 * Preserves conflicting observations without averaging and manages restatement versions.
 */

import { EventClassification, canonicalHash, deepFreeze } from './earnings.types.js';

export class EarningsTruthBridge {
  constructor() {
    // Map<tenantId, Map<factKey, Array<FactVersionRecord>>>
    this.truthStoreByTenant = new Map();
  }

  _getTenantStore(tenantId) {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Valid tenantId is required for truth bridge operations');
    }
    if (!this.truthStoreByTenant.has(tenantId)) {
      this.truthStoreByTenant.set(tenantId, new Map());
    }
    return this.truthStoreByTenant.get(tenantId);
  }

  _getFactKey(ticker, metric, period) {
    return `${ticker.toUpperCase()}#${metric.toUpperCase()}#${period.toUpperCase()}`;
  }

  /**
   * Evaluates and applies a TruthUpdateCandidate
   * 
   * @param {string} tenantId - Tenant identifier
   * @param {Object} candidate - TruthUpdateCandidate from extractor
   * @returns {Object} Result of truth application
   */
  applyCandidateToTruth(tenantId, candidate) {
    const store = this._getTenantStore(tenantId);
    const key = this._getFactKey(candidate.ticker, candidate.metric, candidate.period);

    if (!store.has(key)) {
      store.set(key, []);
    }

    const history = store.get(key);
    const versionNum = history.length + 1;
    const now = new Date().toISOString();

    // Check for source conflict:
    let conflictState = 'NONE';
    if (history.length > 0) {
      const activeFact = history[history.length - 1];
      if (activeFact.sourceId !== candidate.sourceId && Math.abs(activeFact.value - candidate.value) > 1e-6) {
        // Conflicting observation from different source
        conflictState = 'SOURCE_OBSERVATION_CONFLICT';
      }
    }

    const factRecord = {
      factId: `FACT-${candidate.ticker}-${candidate.metric}-${candidate.period}-V${versionNum}`,
      tenantId,
      ticker: candidate.ticker,
      metric: candidate.metric,
      value: candidate.value,
      unit: candidate.unit,
      period: candidate.period,
      asOfDate: candidate.asOfDate,
      effectiveTimestamp: now,
      sourceId: candidate.sourceId,
      sourceTier: candidate.sourceTier,
      evidenceId: candidate.evidenceId,
      evidenceHash: candidate.evidenceHash,
      conflictState,
      version: versionNum,
      isRestatement: candidate.isRestatement || false,
      restatementReason: candidate.restatementReason || null,
      classification: EventClassification.REAL_DATA,
      status: conflictState === 'SOURCE_OBSERVATION_CONFLICT' ? 'CONFLICT_PRESERVED' : 'ACTIVE_TRUTH'
    };

    factRecord.canonicalHash = canonicalHash({
      factId: factRecord.factId,
      ticker: factRecord.ticker,
      metric: factRecord.metric,
      value: factRecord.value,
      period: factRecord.period,
      evidenceHash: factRecord.evidenceHash,
      version: factRecord.version
    });

    const frozenFact = deepFreeze(factRecord);
    history.push(frozenFact);

    return {
      success: true,
      factRecord: frozenFact,
      conflictState,
      totalVersions: history.length,
      message: conflictState === 'SOURCE_OBSERVATION_CONFLICT'
        ? 'Conflict detected and preserved independently in truth store.'
        : 'Fact successfully validated and committed to immutable Truth snapshot.'
    };
  }

  /**
   * Retrieves active truth fact (or flags conflict)
   */
  getActiveFact(tenantId, ticker, metric, period) {
    const store = this._getTenantStore(tenantId);
    const key = this._getFactKey(ticker, metric, period);
    const history = store.get(key) || [];
    if (history.length === 0) return null;

    const latest = history[history.length - 1];
    if (latest.conflictState === 'SOURCE_OBSERVATION_CONFLICT') {
      return {
        ...latest,
        status: 'UNAVAILABLE_CONFLICT_REQUIRES_RECONCILIATION',
        conflictingVersions: history
      };
    }
    return latest;
  }

  /**
   * Retrieves full restatement / version history
   */
  getFactHistory(tenantId, ticker, metric, period) {
    const store = this._getTenantStore(tenantId);
    const key = this._getFactKey(ticker, metric, period);
    return store.get(key) || [];
  }

  clear() {
    this.truthStoreByTenant.clear();
  }
}

export const defaultEarningsTruthBridge = new EarningsTruthBridge();
