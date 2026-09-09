/**
 * test-kg-restatement-propagation.js
 * Suite 10: Restatement Propagation & Historical Audit Integrity Tests
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

console.log('--- Running Suite 10: Restatement Propagation Tests ---');

const store = createKGStore();
const depEngine = new KnowledgeGraphDependencyEngine(store);
const tenantId = 'tenant-restate-1';

// 1. Build downstream dependency chain
store.addNode(tenantId, { nodeId: 'FACT_HISTORICAL_REVENUE', nodeType: KGNodeType.FINANCIAL_FACT, label: 'FY2024 Revenue: $100M' });
store.addNode(tenantId, { nodeId: 'FCST_REVENUE_MODEL', nodeType: KGNodeType.FORECAST, label: 'FY2025 Revenue Model' });
store.addNode(tenantId, { nodeId: 'VAL_DCF_MODEL', nodeType: KGNodeType.VALUATION, label: 'DCF Valuation' });
store.addNode(tenantId, { nodeId: 'DEC_HISTORICAL_BUY', nodeType: KGNodeType.DECISION, label: 'Buy Decision Made in 2024', properties: { originalPrice: 50.0 } });

store.addRelationship(tenantId, {
  relationshipId: 'REL-FACT-FCST',
  fromNodeId: 'FACT_HISTORICAL_REVENUE',
  toNodeId: 'FCST_REVENUE_MODEL',
  relationshipType: KGRelationshipType.FORECAST_DEPENDS_ON_FACT,
  status: KGRelationshipStatus.VALIDATED,
  provenance: { sourceEvidenceIds: ['EV_1'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING }
});

store.addRelationship(tenantId, {
  relationshipId: 'REL-FCST-VAL',
  fromNodeId: 'FCST_REVENUE_MODEL',
  toNodeId: 'VAL_DCF_MODEL',
  relationshipType: KGRelationshipType.VALUATION_DEPENDS_ON_FORECAST,
  status: KGRelationshipStatus.VALIDATED,
  provenance: { sourceEvidenceIds: ['EV_2'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING }
});

store.addRelationship(tenantId, {
  relationshipId: 'REL-VAL-DEC',
  fromNodeId: 'VAL_DCF_MODEL',
  toNodeId: 'DEC_HISTORICAL_BUY',
  relationshipType: KGRelationshipType.DECISION_DEPENDS_ON_FACT,
  status: KGRelationshipStatus.VALIDATED,
  provenance: { sourceEvidenceIds: ['EV_3'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING }
});

// 2. Propagate restatement of FACT_HISTORICAL_REVENUE
const restatementResult = depEngine.propagateFactRestatement(tenantId, 'FACT_HISTORICAL_REVENUE', {
  oldValue: 100000000,
  newValue: 85000000,
  delta: -15000000,
  restatementReason: 'Revenue recognition restatement in 10-K/A'
});

testAssert(restatementResult.restatedFactId === 'FACT_HISTORICAL_REVENUE', 'Restated fact ID identified');
testAssert(restatementResult.affectedDownstreamCount === 3, '3 downstream objects flagged');

const staleDecision = restatementResult.staleItems.find(i => i.nodeId === 'DEC_HISTORICAL_BUY');
testAssert(staleDecision !== undefined, 'Downstream decision identified');
testAssert(staleDecision.staleStatus === 'POTENTIAL_STALENESS', 'Decision flagged as POTENTIAL_STALENESS');
testAssert(staleDecision.historicalDecisionContextPreserved === true, 'Historical decision record preserved');
testAssert(restatementResult.historicalAuditInvariant === 'HISTORICAL_DECISION_CONTEXT_PRESERVED', 'Audit invariant guaranteed');

// 3. Confirm historical decision node in store remains pristine
const storedDecision = store.getNode(tenantId, 'DEC_HISTORICAL_BUY');
testAssert(storedDecision.properties.originalPrice === 50.0, 'Historical decision properties untouched in store');

console.log(`[PASS] Suite 10 Restatement Propagation passed: ${assertionCount} assertions`);
export default { assertionCount };
