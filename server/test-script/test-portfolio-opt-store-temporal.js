/**
 * server/test-script/test-portfolio-opt-store-temporal.js
 * 
 * Phase 33 — Suite 2: Multi-Tenant Repository, Temporal PIT & Audit Store
 */

import { PortfolioOptimizationRepository } from '../portfolioOptimization/portfolioOptimization.repository.js';
import { PortfolioOptimizationPackageBuilder } from '../portfolioOptimization/portfolioOptimization.package.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 2: Multi-Tenant Repository & Temporal PIT Audit Store ---');

const repo = new PortfolioOptimizationRepository();
const tenantA = 'tenant_hedge_fund';
const tenantB = 'tenant_family_office';

const mockOptResult1 = {
  objectiveType: 'MINIMUM_VARIANCE',
  symbols: ['AAPL', 'MSFT'],
  optimizedWeights: [0.6, 0.4],
  portfolioMetrics: { expectedReturn: 0.08, portfolioVolatility: 0.15 },
  positionDecisions: [{ symbol: 'AAPL', weightDelta: 0.1 }],
  postOptimizationVerification: { isHardConstraintsSatisfied: true },
  asOf: '2026-01-15T00:00:00.000Z'
};

const pkg1 = PortfolioOptimizationPackageBuilder.buildSealedPackage({
  optimizationResult: mockOptResult1,
  explanationDAG: { dagId: 'DAG-1' },
  portfolioSnapshotId: 'SNAP-MAIN-PORTFOLIO',
  tenantId: tenantA
});

repo.savePackage(tenantA, pkg1);
assert(repo.getPackage(tenantA, pkg1.packageId) !== null, 'Package saved and retrieved for Tenant A');
assert(repo.getPackage(tenantB, pkg1.packageId) === null, 'Tenant B cannot access Tenant A package (Isolation)');

// Point-in-Time Temporal Cutoff Test
const mockOptResult2 = {
  ...mockOptResult1,
  optimizedWeights: [0.7, 0.3],
  asOf: '2026-02-15T00:00:00.000Z'
};

const pkg2 = PortfolioOptimizationPackageBuilder.buildSealedPackage({
  optimizationResult: mockOptResult2,
  explanationDAG: { dagId: 'DAG-2' },
  portfolioSnapshotId: 'SNAP-MAIN-PORTFOLIO',
  tenantId: tenantA
});

repo.savePackage(tenantA, pkg2);

// Query @ T1 (Jan 20) -> must return pkg1
const pit1 = repo.getOptimizationAsOf(tenantA, 'SNAP-MAIN-PORTFOLIO', '2026-01-20T00:00:00.000Z');
assert(pit1 !== null, 'PIT query @ T1 returns package');
assert(pit1.packageId === pkg1.packageId, 'PIT query @ T1 correctly returns historical package 1');
assert(pit1.optimizedWeights[0] === 0.6, 'Historical weights @ T1 are preserved');

// Query @ T2 (Feb 20) -> must return pkg2
const pit2 = repo.getOptimizationAsOf(tenantA, 'SNAP-MAIN-PORTFOLIO', '2026-02-20T00:00:00.000Z');
assert(pit2 !== null, 'PIT query @ T2 returns package');
assert(pit2.packageId === pkg2.packageId, 'PIT query @ T2 correctly returns latest package 2');
assert(pit2.optimizedWeights[0] === 0.7, 'Updated weights @ T2 are retrieved');

// Query before any package exists -> must return null
const pitEarly = repo.getOptimizationAsOf(tenantA, 'SNAP-MAIN-PORTFOLIO', '2025-12-31T00:00:00.000Z');
assert(pitEarly === null, 'PIT query prior to inception returns null');

// List packages
const listA = repo.listPackages(tenantA);
assert(listA.length === 2, 'Tenant A has exactly 2 packages listed');
const listB = repo.listPackages(tenantB);
assert(listB.length === 0, 'Tenant B has 0 packages listed');

// Cryptographic package verification
const verifyCheck = PortfolioOptimizationPackageBuilder.verifyPackageIntegrity(pkg1);
assert(verifyCheck.isValid === true, 'Sealed package integrity hash verifies bit-for-bit');

console.log(`PASSED: ${passed}`);
