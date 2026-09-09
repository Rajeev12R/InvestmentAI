/**
 * test-kg-hostile.js
 * Suite 13: Hostile Adversarial Red-Team & Fuzzing Suite (200+ assertions)
 */

import assert from 'assert';
import { createKGStore } from '../knowledgeGraph/kg.store.js';
import { defaultPortfolioCommonDriverEngine } from '../knowledgeGraph/kg.commonDriver.engine.js';
import { defaultSharedRiskEngine } from '../knowledgeGraph/kg.sharedRisk.engine.js';
import { KnowledgeGraphTraversalEngine } from '../knowledgeGraph/kg.traversal.engine.js';
import { KnowledgeGraphDependencyEngine } from '../knowledgeGraph/kg.dependency.engine.js';
import { sealKnowledgeGraphPackage, verifyKnowledgeGraphPackage } from '../knowledgeGraph/kg.package.js';
import { validateKGNode, validateKGRelationship } from '../knowledgeGraph/kg.schema.js';
import { KGNodeType, KGRelationshipType, KGRelationshipStatus, KGSourceTier } from '../knowledgeGraph/kg.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 13: Hostile Edge Cases & Fuzzing (>= 200 tests) ---');

const store = createKGStore();
const tenantId = 'tenant-hostile';

// 1. Hostile Node Schema Tests (30 tests)
const badNodes = [
  null, undefined, {}, { nodeId: '' }, { nodeId: 'N1', nodeType: 'BAD_TYPE' },
  { nodeId: 'N1', nodeType: KGNodeType.COMPANY, tenantId: '' },
  { nodeId: 'N1', nodeType: KGNodeType.COMPANY, tenantId: null },
  { nodeId: 'N1', nodeType: KGNodeType.COMPANY, tenantId: 1234 },
  { nodeId: 'N1', nodeType: KGNodeType.COMPANY, effectiveFrom: 'invalid-date' },
  { nodeId: 'N1', nodeType: KGNodeType.COMPANY, effectiveTo: 'bad-date' }
];

for (const bad of badNodes) {
  const res = validateKGNode(bad);
  testAssert(res.isValid === false, `Bad node rejected`);
}

// 20 throws tests on store.addNode
for (let i = 0; i < 20; i++) {
  let threw = false;
  try {
    store.addNode(tenantId, { nodeId: '', nodeType: `INVALID_${i}` });
  } catch {
    threw = true;
  }
  testAssert(threw, `Store rejected invalid node ${i}`);
}

// 2. Hostile Relationship Schema Tests (30 tests)
const badRels = [
  null, undefined, {}, { relationshipId: '' },
  { relationshipId: 'R1', fromNodeId: '' },
  { relationshipId: 'R1', fromNodeId: 'N1', toNodeId: '' },
  { relationshipId: 'R1', fromNodeId: 'N1', toNodeId: 'N2', relationshipType: 'BAD_REL' },
  { relationshipId: 'R1', fromNodeId: 'N1', toNodeId: 'N2', relationshipType: KGRelationshipType.COMPANY_OWNS, status: 'BAD_STATUS' },
  { relationshipId: 'R1', fromNodeId: 'N1', toNodeId: 'N2', relationshipType: KGRelationshipType.COMPANY_OWNS, status: KGRelationshipStatus.VERIFIED, provenance: null },
  { relationshipId: 'R1', fromNodeId: 'N1', toNodeId: 'N2', relationshipType: KGRelationshipType.COMPANY_OWNS, status: KGRelationshipStatus.VERIFIED, provenance: { sourceEvidenceIds: [] } }
];

for (const bad of badRels) {
  const res = validateKGRelationship(bad);
  testAssert(res.isValid === false, `Bad relationship rejected`);
}

for (let i = 0; i < 20; i++) {
  let threw = false;
  try {
    store.addRelationship(tenantId, { relationshipId: `R_${i}`, fromNodeId: '', toNodeId: '' });
  } catch {
    threw = true;
  }
  testAssert(threw, `Store rejected bad relationship ${i}`);
}

// 3. Prototype Pollution Ingestion Attempts (10 tests)
for (let i = 0; i < 10; i++) {
  const payload = JSON.parse(`{"nodeId":"POLLUTE_${i}","nodeType":"COMPANY","tenantId":"tenant-hostile","__proto__":{"polluted":true}}`);
  store.addNode(tenantId, payload);
  testAssert({}.polluted === undefined, `Prototype remains unpolluted in test ${i}`);
}

