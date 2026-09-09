/**
 * test-synthesis-model-agreement.js
 * Suite 5: Valuation Model Disagreement & Contradictory Evidence Surfacing Tests
 */

import assert from 'assert';
import { defaultModelAgreementEngine } from '../researchSynthesis/synthesis.modelAgreement.engine.js';
import { ModelAgreementClass } from '../researchSynthesis/synthesis.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 5: Model Agreement & Contradictions Tests ---');

// 1. Convergent Model Agreement (< 10% dispersion)
const convRes = defaultModelAgreementEngine.evaluateModelAgreement({
  dcfFairValue: 150.0,
  relativeFairValue: 155.0,
  reverseDcfFairValue: 148.0
});
testAssert(convRes.agreementClass === ModelAgreementClass.CONVERGENT, 'Classified as CONVERGENT');
testAssert(convRes.dispersionSpreadPct < 10.0, 'Dispersion spread < 10%');

// 2. Divergent Model Agreement (> 25% dispersion)
const divRes = defaultModelAgreementEngine.evaluateModelAgreement({
  dcfFairValue: 120.0,
  relativeFairValue: 190.0,
  reverseDcfFairValue: 140.0
});
testAssert(divRes.agreementClass === ModelAgreementClass.DIVERGENT, 'Classified as DIVERGENT');
testAssert(divRes.dispersionSpreadPct > 25.0, 'Dispersion spread > 25%');
testAssert(divRes.driversOfDisagreement.length > 0, 'Drivers of disagreement surfaced');

// 3. Conflicting Model Signals relative to spot price
const confRes = defaultModelAgreementEngine.evaluateModelAgreement({
  dcfFairValue: 200.0, // +33% upside
  relativeFairValue: 100.0 // -33% downside
}, 150.0); // Spot $150
testAssert(confRes.agreementClass === ModelAgreementClass.CONFLICTING, 'Classified as CONFLICTING');

// 4. Evidence Contradiction Surfacing
const signals = [
  { category: 'EARNINGS_SURPRISE', direction: 'POSITIVE', text: 'Q4 EPS beat by +15%' },
  { category: 'CASH_CONVERSION', direction: 'NEGATIVE', text: 'Operating cash flow down -25%' }
];
const contraRes = defaultModelAgreementEngine.surfaceEvidenceContradictions(signals);
testAssert(contraRes.hasContradictions === true, 'Contradiction detected');
testAssert(contraRes.totalContradictionsCount === 1, '1 contradiction pair found');
testAssert(contraRes.contradictions[0].pairType === 'EARNINGS_BEAT_VS_CASH_DEVIATION', 'Identified earnings beat vs cash deviation');

console.log(`[PASS] Suite 5 Model Agreement & Contradictions passed: ${assertionCount} assertions`);
export default { assertionCount };
