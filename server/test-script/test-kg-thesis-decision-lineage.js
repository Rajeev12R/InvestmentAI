/**
 * test-kg-thesis-decision-lineage.js
 * Suite 9: Thesis Dependency & Decision Lineage Tests
 */

import assert from 'assert';
import { createKGStore } from '../knowledgeGraph/kg.store.js';
import { DecisionLineageEngine } from '../knowledgeGraph/kg.decisionLineage.engine.js';
import { KGNodeType, KGRelationshipType, KGRelationshipStatus, KGSourceTier } from '../knowledgeGraph/kg.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 9: Thesis & Decision Lineage Tests ---');

const store = createKGStore();
const lineageEngine = new DecisionLineageEngine(store);
const tenantId = 'tenant-lineage-1';

// 1. Create Decision, Position, Thesis, Expected Driver, Financial Fact, and Source Nodes
store.addNode(tenantId, { nodeId: 'DEC_BUY_NVDA_2026', nodeType: KGNodeType.DECISION, label: 'Buy NVDA Allocation', properties: { decisionType: 'BUY' } });
store.addNode(tenantId, { nodeId: 'THESIS_NVDA_AI_MOAT', nodeType: KGNodeType.THESIS, label: 'Thesis: CUDA Ecosystem Moat' });
store.addNode(tenantId, { nodeId: 'DRIVER_DATA_CENTER_GROWTH', nodeType: KGNodeType.EXPECTED_DRIVER, label: 'Driver: Data Center 40% YoY' });
store.addNode(tenantId, { nodeId: 'FACT_NVDA_DC_REV', nodeType: KGNodeType.FINANCIAL_FACT, label: 'Data Center Rev: $30.8B' });
store.addNode(tenantId, { nodeId: 'EVT_COMPETITOR_ASIC_BREAKTHROUGH', nodeType: KGNodeType.CORPORATE_EVENT, label: 'Competitor ASIC Breakthrough' });

// 2. Link relationships
store.addRelationship(tenantId, {
  relationshipId: 'REL-DEC-THESIS',
  fromNodeId: 'DEC_BUY_NVDA_2026',
  toNodeId: 'THESIS_NVDA_AI_MOAT',
  relationshipType: KGRelationshipType.THESIS_ABOUT,
  status: KGRelationshipStatus.VALIDATED,
  provenance: { sourceEvidenceIds: ['EV_DEC_MEMO'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING }
});

store.addRelationship(tenantId, {
  relationshipId: 'REL-DRIVER-THESIS',
  fromNodeId: 'DRIVER_DATA_CENTER_GROWTH',
  toNodeId: 'THESIS_NVDA_AI_MOAT',
  relationshipType: KGRelationshipType.EXPECTED_DRIVER_SUPPORTS_THESIS,
  status: KGRelationshipStatus.VALIDATED,
  provenance: { sourceEvidenceIds: ['EV_DRIVER_MODEL'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING }
});

store.addRelationship(tenantId, {
  relationshipId: 'REL-FACT-THESIS',
  fromNodeId: 'FACT_NVDA_DC_REV',
  toNodeId: 'THESIS_NVDA_AI_MOAT',
  relationshipType: KGRelationshipType.FACT_SUPPORTS_THESIS,
  status: KGRelationshipStatus.VERIFIED,
  provenance: { sourceEvidenceIds: ['SEC_10Q_AUDITED'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING }
});

// 3. Test Decision Lineage
const lineage = lineageEngine.getDecisionLineage(tenantId, 'DEC_BUY_NVDA_2026');
testAssert(lineage.isFound === true, 'Decision lineage retrieved');
testAssert(lineage.decisionType === 'BUY', 'Decision type is BUY');
testAssert(lineage.evidenceChain.length >= 1, 'Evidence chain populated');

// 4. Test Healthy Thesis Dependencies
const thesisEval1 = lineageEngine.evaluateThesisDependencies(tenantId, 'THESIS_NVDA_AI_MOAT');
testAssert(thesisEval1.isFound === true, 'Thesis evaluated');
testAssert(thesisEval1.thesisHealth === 'HEALTHY', 'Thesis is HEALTHY with supporting facts and drivers');
testAssert(thesisEval1.supportingFactsCount === 1, '1 supporting fact');
testAssert(thesisEval1.activeDriversCount === 1, '1 active driver');

// 5. Test Breaker Event Triggering Potential Invalidation
store.addRelationship(tenantId, {
  relationshipId: 'REL-BREAKER-EVENT',
  fromNodeId: 'EVT_COMPETITOR_ASIC_BREAKTHROUGH',
  toNodeId: 'THESIS_NVDA_AI_MOAT',
  relationshipType: KGRelationshipType.EVENT_CHANGED_THESIS,
  status: KGRelationshipStatus.VERIFIED,
  provenance: { sourceEvidenceIds: ['EV_TECH_BENCHMARK'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING }
});

const thesisEval2 = lineageEngine.evaluateThesisDependencies(tenantId, 'THESIS_NVDA_AI_MOAT');
testAssert(thesisEval2.thesisHealth === 'POTENTIALLY_INVALIDATED', 'Thesis health updated to POTENTIALLY_INVALIDATED upon contradictory breaker event');
testAssert(thesisEval2.contradictoryFactsCount === 1, '1 contradictory event recorded');

console.log(`[PASS] Suite 9 Thesis & Decision Lineage passed: ${assertionCount} assertions`);
export default { assertionCount };
