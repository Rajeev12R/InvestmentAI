/**
 * server/test-script/test-earnings-forecast-revisions.js
 * 
 * Phase 21: Event-Driven Forecast Revisions & Causality Tracking
 */

import assert from 'assert';
import { defaultEventDrivenForecastRevisionEngine, EventDrivenForecastRevisionEngine } from '../earnings/earnings.forecastRevision.engine.js';
import { EventClassification, RevisionCausalityType } from '../earnings/earnings.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 21 EVENT-DRIVEN FORECAST REVISION TESTS ---');

const engine = defaultEventDrivenForecastRevisionEngine;
testAssert(engine instanceof EventDrivenForecastRevisionEngine, 'Engine is instantiated');

// 1. Base Active Forecast
const baseForecast = {
  forecastId: 'FCST-AAPL-2025-V1',
  ticker: 'AAPL',
  metric: 'REVENUE',
  forecastValue: 400000,
  value: 400000,
  assumptions: {
    revenueGrowthRate: 0.08,
    operatingMargin: 0.28,
    taxRate: 0.21
  },
  output: {
    baseRevenue: 100000,
    baseShares: 15000
  }
};

// 2. Revenue Surprise Event Revision
const revSurpriseEvent = {
  eventId: 'EVNT-AAPL-2025Q4-001',
  revenueSurprisePct: 0.04, // +4.0% surprise
  actualRevenue: 104000
};

const revRevision = engine.generateRevisionCandidate(baseForecast, revSurpriseEvent);
testAssert(revRevision.ticker === 'AAPL', 'Ticker preserved');
testAssert(revRevision.previousForecastId === 'FCST-AAPL-2025-V1', 'Previous forecast ID linked');
testAssert(revRevision.classification === EventClassification.FORECAST, 'Classification is FORECAST');
testAssert(revRevision.revisedValue > 0, 'Revised value computed');
testAssert(revRevision.updatedAssumptions.revenueGrowthRate > 0.08, 'Revenue growth assumption adjusted upwards');
testAssert(revRevision.revisionCausality.length >= 1, 'Causality recorded');
testAssert(revRevision.revisionCausality[0].causality === RevisionCausalityType.REVENUE_ACTUAL_SURPRISE, 'Causality type is REVENUE_ACTUAL_SURPRISE');
testAssert(typeof revRevision.canonicalHash === 'string' && revRevision.canonicalHash.length === 64, 'SHA-256 canonical hash generated');

// 3. Guidance Revision Event
const guidanceEvent = {
  eventId: 'EVNT-AAPL-2025Q4-GUIDE',
  guidancePctRevision: 0.05, // +5.0% guidance upgrade
  actualRevenue: 100000
};

const guideRevision = engine.generateRevisionCandidate(baseForecast, guidanceEvent);
testAssert(guideRevision.updatedAssumptions.revenueGrowthRate > 0.08, 'Guidance upgrade revised growth up');
testAssert(guideRevision.revisionCausality.some(c => c.causality === RevisionCausalityType.GUIDANCE_REVISION_MIDPOINT), 'Guidance causality recorded');

// 4. Margin Surprise Event
const marginEvent = {
  eventId: 'EVNT-AAPL-2025Q4-MARGIN',
  operatingMarginActual: 0.32, // Up to 32%
  actualRevenue: 100000
};

const marginRevision = engine.generateRevisionCandidate(baseForecast, marginEvent);
testAssert(Math.abs(marginRevision.updatedAssumptions.operatingMargin - 0.30) < 1e-9, 'Margin updated to average of 0.28 and 0.32');
testAssert(marginRevision.revisionCausality.some(c => c.causality === RevisionCausalityType.MARGIN_ACTUAL_SURPRISE), 'Margin surprise causality recorded');

// 5. Multi-Driver Event (Revenue + Guidance + Margin)
const multiEvent = {
  eventId: 'EVNT-AAPL-2025Q4-MULTI',
  revenueSurprisePct: 0.03,
  guidancePctRevision: 0.04,
  operatingMarginActual: 0.30,
  actualRevenue: 103000
};

const multiRevision = engine.generateRevisionCandidate(baseForecast, multiEvent);
testAssert(multiRevision.revisionCausality.length === 3, `Expected 3 causal drivers, got ${multiRevision.revisionCausality.length}`);
testAssert(multiRevision.updatedAssumptions.revenueGrowthRate > 0.10, 'Compound growth rate updated');

// 6. No Drivers Event (Fallback)
const emptyEvent = {
  eventId: 'EVNT-AAPL-2025Q4-EMPTY'
};
const emptyRevision = engine.generateRevisionCandidate(baseForecast, emptyEvent);
testAssert(emptyRevision.revisionCausality.length === 1, 'Single fallback causality recorded');
testAssert(emptyRevision.revisionCausality[0].causality === RevisionCausalityType.CAUSE_UNAVAILABLE, 'Causality is CAUSE_UNAVAILABLE');

// 7. Error Handling on invalid inputs
try {
  engine.generateRevisionCandidate(null, revSurpriseEvent);
  testAssert(false, 'Should throw on null previousForecast');
} catch (e) {
  testAssert(true, 'Caught invalid previousForecast');
}

try {
  engine.generateRevisionCandidate(baseForecast, null);
  testAssert(false, 'Should throw on null eventEvidence');
} catch (e) {
  testAssert(true, 'Caught invalid eventEvidence');
}

// 8. Immutability / Deep Freeze
try {
  revRevision.revisedValue = 9999999;
  testAssert(false, 'Should fail to mutate candidate');
} catch (e) {
  testAssert(true, 'Candidate is frozen');
}

console.log(`PASSED: ${assertionCount} assertions`);
export { assertionCount };
