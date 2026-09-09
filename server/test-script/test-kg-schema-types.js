/**
 * test-kg-schema-types.js
 * Suite 1: Knowledge Graph Schema, Node/Relationship Types, Canonical Hashing & Deep Freeze
 */

import assert from 'assert';
import { KGNodeType, KGRelationshipType, KGRelationshipStatus, canonicalSha256, deepFreeze, KGSourceTier } from '../knowledgeGraph/kg.types.js';
import { validateKGNode, validateKGRelationship, validateKGPackage } from '../knowledgeGraph/kg.schema.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 1: Knowledge Graph Schema & Types Tests ---');

// 1. Enum verification
testAssert(Object.keys(KGNodeType).length === 27, '27 Canonical KG Node Types defined');
testAssert(Object.keys(KGRelationshipType).length === 36, '36 Canonical KG Relationship Types defined');
testAssert(Object.keys(KGRelationshipStatus).length === 10, '10 Relationship Status types defined');

// 2. Deterministic Canonical SHA-256 Hashing
const payloadA = { z: 1, a: 2, m: { y: 3, x: 4 } };
const payloadB = { a: 2, z: 1, m: { x: 4, y: 3 } };
const hashA = canonicalSha256(payloadA);
const hashB = canonicalSha256(payloadB);
testAssert(hashA === hashB, 'Canonical SHA256 is deterministic across key ordering');
testAssert(typeof hashA === 'string' && hashA.length === 64, 'SHA256 signature is 64 hex characters');

// 3. Deep Freeze Immutability
const mutableGraph = { nodes: [{ id: 'N1' }], rels: [{ from: 'N1', to: 'N2' }] };
const frozenGraph = deepFreeze(mutableGraph);
let mutErr = false;
try {
  frozenGraph.nodes.push({ id: 'N2' });
} catch {
  mutErr = true;
}
testAssert(mutErr, 'deepFreeze prevents array mutation on graph objects');

// 4. Node Schema Validation - Valid
const validNode = {
  nodeId: 'SEC_NVDA',
  nodeType: KGNodeType.SECURITY,
  canonicalId: 'SEC_NVDA_US',
  label: 'NVIDIA Corp Equity',
  tenantId: 'tenant-alpha',
  effectiveFrom: '2020-01-01T00:00:00.000Z'
};
const valNodeRes = validateKGNode(validNode);
testAssert(valNodeRes.isValid === true, 'Valid node passes schema validation');

// 5. Node Schema Validation - Invalid
const invalidNode = {
  nodeId: '',
  nodeType: 'UNKNOWN_TYPE',
  tenantId: null
};
const invNodeRes = validateKGNode(invalidNode);
testAssert(invNodeRes.isValid === false, 'Invalid node rejected');
testAssert(invNodeRes.errors.length >= 2, 'Multiple schema errors reported');

// 6. Relationship Schema Validation - Valid
const validRel = {
  relationshipId: 'REL-NVDA-SEMIS-001',
  fromNodeId: 'SEC_NVDA',
  toNodeId: 'IND_SEMICONDUCTORS',
  relationshipType: KGRelationshipType.COMPANY_IN_INDUSTRY,
  status: KGRelationshipStatus.VERIFIED,
  tenantId: 'tenant-alpha',
  provenance: {
    sourceEvidenceIds: ['EV_GICS_2026'],
    sourceIds: ['GICS_CLASSIFIER'],
    sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING
  }
};
const valRelRes = validateKGRelationship(validRel);
testAssert(valRelRes.isValid === true, 'Valid relationship passes schema validation');

// 7. Relationship Schema Validation - Missing Provenance on Authoritative Edge
const unprovenRel = {
  relationshipId: 'REL-NVDA-SUPPLY-001',
  fromNodeId: 'SEC_NVDA',
  toNodeId: 'SEC_TSMC',
  relationshipType: KGRelationshipType.COMPANY_DEPENDS_ON,
  status: KGRelationshipStatus.VERIFIED,
  tenantId: 'tenant-alpha',
  provenance: null // Missing provenance
};
const unprovenRes = validateKGRelationship(unprovenRel);
testAssert(unprovenRes.isValid === false, 'Authoritative relationship without provenance is rejected');

// 8. Package Schema Validation
const validPkg = {
  packageId: 'PKG-KG-101',
  sha256Signature: 'a'.repeat(64),
  payload: { nodes: [], relationships: [] }
};
testAssert(validateKGPackage(validPkg).isValid === true, 'Valid package passes validation');
testAssert(validateKGPackage({}).isValid === false, 'Empty package fails validation');

console.log(`[PASS] Suite 1 Knowledge Graph Schema & Types passed: ${assertionCount} assertions`);
export default { assertionCount };
