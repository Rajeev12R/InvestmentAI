/**
 * test-synthesis-claim-validator.js
 * Suite 4: Evidence-First Claim System & Validation Invariants Tests
 */

import assert from 'assert';
import { defaultResearchClaimValidator } from '../researchSynthesis/synthesis.claim.validator.js';
import { ResearchClaimType, ClaimConfidence } from '../researchSynthesis/synthesis.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 4: Claim Validator Tests ---');

// 1. FACT claims must have authoritative evidence IDs
const factWithoutEvidence = {
  claimId: 'C1',
  claimText: 'Revenue grew 10%',
  claimType: ResearchClaimType.FACT,
  sourceEvidenceIds: []
};
const res1 = defaultResearchClaimValidator.validateClaims([factWithoutEvidence]);
testAssert(res1.isValid === false, 'FACT claim without evidence is rejected');

const factWithEvidence = {
  claimId: 'C2',
  claimText: 'Revenue was $100M per 10-K filing',
  claimType: ResearchClaimType.FACT,
  sourceEvidenceIds: ['EV_10K_SEC']
};
const res2 = defaultResearchClaimValidator.validateClaims([factWithEvidence]);
testAssert(res2.isValid === true, 'FACT claim with evidence passes');
testAssert(res2.claims[0].confidenceStatus === ClaimConfidence.VERIFIED_HIGH, 'Confidence is VERIFIED_HIGH');

// 2. AI_HYPOTHESIS cannot masquerade as authoritative fact
const hypothesisMasquerading = {
  claimId: 'C3',
  claimText: 'Company will dominate market in 2030',
  claimType: ResearchClaimType.AI_HYPOTHESIS,
  confidenceStatus: ClaimConfidence.VERIFIED_HIGH // Forbidden!
};
const res3 = defaultResearchClaimValidator.validateClaims([hypothesisMasquerading]);
testAssert(res3.isValid === false, 'AI_HYPOTHESIS cannot claim VERIFIED_HIGH');

// 3. UNAVAILABLE data cannot assert numbers
const unavailableAssertingNumber = {
  claimId: 'C4',
  claimText: 'R&D spend was $50M',
  claimType: ResearchClaimType.FACT,
  sourceEvidenceIds: ['EV_1'],
  confidenceStatus: ClaimConfidence.UNAVAILABLE,
  numericValue: 50000000
};
const res4 = defaultResearchClaimValidator.validateClaims([unavailableAssertingNumber]);
testAssert(res4.isValid === false, 'UNAVAILABLE claim cannot assert numeric value');

// 4. Multi-claim validation batch
const batchClaims = [
  { claimId: 'B1', claimText: 'DCF is $150', claimType: ResearchClaimType.MODEL_ESTIMATE, modelName: 'DCF' },
  { claimId: 'B2', claimText: 'EPS is $4.50', claimType: ResearchClaimType.FORECAST, forecastVintage: '2026-Q1' }
];
const batchRes = defaultResearchClaimValidator.validateClaims(batchClaims);
testAssert(batchRes.isValid === true, 'Batch of valid model and forecast claims passes');
testAssert(batchRes.validClaimsCount === 2, 'All 2 claims valid');

console.log(`[PASS] Suite 4 Claim Validator passed: ${assertionCount} assertions`);
export default { assertionCount };
