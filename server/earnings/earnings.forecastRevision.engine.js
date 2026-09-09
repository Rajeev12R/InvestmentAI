/**
 * server/earnings/earnings.forecastRevision.engine.js
 * 
 * Phase 21: Event-Driven Forecast Revision Engine (Phase 20 Integration)
 * Generates deterministic forecast revision candidates from earnings surprises and guidance updates.
 * Preserves historical forecast immutability and enforces explicit revision causality attribution.
 */

import { EventClassification, RevisionCausalityType, canonicalHash, deepFreeze } from './earnings.types.js';
import { defaultRevisionEngine } from '../forecasting/forecast.revisions.engine.js';
import { forecastFundamentalStatements } from '../forecasting/forecast.fundamental.engine.js';

export class EventDrivenForecastRevisionEngine {
  /**
   * Generates a forecast revision candidate based on newly validated earnings evidence
   * 
   * @param {Object} previousForecast - Active Phase 20 forecast record (Version V_k)
   * @param {Object} eventEvidence - Validated earnings facts or guidance updates
   * @returns {Object} New revision candidate record (Version V_k+1)
   */
  generateRevisionCandidate(previousForecast, eventEvidence) {
    if (!previousForecast || typeof previousForecast !== 'object') {
      throw new Error('Valid previousForecast is required for event-driven revision');
    }
    if (!eventEvidence || typeof eventEvidence !== 'object') {
      throw new Error('Valid eventEvidence is required for event-driven revision');
    }

    const prevVal = typeof previousForecast.value === 'number' ? previousForecast.value : (previousForecast.forecastValue || 0);
    const prevDrivers = previousForecast.assumptions || previousForecast.drivers || {};

    const updatedDrivers = { ...prevDrivers };
    const causalityList = [];

    // 1. Check revenue surprise effect
    if (eventEvidence.revenueSurprisePct !== undefined && typeof eventEvidence.revenueSurprisePct === 'number') {
      const growthAdj = eventEvidence.revenueSurprisePct * 0.5; // damped revision rule
      const baseGrowth = typeof prevDrivers.revenueGrowthRate === 'number' ? prevDrivers.revenueGrowthRate : 0.08;
      updatedDrivers.revenueGrowthRate = baseGrowth + growthAdj;
      causalityList.push({
        driver: 'revenueGrowthRate',
        causality: RevisionCausalityType.REVENUE_ACTUAL_SURPRISE,
        evidence: `Revenue surprise of ${(eventEvidence.revenueSurprisePct * 100).toFixed(2)}%`,
        previousDriverValue: baseGrowth,
        newDriverValue: updatedDrivers.revenueGrowthRate
      });
    }

    // 2. Check guidance update effect
    if (eventEvidence.guidancePctRevision !== undefined && typeof eventEvidence.guidancePctRevision === 'number') {
      const baseGrowth = updatedDrivers.revenueGrowthRate || (typeof prevDrivers.revenueGrowthRate === 'number' ? prevDrivers.revenueGrowthRate : 0.08);
      updatedDrivers.revenueGrowthRate = baseGrowth + (eventEvidence.guidancePctRevision * 0.6);
      causalityList.push({
        driver: 'revenueGrowthRate',
        causality: RevisionCausalityType.GUIDANCE_REVISION_MIDPOINT,
        evidence: `Guidance midpoint revised by ${(eventEvidence.guidancePctRevision * 100).toFixed(2)}%`,
        previousDriverValue: baseGrowth,
        newDriverValue: updatedDrivers.revenueGrowthRate
      });
    }

    // 3. Check margin change effect
    if (eventEvidence.operatingMarginActual !== undefined && typeof eventEvidence.operatingMarginActual === 'number') {
      const prevMargin = typeof prevDrivers.operatingMargin === 'number' ? prevDrivers.operatingMargin : 0.25;
      updatedDrivers.operatingMargin = (prevMargin + eventEvidence.operatingMarginActual) / 2.0;
      causalityList.push({
        driver: 'operatingMargin',
        causality: RevisionCausalityType.MARGIN_ACTUAL_SURPRISE,
        evidence: `Reported operating margin of ${(eventEvidence.operatingMarginActual * 100).toFixed(2)}%`,
        previousDriverValue: prevMargin,
        newDriverValue: updatedDrivers.operatingMargin
      });
    }

    if (causalityList.length === 0) {
      causalityList.push({
        driver: 'NONE',
        causality: RevisionCausalityType.CAUSE_UNAVAILABLE,
        evidence: 'No material drivers identified'
      });
    }

    // Generate revised fundamental forecast table
    const baseRev = eventEvidence.actualRevenue || previousForecast.output?.baseRevenue || 100000;
    const baseShares = eventEvidence.actualShares || previousForecast.output?.baseShares || 1000;

    const revisedFund = forecastFundamentalStatements({ baseRevenue: baseRev, baseShares: baseShares }, updatedDrivers, 3);
    const newVal = revisedFund.summary.finalYearRevenue;
    const deltaVal = newVal - prevVal;

    const now = new Date().toISOString();
    const candidate = {
      ticker: previousForecast.ticker,
      metric: previousForecast.metric,
      previousForecastId: previousForecast.forecastId,
      previousValue: prevVal,
      revisedValue: newVal,
      deltaValue: deltaVal,
      deltaPercent: prevVal !== 0 ? (deltaVal / Math.abs(prevVal)) : 0.0,
      revisedOutput: revisedFund,
      updatedAssumptions: updatedDrivers,
      revisionCausality: causalityList,
      sourceEventId: eventEvidence.eventId || null,
      createdAt: now,
      classification: EventClassification.FORECAST
    };

    candidate.canonicalHash = canonicalHash({
      ticker: candidate.ticker,
      metric: candidate.metric,
      previousForecastId: candidate.previousForecastId,
      revisedValue: candidate.revisedValue,
      deltaValue: candidate.deltaValue,
      createdAt: candidate.createdAt
    });

    return deepFreeze(candidate);
  }
}

export const defaultEventDrivenForecastRevisionEngine = new EventDrivenForecastRevisionEngine();
