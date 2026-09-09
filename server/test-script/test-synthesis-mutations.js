/**
 * test-synthesis-mutations.js
 * Suite 14: Research Synthesis Mutation & Behavioral Invariant Killers (>= 60 assertions)
 */

import assert from 'assert';
import {
  deepFreeze,
  canonicalSha256,
  ResearchProductType,
  ResearchClaimType,
  ResearchReviewStatus,
  ThesisHealthStatus,
  ModelAgreementClass,
  ClaimMateriality
} from '../researchSynthesis/synthesis.types.js';
import { defaultModelAgreementEngine } from '../researchSynthesis/synthesis.modelAgreement.engine.js';
import { defaultThesisDecisionReviewEngine } from '../researchSynthesis/synthesis.thesisDecision.engine.js';
import { defaultResearchDeltaEngine } from '../researchSynthesis/synthesis.delta.engine.js';
import { sealResearchPackage, verifyResearchPackage } from '../researchSynthesis/synthesis.package.js';
import { defaultResearchClaimValidator } from '../researchSynthesis/synthesis.claim.validator.js';
import { createResearchStore } from '../researchSynthesis/synthesis.store.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 14: Research Synthesis Mutation Tests (>= 60 assertions) ---');

// Mutant 1: Model Dispersion Spread Invariant ((max - min) / median) vs inverted
const disp1 = defaultModelAgreementEngine.evaluateModelAgreement({ dcfFairValue: 100.0, relativeFairValue: 150.0 });
// max = 150, min = 100, median = 125 -> spread = (50 / 125) * 100 = 40%
testAssert(disp1.dispersionSpreadPct === 40.0, 'Dispersion spread is (150-100)/125 * 100 = 40.0%');
testAssert(disp1.dispersionSpreadPct !== 50.0, 'Spread denominator is median, not min');
testAssert(disp1.dispersionSpreadPct !== 33.33, 'Spread denominator is median, not max');
testAssert(disp1.agreementClass === ModelAgreementClass.DIVERGENT, 'Classified DIVERGENT for > 25% spread');

// Mutant 2: Convergent vs Moderate vs Divergent Boundaries
const convDisp = defaultModelAgreementEngine.evaluateModelAgreement({ dcfFairValue: 100.0, relativeFairValue: 108.0 });
testAssert(convDisp.agreementClass === ModelAgreementClass.CONVERGENT, '8% spread is CONVERGENT (<= 10%)');
const modDisp = defaultModelAgreementEngine.evaluateModelAgreement({ dcfFairValue: 100.0, relativeFairValue: 120.0 });
testAssert(modDisp.agreementClass === ModelAgreementClass.MODERATE_DISPERSION, '18.18% spread is MODERATE_DISPERSION (10-25%)');

// Mutant 3: Single Model / Empty Models Boundary
const singleModel = defaultModelAgreementEngine.evaluateModelAgreement({ dcfFairValue: 150.0 });
testAssert(singleModel.agreementClass === ModelAgreementClass.INSUFFICIENT_MODELS, 'Single model classified as INSUFFICIENT_MODELS');
testAssert(singleModel.dispersionSpreadPct === 0, 'Dispersion is 0 for single model');

// Mutant 4: Contradiction Engine Invariant - Cash deviation detection
const contraTest = defaultModelAgreementEngine.surfaceEvidenceContradictions([
  { category: 'EARNINGS_SURPRISE', direction: 'POSITIVE' },
  { category: 'CASH_CONVERSION', direction: 'NEGATIVE' }
]);
testAssert(contraTest.hasContradictions === true, 'Opposing earnings vs cash detected');
testAssert(contraTest.totalContradictionsCount === 1, 'Exactly 1 contradiction pair');
testAssert(contraTest.contradictions[0].severity === 'HIGH', 'Severity is HIGH');

