/**
 * test-synthesis-package-sealing.js
 * Suite 11: Cryptographic Package Sealing, Tamper Verification & Copilot Tools Tests
 */

import assert from 'assert';
import { sealResearchPackage, verifyResearchPackage } from '../researchSynthesis/synthesis.package.js';
import { ResearchCopilotTools } from '../researchSynthesis/synthesis.tool.js';
import { defaultResearchProductStore } from '../researchSynthesis/synthesis.store.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 11: Package Sealing & Copilot Tools Tests ---');

// 1. Seal Research Package
const sampleProduct = {
  productId: 'PROD_PKG_TEST',
  productType: 'SECURITY_BRIEF',
  subjectIds: ['NVDA'],
  generatedAt: '2026-01-01T00:00:00.000Z',
  knowledgeCutoff: '2026-01-01T00:00:00.000Z',
  claims: [{ claimId: 'C1', claimText: 'Revenue $100M', claimType: 'FACT', sourceEvidenceIds: ['EV_1'] }]
};

const sealed = sealResearchPackage(sampleProduct, 'USR_ANALYST_1');
testAssert(sealed.isSealed === true, 'Package is marked sealed');
testAssert(typeof sealed.sha256Signature === 'string' && sealed.sha256Signature.length === 64, '64-character SHA-256 signature generated');

// 2. Untampered Package Verification
const validVerify = verifyResearchPackage(sealed);
testAssert(validVerify.isValid === true, 'Untampered package verifies valid');
testAssert(validVerify.status === 'VALID_UNMODIFIED', 'Status is VALID_UNMODIFIED');

// 3. Tampered Package Verification
const tampered = {
  ...sealed,
  researchProduct: { ...sealed.researchProduct, subjectIds: ['TAMPERED_TICKER'] }
};
const tamperedVerify = verifyResearchPackage(tampered);
testAssert(tamperedVerify.isValid === false, 'Tampered package verification fails');
testAssert(tamperedVerify.status === 'TAMPERED_OR_CORRUPT', 'Status is TAMPERED_OR_CORRUPT');

// 4. Copilot Tool: generateResearchBrief
const copilotBrief = await ResearchCopilotTools.generateResearchBrief('tenant-pkg', 'MSFT', '2026-01-01T00:00:00.000Z');
testAssert(copilotBrief.subjectId === 'MSFT', 'Copilot generated brief for MSFT');
testAssert(copilotBrief.isFullyValidated === true, 'Copilot brief claims verified');
testAssert(typeof copilotBrief.contextHash === 'string', 'Copilot attached context hash');

// 5. Copilot Tool: explainModelDisagreement
const modelExpl = ResearchCopilotTools.explainModelDisagreement({ dcfFairValue: 150.0, relativeFairValue: 155.0 });
testAssert(modelExpl.agreementClass === 'CONVERGENT', 'Copilot explained model agreement');

// 6. Store Human Review Workflow: Save -> Approve -> Publish
const storeProduct = defaultResearchProductStore.saveProduct('tenant-pkg', sampleProduct);
testAssert(storeProduct.reviewerStatus === 'DRAFT', 'Initial status is DRAFT');

const approvedProduct = defaultResearchProductStore.approveProduct('tenant-pkg', 'PROD_PKG_TEST', {
  userId: 'USR_ANALYST_1',
  role: 'ANALYST',
  rationale: 'Evidence verified'
});
testAssert(approvedProduct.reviewerStatus === 'HUMAN_APPROVED', 'Status transitions to HUMAN_APPROVED');

const publishedProduct = defaultResearchProductStore.publishProduct('tenant-pkg', 'PROD_PKG_TEST', {
  userId: 'USR_PM_1',
  role: 'PORTFOLIO_MANAGER'
});
testAssert(publishedProduct.reviewerStatus === 'PUBLISHED', 'Status transitions to PUBLISHED');

console.log(`[PASS] Suite 11 Package Sealing & Copilot Tools passed: ${assertionCount} assertions`);
export default { assertionCount };
