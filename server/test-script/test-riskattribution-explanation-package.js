/**
 * server/test-script/test-riskattribution-explanation-package.js
 * 
 * Phase 32 — Suite 11: Explanation DAG, Natural Language Generator & Sealed Package
 */

import { RiskAttributionEngine } from '../riskAttribution/riskAttribution.engine.js';
import { RiskAttributionExplanationDAG } from '../riskAttribution/riskAttribution.explanation.js';
import { RiskAttributionPackageBuilder } from '../riskAttribution/riskAttribution.package.js';
import { ConfidenceStatus } from '../riskAttribution/riskAttribution.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 11: Explanation DAG, Natural Language Generator & Sealed Package ---');

const symbols = ['AAPL', 'MSFT', 'AMZN'];
const weights = [0.4, 0.35, 0.25];
const cov = [
  [0.05, 0.03, 0.02],
  [0.03, 0.04, 0.015],
  [0.02, 0.015, 0.06]
];
const sectors = { AAPL: 'Technology', MSFT: 'Technology', AMZN: 'Consumer Discretionary' };

const attr = RiskAttributionEngine.runComprehensiveAttribution({
  symbols,
  weights,
  covarianceMatrix: cov,
  sectors,
  periodsPerYear: 252
});

// 1. Explanation DAG Generation
const dag = RiskAttributionExplanationDAG.buildExplanationDAG(attr);
assert(dag !== null, 'Explanation DAG generated');
assert(dag.totalNodes >= 4, 'DAG contains root + position + sector nodes');
assert(dag.totalEdges >= 3, 'DAG contains connecting edges');

// Verify Node Calculation & Metadata
const rootNode = dag.nodes.find(n => n.nodeId === 'NODE-PORTFOLIO-VOLATILITY');
assert(rootNode !== null, 'Root volatility node exists in DAG');
assert(rootNode.confidence === ConfidenceStatus.CALCULATED, 'Root node confidence is CALCULATED');
assert(rootNode.calculation.includes('sigma_p'), 'Root node contains mathematical calculation formula');
assert(rootNode.dependencies.length >= 2, 'Root node lists input dependencies');

// 2. Deterministic Natural Language Generator
assert(dag.narrative !== null, 'Narrative generated');
assert(typeof dag.narrative.summary === 'string' && dag.narrative.summary.length > 20, 'Narrative summary is valid string');
assert(dag.narrative.bulletPoints.length >= 3, 'Narrative contains bullet points');

// Verify narrative contains exact numbers matching quantitative metrics (No contradictions)
const volPctStr = (attr.portfolioMetrics.portfolioVolatility * 100).toFixed(2);
assert(dag.narrative.summary.includes(volPctStr), `Narrative contains exact portfolio volatility ${volPctStr}%`);
assert(dag.narrative.summary.includes('AAPL'), 'Narrative references top holding AAPL');

// 3. Sealed Package Construction & Cryptographic SHA-256 Seal
const sealedPkg = RiskAttributionPackageBuilder.buildSealedPackage({
  attributionResult: attr,
  explanationDAG: dag,
  portfolioSnapshotId: 'SNAP-AUDIT-2026',
  tenantId: 'tenant_institutional',
  modelProvenance: { covarianceModelVersion: 'v31.1.0-psd', dataSnapshotVersion: 'PROD-T1' }
});

assert(sealedPkg.integrity.isSealed === true, 'Package is marked sealed');
assert(sealedPkg.integrity.algorithm === 'SHA-256', 'Package uses SHA-256 integrity algorithm');
assert(typeof sealedPkg.integrity.hash === 'string' && sealedPkg.integrity.hash.length === 64, 'SHA-256 hash is 64 hex characters');
assert(sealedPkg.modelProvenance.dataSnapshotVersion === 'PROD-T1', 'Model provenance recorded in sealed package');

// 4. Verification of Untampered Sealed Package
const validCheck = RiskAttributionPackageBuilder.verifyPackageIntegrity(sealedPkg);
assert(validCheck.isValid === true, 'Untampered package verification succeeds');

// 5. Verification of Tampered Sealed Package
const tamperedPkg = JSON.parse(JSON.stringify(sealedPkg));
tamperedPkg.positions[0].weight = 0.99; // Tampering with holdings
const invalidCheck = RiskAttributionPackageBuilder.verifyPackageIntegrity(tamperedPkg);
assert(invalidCheck.isValid === false, 'Tampered package is successfully detected and rejected');
assert(invalidCheck.reason.includes('Hash mismatch'), 'Integrity check returns Hash mismatch reason');

console.log(`PASSED: ${passed}`);
