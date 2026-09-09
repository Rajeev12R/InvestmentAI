/**
 * test-kg-mutations.js
 * Suite 14: Knowledge Graph Mutation & Invariant Killers (50+ assertions)
 */

import assert from 'assert';
import {
  deepFreeze,
  canonicalSha256,
  KGNodeType,
  KGRelationshipType,
  KGRelationshipStatus,
  KGSourceTier,
  KGImpactCategory
} from '../knowledgeGraph/kg.types.js';
import { createKGStore, KnowledgeGraphStore } from '../knowledgeGraph/kg.store.js';
import { defaultPortfolioCommonDriverEngine } from '../knowledgeGraph/kg.commonDriver.engine.js';
import { defaultSharedRiskEngine } from '../knowledgeGraph/kg.sharedRisk.engine.js';
import { KnowledgeGraphTraversalEngine } from '../knowledgeGraph/kg.traversal.engine.js';
import { KnowledgeGraphDependencyEngine } from '../knowledgeGraph/kg.dependency.engine.js';
import { DecisionLineageEngine } from '../knowledgeGraph/kg.decisionLineage.engine.js';
import { defaultEntityResolutionEngine } from '../knowledgeGraph/kg.entityResolution.js';
import { sealKnowledgeGraphPackage, verifyKnowledgeGraphPackage } from '../knowledgeGraph/kg.package.js';
import { validateKGRelationship, validateKGNode } from '../knowledgeGraph/kg.schema.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 14: Knowledge Graph Mutation Tests ---');

// Mutant 1: Driver Exposure Math - Gross vs Net Portfolio Weight Denominator
const portHoldings = [
  { ticker: 'LONG_A', marketValue: 100000, drivers: { AI_CAPEX: 1.5, CLOUD: 1.0 } },
  { ticker: 'SHORT_B', marketValue: -50000, drivers: { AI_CAPEX: -0.5, CLOUD: 0.5 } }
];
const concResult = defaultPortfolioCommonDriverEngine.calculateCommonDrivers(portHoldings);
testAssert(concResult.grossPortfolioValue === 150000, 'Portfolio gross value is 150000');
testAssert(concResult.netPortfolioValue === 50000, 'Portfolio net value is 50000');
testAssert(concResult.totalLongValue === 100000, 'Total long value is 100000');
testAssert(concResult.totalShortValue === 50000, 'Total short value is 50000');
testAssert(concResult.grossPortfolioValue !== concResult.netPortfolioValue, 'Gross does not equal Net when shorts present');

const aiDriver = concResult.driverBreakdown.find(d => d.driverName === 'AI_CAPEX');
testAssert(aiDriver !== undefined, 'AI_CAPEX driver identified');
// Net dollar exposure: 100000 * 1.5 + (-50000) * -0.5 = 150000 + 25000 = 175000
testAssert(aiDriver.netDollarExposure === 175000, 'AI_CAPEX net exposure correctly calculated');
testAssert(aiDriver.holdingsCount === 2, 'AI_CAPEX shared across 2 holdings');

// Mutant 2: Driver HHI & N_eff Invariants
testAssert(concResult.driverHHI > 0, 'Driver HHI is positive');
testAssert(concResult.effectiveNumberOfDrivers > 0, 'Effective number of drivers is positive');
testAssert(Math.abs(concResult.effectiveNumberOfDrivers - (10000 / concResult.driverHHI)) < 0.1, 'N_eff consistent with HHI scale');
testAssert(concResult.top3DriverConcentrationPct <= 100, 'Top 3 driver concentration <= 100%');
testAssert(concResult.classification === 'MODEL_ESTIMATE', 'Driver concentration classified as MODEL_ESTIMATE');

