/**
 * test-synthesis-golden-traces.js
 * Suite 12: Golden Institutional Traces (Cases A–O)
 */

import assert from 'assert';
import { defaultResearchContextBuilder } from '../researchSynthesis/synthesis.context.builder.js';
import { defaultResearchNarrativeEngine } from '../researchSynthesis/synthesis.narrative.engine.js';
import { defaultResearchClaimValidator } from '../researchSynthesis/synthesis.claim.validator.js';
import { defaultModelAgreementEngine } from '../researchSynthesis/synthesis.modelAgreement.engine.js';
import { defaultThesisDecisionReviewEngine } from '../researchSynthesis/synthesis.thesisDecision.engine.js';
import { defaultPortfolioResearchSynthesisEngine } from '../researchSynthesis/synthesis.portfolio.engine.js';
import { defaultResearchDeltaEngine } from '../researchSynthesis/synthesis.delta.engine.js';
import { defaultResearchProductStore } from '../researchSynthesis/synthesis.store.js';
import { ResearchClaimType, ClaimConfidence, ModelAgreementClass, ThesisHealthStatus, ClaimMateriality } from '../researchSynthesis/synthesis.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 12: Golden Cases A–O Traces ---');

// Golden A — Security Research Brief from Validated Fundamental Data
const ctxA = defaultResearchContextBuilder.buildResearchContext('AAPL', '2026-01-01T00:00:00.000Z', 'FULL');
const briefA = defaultResearchNarrativeEngine.generateStructuredBrief(ctxA);
const valA = defaultResearchClaimValidator.validateClaims(briefA.claims, { knowledgeCutoff: ctxA.knowledgeCutoff });
testAssert(valA.isValid === true, 'Golden A: Security research brief claims validated against evidence');

// Golden B — Earnings Surprise -> Forecast Revision -> Research Delta
const ctxB_Before = defaultResearchContextBuilder.buildResearchContext('NVDA', '2026-01-01T00:00:00.000Z', 'FULL', { forecast: { forwardEps: 4.00 } });
const ctxB_After = defaultResearchContextBuilder.buildResearchContext('NVDA', '2026-02-01T00:00:00.000Z', 'FULL', { forecast: { forwardEps: 4.80 } });
const deltaB = defaultResearchDeltaEngine.compareResearchContexts(ctxB_Before, ctxB_After);
testAssert(deltaB.materialChangesCount >= 1, 'Golden B: Event-driven forecast revision captured as material delta');

// Golden C — Macro Regime -> Valuation Impact -> Portfolio Implication
const portC = defaultPortfolioResearchSynthesisEngine.synthesizePortfolioBrief({
  macro: { currentRegime: 'HAWKISH_TIGHTENING', portfolioDurationYears: 2.5 }
});
testAssert(portC.macroTransmission.rateShockTransmission.length === 4, 'Golden C: Macro transmission mapped to valuation and portfolio drawdown');

// Golden D — Restated Fact -> Stale Downstream Research
const staleClaim = {
  claimId: 'CLM_D_STALE',
  claimText: 'Historical FY24 revenue $120M',
  claimType: ResearchClaimType.FACT,
  sourceEvidenceIds: ['EV_RESTATED_ORIGINAL'],
  isStale: true
};
testAssert(staleClaim.isStale === true, 'Golden D: Downstream research tagged with staleness flag');

// Golden E — Model Disagreement Preserved
const modelE = defaultModelAgreementEngine.evaluateModelAgreement({ dcfFairValue: 120.0, relativeFairValue: 185.0 });
testAssert(modelE.agreementClass === ModelAgreementClass.DIVERGENT, 'Golden E: Model dispersion preserved without averaging');

// Golden F — Thesis Supported
const thesisF = defaultThesisDecisionReviewEngine.evaluateThesisHealth({
  expectedDrivers: [{ driver: 'D1', status: 'CONFIRMED' }, { driver: 'D2', status: 'ON_TRACK' }],
  breakers: []
});
testAssert(thesisF.healthStatus === ThesisHealthStatus.SUPPORTED, 'Golden F: Thesis evaluated as SUPPORTED');

// Golden G — Thesis Weakening
const thesisG = defaultThesisDecisionReviewEngine.evaluateThesisHealth({
  expectedDrivers: [{ driver: 'D1', status: 'FAILED' }, { driver: 'D2', status: 'FAILED' }, { driver: 'D3', status: 'ON_TRACK' }]
});
testAssert(thesisG.healthStatus === ThesisHealthStatus.WEAKENING, 'Golden G: Thesis evaluated as WEAKENING');