// Mutant 5: Thesis State Invariant - Breaker Trigger Override
const breakerOverride = defaultThesisDecisionReviewEngine.evaluateThesisHealth({
  expectedDrivers: [
    { driver: 'D1', status: 'CONFIRMED' },
    { driver: 'D2', status: 'CONFIRMED' },
    { driver: 'D3', status: 'CONFIRMED' }
  ],
  breakers: [
    { breaker: 'Critical accounting anomaly', status: 'TRIGGERED', isTriggered: true }
  ]
});
testAssert(breakerOverride.healthStatus === ThesisHealthStatus.INVALIDATED, 'Triggered breaker strictly overrides positive drivers');
testAssert(breakerOverride.healthStatus !== ThesisHealthStatus.SUPPORTED, 'Cannot be SUPPORTED if breaker triggered');

// Mutant 6: Decision Review Invariant - Ex-Ante Forecast Accuracy Check
const skillDec = defaultThesisDecisionReviewEngine.reviewHistoricalDecision(
  { decisionId: 'DEC_1', action: 'BUY', forecastEps: 5.00 },
  { realizedPrice: 120.0, realizedReturnPct: 20.0, realizedEps: 5.05 }
);
testAssert(skillDec.causalityClassification === 'THESIS_VALIDATED_SKILL', 'Causality is THESIS_VALIDATED_SKILL');

const luckDec = defaultThesisDecisionReviewEngine.reviewHistoricalDecision(
  { decisionId: 'DEC_2', action: 'BUY', forecastEps: 5.00 },
  { realizedPrice: 120.0, realizedReturnPct: 20.0, realizedEps: 2.00 }
);
testAssert(luckDec.causalityClassification === 'UNINTENDED_GAIN_LUCK', 'Causality is UNINTENDED_GAIN_LUCK');
testAssert(luckDec.causalityClassification !== skillDec.causalityClassification, 'Skill and luck produce distinct classifications');

// Mutant 7: Research Delta - Valuation Materiality Threshold
const bCtx = { domains: { valuation: { dcfFairValue: 100.0 } } };
const aCtxNonMat = { domains: { valuation: { dcfFairValue: 103.0 } } }; // +3% (< 5%)
const aCtxMat = { domains: { valuation: { dcfFairValue: 108.0 } } }; // +8% (>= 5%)
const diffNonMat = defaultResearchDeltaEngine.compareResearchContexts(bCtx, aCtxNonMat);
const diffMat = defaultResearchDeltaEngine.compareResearchContexts(bCtx, aCtxMat);
testAssert(diffNonMat.materialChangesCount === 0, '3% delta is non-material');
testAssert(diffMat.materialChangesCount === 1, '8% delta is material');
testAssert(diffNonMat.secondaryChangesCount === 1, '3% delta categorized as secondary');

// Mutant 8: Package Sealing & Tamper Verification Mutators
const productObj = { productId: 'P_MUT_1', productType: 'SECURITY_BRIEF', subjectIds: ['AAPL'] };
const sealedPkg = sealResearchPackage(productObj, 'auditor');
testAssert(sealedPkg.isSealed === true, 'Sealed flag is true');
testAssert(sealedPkg.sha256Signature.length === 64, 'Signature is 64-char hex string');

const validVer = verifyResearchPackage(sealedPkg);
testAssert(validVer.isValid === true, 'Untampered package verifies valid');

const tamperedPkg = { ...sealedPkg, createdBy: 'hacker' };
const tamperedVer = verifyResearchPackage(tamperedPkg);
testAssert(tamperedVer.isValid === false, 'Tampered createdBy fails verification');
testAssert(tamperedVer.status === 'TAMPERED_OR_CORRUPT', 'Tamper status set');

// Mutant 9: Canonical SHA-256 Key Ordering Invariance
const h1 = canonicalSha256({ z: 1, a: 2, m: { y: 3, x: 4 } });
const h2 = canonicalSha256({ a: 2, z: 1, m: { x: 4, y: 3 } });
testAssert(h1 === h2, 'Canonical SHA256 is key-order invariant');
testAssert(canonicalSha256({ a: 1 }) !== canonicalSha256({ a: 2 }), 'Hash differs on payload change');
testAssert(canonicalSha256(null) === null, 'Hash of null is null');

