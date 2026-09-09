/**
 * @file factRepository.js
 * Immutable Canonical Fact Repository & Storage for Phase 11.
 * Stores verified facts, historical versions, and links observations to Truth snapshots.
 */

import crypto from 'crypto';
import { FactStatus } from './fact.types.js';

class FactRepository {
  constructor() {
    this.facts = new Map(); // factId -> Fact
    this.factsByTickerMetricPeriod = new Map(); // `${ticker}:${metric}:${period}` -> Array of Facts (ordered by version)
    this.rawDocuments = new Map(); // sourceDocumentId -> DocumentRecord
  }

  /**
   * Stores a raw document record.
   * @param {Object} docRecord
   */
  storeRawDocument(docRecord) {
    if (!docRecord || !docRecord.sourceDocumentId) {
      throw new Error('Valid document record with sourceDocumentId required');
    }
    this.rawDocuments.set(docRecord.sourceDocumentId, Object.freeze({ ...docRecord }));
    return this.rawDocuments.get(docRecord.sourceDocumentId);
  }

  getRawDocument(sourceDocumentId) {
    return this.rawDocuments.get(sourceDocumentId) || null;
  }

  /**
   * Stores or updates a verified financial fact with versioning.
   * @param {Object} factData
   * @returns {Object} Stored Fact
   */
  storeFact(factData) {
    if (!factData || !factData.ticker || !factData.metric) {
      throw new Error('Valid fact with ticker and metric required');
    }

    const ticker = factData.ticker.toUpperCase();
    const metric = factData.metric.toUpperCase();
    const period = (factData.period || factData.periodType || 'FY2025').toUpperCase();
    const key = `${ticker}:${metric}:${period}`;

    const existingHistory = this.factsByTickerMetricPeriod.get(key) || [];
    const version = existingHistory.length + 1;
    const factId = factData.factId || `FACT-${ticker}-${metric}-${period}-V${version}`;

    const factPayload = JSON.stringify({
      factId,
      ticker,
      metric,
      period,
      value: factData.value,
      currency: factData.currency || 'USD',
      unit: factData.unit || 'RAW_UNITS',
      version,
      sourceDocumentId: factData.sourceDocumentId,
      evidenceId: factData.evidenceId,
      observedAt: factData.observedAt || new Date().toISOString()
    });

    const hash = crypto.createHash('sha256').update(factPayload).digest('hex');

    const canonicalFact = Object.freeze({
      factId,
      version,
      ticker,
      metric,
      period,
      periodStart: factData.periodStart || null,
      periodEnd: factData.periodEnd || null,
      periodType: factData.periodType || 'FY',
      value: factData.value,
      currency: factData.currency || 'USD',
      unit: factData.unit || 'RAW_UNITS',
      sourceTier: factData.sourceTier || 'TIER_1_PRIMARY',
      sourceRecordId: factData.sourceRecordId || `REC-${factId}`,
      sourceDocumentId: factData.sourceDocumentId || null,
      evidenceId: factData.evidenceId || `EVID-${factId}`,
      filingDate: factData.filingDate || new Date().toISOString().split('T')[0],
      observedAt: factData.observedAt || new Date().toISOString(),
      status: FactStatus.ACTIVE_TRUTH,
      isRestated: version > 1,
      priorFactId: version > 1 ? existingHistory[existingHistory.length - 1].factId : null,
      restatementReason: factData.restatementReason || null,
      hash
    });

    // Mark previous versions as SUPERSEDED / RESTATED without deleting them
    if (existingHistory.length > 0) {
      const updatedHistory = existingHistory.map((f, idx) => {
        if (idx === existingHistory.length - 1) {
          return Object.freeze({ ...f, status: FactStatus.SUPERSEDED });
        }
        return f;
      });
      updatedHistory.push(canonicalFact);
      this.factsByTickerMetricPeriod.set(key, updatedHistory);
    } else {
      this.factsByTickerMetricPeriod.set(key, [canonicalFact]);
    }

    this.facts.set(factId, canonicalFact);
    return canonicalFact;
  }

  getFact(factId) {
    return this.facts.get(factId) || null;
  }

  getActiveFact(ticker, metric, period = 'FY2025') {
    const key = `${ticker.toUpperCase()}:${metric.toUpperCase()}:${period.toUpperCase()}`;
    const history = this.factsByTickerMetricPeriod.get(key) || [];
    if (history.length === 0) return null;
    return history[history.length - 1];
  }

  getFactHistory(ticker, metric, period = 'FY2025') {
    const key = `${ticker.toUpperCase()}:${metric.toUpperCase()}:${period.toUpperCase()}`;
    return this.factsByTickerMetricPeriod.get(key) || [];
  }

  listFactsByTicker(ticker, { period = null, metric = null } = {}) {
    const results = [];
    const prefix = `${ticker.toUpperCase()}:`;

    for (const [key, history] of this.factsByTickerMetricPeriod.entries()) {
      if (key.startsWith(prefix)) {
        const active = history[history.length - 1];
        if (period && active.period !== period.toUpperCase()) continue;
        if (metric && active.metric !== metric.toUpperCase()) continue;
        results.push(active);
      }
    }
    return results;
  }

  clear() {
    this.facts.clear();
    this.factsByTickerMetricPeriod.clear();
    this.rawDocuments.clear();
  }
}

export const factRepository = new FactRepository();
