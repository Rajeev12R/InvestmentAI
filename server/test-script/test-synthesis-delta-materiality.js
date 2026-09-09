/**
 * test-synthesis-delta-materiality.js
 * Suite 10: Research Delta & Materiality Rules Engine Tests
 */

import assert from 'assert';
import { defaultResearchDeltaEngine, DEFAULT_MATERIALITY_THRESHOLDS } from '../researchSynthesis/synthesis.delta.engine.js';
import { ClaimMateriality } from '../researchSynthesis/synthesis.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 10: Delta & Materiality Engine Tests ---');

// 1. Material vs Non-Material Valuation Changes
const contextBase = {
  domains: {
    valuation: { dcfFairValue: 100.0 },
    forecast: { forwardEps: 5.00 },
    risk: { overallRiskScore: 40 }
  }
};

// 2% change in valuation (threshold is 5%) -> SECONDARY
const contextSmallChange = {
  domains: {
    valuation: { dcfFairValue: 102.0 }, // +2%
    forecast: { forwardEps: 5.00 },
    risk: { overallRiskScore: 40 }
  }
};
const resSmall = defaultResearchDeltaEngine.compareResearchContexts(contextBase, contextSmallChange);
testAssert(resSmall.totalChangesCount === 1, '1 total change found');
testAssert(resSmall.materialChangesCount === 0, '0 material changes (< 5% threshold)');
testAssert(resSmall.secondaryChangesCount === 1, '1 secondary change');
testAssert(resSmall.allChanges[0].materiality === ClaimMateriality.SECONDARY, 'Marked as SECONDARY');

// 10% change in valuation -> MATERIAL
const contextLargeChange = {
  domains: {
    valuation: { dcfFairValue: 110.0 }, // +10%
    forecast: { forwardEps: 5.00 },
    risk: { overallRiskScore: 40 }
  }
};
const resLarge = defaultResearchDeltaEngine.compareResearchContexts(contextBase, contextLargeChange);
testAssert(resLarge.materialChangesCount === 1, '1 material change (>= 5% threshold)');
testAssert(resLarge.materialChanges[0].materiality === ClaimMateriality.MATERIAL, 'Marked as MATERIAL');

// Risk score shift of 15 points (threshold is 10) -> MATERIAL
const contextRiskShift = {
  domains: {
    valuation: { dcfFairValue: 100.0 },
    forecast: { forwardEps: 5.00 },
    risk: { overallRiskScore: 55 } // +15 points
  }
};
const resRisk = defaultResearchDeltaEngine.compareResearchContexts(contextBase, contextRiskShift);
testAssert(resRisk.materialChangesCount === 1, 'Risk shift flagged MATERIAL');

console.log(`[PASS] Suite 10 Delta & Materiality Engine passed: ${assertionCount} assertions`);
export default { assertionCount };
