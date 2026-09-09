/**
 * test-kg-package-sealing-copilot.js
 * Suite 11: Cryptographic Package Sealing, Verification & Read-Only Copilot Tools
 */

import assert from 'assert';
import { sealKnowledgeGraphPackage, verifyKnowledgeGraphPackage } from '../knowledgeGraph/kg.package.js';
import { searchKnowledgeGraph, explainRelationship, traceFactImpact, findCommonDrivers } from '../knowledgeGraph/kg.tool.js';
import { createKGStore } from '../knowledgeGraph/kg.store.js';
import { KGNodeType, KGRelationshipType, KGRelationshipStatus, KGSourceTier } from '../knowledgeGraph/kg.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 11: Package Sealing & Copilot Tools Tests ---');

// 1. Package creation and cryptographic sealing
const payload = {
  tenantId: 'tenant-audit-pkg',
  asOf: '2026-06-30T00:00:00.000Z',
  nodes: [{ nodeId: 'SEC_NVDA', type: 'SECURITY' }],
  relationships: [{ id: 'R1', from: 'SEC_NVDA', to: 'SEC_TSMC' }]
};

const sealedPkg = sealKnowledgeGraphPackage(payload, 'auditor-jane');
testAssert(sealedPkg.packageId.startsWith('PKG-KG-'), 'Package ID generated');
testAssert(sealedPkg.packageVersion === '23.0.0', 'Package version 23.0.0');
testAssert(typeof sealedPkg.sha256Signature === 'string' && sealedPkg.sha256Signature.length === 64, 'SHA256 signature is 64 hex chars');
testAssert(sealedPkg.createdBy === 'auditor-jane', 'Creator recorded');
testAssert(sealedPkg.isSealed === true, 'Package is sealed');

// 2. Package verification - untampered
const verifyRes1 = verifyKnowledgeGraphPackage(sealedPkg);
testAssert(verifyRes1.isValid === true, 'Untampered package verifies valid');

// 3. Package verification - tampered payload
const tamperedPkg = JSON.parse(JSON.stringify(sealedPkg));
tamperedPkg.payload.nodes.push({ nodeId: 'SEC_FAKE', type: 'SECURITY' });
const verifyRes2 = verifyKnowledgeGraphPackage(tamperedPkg);
testAssert(verifyRes2.isValid === false, 'Tampered package is rejected');

// 4. Copilot read-only tools
const store = createKGStore();
store.addNode('t-copilot', { nodeId: 'SEC_NVDA', nodeType: KGNodeType.SECURITY, label: 'NVIDIA Corp' });
store.addNode('t-copilot', { nodeId: 'SEC_TSMC', nodeType: KGNodeType.SECURITY, label: 'TSMC Corp' });
store.addRelationship('t-copilot', {
  relationshipId: 'REL-SUPPLY-01',
  fromNodeId: 'SEC_TSMC',
  toNodeId: 'SEC_NVDA',
  relationshipType: KGRelationshipType.COMPANY_SUPPLIES,
  status: KGRelationshipStatus.VERIFIED,
  provenance: { sourceEvidenceIds: ['EV_10K'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING }
});

const searchRes = await searchKnowledgeGraph({ tenantId: 't-copilot', query: 'NVIDIA' }, { store });
testAssert(searchRes.count === 1, 'Copilot search finds node');
testAssert(searchRes.results[0].nodeId === 'SEC_NVDA', 'Search returns NVDA');

const explainRes = await explainRelationship({ tenantId: 't-copilot', relationshipId: 'REL-SUPPLY-01' }, { store });
testAssert(explainRes.isFound === true, 'Copilot explains relationship');
testAssert(explainRes.evidenceStatus === KGRelationshipStatus.VERIFIED, 'Evidence status is VERIFIED');

const driversRes = await findCommonDrivers({
  positions: [{ ticker: 'NVDA', marketValue: 100000, drivers: { AI: 1.0 } }]
});
testAssert(driversRes.totalDriversCount === 1, 'Copilot common drivers calculated');

console.log(`[PASS] Suite 11 Package Sealing & Copilot Tools passed: ${assertionCount} assertions`);
export default { assertionCount };
