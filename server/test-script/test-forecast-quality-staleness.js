/**
 * server/test-script/test-forecast-quality-staleness.js
 * 
 * Phase 20: Forecast Quality & Staleness Lifecycle Tests
 */

import assert from 'assert';
import { evaluateForecastFreshness, computeForecastQualityScore } from '../forecasting/forecast.quality.engine.js';
import { ForecastFreshnessStatus, ForecastClassification } from '../forecasting/forecast.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 20 QUALITY & STALENESS TESTS ---');

const baseDate = '2026-06-01T00:00:00Z';

// 1. Freshness: Current (10 days old)
const date10DaysOld = '2026-05-22T00:00:00Z';
const freshCurrent = evaluateForecastFreshness(date10DaysOld, baseDate);
testAssert(freshCurrent.freshnessStatus === ForecastFreshnessStatus.CURRENT, '10-day old forecast is CURRENT');
testAssert(freshCurrent.ageDays === 10, 'Age is 10 days');

// 2. Freshness: Aging (45 days old)
const date45DaysOld = '2026-04-17T00:00:00Z';
const freshAging = evaluateForecastFreshness(date45DaysOld, baseDate);
testAssert(freshAging.freshnessStatus === ForecastFreshnessStatus.AGING, '45-day old forecast is AGING');

// 3. Freshness: Stale (120 days old)
const date120DaysOld = '2026-02-01T00:00:00Z';
const freshStale = evaluateForecastFreshness(date120DaysOld, baseDate);
testAssert(freshStale.freshnessStatus === ForecastFreshnessStatus.STALE, '120-day old forecast is STALE');

// 4. Freshness: Expired (200 days old)
const date200DaysOld = '2025-11-13T00:00:00Z';
const freshExpired = evaluateForecastFreshness(date200DaysOld, baseDate);
testAssert(freshExpired.freshnessStatus === ForecastFreshnessStatus.EXPIRED, '200-day old forecast is EXPIRED');

// 5. Quality Score: High Quality Forecast
const highQualityRecord = {
  ticker: 'AAPL',
  createdAt: new Date().toISOString(),
  baselineEvidenceIds: ['EVID-10K-2025', 'EVID-10Q-Q3', 'EVID-TRANSCRIPT-Q3'], // 3 * 10 = 30 pts
  assumptions: {
    growth: 0.10,
    margin: 0.30,
    tax: 0.20,
    capex: 0.05,
    da: 0.04 // 5 * 5 = 25 pts
  },
  uncertainty: {
    lowerBound95: 100,
    upperBound95: 120 // 20 pts
  }
  // Freshness: CURRENT = 25 pts
  // Total expected = 30 + 25 + 20 + 25 = 100 pts
};

const qHigh = computeForecastQualityScore(highQualityRecord);
testAssert(qHigh.totalQualityScore === 100, `High quality score is 100, got ${qHigh.totalQualityScore}`);
testAssert(qHigh.qualityRating === 'HIGH', 'Rating is HIGH');
testAssert(qHigh.classification === ForecastClassification.DERIVED, 'Quality score is DERIVED');

// 6. Quality Score: Low Quality / Stale Forecast
const lowQualityRecord = {
  ticker: 'STALE_CO',
  createdAt: '2025-01-01T00:00:00Z', // EXPIRED = 0 pts
  baselineEvidenceIds: ['EVID-1'], // 10 pts
  assumptions: { g: 0.05 }, // 5 pts
  uncertainty: null // 5 pts
  // Total expected = 10 + 5 + 5 + 0 = 20 pts
};

const qLow = computeForecastQualityScore(lowQualityRecord);
testAssert(qLow.totalQualityScore === 20, `Low quality score is 20, got ${qLow.totalQualityScore}`);
testAssert(qLow.qualityRating === 'LOW', 'Rating is LOW');

console.log(`[PASS] Phase 20 Quality & Staleness tests passed: ${assertionCount} assertions`);

export default { assertionCount };