// Mutant 3: Empty Driver Calculation Boundary
const emptyConc = defaultPortfolioCommonDriverEngine.calculateCommonDrivers([]);
testAssert(emptyConc.grossPortfolioValue === 0, 'Empty portfolio gross value is 0');
testAssert(emptyConc.netPortfolioValue === 0, 'Empty portfolio net value is 0');
testAssert(emptyConc.driverHHI === 0, 'Empty portfolio HHI is 0');
testAssert(emptyConc.effectiveNumberOfDrivers === 0, 'Empty portfolio N_eff is 0');
testAssert(emptyConc.totalDriversCount === 0, 'Empty portfolio has 0 drivers');

// Mutant 4: Shared Risk Capital Aggregation
const testPositions = [
  { ticker: 'AAPL', marketValue: 500000, sharedRisks: ['TAIWAN_STRAIT_RISK', 'CHINA_DEMAND'] },
  { ticker: 'NVDA', marketValue: 400000, sharedRisks: ['TAIWAN_STRAIT_RISK', 'EXPORT_CONTROLS'] }
];
const sharedRisks = defaultSharedRiskEngine.calculateSharedRisks(testPositions);
testAssert(sharedRisks.totalGrossPortfolioValue === 900000, 'Total gross portfolio value is 900000');
testAssert(sharedRisks.topSharedRisks.length === 3, 'Found 3 distinct shared risk buckets');

const taiwanRisk = sharedRisks.topSharedRisks.find(r => r.riskName === 'TAIWAN_STRAIT_RISK');
testAssert(taiwanRisk !== undefined, 'Taiwan risk bucket identified');
testAssert(taiwanRisk.exposedCapital === 900000, 'All 900k capital exposed to Taiwan risk');
testAssert(taiwanRisk.capitalSharePct === 100, 'Capital share percentage is 100%');
testAssert(taiwanRisk.holdingsCount === 2, 'Taiwan risk spans 2 holdings');

// Mutant 5: Shared Risk Empty & Zero Values
const emptyRisks = defaultSharedRiskEngine.calculateSharedRisks([]);
testAssert(emptyRisks.totalGrossPortfolioValue === 0, 'Empty risks returns 0 gross value');
testAssert(emptyRisks.topSharedRisks.length === 0, 'Empty risks returns 0 risk items');

// Mutant 6: Immutability / DeepFreeze Mutators
const frozenObj = deepFreeze({
  name: 'KG_IMMUTABLE',
  metadata: { version: 1, tags: ['a', 'b'] },
  metrics: { hhi: 0.35 }
});
let f1 = false, f2 = false, f3 = false, f4 = false, f5 = false;
try { frozenObj.name = 'MUTATED'; } catch { f1 = true; }
try { frozenObj.metadata.version = 2; } catch { f2 = true; }
try { frozenObj.metadata.tags.push('c'); } catch { f3 = true; }
try { frozenObj.newField = 'FAIL'; } catch { f4 = true; }
try { delete frozenObj.metrics; } catch { f5 = true; }
testAssert(f1, 'DeepFreeze blocks root mutation');
testAssert(f2, 'DeepFreeze blocks nested mutation');
testAssert(f3, 'DeepFreeze blocks array push');
testAssert(f4, 'DeepFreeze blocks new property');
testAssert(f5, 'DeepFreeze blocks property deletion');
testAssert(frozenObj.name === 'KG_IMMUTABLE', 'Value is preserved');
testAssert(frozenObj.metadata.tags.length === 2, 'Array length is preserved');

// Mutant 7: Canonical SHA-256 Key Ordering Invariance
const hashA = canonicalSha256({ z: 'last', a: 'first', nested: { b: 2, a: 1 } });
const hashB = canonicalSha256({ a: 'first', z: 'last', nested: { a: 1, b: 2 } });
testAssert(hashA === hashB, 'Canonical SHA256 is key-order invariant');
testAssert(typeof hashA === 'string' && hashA.length === 64, 'SHA256 produces 64-character hex string');
testAssert(canonicalSha256({ a: 1 }) !== canonicalSha256({ a: 2 }), 'Canonical SHA256 produces different hash for different content');
testAssert(canonicalSha256(null) === null, 'Canonical SHA256 returns null for null input');
testAssert(canonicalSha256(undefined) === null, 'Canonical SHA256 returns null for undefined input');

