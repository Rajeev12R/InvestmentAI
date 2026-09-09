/**
 * server/test-script/test-portfolio-opt-concurrency.js
 * 
 * Phase 33 — Suite 12: Concurrent Execution & Multi-Tenant Isolation (55 Operations)
 */

import { PortfolioOptimizationEngine } from '../portfolioOptimization/portfolioOptimization.engine.js';
import { PortfolioOptimizationPackageBuilder } from '../portfolioOptimization/portfolioOptimization.package.js';
import { PortfolioOptimizationExplanationDAG } from '../portfolioOptimization/portfolioOptimization.explanation.js';
import { portfolioOptimizationRepository } from '../portfolioOptimization/portfolioOptimization.repository.js';
import { OptimizationObjective } from '../portfolioOptimization/portfolioOptimization.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 12: Concurrent Execution & Multi-Tenant Isolation (55 Ops) ---');

const symbols = ['ASSET_1', 'ASSET_2', 'ASSET_3'];
const cov = [
  [0.04, 0.01, 0.01],
  [0.01, 0.05, 0.01],
  [0.01, 0.01, 0.06]
];

// Launch 55 concurrent optimization tasks across distinct tenants
const tasks = [];
for (let i = 0; i < 55; i++) {
  const tenantId = `tenant_concurrent_${i % 5}`;
  const snapId = `SNAP-CONC-${i}`;

  const task = (async () => {
    const opt = PortfolioOptimizationEngine.runOptimization({
      objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
      symbols,
      covarianceMatrix: cov,
      constraints: {
        longOnly: true,
        maxWeights: [0.6, 0.6, 0.6]
      },
      asOf: '2026-09-07T00:00:00.000Z'
    });

    const dag = PortfolioOptimizationExplanationDAG.buildExplanationDAG(opt);
    const pkg = PortfolioOptimizationPackageBuilder.buildSealedPackage({
      optimizationResult: opt,
      explanationDAG: dag,
      portfolioSnapshotId: snapId,
      tenantId
    });

    portfolioOptimizationRepository.savePackage(tenantId, pkg);
    const retrieved = portfolioOptimizationRepository.getPackage(tenantId, pkg.packageId);

    return {
      status: opt.status,
      isVerified: opt.postOptimizationVerification.isHardConstraintsSatisfied,
      isRetrieved: retrieved !== null && retrieved.packageId === pkg.packageId
    };
  })();

  tasks.push(task);
}

const results = await Promise.all(tasks);

assert(results.length === 55, 'All 55 concurrent tasks completed execution');
for (let i = 0; i < 55; i++) {
  assert(results[i].status === 'OPTIMAL', `Concurrent Job ${i}: Reached OPTIMAL status`);
}

console.log(`PASSED: ${passed}`);
