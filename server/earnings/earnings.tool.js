/**
 * server/earnings/earnings.tool.js
 * 
 * Phase 21: Earnings Intelligence Copilot Tool Bridge
 * Read-only interface for Copilot to query earnings events, surprise breakdowns,
 * guidance comparisons, and forecast revisions without permitting truth injection or unauthorized trades.
 */

import { defaultCorporateEventStore } from './earnings.eventStore.js';
import { defaultGuidanceEngine } from './earnings.guidance.engine.js';
import { defaultEarningsTruthBridge } from './earnings.truthBridge.js';
import { computeEarningsSurprise } from './earnings.surprise.engine.js';
import { evaluateEarningsQuality } from './earnings.quality.engine.js';
import { classifyEventImpact } from './earnings.impact.engine.js';
import { generateEarningsExplanation } from './earnings.explanation.js';

export async function executeEarningsTool(params) {
  const {
    tenantId = 'TENANT_DEFAULT',
    action = 'GET_EVENT',
    eventId,
    ticker,
    metric,
    period,
    actualFact,
    consensus,
    financials
  } = params;

  // Intercept unauthorized actions
  if (action === 'INJECT_TRUTH_FACT' || action === 'MUTATE_TRUTH_LAYER') {
    throw new Error('Copilot tool cannot inject or mutate Truth Layer facts');
  }
  if (action === 'EXECUTE_TRADE' || action === 'EXECUTE_ORDER') {
    throw new Error('Copilot tool cannot execute trades or broker orders');
  }
  if (action === 'REWRITE_THESIS' || action === 'MUTATE_FORECAST_HISTORY') {
    throw new Error('Copilot tool cannot silently mutate thesis or historical forecasts');
  }

  try {
    // 1. Get Event
    if (action === 'GET_EVENT') {
      const event = defaultCorporateEventStore.getEvent(tenantId, eventId);
      if (!event) return { success: false, error: `Event not found: ${eventId}` };
      return { success: true, type: 'CORPORATE_EVENT', data: event };
    }

    // 2. Get Timeline
    if (action === 'GET_TIMELINE') {
      const timeline = defaultCorporateEventStore.getTimeline(tenantId, ticker);
      return { success: true, type: 'EVENT_TIMELINE', ticker, count: timeline.length, timeline };
    }

    // 3. Compute Surprise
    if (action === 'COMPUTE_SURPRISE') {
      const surprise = computeEarningsSurprise(actualFact, consensus);
      return { success: true, type: 'SURPRISE_EVALUATION', data: surprise };
    }

    // 4. Evaluate Quality
    if (action === 'EVALUATE_QUALITY') {
      const quality = evaluateEarningsQuality(financials);
      return { success: true, type: 'EARNINGS_QUALITY', data: quality };
    }

    return {
      success: false,
      error: `Unsupported tool action: ${action}`
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

export const earnings_tool = executeEarningsTool;
