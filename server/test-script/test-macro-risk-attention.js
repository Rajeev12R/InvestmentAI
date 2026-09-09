/**
 * test-macro-risk-attention.js
 * Suite 10: Macro Risk (Phase 3) & Attention (Phase 7) Bridge Tests
 */

import assert from 'assert';
import { generateMacroRiskSignals } from '../macro/macro.risk.bridge.js';
import { generateMacroAttentionSignal } from '../macro/macro.attention.bridge.js';
import { MacroEnums } from '../macro/macro.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 10: Macro Risk & Attention Bridge Tests ---');

// 1. Risk bridge generation with unique riskSourceId
const regimeData = {
  regime: MacroEnums.MacroRegime.STAGFLATION,
  confidence: 0.85,
  supportingEvidence: ['CPI YoY at 5.5%', 'GDP Growth slowing to 0.4%'],
  transitionMatrix: {}
};

const riskSignals = generateMacroRiskSignals(regimeData, {
  portfolioId: 'PORT-101',
  positions: [{ ticker: 'NVDA', sensitivities: { INFLATION: -0.8, RATES: -1.2 } }]
});

testAssert(Array.isArray(riskSignals), 'Risk signals is an array');
testAssert(riskSignals.length > 0, 'Generated risk signals');
const firstSig = riskSignals[0];
testAssert(firstSig.riskSourceId.startsWith('MACRO-RISK-'), 'Unique riskSourceId prefixed MACRO-RISK-');
testAssert(firstSig.classification === 'MODEL_ESTIMATE', 'Tagged as MODEL_ESTIMATE');
testAssert(firstSig.regime === MacroEnums.MacroRegime.STAGFLATION, 'Regime preserved in risk signal');

// 2. Attention bridge generation (additive, non-mutating)
const attentionSignal = generateMacroAttentionSignal({
  macroMetric: 'US_CPI_YOY',
  surpriseMagnitude: 0.8, // high surprise
  threshold: 0.5,
  regimeChange: true,
  previousRegime: MacroEnums.MacroRegime.GOLDILOCKS,
  newRegime: MacroEnums.MacroRegime.LATE_CYCLE_SLOWDOWN
});

testAssert(attentionSignal.classification === 'MODEL_ESTIMATE', 'Tagged as MODEL_ESTIMATE');
testAssert(attentionSignal.attentionScore >= 70, 'Attention score is high for regime shift');
testAssert(attentionSignal.additive === true, 'Attention signal marked additive');
testAssert(attentionSignal.rationale.includes('Regime change'), 'Rationale mentions regime change');

// 3. Immutability
let mutErr = false;
try {
  attentionSignal.attentionScore = 100;
} catch {
  mutErr = true;
}
testAssert(mutErr, 'Attention signal is frozen');

console.log(`[PASS] Suite 10 Macro Risk & Attention Bridges passed: ${assertionCount} assertions`);
export default { assertionCount };
