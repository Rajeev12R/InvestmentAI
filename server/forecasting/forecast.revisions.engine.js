/**
 * server/forecasting/forecast.revisions.engine.js
 * 
 * Phase 20: Forecast Revision & Version Intelligence Engine
 * Tracks version history and generates deterministic attribution for forecast revisions.
 */

import { ForecastClassification } from './forecast.types.js';

export class ForecastRevisionEngine {
  constructor() {
    // Map<forecastKey, Array<ForecastVersionRecord>>
    this.historyByForecast = new Map();
  }

  _getKey(tenantId, ticker, metric, period) {
    return `${tenantId}#${ticker.toUpperCase()}#${metric.toUpperCase()}#${period.toUpperCase()}`;
  }

  /**
   * Records a new version of a forecast
   */
  recordForecastVersion(tenantId, forecastRecord) {
    const key = this._getKey(tenantId, forecastRecord.ticker, forecastRecord.metric, forecastRecord.period || 'FY+1');
    if (!this.historyByForecast.has(key)) {
      this.historyByForecast.set(key, []);
    }

    const history = this.historyByForecast.get(key);
    const versionNumber = history.length + 1;
    const versionedRecord = Object.freeze({
      ...forecastRecord,
      version: versionNumber,
      versionTag: `V${versionNumber}`,
      recordedAt: new Date().toISOString()
    });

    history.push(versionedRecord);
    return versionedRecord;
  }

  /**
   * Retrieves full version history for a forecast
   */
  getVersionHistory(tenantId, ticker, metric, period = 'FY+1') {
    const key = this._getKey(tenantId, ticker, metric, period);
    return this.historyByForecast.get(key) || [];
  }

  /**
   * Compares two versions and attributes drivers of revision
   */
  attributeRevision(vPrev, vCurr) {
    if (!vPrev || !vCurr) {
      throw new Error('Both previous and current forecast versions are required for revision attribution');
    }

    const prevVal = typeof vPrev === 'number' ? vPrev : (vPrev.forecastValue || vPrev.summary?.finalYearRevenue || 0);
    const currVal = typeof vCurr === 'number' ? vCurr : (vCurr.forecastValue || vCurr.summary?.finalYearRevenue || 0);

    const deltaDollar = currVal - prevVal;
    const deltaPercent = prevVal !== 0 ? (deltaDollar / Math.abs(prevVal)) : 0.0;
    const direction = deltaDollar > 1e-6 ? 'UPGRADE' : (deltaDollar < -1e-6 ? 'DOWNGRADE' : 'UNCHANGED');

    // Driver attribution comparison
    const driverDifferences = [];
    const prevAssump = vPrev.assumptions || {};
    const currAssump = vCurr.assumptions || {};

    const allKeys = Array.from(new Set([...Object.keys(prevAssump), ...Object.keys(currAssump)]));
    for (const k of allKeys) {
      const p = prevAssump[k];
      const c = currAssump[k];
      if (p !== c) {
        driverDifferences.push({
          driver: k,
          previousValue: p,
          currentValue: c,
          delta: typeof c === 'number' && typeof p === 'number' ? c - p : null,
          rationale: currAssump[`${k}_rationale`] || null
        });
      }
    }

    return {
      previousVersion: vPrev.versionTag || 'V_PREV',
      currentVersion: vCurr.versionTag || 'V_CURR',
      previousValue: prevVal,
      currentValue: currVal,
      deltaValue: deltaDollar,
      deltaDollar,
      deltaPercent,
      direction,
      driverAttribution: driverDifferences,
      classification: ForecastClassification.DERIVED
    };
  }

  recordRevision(params) {
    const tenantId = params.tenantId || 'DEFAULT_TENANT';
    const record = {
      forecastId: params.forecastId,
      ticker: params.ticker,
      metric: params.metric,
      forecastValue: params.value,
      assumptions: params.drivers,
      author: params.author,
      reason: params.reason
    };
    return this.recordForecastVersion(tenantId, record);
  }

  compareVersions(forecastId, v1Num, v2Num, tenantId = 'DEFAULT_TENANT') {
    // Look up in history
    for (const [key, history] of this.historyByForecast.entries()) {
      if (history.some(h => h.forecastId === forecastId)) {
        const v1 = history.find(h => h.version === v1Num);
        const v2 = history.find(h => h.version === v2Num);
        if (v1 && v2) {
          return this.attributeRevision(v1, v2);
        }
      }
    }
    throw new Error(`Versions V${v1Num} and V${v2Num} not found for ${forecastId}`);
  }
}

export const defaultRevisionEngine = new ForecastRevisionEngine();
