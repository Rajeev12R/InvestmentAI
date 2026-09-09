/**
 * server/earnings/earnings.guidance.engine.js
 * 
 * Phase 21: Corporate Guidance Analysis Engine
 * Tracks guidance ranges, midpoints, revisions, and produces 3-way comparisons
 * (Company Guidance vs External Consensus vs Internal Forecast).
 */

import { EventClassification, GuidanceRevisionDirection } from './earnings.types.js';
import { validateGuidancePayload } from './earnings.schema.js';

export class GuidanceEngine {
  constructor() {
    // Map<guidanceKey, Array<GuidanceRecord>>
    this.guidanceStore = new Map();
  }

  _getKey(ticker, metric, period) {
    return `${ticker.toUpperCase()}#${metric.toUpperCase()}#${period.toUpperCase()}`;
  }

  /**
   * Records a guidance update
   */
  recordGuidance(ticker, guidanceData, publicationTimestamp = new Date().toISOString()) {
    validateGuidancePayload(guidanceData);

    const key = this._getKey(ticker, guidanceData.metric, guidanceData.period);
    if (!this.guidanceStore.has(key)) {
      this.guidanceStore.set(key, []);
    }

    const history = this.guidanceStore.get(key);
    const version = history.length + 1;

    let midpoint = null;
    let rangeSpread = null;

    if (typeof guidanceData.low === 'number' && typeof guidanceData.high === 'number') {
      midpoint = (guidanceData.low + guidanceData.high) / 2.0;
      rangeSpread = guidanceData.high - guidanceData.low;
    } else if (typeof guidanceData.pointEstimate === 'number') {
      midpoint = guidanceData.pointEstimate;
      rangeSpread = 0.0;
    }

    // Determine revision direction if prior guidance exists
    let revisionDirection = GuidanceRevisionDirection.INITIATED;
    let deltaMidpoint = null;
    let pctRevision = null;

    if (history.length > 0) {
      const prev = history[history.length - 1];
      if (prev.midpoint !== null && midpoint !== null) {
        deltaMidpoint = midpoint - prev.midpoint;
        pctRevision = prev.midpoint !== 0 ? (deltaMidpoint / Math.abs(prev.midpoint)) : 0.0;

        if (deltaMidpoint > 1e-6) {
          revisionDirection = GuidanceRevisionDirection.RAISE;
        } else if (deltaMidpoint < -1e-6) {
          revisionDirection = GuidanceRevisionDirection.CUT;
        } else {
          revisionDirection = GuidanceRevisionDirection.MAINTAINED;
        }
      }
    }

    const record = {
      guidanceId: `GUID-${ticker.toUpperCase()}-${guidanceData.metric.toUpperCase()}-${guidanceData.period.toUpperCase()}-V${version}`,
      ticker: ticker.toUpperCase(),
      metric: guidanceData.metric.toUpperCase(),
      period: guidanceData.period.toUpperCase(),
      low: guidanceData.low !== undefined ? guidanceData.low : null,
      high: guidanceData.high !== undefined ? guidanceData.high : null,
      pointEstimate: guidanceData.pointEstimate !== undefined ? guidanceData.pointEstimate : null,
      midpoint,
      rangeSpread,
      revisionDirection,
      deltaMidpoint,
      pctRevision,
      version,
      publicationTimestamp,
      commentary: guidanceData.commentary || null,
      classification: EventClassification.REAL_DATA
    };

    history.push(Object.freeze(record));
    return record;
  }

  /**
   * Retrieves active guidance
   */
  getLatestGuidance(ticker, metric, period) {
    const key = this._getKey(ticker, metric, period);
    const history = this.guidanceStore.get(key) || [];
    return history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * Produces a 3-way comparison (Company Guidance vs External Consensus vs Internal Forecast)
   */
  compareGuidanceConsensusInternal(ticker, metric, period, consensusRecord, internalForecast) {
    const guidance = this.getLatestGuidance(ticker, metric, period);
    const internalVal = typeof internalForecast === 'number' ? internalForecast : (internalForecast?.forecastValue || null);
    const consensusVal = typeof consensusRecord === 'number' ? consensusRecord : (consensusRecord?.meanEstimate || null);

    const gMid = guidance ? guidance.midpoint : null;

    const deltaGuidanceVsConsensus = (gMid !== null && consensusVal !== null) ? gMid - consensusVal : null;
    const deltaInternalVsGuidance = (internalVal !== null && gMid !== null) ? internalVal - gMid : null;
    const deltaInternalVsConsensus = (internalVal !== null && consensusVal !== null) ? internalVal - consensusVal : null;

    return {
      ticker: ticker.toUpperCase(),
      metric: metric.toUpperCase(),
      period: period.toUpperCase(),
      guidance: guidance ? {
        low: guidance.low,
        high: guidance.high,
        midpoint: guidance.midpoint,
        revisionDirection: guidance.revisionDirection,
        classification: EventClassification.REAL_DATA
      } : null,
      consensus: consensusVal !== null ? {
        value: consensusVal,
        classification: EventClassification.DERIVED
      } : null,
      internalForecast: internalVal !== null ? {
        value: internalVal,
        classification: EventClassification.FORECAST
      } : null,
      comparison: {
        deltaGuidanceVsConsensus,
        deltaInternalVsGuidance,
        deltaInternalVsConsensus,
        guidanceAboveConsensus: deltaGuidanceVsConsensus !== null ? deltaGuidanceVsConsensus > 0 : null,
        internalAboveGuidance: deltaInternalVsGuidance !== null ? deltaInternalVsGuidance > 0 : null,
        classification: EventClassification.DERIVED
      }
    };
  }

  clear() {
    this.guidanceStore.clear();
  }
}

export const defaultGuidanceEngine = new GuidanceEngine();
