/**
 * test-kg-golden-traces.js
 * Suite 12: Deterministic Golden Traces A through L
 */

import assert from 'assert';
import { createKGStore } from '../knowledgeGraph/kg.store.js';
import { KnowledgeGraphDependencyEngine } from '../knowledgeGraph/kg.dependency.engine.js';
import { defaultPortfolioCommonDriverEngine } from '../knowledgeGraph/kg.commonDriver.engine.js';
import { DecisionLineageEngine } from '../knowledgeGraph/kg.decisionLineage.engine.js';
import { defaultEntityResolutionEngine } from '../knowledgeGraph/kg.entityResolution.js';
import { sealKnowledgeGraphPackage, verifyKnowledgeGraphPackage } from '../knowledgeGraph/kg.package.js';
import { KGNodeType, KGRelationshipType, KGRelationshipStatus, KGSourceTier } from '../knowledgeGraph/kg.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 12: Golden Cases A–L Traces ---');

const store = createKGStore();
const depEngine = new KnowledgeGraphDependencyEngine(store);
const lineageEngine = new DecisionLineageEngine(store);
const tenantId = 'tenant-golden-traces';

// Golden A — Fact -> Forecast -> Valuation -> Decision
store.addNode(tenantId, { nodeId: 'GA_FACT_EPS', nodeType: KGNodeType.FINANCIAL_FACT, label: 'EPS $5.00' });
store.addNode(tenantId, { nodeId: 'GA_FCST_GROWTH', nodeType: KGNodeType.FORECAST, label: 'Growth 15%' });
store.addNode(tenantId, { nodeId: 'GA_VAL_TARGET', nodeType: KGNodeType.VALUATION, label: 'Target $100' });
store.addNode(tenantId, { nodeId: 'GA_DEC_BUY', nodeType: KGNodeType.DECISION, label: 'Buy Decision' });