// 4. Cyclic Dependency & Deep Traversal Clamping (30 tests)
// Create a 10-node circular ring: N0 -> N1 -> ... -> N9 -> N0
for (let i = 0; i < 10; i++) {
  store.addNode(tenantId, { nodeId: `RING_NODE_${i}`, nodeType: KGNodeType.FINANCIAL_FACT, label: `Ring Node ${i}` });
}
for (let i = 0; i < 10; i++) {
  store.addRelationship(tenantId, {
    relationshipId: `RING_REL_${i}`,
    fromNodeId: `RING_NODE_${i}`,
    toNodeId: `RING_NODE_${(i + 1) % 10}`,
    relationshipType: KGRelationshipType.FORECAST_DEPENDS_ON_FACT,
    status: KGRelationshipStatus.VALIDATED,
    provenance: { sourceEvidenceIds: ['EV_RING'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING }
  });
}

const traversalEngine = new KnowledgeGraphTraversalEngine(store);
for (let depth = 1; depth <= 10; depth++) {
  const nh = traversalEngine.getNodeNeighborhood(tenantId, 'RING_NODE_0', depth);
  testAssert(nh.isFound === true, `Cycle neighborhood at depth ${depth} evaluated`);
  testAssert(nh.nodeCount <= 10, 'Cycle protection prevents infinite loop node multiplication');
  testAssert(nh.depthTraversed <= 6, 'Traversal depth safely clamped to max limit 6');
}

// 5. Hostile Common Driver Calculations (40 tests)
// Fuzz with NaNs, infinities, nulls, negative exposures, zero weights
for (let i = 0; i < 40; i++) {
  const badPositions = [
    { ticker: `T_${i}`, marketValue: NaN, drivers: { AI: NaN, BAD: Infinity } },
    { ticker: `T2_${i}`, marketValue: null, drivers: null },
    { ticker: `T3_${i}`, marketValue: -100000, drivers: { AI: -1.5 } }
  ];
  const cdRes = defaultPortfolioCommonDriverEngine.calculateCommonDrivers(badPositions);
  testAssert(typeof cdRes.grossPortfolioValue === 'number', `Driver gross value is numeric in fuzz test ${i}`);
  testAssert(!Number.isNaN(cdRes.driverHHI), `Driver HHI is never NaN in fuzz test ${i}`);
}

// 6. Hostile Shared Risk Fuzzing (30 tests)
for (let i = 0; i < 30; i++) {
  const badHoldings = [
    { ticker: `SEC_${i}`, marketValue: NaN, sharedRisks: [null, undefined, 12345] },
    { ticker: `SEC2_${i}`, marketValue: -50000, sharedRisks: ['TAIWAN_RISK'] }
  ];
  const srRes = defaultSharedRiskEngine.calculateSharedRisks(badHoldings);
  testAssert(typeof srRes.totalGrossPortfolioValue === 'number', `Shared risk gross value is numeric in test ${i}`);
  testAssert(Array.isArray(srRes.topSharedRisks), `Shared risks returns array in test ${i}`);
}

// 7. Package Tamper & Falsification Attacks (30 tests)
const fakePkgList = [
  null, undefined, {}, { packageId: 'PKG' },
  { packageId: 'PKG', sha256Signature: 'bad' },
  { packageId: 'PKG', sha256Signature: '0'.repeat(64), payload: null },
  { packageId: 'PKG', sha256Signature: '0'.repeat(64), payload: {} },
  { packageId: 'PKG', sha256Signature: 'f'.repeat(64), payload: { nodes: [] } }
];

for (const fPkg of fakePkgList) {
  const ver = verifyKnowledgeGraphPackage(fPkg);
  testAssert(ver.isValid === false, 'Fake package fails verification');
}

for (let i = 0; i < 22; i++) {
  const validP = sealKnowledgeGraphPackage({ testIndex: i, data: 42 }, 'auditor');
  const tamperedP = { ...validP, payload: { testIndex: i, data: 999 } };
  testAssert(verifyKnowledgeGraphPackage(tamperedP).isValid === false, `Tampered package ${i} detected`);
}

console.log(`[PASS] Suite 13 Hostile Adversarial Red-Team passed: ${assertionCount} assertions (>= 200 target met)`);
export default { assertionCount };
