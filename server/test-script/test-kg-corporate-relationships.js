/**
 * test-kg-corporate-relationships.js
 * Suite 4: Corporate Relationships & Supply Chain Intelligence Tests
 */

import assert from 'assert';
import { createKGStore } from '../knowledgeGraph/kg.store.js';
import { KGNodeType, KGRelationshipType, KGRelationshipStatus, KGSourceTier } from '../knowledgeGraph/kg.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 4: Corporate Relationships Tests ---');

const store = createKGStore();
const tenantId = 'tenant-corp-1';

// 1. Create company nodes
store.addNode(tenantId, { nodeId: 'COMP_APPLE', nodeType: KGNodeType.COMPANY, label: 'Apple Inc' });
store.addNode(tenantId, { nodeId: 'COMP_TSMC', nodeType: KGNodeType.COMPANY, label: 'TSMC' });
store.addNode(tenantId, { nodeId: 'COMP_SAMSUNG', nodeType: KGNodeType.COMPANY, label: 'Samsung Electronics' });
store.addNode(tenantId, { nodeId: 'IND_TECH_HARDWARE', nodeType: KGNodeType.INDUSTRY, label: 'Technology Hardware' });

// 2. Supply Chain: TSMC supplies Apple
const supplyRel = store.addRelationship(tenantId, {
  relationshipId: 'REL-TSMC-AAPL-SUPPLY',
  fromNodeId: 'COMP_TSMC',
  toNodeId: 'COMP_APPLE',
  relationshipType: KGRelationshipType.COMPANY_SUPPLIES,
  status: KGRelationshipStatus.VERIFIED,
  properties: { productCategory: 'Advanced Silicon Fabrication (3nm/5nm)' },
  provenance: {
    sourceEvidenceIds: ['EV_AAPL_10K_SUPPLIERS'],
    sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING
  }
});

testAssert(supplyRel.relationshipType === KGRelationshipType.COMPANY_SUPPLIES, 'Supply chain relationship created');
testAssert(supplyRel.status === KGRelationshipStatus.VERIFIED, 'Verified status preserved');
testAssert(supplyRel.properties.productCategory.includes('Advanced Silicon'), 'Product category preserved');

// 3. Competitor edge: Apple vs Samsung
const compRel = store.addRelationship(tenantId, {
  relationshipId: 'REL-AAPL-SAMSUNG-COMPETE',
  fromNodeId: 'COMP_APPLE',
  toNodeId: 'COMP_SAMSUNG',
  relationshipType: KGRelationshipType.COMPANY_COMPETES_WITH,
  status: KGRelationshipStatus.VERIFIED,
  provenance: {
    sourceEvidenceIds: ['EV_PEER_FILING'],
    sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING
  }
});
testAssert(compRel.relationshipType === KGRelationshipType.COMPANY_COMPETES_WITH, 'Competitor relationship established');

// 4. Industry classification
const indRel = store.addRelationship(tenantId, {
  relationshipId: 'REL-AAPL-IND',
  fromNodeId: 'COMP_APPLE',
  toNodeId: 'IND_TECH_HARDWARE',
  relationshipType: KGRelationshipType.COMPANY_IN_INDUSTRY,
  status: KGRelationshipStatus.VALIDATED,
  provenance: {
    sourceEvidenceIds: ['EV_GICS'],
    sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING
  }
});
testAssert(indRel.toNodeId === 'IND_TECH_HARDWARE', 'Industry edge mapped');

// 5. Query relationships for Apple
const snap = store.getSnapshotAsOf(tenantId);
const appleRels = snap.relationships.filter(r => r.fromNodeId === 'COMP_APPLE' || r.toNodeId === 'COMP_APPLE');
testAssert(appleRels.length === 3, 'Apple has 3 connected corporate relationships');

console.log(`[PASS] Suite 4 Corporate Relationships passed: ${assertionCount} assertions`);
export default { assertionCount };
