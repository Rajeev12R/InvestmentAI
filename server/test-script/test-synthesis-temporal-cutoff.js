/**
 * test-synthesis-temporal-cutoff.js
 * Suite 2: Point-in-Time Knowledge Cutoff & Anti-Lookahead Enforcement Tests
 */

import assert from 'assert';
import { defaultResearchContextBuilder } from '../researchSynthesis/synthesis.context.builder.js';
import { defaultResearchClaimValidator } from '../researchSynthesis/synthesis.claim.validator.js';
import { ResearchClaimType } from '../researchSynthesis/synthesis.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 2: Temporal Cutoff & Anti-Lookahead Tests ---');

// 1. Point-in-Time Context Construction
const cutoff2025 = '2025-06-30T23:59:59.000Z';
const context2025 = defaultResearchContextBuilder.buildResearchContext('AAPL', cutoff2025, 'FULL', {
  fundamentals: { revenue: 85000000, asOf: '2025-06-30T00:00:00.000Z' },
  forecast: { forwardEps: 4.20, forecastVintage: '2025-Q2' }
});

testAssert(context2025.knowledgeCutoff === cutoff2025, 'Knowledge cutoff timestamp strictly preserved');
testAssert(context2025.domains.fundamentals.revenue === 85000000, 'Context retrieves data as of 2025 cutoff');

// 2. Anti-Lookahead Claim Validation: Claim with future timestamp rejected
const futureClaim = {
  claimId: 'CLM_FUTURE_LEAK',
  claimText: 'Q3 2025 earnings reported in August',
  claimType: ResearchClaimType.FACT,
  sourceEvidenceIds: ['EV_AUG_2025'],
  observedAt: '2025-08-15T00:00:00.000Z' // Past cutoff of 2025-06-30!
};

const validationResult = defaultResearchClaimValidator.validateClaims([futureClaim], { knowledgeCutoff: cutoff2025 });
testAssert(validationResult.isValid === false, 'Claim observed after knowledgeCutoff is rejected');
testAssert(validationResult.invalidClaimsCount === 1, '1 invalid claim detected');
testAssert(validationResult.violations[0].errors.some(e => e.includes('Temporal violation') || e.includes('knowledgeCutoff')), 'Violation error specifies temporal cutoff');

// 3. Valid historical claim as of cutoff passes
const validPastClaim = {
  claimId: 'CLM_VALID_PAST',
  claimText: 'Q1 2025 revenue was $85M',
  claimType: ResearchClaimType.FACT,
  sourceEvidenceIds: ['EV_MAR_2025'],
  observedAt: '2025-03-31T00:00:00.000Z'
};
const validPastResult = defaultResearchClaimValidator.validateClaims([validPastClaim], { knowledgeCutoff: cutoff2025 });
testAssert(validPastResult.isValid === true, 'Historical claim prior to cutoff passes validation');

console.log(`[PASS] Suite 2 Temporal Cutoff & Anti-Lookahead passed: ${assertionCount} assertions`);
export default { assertionCount };
