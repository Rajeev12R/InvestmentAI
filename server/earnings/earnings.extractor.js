/**
 * server/earnings/earnings.extractor.js
 * 
 * Phase 21: Deterministic Fact Extractor & TruthUpdateCandidate Builder
 * Extracts canonical financial line items from corporate events and formats validated candidates.
 */

import { EventClassification, canonicalHash } from './earnings.types.js';

export class EarningsFactExtractor {
  /**
   * Deterministically extracts financial facts from an event payload
   * 
   * @param {Object} eventRecord - Stored corporate event
   * @returns {Array<Object>} List of validated TruthUpdateCandidate objects
   */
  extractFacts(eventRecord) {
    if (!eventRecord || !eventRecord.payload) {
      throw new Error('Valid eventRecord with payload required for extraction');
    }

    const payload = eventRecord.payload;
    const candidates = [];
    const ticker = eventRecord.securityId.toUpperCase();
    const period = eventRecord.reportingPeriod.toUpperCase();
    const pubDate = eventRecord.publicationTimestamp;

    // Supported financial statement line items
    const metricMappings = [
      { key: 'revenue', metric: 'REVENUE', unit: 'USD' },
      { key: 'eps', metric: 'DILUTED_EPS', unit: 'USD_PER_SHARE' },
      { key: 'dilutedEps', metric: 'DILUTED_EPS', unit: 'USD_PER_SHARE' },
      { key: 'netIncome', metric: 'NET_INCOME', unit: 'USD' },
      { key: 'ebitda', metric: 'EBITDA', unit: 'USD' },
      { key: 'ebit', metric: 'OPERATING_INCOME', unit: 'USD' },
      { key: 'grossProfit', metric: 'GROSS_PROFIT', unit: 'USD' },
      { key: 'cfo', metric: 'OPERATING_CASH_FLOW', unit: 'USD' },
      { key: 'operatingCashFlow', metric: 'OPERATING_CASH_FLOW', unit: 'USD' },
      { key: 'capex', metric: 'CAPEX', unit: 'USD' },
      { key: 'fcf', metric: 'FREE_CASH_FLOW', unit: 'USD' },
      { key: 'cash', metric: 'CASH_AND_EQUIVALENTS', unit: 'USD' },
      { key: 'totalDebt', metric: 'TOTAL_DEBT', unit: 'USD' },
      { key: 'shares', metric: 'DILUTED_SHARES', unit: 'COUNT' }
    ];

    for (const mapping of metricMappings) {
      const val = payload[mapping.key];
      if (val !== undefined && val !== null) {
        if (typeof val !== 'number' || !Number.isFinite(val)) {
          throw new TypeError(`Extracted fact ${mapping.metric} must be a finite number, got: ${val}`);
        }

        const candidateId = `TUC-${ticker}-${mapping.metric}-${period}-${eventRecord.eventId.slice(-6)}`;
        const candidate = {
          candidateId,
          ticker,
          metric: mapping.metric,
          value: val,
          unit: mapping.unit,
          period,
          asOfDate: pubDate,
          sourceEventId: eventRecord.eventId,
          sourceId: eventRecord.sourceId,
          sourceTier: eventRecord.sourceTier,
          evidenceId: eventRecord.evidenceId,
          evidenceHash: eventRecord.evidenceHash,
          classification: EventClassification.REAL_DATA,
          extractionStatus: 'VALIDATED_DETERMINISTIC',
          timestamp: new Date().toISOString()
        };

        candidate.canonicalHash = canonicalHash({
          ticker: candidate.ticker,
          metric: candidate.metric,
          value: candidate.value,
          period: candidate.period,
          evidenceHash: candidate.evidenceHash
        });

        candidates.push(candidate);
      }
    }

    return candidates;
  }
}

export const defaultEarningsFactExtractor = new EarningsFactExtractor();
export function extractCorporateFacts(eventRecord) {
  return defaultEarningsFactExtractor.extractFacts(eventRecord);
}
