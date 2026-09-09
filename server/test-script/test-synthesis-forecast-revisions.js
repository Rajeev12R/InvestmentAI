/**
 * test-synthesis-forecast-revisions.js
 * Suite 8: Forecast Revision Synthesis, Causality & Valuation Consequence Tests
 */

import assert from 'assert';
import { defaultResearchDeltaEngine } from '../researchSynthesis/synthesis.delta.engine.js';
import { defaultResearchNarrativeEngine } from '../researchSynthesis/synthesis.narrative.engine.js';
import { defaultResearchContextBuilder } from '../researchSynthesis/synthesis.context.builder.js';
import { ClaimMateriality } from '../researchSynthesis/synthesis.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 8: Forecast Revision Synthesis Tests ---');

// 1. Context before earnings beat
const contextBefore = defaultResearchContextBuilder.buildResearchContext('AAPL', '2026-01-01T00:00:00.000Z', 'FULL', {
  forecast: { forwardEps: 4.50 },
  valuation: { dcfFairValue: 150.0 },
  earnings: { reportedEps: 1.15 }
});

// 2. Context after earnings beat & forecast upgrade
const contextAfter = defaultResearchContextBuilder.buildResearchContext('AAPL', '2026-02-01T00:00:00.000Z', 'FULL', {
  forecast: { forwardEps: 5.00 }, // +11.1% revision
  valuation: { dcfFairValue: 168.0 }, // +12.0% revision
  earnings: { reportedEps: 1.35 }
});

const deltaRes = defaultResearchDeltaEngine.compareResearchContexts(contextBefore, contextAfter);

testAssert(deltaRes.materialChangesCount >= 2, 'Material forecast and valuation changes flagged');
const fcstDelta = deltaRes.materialChanges.find(c => c.domain === 'FORECAST');
testAssert(fcstDelta !== undefined, 'Forecast revision delta identified');
testAssert(fcstDelta.materiality === ClaimMateriality.MATERIAL, 'Forecast revision marked MATERIAL');
testAssert(fcstDelta.oldValue === 4.50 && fcstDelta.newValue === 5.00, 'Exact old and new values preserved');

const valDelta = deltaRes.materialChanges.find(c => c.domain === 'VALUATION');
testAssert(valDelta !== undefined, 'Valuation consequence delta identified');
testAssert(valDelta.materiality === ClaimMateriality.MATERIAL, 'Valuation shift marked MATERIAL');

// 3. Narrative generation includes revision commentary
const brief = defaultResearchNarrativeEngine.generateStructuredBrief(contextAfter);
testAssert(brief.sections.whatChanged.length > 0, 'Narrative whatChanged section populated');
testAssert(brief.claims.some(c => c.claimType === 'FORECAST'), 'Forecast claim registered');

console.log(`[PASS] Suite 8 Forecast Revision Synthesis passed: ${assertionCount} assertions`);
export default { assertionCount };