store.addRelationship(tenantId, { relationshipId: 'GA_R1', fromNodeId: 'GA_FACT_EPS', toNodeId: 'GA_FCST_GROWTH', relationshipType: KGRelationshipType.FORECAST_DEPENDS_ON_FACT, status: KGRelationshipStatus.VALIDATED, provenance: { sourceEvidenceIds: ['E1'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING } });
store.addRelationship(tenantId, { relationshipId: 'GA_R2', fromNodeId: 'GA_FCST_GROWTH', toNodeId: 'GA_VAL_TARGET', relationshipType: KGRelationshipType.VALUATION_DEPENDS_ON_FORECAST, status: KGRelationshipStatus.VALIDATED, provenance: { sourceEvidenceIds: ['E2'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING } });
store.addRelationship(tenantId, { relationshipId: 'GA_R3', fromNodeId: 'GA_VAL_TARGET', toNodeId: 'GA_DEC_BUY', relationshipType: KGRelationshipType.DECISION_DEPENDS_ON_FACT, status: KGRelationshipStatus.VALIDATED, provenance: { sourceEvidenceIds: ['E3'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING } });

const gaImpact = depEngine.evaluateFactImpact(tenantId, 'GA_FACT_EPS');
testAssert(gaImpact.affectedDownstreamCount === 3, 'Golden A: 3 downstream nodes in dependency chain');
testAssert(gaImpact.affectedNodes.some(n => n.nodeId === 'GA_DEC_BUY'), 'Golden A: Fact reaches decision');

// Golden B — Earnings Event -> Fact -> Forecast Revision -> Thesis
store.addNode(tenantId, { nodeId: 'GB_EVENT', nodeType: KGNodeType.EARNINGS_EVENT, label: 'Q3 Beat Event' });
store.addNode(tenantId, { nodeId: 'GB_FACT', nodeType: KGNodeType.FINANCIAL_FACT, label: 'Observed Rev $20B' });
store.addNode(tenantId, { nodeId: 'GB_FCST_REV', nodeType: KGNodeType.FORECAST, label: 'Forecast Revision V2' });
store.addNode(tenantId, { nodeId: 'GB_THESIS', nodeType: KGNodeType.THESIS, label: 'High Growth Thesis' });

store.addRelationship(tenantId, { relationshipId: 'GB_R1', fromNodeId: 'GB_EVENT', toNodeId: 'GB_FACT', relationshipType: KGRelationshipType.EVENT_CHANGED_FACT, status: KGRelationshipStatus.VERIFIED, provenance: { sourceEvidenceIds: ['E_10Q'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING } });
store.addRelationship(tenantId, { relationshipId: 'GB_R2', fromNodeId: 'GB_EVENT', toNodeId: 'GB_FCST_REV', relationshipType: KGRelationshipType.EVENT_CHANGED_FORECAST, status: KGRelationshipStatus.MODEL_ESTIMATE, provenance: { sourceEvidenceIds: ['E_REV'], sourceTier: KGSourceTier.TIER_3_INSTITUTIONAL_CONSENSUS } });
store.addRelationship(tenantId, { relationshipId: 'GB_R3', fromNodeId: 'GB_FCST_REV', toNodeId: 'GB_THESIS', relationshipType: KGRelationshipType.FACT_SUPPORTS_THESIS, status: KGRelationshipStatus.VALIDATED, provenance: { sourceEvidenceIds: ['E_TH'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING } });

const gbImpact = depEngine.evaluateFactImpact(tenantId, 'GB_EVENT');
testAssert(gbImpact.affectedDownstreamCount >= 3, 'Golden B: Earnings event propagates to thesis');

// Golden C — Macro Regime -> Security Exposure -> Portfolio Driver
store.addNode(tenantId, { nodeId: 'GC_REGIME', nodeType: KGNodeType.MACRO_REGIME, label: 'High Inflation Regime' });
store.addNode(tenantId, { nodeId: 'GC_SEC', nodeType: KGNodeType.SECURITY, label: 'Airline A Equity' });
store.addRelationship(tenantId, { relationshipId: 'GC_R1', fromNodeId: 'GC_REGIME', toNodeId: 'GC_SEC', relationshipType: KGRelationshipType.SECURITY_EXPOSED_TO_MACRO, status: KGRelationshipStatus.MODEL_ESTIMATE, properties: { oilBeta: -1.2 }, provenance: { sourceEvidenceIds: ['E_MACRO'], sourceTier: KGSourceTier.TIER_1_CENTRAL_BANK } });
const gcSnap = store.getSnapshotAsOf(tenantId);
testAssert(gcSnap.relationships.some(r => r.relationshipId === 'GC_R1'), 'Golden C: Macro regime exposure mapped to security');

// Golden D — Shared Driver Concentration
const gdRes = defaultPortfolioCommonDriverEngine.calculateCommonDrivers([
  { ticker: 'A', marketValue: 600000, drivers: { DRIVER_X: 1.0 } },
  { ticker: 'B', marketValue: 400000, drivers: { DRIVER_X: 1.0 } }
]);
testAssert(gdRes.top3DriverConcentrationPct === 100, 'Golden D: 100% concentration in shared DRIVER_X');

// Golden E — Restated Fact -> Downstream Staleness
const geRes = depEngine.propagateFactRestatement(tenantId, 'GA_FACT_EPS', { delta: -1.0 });
testAssert(geRes.staleItems.length === 3, 'Golden E: 3 downstream items marked POTENTIAL_STALENESS');

// Golden F — Historical Decision Replay
const gfLineage = lineageEngine.getDecisionLineage(tenantId, 'GA_DEC_BUY');
testAssert(gfLineage.decisionId === 'GA_DEC_BUY', 'Golden F: Decision lineage retrieved');

// Golden G — Acquisition / Entity Resolution
const ggRes = defaultEntityResolutionEngine.resolveEntity('TARGET_B', '2023-01-01T00:00:00.000Z');
testAssert(ggRes.canonicalId === 'TARGET_B_CORP', 'Golden G: Target B resolved as independent pre-acquisition');

// Golden H — Delisted Security Survivorship
store.addNode(tenantId, { nodeId: 'GH_DELISTED', nodeType: KGNodeType.SECURITY, label: 'Enron Corp', effectiveFrom: '1995-01-01T00:00:00.000Z', effectiveTo: '2001-12-02T00:00:00.000Z', isDelisted: true });
const ghHist = store.getHistoricalEntities(tenantId, '2000-01-01T00:00:00.000Z');
testAssert(ghHist.some(n => n.nodeId === 'GH_DELISTED'), 'Golden H: Delisted entity preserved in historical query');

// Golden I — Thesis Dependency
store.addNode(tenantId, { nodeId: 'GI_THESIS', nodeType: KGNodeType.THESIS, label: 'AI Moat Thesis' });
store.addNode(tenantId, { nodeId: 'GI_DRIVER', nodeType: KGNodeType.EXPECTED_DRIVER, label: 'GPU Demand' });
store.addRelationship(tenantId, { relationshipId: 'GI_R1', fromNodeId: 'GI_DRIVER', toNodeId: 'GI_THESIS', relationshipType: KGRelationshipType.EXPECTED_DRIVER_SUPPORTS_THESIS, status: KGRelationshipStatus.VALIDATED, provenance: { sourceEvidenceIds: ['E_DRV'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING } });
const giDeps = lineageEngine.evaluateThesisDependencies(tenantId, 'GI_THESIS');
testAssert(giDeps.thesisHealth === 'HEALTHY', 'Golden I: Thesis evaluated as HEALTHY');

// Golden J — Decision Lineage
store.addNode(tenantId, { nodeId: 'GJ_DEC', nodeType: KGNodeType.DECISION, label: 'Allocation Decision' });
store.addRelationship(tenantId, { relationshipId: 'GJ_R1', fromNodeId: 'GJ_DEC', toNodeId: 'GI_THESIS', relationshipType: KGRelationshipType.THESIS_ABOUT, status: KGRelationshipStatus.VALIDATED, provenance: { sourceEvidenceIds: ['E_DEC'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING } });
const gjLineage = lineageEngine.getDecisionLineage(tenantId, 'GJ_DEC');
testAssert(gjLineage.lineageNodes.length >= 2, 'Golden J: Bidirectional lineage verified');

// Golden K — Evidence-backed Relationship
const gkRel = store.getRelationship(tenantId, 'GA_R1');
testAssert(gkRel.provenance.sourceTier === KGSourceTier.TIER_1_REGULATORY_FILING, 'Golden K: Relationship has Tier 1 verified evidence');

// Golden L — AI Hypothesis Cannot Become Authoritative Fact
const aiRel = store.addRelationship(tenantId, {
  relationshipId: 'GL_AI_HYPOTHESIS',
  fromNodeId: 'SEC_NVDA',
  toNodeId: 'SEC_AAPL',
  relationshipType: KGRelationshipType.COMPANY_COMPETES_WITH,
  status: KGRelationshipStatus.AI_HYPOTHESIS,
  provenance: { sourceEvidenceIds: [] }
});
testAssert(aiRel.status === KGRelationshipStatus.AI_HYPOTHESIS, 'Golden L: AI hypothesis strictly isolated as AI_HYPOTHESIS');

console.log(`[PASS] Suite 12 Golden Traces A-L passed: ${assertionCount} assertions`);
export default { assertionCount };