// Mutant 8: Provenance Schema Validation Rejection
const invalidRel = {
  relationshipId: 'REL_UNVERIFIED_MUT',
  fromNodeId: 'NODE_SOURCE_A',
  toNodeId: 'NODE_SOURCE_B',
  relationshipType: KGRelationshipType.COMPANY_COMPETES_WITH,
  status: KGRelationshipStatus.VERIFIED,
  tenantId: 'tenant-mut-1',
  provenance: { sourceEvidenceIds: [] } // Missing evidence
};
const valResult = validateKGRelationship(invalidRel);
testAssert(valResult.isValid === false, 'Relationship claiming VERIFIED without evidence fails validation');
testAssert(valResult.errors.some(e => e.includes('sourceEvidenceIds')), 'Error mentions sourceEvidenceIds');

// Mutant 9: Point-in-time temporal leakage filter in Snapshot
const store = createKGStore();
const tenantId = 'tenant-mut-1';

store.addNode(tenantId, {
  nodeId: 'NODE_PAST_MUT',
  nodeType: KGNodeType.COMPANY,
  label: 'Past Co',
  createdAt: '2026-01-01T00:00:00.000Z',
  effectiveFrom: '2026-01-01T00:00:00.000Z',
  effectiveTo: '2026-06-01T00:00:00.000Z'
});
store.addNode(tenantId, {
  nodeId: 'NODE_FUTURE_MUT',
  nodeType: KGNodeType.COMPANY,
  label: 'Future Co',
  createdAt: '2026-07-01T00:00:00.000Z',
  effectiveFrom: '2026-07-01T00:00:00.000Z',
  effectiveTo: null
});

store.addRelationship(tenantId, {
  relationshipId: 'REL_PAST_ACTIVE',
  fromNodeId: 'NODE_PAST_MUT',
  toNodeId: 'NODE_PAST_MUT',
  relationshipType: KGRelationshipType.COMPANY_COMPETES_WITH,
  status: KGRelationshipStatus.DERIVED,
  createdAt: '2026-01-01T00:00:00.000Z',
  observedAt: '2026-01-01T00:00:00.000Z',
  effectiveFrom: '2026-01-01T00:00:00.000Z',
  effectiveTo: '2026-06-01T00:00:00.000Z'
});

const snapMarch = store.getSnapshotAsOf(tenantId, '2026-03-01T00:00:00.000Z');
testAssert(snapMarch.nodes.some(n => n.nodeId === 'NODE_PAST_MUT'), 'Past node is visible in March 2026 snapshot');
testAssert(!snapMarch.nodes.some(n => n.nodeId === 'NODE_FUTURE_MUT'), 'Future node is filtered out in March 2026 snapshot (anti-leakage)');
testAssert(snapMarch.relationships.some(r => r.relationshipId === 'REL_PAST_ACTIVE'), 'Relationship active in March 2026');

const snapJuly = store.getSnapshotAsOf(tenantId, '2026-07-01T00:00:00.000Z');
testAssert(snapJuly.nodes.some(n => n.nodeId === 'NODE_FUTURE_MUT'), 'Future node visible in July 2026 snapshot');
testAssert(!snapJuly.relationships.some(r => r.relationshipId === 'REL_PAST_ACTIVE'), 'Expired relationship filtered out in July 2026');

// Mutant 10: Entity Resolution - Ticker rename point-in-time
const resolvedFB_2020 = defaultEntityResolutionEngine.resolveEntity('FB', '2020-01-01T00:00:00.000Z');
testAssert(resolvedFB_2020.canonicalId === 'META_CORP', 'FB resolves to META_CORP canonical identity');
testAssert(resolvedFB_2020.isResolved === true, 'FB is resolved');