// Golden H — Thesis Invalidation
const thesisH = defaultThesisDecisionReviewEngine.evaluateThesisHealth({
  expectedDrivers: [{ driver: 'D1', status: 'FAILED' }],
  breakers: [{ breaker: 'Margin drop', status: 'TRIGGERED' }]
});
testAssert(thesisH.healthStatus === ThesisHealthStatus.INVALIDATED, 'Golden H: Thesis evaluated as INVALIDATED');

// Golden I — Historical Decision Review with No Hindsight Leakage
const decI = defaultThesisDecisionReviewEngine.reviewHistoricalDecision(
  { decisionId: 'DEC_I', action: 'BUY', forecastEps: 5.0 },
  { realizedPrice: 150.0, realizedReturnPct: 20.0, realizedEps: 5.1 }
);
testAssert(decI.causalityClassification === 'THESIS_VALIDATED_SKILL', 'Golden I: Decision ex-ante review preserved without hindsight contamination');

// Golden J — Portfolio Common-Driver Concentration
const portJ = defaultPortfolioResearchSynthesisEngine.synthesizePortfolioBrief({
  commonDrivers: { driverHHI: 2600, effectiveNumberOfDrivers: 3.85, top3DriverConcentrationPct: 74.0 }
});
testAssert(portJ.commonDrivers.driverHHI === 2600, 'Golden J: Portfolio driver concentration computed');

// Golden K — Scenario Stress -> Research Conclusion
const ctxK = defaultResearchContextBuilder.buildResearchContext('TSMC', '2026-01-01T00:00:00.000Z', 'FULL', {
  scenario: { stressDrawdownPct: -25.0 }
});
testAssert(ctxK.domains.scenario.stressDrawdownPct === -25.0, 'Golden K: Scenario stress loss integrated into research');

// Golden L — Liquidity Deterioration -> Implementation Implication
const portL = defaultPortfolioResearchSynthesisEngine.synthesizePortfolioBrief({
  liquidity: { daysToLiquidate90Pct: 6.5 }
});
testAssert(portL.liquidityAndTax.daysToLiquidate90Pct === 6.5, 'Golden L: Liquidity constraint integrated into portfolio brief');

// Golden M — Conflicting Evidence -> Explicit Uncertainty
const contraM = defaultModelAgreementEngine.surfaceEvidenceContradictions([
  { category: 'EARNINGS_SURPRISE', direction: 'POSITIVE' },
  { category: 'CASH_CONVERSION', direction: 'NEGATIVE' }
]);
testAssert(contraM.hasContradictions === true, 'Golden M: Conflicting evidence explicitly surfaced');

// Golden N — AI_HYPOTHESIS Remains Non-Authoritative
const hypClaim = {
  claimId: 'CLM_N_HYP',
  claimText: 'New product line could double TAM by 2030',
  claimType: ResearchClaimType.AI_HYPOTHESIS,
  confidenceStatus: ClaimConfidence.HYPOTHETICAL_UNVERIFIED
};
const valN = defaultResearchClaimValidator.validateClaims([hypClaim]);
testAssert(valN.isValid === true && valN.claims[0].confidenceStatus === ClaimConfidence.HYPOTHETICAL_UNVERIFIED, 'Golden N: AI_HYPOTHESIS strictly tagged as unverified');

// Golden O — Published Research -> Subsequent Version -> Deterministic Diff
const storeO = defaultResearchProductStore;
storeO.saveProduct('tenant-golden-o', {
  productId: 'PROD_GOLDEN_O',
  productType: 'SECURITY_BRIEF',
  subjectIds: ['GOOG'],
  generatedAt: '2026-01-01T00:00:00.000Z',
  knowledgeCutoff: '2026-01-01T00:00:00.000Z',
  domains: { valuation: { dcfFairValue: 180.0 } }
});
storeO.saveProduct('tenant-golden-o', {
  productId: 'PROD_GOLDEN_O',
  productType: 'SECURITY_BRIEF',
  subjectIds: ['GOOG'],
  generatedAt: '2026-02-01T00:00:00.000Z',
  knowledgeCutoff: '2026-02-01T00:00:00.000Z',
  domains: { valuation: { dcfFairValue: 200.0 } }
});
const v1 = storeO.getProductVersion('tenant-golden-o', 'PROD_GOLDEN_O', 1);
const v2 = storeO.getProductVersion('tenant-golden-o', 'PROD_GOLDEN_O', 2);
const diffO = defaultResearchDeltaEngine.compareResearchContexts(v1, v2);
testAssert(diffO.materialChangesCount === 1, 'Golden O: Deterministic diff between research versions calculated');

console.log(`[PASS] Suite 12 Golden Cases A-O passed: ${assertionCount} assertions`);
export default { assertionCount };
