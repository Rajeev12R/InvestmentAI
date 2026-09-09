/**
 * test-kg-store-temporal.js
 * Suite 2: Revision-Aware Store, Point-in-Time Cutoff & Temporal Leakage Prevention
 */

import assert from 'assert';
import { createKGStore } from '../knowledgeGraph/kg.store.js';
import { KGNodeType, KGRelationshipType, KGRelationshipStatus, KGSourceTier } from '../knowledgeGraph/kg.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 2: Store & Temporal Engine Tests ---');

const store = createKGStore();
const tenantId = 'tenant-temporal-1';

// 1. Ingest historical entities
store.addNode(tenantId, {
  nodeId: 'COMP_HISTORICAL_A',
  nodeType: KGNodeType.COMPANY,
  canonicalId: 'COMP_A',
  label: 'Company A Historical',
  createdAt: '2023-01-01T00:00:00.000Z',
  effectiveFrom: '2023-01-01T00:00:00.000Z',
  effectiveTo: '2024-12-31T23:59:59.000Z',
  isDelisted: true
});

store.addNode(tenantId, {
  nodeId: 'COMP_FUTURE_B',
  nodeType: KGNodeType.COMPANY,
  canonicalId: 'COMP_B',
  label: 'Company B Founded in 2025',
  createdAt: '2025-01-01T00:00:00.000Z',
  effectiveFrom: '2025-01-01T00:00:00.000Z',
  effectiveTo: null
});

// 2. Ingest relationship active between 2023 and 2024
store.addRelationship(tenantId, {
  relationshipId: 'REL-A-SUPPLIES-B',
  fromNodeId: 'COMP_HISTORICAL_A',
  toNodeId: 'COMP_FUTURE_B',
  relationshipType: KGRelationshipType.COMPANY_SUPPLIES,
  status: KGRelationshipStatus.VERIFIED,
  createdAt: '2023-06-01T00:00:00.000Z',
  observedAt: '2023-06-01T00:00:00.000Z',
  effectiveFrom: '2023-06-01T00:00:00.000Z',
  effectiveTo: '2024-12-31T23:59:59.000Z',
  provenance: {
    sourceEvidenceIds: ['EV_10K_2023'],
    sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING
  }
});

// 3. Point-in-Time Query: In 2023 (As of 2023-12-31)
const snap2023 = store.getSnapshotAsOf(tenantId, '2023-12-31T23:59:59.000Z');
testAssert(snap2023.nodes.some(n => n.nodeId === 'COMP_HISTORICAL_A'), 'Company A exists in 2023 snapshot');
testAssert(!snap2023.nodes.some(n => n.nodeId === 'COMP_FUTURE_B'), 'Company B (2025) is NOT present in 2023 snapshot (no future leakage)');
testAssert(snap2023.relationships.length === 0, 'Relationship is omitted because endpoint Company B did not exist in 2023');

// 4. Point-in-Time Query: In 2025 (As of 2025-06-30)
const snap2025 = store.getSnapshotAsOf(tenantId, '2025-06-30T00:00:00.000Z');
testAssert(snap2025.nodes.some(n => n.nodeId === 'COMP_FUTURE_B'), 'Company B exists in 2025 snapshot');

// 5. Survivorship Preservation: Historical entity retrieval
const histEntities2023 = store.getHistoricalEntities(tenantId, '2023-12-31T23:59:59.000Z');
testAssert(histEntities2023.length === 1, 'Historical entity preserved as of 2023');
testAssert(histEntities2023[0].isDelisted === true, 'Delisted status flag preserved');

// 6. Provenance Downgrade on unverified relationship
const unverifiedRel = store.addRelationship(tenantId, {
  relationshipId: 'REL-UNVERIFIED-01',
  fromNodeId: 'COMP_HISTORICAL_A',
  toNodeId: 'COMP_HISTORICAL_A',
  relationshipType: KGRelationshipType.COMPANY_COMPETES_WITH,
  status: KGRelationshipStatus.VERIFIED, // Claims verified but gives no evidence
  createdAt: '2023-01-01T00:00:00.000Z',
  provenance: { sourceEvidenceIds: [] }
});
testAssert(unverifiedRel.status === KGRelationshipStatus.UNVERIFIED_SOURCE, 'Unverified edge automatically downgraded to UNVERIFIED_SOURCE');

console.log(`[PASS] Suite 2 Store & Temporal Engine passed: ${assertionCount} assertions`);
export default { assertionCount };
