/**
 * test-kg-earnings-macro-bridges.js
 * Suite 6: Cross-Domain Earnings (Phase 21) & Macro (Phase 22) Graph Integration Tests
 */

import assert from 'assert';
import { createKGStore } from '../knowledgeGraph/kg.store.js';
import { KGNodeType, KGRelationshipType, KGRelationshipStatus, KGSourceTier } from '../knowledgeGraph/kg.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 6: Earnings & Macro Bridges Tests ---');

const store = createKGStore();
const tenantId = 'tenant-bridges-1';

// 1. Ingest Phase 21 Earnings Event Nodes
store.addNode(tenantId, { nodeId: 'EVT_AAPL_2025Q4_EARNINGS', nodeType: KGNodeType.EARNINGS_EVENT, label: 'AAPL Q4 Earnings Release' });
store.addNode(tenantId, { nodeId: 'FACT_AAPL_EPS_2025Q4', nodeType: KGNodeType.FINANCIAL_FACT, label: 'AAPL Q4 EPS: $1.64' });
store.addNode(tenantId, { nodeId: 'FCST_AAPL_FY26_EPS', nodeType: KGNodeType.FORECAST, label: 'AAPL FY26 EPS Forecast' });

store.addRelationship(tenantId, {
  relationshipId: 'REL-EARNINGS-TO-FACT',
  fromNodeId: 'EVT_AAPL_2025Q4_EARNINGS',
  toNodeId: 'FACT_AAPL_EPS_2025Q4',
  relationshipType: KGRelationshipType.EVENT_CHANGED_FACT,
  status: KGRelationshipStatus.VERIFIED,
  provenance: { sourceEvidenceIds: ['SEC_EDGAR_10Q'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING }
});

store.addRelationship(tenantId, {
  relationshipId: 'REL-EARNINGS-TO-FCST',
  fromNodeId: 'EVT_AAPL_2025Q4_EARNINGS',
  toNodeId: 'FCST_AAPL_FY26_EPS',
  relationshipType: KGRelationshipType.EVENT_CHANGED_FORECAST,
  status: KGRelationshipStatus.MODEL_ESTIMATE,
  provenance: { sourceEvidenceIds: ['ANALYST_REVISION_MODEL'], sourceTier: KGSourceTier.TIER_3_INSTITUTIONAL_CONSENSUS }
});

// 2. Ingest Phase 22 Macro Regime Nodes
store.addNode(tenantId, { nodeId: 'MACRO_REGIME_STAGFLATION', nodeType: KGNodeType.MACRO_REGIME, label: 'Stagflation Macro Regime' });
store.addNode(tenantId, { nodeId: 'SEC_AAPL', nodeType: KGNodeType.SECURITY, label: 'Apple Equity' });
store.addNode(tenantId, { nodeId: 'PORT_GROWTH_101', nodeType: KGNodeType.PORTFOLIO, label: 'Global Growth Portfolio' });

store.addRelationship(tenantId, {
  relationshipId: 'REL-MACRO-EXP-SEC',
  fromNodeId: 'MACRO_REGIME_STAGFLATION',
  toNodeId: 'SEC_AAPL',
  relationshipType: KGRelationshipType.SECURITY_EXPOSED_TO_MACRO,
  status: KGRelationshipStatus.MODEL_ESTIMATE,
  properties: { inflationSensitivity: -0.4, ratesSensitivity: -0.8 },
  provenance: { sourceEvidenceIds: ['MACRO_REGIME_MODEL'], sourceTier: KGSourceTier.TIER_1_CENTRAL_BANK }
});

store.addRelationship(tenantId, {
  relationshipId: 'REL-SEC-HELD-BY-PORT',
  fromNodeId: 'SEC_AAPL',
  toNodeId: 'PORT_GROWTH_101',
  relationshipType: KGRelationshipType.SECURITY_HELD_BY,
  status: KGRelationshipStatus.VERIFIED,
  properties: { weight: 0.12, marketValue: 1200000 },
  provenance: { sourceEvidenceIds: ['PORTFOLIO_LEDGER'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING }
});

// 3. Verifications
const snap = store.getSnapshotAsOf(tenantId);
testAssert(snap.nodeCount === 6, '6 cross-domain nodes ingested');
testAssert(snap.relationshipCount === 4, '4 cross-domain relationships mapped');

const earningsFactRel = snap.relationships.find(r => r.relationshipId === 'REL-EARNINGS-TO-FACT');
testAssert(earningsFactRel.status === KGRelationshipStatus.VERIFIED, 'Observed fact is VERIFIED');

const macroRel = snap.relationships.find(r => r.relationshipId === 'REL-MACRO-EXP-SEC');
testAssert(macroRel.status === KGRelationshipStatus.MODEL_ESTIMATE, 'Macro exposure is MODEL_ESTIMATE (no causal fabrication)');

console.log(`[PASS] Suite 6 Earnings & Macro Bridges passed: ${assertionCount} assertions`);
export default { assertionCount };