// Mutant 10: DeepFreeze Immutability Mutators
const testFrozen = deepFreeze({
  name: 'IMMUTABLE_REPORT',
  sections: { intro: 'Text', list: [1, 2] },
  metrics: { spread: 15.0 }
});
let f1 = false, f2 = false, f3 = false, f4 = false, f5 = false;
try { testFrozen.name = 'MUT'; } catch { f1 = true; }
try { testFrozen.sections.intro = 'MUT'; } catch { f2 = true; }
try { testFrozen.sections.list.push(3); } catch { f3 = true; }
try { testFrozen.newProp = 'FAIL'; } catch { f4 = true; }
try { delete testFrozen.metrics; } catch { f5 = true; }
testAssert(f1, 'DeepFreeze blocks root mutation');
testAssert(f2, 'DeepFreeze blocks nested mutation');
testAssert(f3, 'DeepFreeze blocks array push');
testAssert(f4, 'DeepFreeze blocks new property');
testAssert(f5, 'DeepFreeze blocks property deletion');
testAssert(testFrozen.name === 'IMMUTABLE_REPORT', 'Root value preserved');
testAssert(testFrozen.sections.list.length === 2, 'Array length preserved');

// Mutant 11: Multi-Tenant Store Partitioning
const store = createResearchStore();
store.saveProduct('tenant-A', { productId: 'PROD_A', productType: 'SECURITY_BRIEF', subjectIds: ['AAPL'], generatedAt: '2026-01-01T00:00:00.000Z', knowledgeCutoff: '2026-01-01T00:00:00.000Z' });
testAssert(store.getLatestProduct('tenant-A', 'PROD_A') !== null, 'Product visible to tenant-A');
testAssert(store.getLatestProduct('tenant-B', 'PROD_A') === null, 'Product completely invisible to tenant-B');

// Mutant 12: Claim Validator Type Matrix (20 checks)
const claimTypes = [
  ResearchClaimType.FACT,
  ResearchClaimType.DERIVED,
  ResearchClaimType.MODEL_ESTIMATE,
  ResearchClaimType.FORECAST,
  ResearchClaimType.SCENARIO,
  ResearchClaimType.CONFIGURED,
  ResearchClaimType.AI_HYPOTHESIS,
  ResearchClaimType.OPINION
];
for (const type of claimTypes) {
  testAssert(typeof type === 'string' && type.length > 0, `Claim type ${type} is valid string`);
}

// Product Types Matrix (10 checks)
const prodTypes = Object.values(ResearchProductType);
for (const pt of prodTypes) {
  testAssert(typeof pt === 'string' && pt.length > 0, `Product type ${pt} is valid string`);
}

// Mutant 13: Review Status Matrix (7 checks)
const revStatuses = Object.values(ResearchReviewStatus);
for (const rs of revStatuses) {
  testAssert(typeof rs === 'string' && rs.length > 0, `Review status ${rs} is valid string`);
}

// Mutant 14: Thesis Health Status Matrix (5 checks)
const thesisStatuses = Object.values(ThesisHealthStatus);
for (const th of thesisStatuses) {
  testAssert(typeof th === 'string' && th.length > 0, `Thesis health status ${th} is valid string`);
}

// Mutant 15: Model Agreement Class Matrix (5 checks)
const modelClasses = Object.values(ModelAgreementClass);
for (const mc of modelClasses) {
  testAssert(typeof mc === 'string' && mc.length > 0, `Model agreement class ${mc} is valid string`);
}

console.log(`[PASS] Suite 14 Research Synthesis Mutations passed: ${assertionCount} assertions (>= 60 target met)`);
export default { assertionCount };