const resolvedMETA_2024 = defaultEntityResolutionEngine.resolveEntity('META', '2024-01-01T00:00:00.000Z');
testAssert(resolvedMETA_2024.canonicalId === 'META_CORP', 'META resolves to META_CORP');

const fallbackEntity = defaultEntityResolutionEngine.resolveEntity('UNKNOWN_XYZ_TICKER');
testAssert(fallbackEntity.isResolved === false, 'Unknown ticker is marked isResolved = false');
testAssert(fallbackEntity.resolutionType === 'EXACT_NAME_FALLBACK', 'Fallback resolution type applied');

// Mutant 11: Traversal cycle detection & depth limit
const travStore = createKGStore();
const travEngine = new KnowledgeGraphTraversalEngine(travStore);
const tId = 'tenant-trav-mut';

travStore.addNode(tId, { nodeId: 'CYC_A', nodeType: KGNodeType.COMPANY, label: 'A' });
travStore.addNode(tId, { nodeId: 'CYC_B', nodeType: KGNodeType.COMPANY, label: 'B' });
travStore.addNode(tId, { nodeId: 'CYC_C', nodeType: KGNodeType.COMPANY, label: 'C' });

travStore.addRelationship(tId, {
  relationshipId: 'REL_A_B',
  fromNodeId: 'CYC_A',
  toNodeId: 'CYC_B',
  relationshipType: KGRelationshipType.COMPANY_SUPPLIES,
  status: KGRelationshipStatus.DERIVED
});
travStore.addRelationship(tId, {
  relationshipId: 'REL_B_C',
  fromNodeId: 'CYC_B',
  toNodeId: 'CYC_C',
  relationshipType: KGRelationshipType.COMPANY_SUPPLIES,
  status: KGRelationshipStatus.DERIVED
});
travStore.addRelationship(tId, {
  relationshipId: 'REL_C_A',
  fromNodeId: 'CYC_C',
  toNodeId: 'CYC_A',
  relationshipType: KGRelationshipType.COMPANY_SUPPLIES,
  status: KGRelationshipStatus.DERIVED
});

const neighborhood = travEngine.getNodeNeighborhood(tId, 'CYC_A', 3);
testAssert(neighborhood.isFound === true, 'Node found');
testAssert(neighborhood.nodes.length === 3, 'Visited exactly 3 unique nodes in cyclic graph');
testAssert(neighborhood.depthTraversed <= 3, 'Depth traversed respected');

// Mutant 12: Restatement Propagation - Preserves Historical Decision Records
const depStore = createKGStore();
const depEngine = new KnowledgeGraphDependencyEngine(depStore);
const restateTenant = 'tenant-restate-mut';

depStore.addNode(restateTenant, {
  nodeId: 'FACT_HIST_REV',
  nodeType: KGNodeType.FINANCIAL_FACT,
  label: 'FY2024 Revenue $100M'
});
depStore.addNode(restateTenant, {
  nodeId: 'DEC_HIST_ALLOC',
  nodeType: KGNodeType.DECISION,
  label: 'Allocation Decision',
  properties: { originalWeight: 0.05, recommendation: 'BUY' }
});
depStore.addRelationship(restateTenant, {
  relationshipId: 'REL_FACT_DEC',
  fromNodeId: 'FACT_HIST_REV',
  toNodeId: 'DEC_HIST_ALLOC',
  relationshipType: KGRelationshipType.DECISION_DEPENDS_ON_FACT,
  status: KGRelationshipStatus.VALIDATED,
  provenance: { sourceEvidenceIds: ['EV_1'], sourceTier: KGSourceTier.TIER_1_REGULATORY_FILING }
});

const restatementResult = depEngine.propagateFactRestatement(restateTenant, 'FACT_HIST_REV', {
  oldValue: 100000000,
  newValue: 80000000,
  delta: -20000000,
  reason: 'Audit adjustment'
});

testAssert(restatementResult.restatedFactId === 'FACT_HIST_REV', 'Restated correct fact');
testAssert(restatementResult.affectedDownstreamCount === 1, '1 downstream object affected');
testAssert(restatementResult.staleItems.some(i => i.nodeId === 'DEC_HIST_ALLOC'), 'Decision flagged for potential staleness');

