/**
 * test-synthesis-types-schema.js
 * Suite 1: Research Product Types, Claim Types, Schema Validation, Canonical SHA-256 & Deep Freeze
 */

import assert from 'assert';
import {
  ResearchProductType,
  ResearchClaimType,
  ResearchReviewStatus,
  ThesisHealthStatus,
  ModelAgreementClass,
  canonicalSha256,
  deepFreeze
} from '../researchSynthesis/synthesis.types.js';
import { validateResearchClaim, validateResearchProduct } from '../researchSynthesis/synthesis.schema.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 1: Research Types & Schema Tests ---');

// 1. Enum verification
testAssert(Object.keys(ResearchProductType).length === 10, '10 Research Product Types defined');
testAssert(Object.keys(ResearchClaimType).length === 8, '8 Research Claim Types defined');
testAssert(Object.keys(ResearchReviewStatus).length === 7, '7 Research Review Statuses defined');
testAssert(Object.keys(ThesisHealthStatus).length === 5, '5 Thesis Health Statuses defined');
testAssert(Object.keys(ModelAgreementClass).length === 5, '5 Model Agreement Classes defined');

// 2. Deterministic Canonical SHA-256 Hashing
const payloadA = { z: 'last', a: 'first', nested: { beta: 1.5, alpha: 2.0 } };
const payloadB = { a: 'first', z: 'last', nested: { alpha: 2.0, beta: 1.5 } };
const hashA = canonicalSha256(payloadA);
const hashB = canonicalSha256(payloadB);
testAssert(hashA === hashB, 'Canonical SHA256 is deterministic across key ordering');
testAssert(typeof hashA === 'string' && hashA.length === 64, 'SHA256 signature is 64 hex characters');

// 3. Deep Freeze Immutability
const mutObj = { title: 'DRAFT_BRIEF', items: [1, 2, 3] };
const frozen = deepFreeze(mutObj);
let mutErr = false;
try {
  frozen.items.push(4);
} catch {
  mutErr = true;
}
testAssert(mutErr, 'deepFreeze prevents array mutation on research objects');

// 4. Claim Schema Validation
const validClaim = {
  claimId: 'CLM_VALID_01',
  claimText: 'FY2024 Revenue was $100M',
  claimType: ResearchClaimType.FACT,
  sourceEvidenceIds: ['EV_10K_01']
};
const valClaimRes = validateResearchClaim(validClaim);
testAssert(valClaimRes.isValid === true, 'Valid FACT claim passes schema validation');

const invalidClaim = {
  claimId: 'CLM_INVALID_01',
  claimText: 'Missing evidence fact',
  claimType: ResearchClaimType.FACT,
  sourceEvidenceIds: [] // Invalid for FACT
};
const invClaimRes = validateResearchClaim(invalidClaim);
testAssert(invClaimRes.isValid === false, 'FACT claim without evidence fails validation');

// 5. Product Schema Validation
const validProduct = {
  productId: 'PROD_NVDA_01',
  productType: ResearchProductType.SECURITY_BRIEF,
  tenantId: 'tenant-alpha',
  subjectIds: ['NVDA'],
  generatedAt: '2026-01-01T00:00:00.000Z',
  knowledgeCutoff: '2026-01-01T00:00:00.000Z',
  claims: [validClaim]
};
const valProdRes = validateResearchProduct(validProduct);
testAssert(valProdRes.isValid === true, 'Valid research product passes schema validation');

console.log(`[PASS] Suite 1 Research Types & Schema passed: ${assertionCount} assertions`);
export default { assertionCount };
