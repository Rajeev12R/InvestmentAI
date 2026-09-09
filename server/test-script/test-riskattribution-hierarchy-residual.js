/**
 * server/test-script/test-riskattribution-hierarchy-residual.js
 * 
 * Phase 32 — Suite 10: Risk Contribution Hierarchy, Multi-Tier Rollup & Residual Policy
 */

import { RiskAttributionEngine } from '../riskAttribution/riskAttribution.engine.js';
import { RiskAttributionHierarchy } from '../riskAttribution/riskAttribution.hierarchy.js';
import { ResidualPolicy } from '../riskAttribution/riskAttribution.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 10: Risk Contribution Hierarchy & Residual Policy ---');

const symbols = ['MSFT', 'NVDA', 'JPM', 'UNH'];
const weights = [0.35, 0.25, 0.20, 0.20];
const cov = [
  [0.050, 0.035, 0.015, 0.010],
  [0.035, 0.080, 0.018, 0.012],
  [0.015, 0.018, 0.040, 0.014],
  [0.010, 0.012, 0.014, 0.035]
];

const sectors = {
  MSFT: 'Technology',
  NVDA: 'Technology',
  JPM: 'Financials',
  UNH: 'Healthcare'
};

const sleeves = {
  MSFT: 'Core Equity',
  NVDA: 'Tactical Growth',
  JPM: 'Core Equity',
  UNH: 'Core Equity'
};

const attr = RiskAttributionEngine.runComprehensiveAttribution({
  symbols,
  weights,
  covarianceMatrix: cov,
  sectors,
  sleeves,
  periodsPerYear: 252
});

// 1. Build Multi-Tier Hierarchy Tree
const tree = RiskAttributionHierarchy.buildHierarchyTree(attr);
assert(tree !== null, 'Hierarchy tree generated');
assert(tree.invariants.hasNoCycles === true, 'Hierarchy tree has NO cycles');
assert(tree.invariants.isAdditivelyConsistent === true, 'Hierarchy tree is additively consistent');

// 2. Verify Sector Tree Rollup
const secTree = tree.sectorTree;
assert(secTree.children.length === 3, 'Sector tree has 3 sector nodes (Tech, Fin, Health)');
const techNode = secTree.children.find(c => c.name === 'Technology');
assert(techNode.children.length === 2, 'Technology node contains 2 position children (MSFT, NVDA)');
const sumTechPosCRC = techNode.children.reduce((s, c) => s + c.componentRiskContribution, 0);
assert(Math.abs(techNode.componentRiskContribution - sumTechPosCRC) < 1e-12, 'Parent Sector CRC equals sum of children position CRCs');

// 3. Verify Sleeve Tree Rollup
const sleeveTree = tree.sleeveTree;
assert(sleeveTree.children.length === 2, 'Sleeve tree has 2 sleeves (Core Equity, Tactical Growth)');
const coreNode = sleeveTree.children.find(c => c.name === 'Core Equity');
assert(coreNode.children.length === 3, 'Core Equity sleeve has 3 positions');

// 4. Verify Residual Policy
assert(attr.reconciliation.residual.policy === ResidualPolicy.RECONCILED_WITHIN_TOLERANCE, 'Residual policy is RECONCILED_WITHIN_TOLERANCE for clean matrix');
assert(attr.reconciliation.residual.crcGap <= 1e-6, 'CRC gap is <= 1e-6');
assert(attr.reconciliation.residual.prcGap <= 1e-5, 'PRC gap is <= 1e-5');
assert(attr.reconciliation.residual.varianceGap <= 1e-6, 'Variance gap is <= 1e-6');

// 5. Test Cycle Detection Utility
const cyclicNodeA = { id: 'A', children: [] };
const cyclicNodeB = { id: 'B', children: [cyclicNodeA] };
cyclicNodeA.children.push(cyclicNodeB); // A -> B -> A cycle
assert(RiskAttributionHierarchy.verifyNoCycles([cyclicNodeA]) === false, 'verifyNoCycles detects cyclic graph');

console.log(`PASSED: ${passed}`);
