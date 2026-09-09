/**
 * server/test-script/test-earnings-guidance-analysis.js
 * 
 * Phase 21: Corporate Guidance Analysis & 3-Way Comparison Unit Tests
 */

import assert from 'assert';
import { GuidanceEngine } from '../earnings/earnings.guidance.engine.js';
import { GuidanceRevisionDirection, EventClassification } from '../earnings/earnings.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 21 GUIDANCE ANALYSIS TESTS ---');

const guidanceEngine = new GuidanceEngine();

// 1. Record Initial FY2026 Guidance ($100B - $105B, Midpoint $102.5B)
const g1 = guidanceEngine.recordGuidance('AAPL', {
  metric: 'REVENUE',
  period: 'FY2026',
  low: 100000000000,
  high: 105000000000,
  commentary: 'Initial annual revenue guidance'
}, '2025-10-30T21:00:00Z');

testAssert(g1.midpoint === 102500000000, 'Initial guidance midpoint is $102.5B');
testAssert(g1.rangeSpread === 5000000000, 'Range spread is $5B');
testAssert(g1.revisionDirection === GuidanceRevisionDirection.INITIATED, 'Initial guidance is INITIATED');
testAssert(g1.version === 1, 'Version is 1');

// 2. Record Upgraded Guidance ($108B - $112B, Midpoint $110B)
const g2 = guidanceEngine.recordGuidance('AAPL', {
  metric: 'REVENUE',
  period: 'FY2026',
  low: 108000000000,
  high: 112000000000,
  commentary: 'Upgraded guidance following strong demand'
}, '2026-01-30T21:00:00Z');

testAssert(g2.midpoint === 110000000000, 'Upgraded midpoint is $110.0B');
testAssert(g2.revisionDirection === GuidanceRevisionDirection.RAISE, 'Revision direction is RAISE');
testAssert(g2.deltaMidpoint === 7500000000, 'Delta midpoint is +$7.5B');
testAssert(g2.version === 2, 'Version is 2');

// 3. Record Downward Revision ($102B - $106B, Midpoint $104B)
const g3 = guidanceEngine.recordGuidance('AAPL', {
  metric: 'REVENUE',
  period: 'FY2026',
  low: 102000000000,
  high: 106000000000
}, '2026-04-30T21:00:00Z');

testAssert(g3.revisionDirection === GuidanceRevisionDirection.CUT, 'Revision direction is CUT');
testAssert(g3.deltaMidpoint === -6000000000, 'Delta midpoint is -$6.0B');

// 4. 3-Way Comparison (Company Guidance vs Consensus vs Internal Forecast)
const comparison = guidanceEngine.compareGuidanceConsensusInternal(
  'AAPL',
  'REVENUE',
  'FY2026',
  { meanEstimate: 103000000000 },
  { forecastValue: 105000000000 }
);

testAssert(comparison.guidance !== null, 'Guidance present in comparison');
testAssert(comparison.guidance.midpoint === 104000000000, 'Active guidance midpoint is $104B');
testAssert(comparison.consensus.value === 103000000000, 'Consensus is $103B');
testAssert(comparison.internalForecast.value === 105000000000, 'Internal is $105B');
testAssert(comparison.comparison.deltaGuidanceVsConsensus === 1000000000, 'Guidance is +$1B above consensus');
testAssert(comparison.comparison.deltaInternalVsGuidance === 1000000000, 'Internal forecast is +$1B above guidance');

console.log(`[PASS] Phase 21 Guidance Analysis tests passed: ${assertionCount} assertions`);

export default { assertionCount };
