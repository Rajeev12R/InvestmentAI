/**
 * test-synthesis-decision-review.js
 * Suite 7: Historical Decision Review & Ex-Ante vs Ex-Post Tests (No Hindsight Leakage)
 */

import assert from 'assert';
import { defaultThesisDecisionReviewEngine } from '../researchSynthesis/synthesis.thesisDecision.engine.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 7: Decision Review Tests ---');

// 1. Validated Decision (Thesis Validated + Skill)
const decRecord = {
  decisionId: 'DEC_BUY_2025',
  action: 'BUY',
  entryPrice: 100.0,
  targetPrice: 130.0,
  forecastEps: 4.00,
  rationale: 'Margin expansion accelerating'
};

const outcomesPositive = {
  realizedPrice: 125.0,
  realizedReturnPct: 25.0,
  realizedEps: 4.10 // Within 10% of forecast $4.00
};

const res1 = defaultThesisDecisionReviewEngine.reviewHistoricalDecision(decRecord, outcomesPositive);
testAssert(res1.decisionId === 'DEC_BUY_2025', 'Decision ID preserved');
testAssert(res1.causalityClassification === 'THESIS_VALIDATED_SKILL', 'Classified as THESIS_VALIDATED_SKILL');
testAssert(res1.hindsightLeakagePrevented === true, 'Hindsight leakage strictly prevented');
testAssert(res1.isPriceOutcomePositive === true, 'Price outcome positive');
testAssert(res1.isFundamentalForecastAccurate === true, 'Fundamental forecast accurate');

// 2. Unintended Gain / Luck (Price went up but earnings missed forecast)
const outcomesLucky = {
  realizedPrice: 130.0,
  realizedReturnPct: 30.0,
  realizedEps: 2.50 // Missed $4.00 forecast significantly
};

const res2 = defaultThesisDecisionReviewEngine.reviewHistoricalDecision(decRecord, outcomesLucky);
testAssert(res2.causalityClassification === 'UNINTENDED_GAIN_LUCK', 'Classified as UNINTENDED_GAIN_LUCK');

// 3. Right Thesis, Wrong Timing / Macro (Forecast met but multiple compressed)
const outcomesMacroShock = {
  realizedPrice: 90.0,
  realizedReturnPct: -10.0,
  realizedEps: 4.05 // Forecast was accurate!
};

const res3 = defaultThesisDecisionReviewEngine.reviewHistoricalDecision(decRecord, outcomesMacroShock);
testAssert(res3.causalityClassification === 'RIGHT_THESIS_WRONG_TIMING_OR_MACRO', 'Classified as RIGHT_THESIS_WRONG_TIMING_OR_MACRO');

console.log(`[PASS] Suite 7 Decision Review passed: ${assertionCount} assertions`);
export default { assertionCount };
