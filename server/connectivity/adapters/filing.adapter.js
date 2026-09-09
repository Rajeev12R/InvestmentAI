/**
 * @file filing.adapter.js
 * Normalized Institutional Regulatory Filing Adapter with Document Versioning for Phase 10.
 */

import crypto from 'crypto';
import { BaseProviderAdapter } from './base.adapter.js';
import { SourceTier, SourceCategory, DocumentType } from '../source.types.js';
import { sourceRegistry } from '../sourceRegistry.js';

export class FilingAdapter extends BaseProviderAdapter {
  constructor() {
    super({
      sourceId: 'SRC-SEC-EDGAR',
      sourceName: 'SEC EDGAR / Regulatory Filings',
      tier: SourceTier.TIER_1_PRIMARY,
      category: SourceCategory.FILINGS
    });
    this.documentVersions = new Map(); // `${ticker}:${documentType}:${period}` -> Array of versions
  }

  async getFilings(ticker, { documentType = DocumentType.FORM_10K, period = '2025' } = {}) {
    if (!ticker) throw new Error('ticker is required for filings lookup');
    const sourceId = ticker.endsWith('.NS') ? 'SRC-NSE-BSE-INDIA' : this.sourceId;
    const cb = sourceRegistry.getCircuitBreaker(sourceId);

    return await cb.execute(async () => {
      const docType = ticker.endsWith('.NS') ? DocumentType.NSE_FILING : documentType;
      const key = `${ticker.toUpperCase()}:${docType}:${period}`;

      const textSummary = `Annual regulatory filing for ${ticker.toUpperCase()} covering financial period ${period}. Contains audited financial statements and notes.`;
      const contentHash = crypto.createHash('sha256').update(textSummary).digest('hex');
      const docId = `DOC-${ticker.toUpperCase()}-${docType}-${period}-V1`;

      const rawDoc = {
        id: docId,
        version: 1,
        sourceId,
        sourceTier: this.tier,
        issuer: ticker.toUpperCase(),
        documentType: docType,
        publishedAt: '2025-11-01T00:00:00.000Z',
        retrievedAt: new Date().toISOString(),
        reportingPeriod: period,
        contentHash,
        canonicalUri: `https://data.sec.gov/edgar/${ticker.toLowerCase()}/${period}/${docType}.htm`,
        summary: textSummary
      };

      if (!this.documentVersions.has(key)) {
        this.documentVersions.set(key, [rawDoc]);
      }

      return {
        ticker: ticker.toUpperCase(),
        documentType: docType,
        period,
        latestVersion: rawDoc.version,
        versionsCount: this.documentVersions.get(key).length,
        document: rawDoc,
        allVersions: this.documentVersions.get(key)
      };
    });
  }

  registerDocumentVersion(ticker, { documentType, period, updatedSummary, publishedAt }) {
    const key = `${ticker.toUpperCase()}:${documentType}:${period}`;
    const existing = this.documentVersions.get(key) || [];
    const nextVersion = existing.length + 1;
    const contentHash = crypto.createHash('sha256').update(updatedSummary).digest('hex');

    const newDoc = {
      id: `DOC-${ticker.toUpperCase()}-${documentType}-${period}-V${nextVersion}`,
      version: nextVersion,
      sourceId: this.sourceId,
      sourceTier: this.tier,
      issuer: ticker.toUpperCase(),
      documentType,
      publishedAt: publishedAt || new Date().toISOString(),
      retrievedAt: new Date().toISOString(),
      reportingPeriod: period,
      contentHash,
      canonicalUri: `https://data.sec.gov/edgar/${ticker.toLowerCase()}/${period}/${documentType}_v${nextVersion}.htm`,
      summary: updatedSummary
    };

    existing.push(newDoc);
    this.documentVersions.set(key, existing);
    return newDoc;
  }

  normalizeFiling(raw = {}, sourceId = this.sourceId) {
    const rawPayload = JSON.stringify({ raw, sourceId });
    const contentHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
    return {
      id: raw.id || `DOC-${contentHash.slice(0, 12)}`,
      documentType: raw.documentType || raw.form || DocumentType.UNKNOWN,
      issuer: raw.issuer || raw.symbol || raw.ticker || 'UNKNOWN',
      period: raw.period || raw.reportingPeriod || '2025',
      contentHash,
      sourceId,
      summary: raw.summary || raw.content || ''
    };
  }
}

export const filingAdapter = new FilingAdapter();