// Historical integrity check: Historical decision properties MUST NOT be wiped
const decAfterRestatement = depStore.getNode(restateTenant, 'DEC_HIST_ALLOC');
testAssert(decAfterRestatement.properties.originalWeight === 0.05, 'Original weight preserved');
testAssert(decAfterRestatement.properties.recommendation === 'BUY', 'Original recommendation preserved');

// Mutant 13: Package Sealing & Tamper Verification
const pkgPayload = { graphStats: { nodes: 10, rels: 15 } };
const sealedPkg = sealKnowledgeGraphPackage(pkgPayload, 'auditor-1');
testAssert(sealedPkg.sha256Signature.length === 64, 'Sealed package has 64-char SHA256 signature');
testAssert(sealedPkg.isSealed === true, 'Package is marked sealed');

const validVerification = verifyKnowledgeGraphPackage(sealedPkg);
testAssert(validVerification.isValid === true, 'Untampered package verifies valid');
testAssert(validVerification.status === 'VALID_UNMODIFIED', 'Status is VALID_UNMODIFIED');

// Tamper payload
const tamperedPkg = { ...sealedPkg, payload: { graphStats: { nodes: 999, rels: 999 } } };
const tamperedVerification = verifyKnowledgeGraphPackage(tamperedPkg);
testAssert(tamperedVerification.isValid === false, 'Tampered package fails verification');
testAssert(tamperedVerification.status === 'TAMPERED_OR_CORRUPT', 'Status is TAMPERED_OR_CORRUPT');

// Mutant 14: Tenant Isolation Mutator
const isoStore = createKGStore();
isoStore.addNode('tenant-A', { nodeId: 'SEC_A', nodeType: KGNodeType.SECURITY, label: 'Sec A' });
testAssert(isoStore.getNode('tenant-A', 'SEC_A') !== null, 'Node visible to tenant-A');
testAssert(isoStore.getNode('tenant-B', 'SEC_A') === null, 'Node completely invisible to tenant-B (tenant isolation)');

// Mutant 15: Dual-Class Resolution Mutator
const googRes = defaultEntityResolutionEngine.resolveEntity('GOOG');
const googlRes = defaultEntityResolutionEngine.resolveEntity('GOOGL');
testAssert(googRes.canonicalId === 'ALPHABET_CLASS_C', 'GOOG resolves to Class C');
testAssert(googlRes.canonicalId === 'ALPHABET_CLASS_A', 'GOOGL resolves to Class A');
testAssert(googRes.canonicalId !== googlRes.canonicalId, 'Dual-class shares retain distinct canonical IDs');

// Mutant 16: Additional Node & Edge Types Verification
testAssert(KGNodeType.CORPORATE_EVENT === 'CORPORATE_EVENT', 'CORPORATE_EVENT node type exists');
testAssert(KGNodeType.COMPLIANCE_RULE === 'COMPLIANCE_RULE', 'COMPLIANCE_RULE node type exists');
testAssert(KGNodeType.SCENARIO === 'SCENARIO', 'SCENARIO node type exists');
testAssert(KGRelationshipType.EVENT_CHANGED_THESIS === 'EVENT_CHANGED_THESIS', 'EVENT_CHANGED_THESIS rel type exists');
testAssert(KGRelationshipType.EXPECTED_DRIVER_SUPPORTS_THESIS === 'EXPECTED_DRIVER_SUPPORTS_THESIS', 'EXPECTED_DRIVER_SUPPORTS_THESIS rel type exists');
testAssert(KGImpactCategory.POTENTIAL_STALENESS === 'POTENTIAL_STALENESS', 'POTENTIAL_STALENESS impact category exists');

console.log(`[PASS] Suite 14 Knowledge Graph Mutations passed: ${assertionCount} assertions`);
export default { assertionCount };
