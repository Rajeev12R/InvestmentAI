/**
 * server/test-script/test-portfolio-opt-explanation-package.js
 * 
 * Phase 33 — Suite 9: Explanation DAG, NLG Narrative & Sealed Package
 */

import { PortfolioOptimizationEngine } from '../portfolioOptimization/portfolioOptimization.engine.js';
import { PortfolioOptimizationExplanationDAG } from '../portfolioOptimization/portfolioOptimization.explanation.js';
import { PortfolioOptimizationPackageBuilder } from '../portfolioOptimization/portfolioOptimization.package.js';
import { OptimizationObjective } from '../portfolioOptimization/portfolioOptimization.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 9: Explanation DAG & Cryptographic Sealed Package ---');

const symbols = ['STOCK_A', 'STOCK_B'];
const cov = [[0.04, 0.01], [0.01, 0.04]];
const optResult = PortfolioOptimizationEngine.runOptimization({
  objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
  symbols,
  covarianceMatrix: cov,
  constraints: { longOnly: true },
  periodsPerYear: 252
});

// 1. Explanation DAG
const dag = PortfolioOptimizationExplanationDAG.buildExplanationDAG(optResult);
assert(dag.dagId.startsWith('DAG-OPT-'), 'DAG ID is formatted correctly');
assert(dag.totalNodes >= 4, 'DAG contains at least 4 nodes (Objective, Solver, Positions, Constraints)');
assert(dag.totalEdges >= 3, 'DAG contains at least 3 directed edges');
assert(dag.narrative !== undefined, 'Narrative object attached to DAG');
assert(typeof dag.narrative.summary === 'string', 'Summary string generated');
assert(dag.narrative.keyDrivers.length > 0, 'Key drivers generated');

// 2. Cryptographically Sealed Package
const sealedPkg = PortfolioOptimizationPackageBuilder.buildSealedPackage({
  optimizationResult: optResult,
  explanationDAG: dag,
  portfolioSnapshotId: 'SNAP-EXPL-PKG',
  tenantId: 'tenant_institutional'
});

assert(sealedPkg.packageId.startsWith('PKG-OPT-'), 'Package ID generated');
assert(typeof sealedPkg.integrityHash === 'string' && sealedPkg.integrityHash.length === 64, 'SHA-256 integrity hash generated (64 hex characters)');

// 3. Verify Sealed Package Integrity
const verifCheck = PortfolioOptimizationPackageBuilder.verifyPackageIntegrity(sealedPkg);
assert(verifCheck.isValid === true, 'Untampered sealed package verifies successfully');

// 4. Tamper Detection
const tamperedPkg = JSON.parse(JSON.stringify(sealedPkg));
tamperedPkg.optimizedWeights[0] += 0.05; // Alter weight
const tamperedCheck = PortfolioOptimizationPackageBuilder.verifyPackageIntegrity(tamperedPkg);
assert(tamperedCheck.isValid === false, 'Tampered package is rejected with isValid = false');

console.log(`PASSED: ${passed}`);
