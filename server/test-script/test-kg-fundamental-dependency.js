/**
 * test-kg-fundamental-dependency.js
 * Suite 5: Fundamental Dependency Graph Tests (Fact -> Forecast -> Valuation -> Decision -> Thesis)
 */

import assert from 'assert';
import { createKGStore } from '../knowledgeGraph/kg.store.js';
import { KnowledgeGraphDependencyEngine } from '../knowledgeGraph/kg.dependency.engine.js';
import { KGNodeType, KGRelationshipType, KGRelationshipStatus, KGSourceTier } from '../knowledgeGraph/kg.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 5: Fundamental Dependency Tests ---');

const store = createKGStore();
const depEngine = new KnowledgeGraphDependencyEngine(store);
const tenantId = 'tenant-fund-dep';

// 1. Create dependency chain nodes
store.addNode(tenantId, { nodeId: 'FACT_NVDA_REV_2025Q4', nodeType: KGNodeType.FINANCIAL_FACT, label: 'NVDA Q4 Revenue: $37.5B' });
store.addNode(tenantId, { nodeId: 'FCST_NVDA_FY26_REV', nodeType: KGNodeType.FORECAST, label: 'NVDA FY26 Revenue Forecast' });
store.addNode(tenantId, { nodeId: 'VAL_NVDA_DCF_01', nodeType: KGNodeType.VALUATION, label: 'NVDA DCF Fair Value: $145' });
store.addNode(tenantId, { nodeId: 'DEC_NVDA_OVERWEIGHT', nodeType: KGNodeType.DECISION, label: 'Decision: Overweight NVDA' });
store.addNode(tenantId, { nodeId: 'THESIS_NVDA_AI_LEADERSHIP', nodeType: KGNodeType.THESIS, label: 'Thesis: AI Accelerator Monopoly' });

// 2. Link dependencies
store.addRelationship(tenantId, {
  relationshipId: 'DEP-FACT-FCST',
  fromNodeId: 'FACT_NVDA_REV_2025Q4',
  toNodeId: 'FCST_NVDA_FY26_REV',
  relationshipType: KGRelationshipType.FORECAST_DEPENDS_ON_FACT,
  status: KGRelationshipStatus.VALIDATED,
  provenance: { sourceEvidenceIds: ['EV_FCST_MODEL'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING }
});

store.addRelationship(tenantId, {
  relationshipId: 'DEP-FCST-VAL',
  fromNodeId: 'FCST_NVDA_FY26_REV',
  toNodeId: 'VAL_NVDA_DCF_01',
  relationshipType: KGRelationshipType.VALUATION_DEPENDS_ON_FORECAST,
  status: KGRelationshipStatus.VALIDATED,
  provenance: { sourceEvidenceIds: ['EV_VAL_MODEL'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING }
});

store.addRelationship(tenantId, {
  relationshipId: 'DEP-VAL-DEC',
  fromNodeId: 'VAL_NVDA_DCF_01',
  toNodeId: 'DEC_NVDA_OVERWEIGHT',
  relationshipType: KGRelationshipType.DECISION_DEPENDS_ON_FACT,
  status: KGRelationshipStatus.VALIDATED,
  provenance: { sourceEvidenceIds: ['EV_DEC_RECORD'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING }
});

store.addRelationship(tenantId, {
  relationshipId: 'DEP-DEC-THESIS',
  fromNodeId: 'DEC_NVDA_OVERWEIGHT',
  toNodeId: 'THESIS_NVDA_AI_LEADERSHIP',
  relationshipType: KGRelationshipType.THESIS_ABOUT,
  status: KGRelationshipStatus.VALIDATED,
  provenance: { sourceEvidenceIds: ['EV_THESIS_DOC'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING }
});

// 3. Evaluate fact impact traversal
const impact = depEngine.evaluateFactImpact(tenantId, 'FACT_NVDA_REV_2025Q4');

testAssert(impact.isFound === true, 'Fact impact evaluated');
testAssert(impact.affectedDownstreamCount === 4, '4 downstream nodes identified');

const fcstImpact = impact.affectedNodes.find(n => n.nodeId === 'FCST_NVDA_FY26_REV');
testAssert(fcstImpact !== undefined, 'Forecast node affected');
testAssert(fcstImpact.traversalDepth === 1, 'Forecast is depth 1');

const decImpact = impact.affectedNodes.find(n => n.nodeId === 'DEC_NVDA_OVERWEIGHT');
testAssert(decImpact !== undefined, 'Decision node affected');
testAssert(decImpact.traversalDepth === 3, 'Decision is depth 3');

const thesisImpact = impact.affectedNodes.find(n => n.nodeId === 'THESIS_NVDA_AI_LEADERSHIP');
testAssert(thesisImpact !== undefined, 'Thesis node affected');
testAssert(thesisImpact.traversalDepth === 4, 'Thesis is depth 4');

console.log(`[PASS] Suite 5 Fundamental Dependency passed: ${assertionCount} assertions`);
export default { assertionCount };
