/**
 * test-macro-regime-engine.js
 * Suite 5: Macro Regime Detection & Classification Tests
 */

import assert from 'assert';
import { detectMacroRegime } from '../macro/macro.regime.engine.js';
import { MacroEnums } from '../macro/macro.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 5: Macro Regime Engine Tests ---');

// 1. Goldilocks Regime (Solid Growth, Low/Stable Inflation)
const goldilocks = detectMacroRegime({
  gdpGrowthYoY: 2.5,
  cpiYoY: 2.1,
  unemploymentRate: 3.9,
  ratesTrend: 'STABLE'
});
testAssert(goldilocks.regime === MacroEnums.MacroRegime.GOLDILOCKS, 'Detected GOLDILOCKS');
testAssert(goldilocks.confidence >= 0.70, 'Confidence >= 0.70');
testAssert(goldilocks.classification === 'MODEL_ESTIMATE', 'Tagged as MODEL_ESTIMATE');

// 2. Stagflation Regime (Negative/Weak Growth, High Inflation)
const stagflation = detectMacroRegime({
  gdpGrowthYoY: 0.2,
  cpiYoY: 5.8,
  unemploymentRate: 5.2,
  ratesTrend: 'RISING'
});
testAssert(stagflation.regime === MacroEnums.MacroRegime.STAGFLATION, 'Detected STAGFLATION');
testAssert(stagflation.supportingEvidence.length > 0, 'Includes supporting evidence');

// 3. Recession Regime (Negative Growth, Falling Inflation)
const recession = detectMacroRegime({
  gdpGrowthYoY: -1.8,
  cpiYoY: 1.2,
  unemploymentRate: 6.5,
  ratesTrend: 'FALLING'
});
testAssert(recession.regime === MacroEnums.MacroRegime.RECESSION, 'Detected RECESSION');

// 4. Overheating Regime (High Growth, High Inflation)
const overheating = detectMacroRegime({
  gdpGrowthYoY: 4.8,
  cpiYoY: 5.2,
  unemploymentRate: 3.4,
  ratesTrend: 'RISING'
});
testAssert(overheating.regime === MacroEnums.MacroRegime.OVERHEATING, 'Detected OVERHEATING');

// 5. Immutability verification
let mutError = false;
try {
  goldilocks.regime = 'MUTATED';
} catch {
  mutError = true;
}
testAssert(mutError, 'Regime output is deeply frozen');

console.log(`[PASS] Suite 5 Macro Regime Engine passed: ${assertionCount} assertions`);
export default { assertionCount };
