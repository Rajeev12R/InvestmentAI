/**
 * Phase 14 Test Suite 10: Policy Hardening, Determinism (100 Replays), & Concurrency (10 Parallel)
 */

import assert from 'assert';
import { PortfolioOptimizerEngine } from '../portfolioConstruction/portfolioConstruction.optimizer.engine.js';
import { PortfolioConstructionPackageBuilder } from '../portfolioConstruction/portfolioConstruction.package.js';
import { portfolioConstructionRepository } from '../portfolioConstruction/portfolioConstruction.repository.js';
import { OptimizationMethod, OptimizationStatus } from '../portfolioConstruction/portfolioConstruction.types.js';
import { PORTFOLIO_OPTIMIZATION_CONFIG_V1, PORTFOLIO_OPTIMIZATION_CONFIG_V2 } from '../portfolioConstruction/portfolioConstructionConfig.js';

console.log("Starting Phase 14 Suite 10: Policy Hardening, Determinism, & Concurrency...");

let assertions = 0;

const universe = [
  { ticker: "AAPL", sector: "Technology" },
  { ticker: "MSFT", sector: "Technology" },
  { ticker: "JPM", sector: "Financials" }
];

const cov = [
  [0.0484, 0.0250, 0.0150],
  [0.0250, 0.0400, 0.0180],
  [0.0150, 0.0180, 0.0361]
];

const expReturns = {
  AAPL: 0.25,
  MSFT: 0.20,
  JPM: 0.10
};

// 1. Policy Configuration Versioning (V1 vs V2)
{
  const optV1 = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.MEAN_VARIANCE,
    universeSecurities: universe,
    expectedReturns: expReturns,
    covarianceMatrix: cov,
    config: PORTFOLIO_OPTIMIZATION_CONFIG_V1
  });

  const optV2 = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.MEAN_VARIANCE,
    universeSecurities: universe,
    expectedReturns: expReturns,
    covarianceMatrix: cov,
    config: PORTFOLIO_OPTIMIZATION_CONFIG_V2
  });

  assert.strictEqual(optV1.status, OptimizationStatus.OPTIMAL);
  assert.strictEqual(optV2.status, OptimizationStatus.OPTIMAL);
  // Higher risk aversion lambda in V2 (3.0 vs 2.5) results in more conservative / diversified weight allocation
  assert.ok(optV2.portfolioVolatility <= optV1.portfolioVolatility + 1e-4);
  assertions += 3;
}

// 2. 100-Run Determinism Deep Test
{
  let firstHash = null;
  let firstWeights = null;

  for (let i = 0; i < 100; i++) {
    const opt = PortfolioOptimizerEngine.optimize({
      method: OptimizationMethod.MEAN_VARIANCE,
      universeSecurities: universe,
      expectedReturns: expReturns,
      covarianceMatrix: cov,
      config: PORTFOLIO_OPTIMIZATION_CONFIG_V1
    });

    const pkg = PortfolioConstructionPackageBuilder.buildPackage({
      packageId: "PKG-DETERMINISM-CONST",
      workspaceId: "WS-DET",
      portfolioId: "PORT-DET",
      optimizationMethod: OptimizationMethod.MEAN_VARIANCE,
      configurationVersion: PORTFOLIO_OPTIMIZATION_CONFIG_V1.configId,
      targetWeights: opt.weights,
      expectedReturn: opt.portfolioExpectedReturn,
      portfolioRisk: opt.portfolioVolatility,
      asOf: "2026-09-06T12:00:00.000Z",
      createdAt: "2026-09-06T12:00:00.000Z"
    });

    if (i === 0) {
      firstHash = pkg.packageHash;
      firstWeights = JSON.stringify(pkg.targetWeights);
    } else {
      assert.strictEqual(pkg.packageHash, firstHash, `Hash divergence at run ${i}`);
      assert.strictEqual(JSON.stringify(pkg.targetWeights), firstWeights, `Weights divergence at run ${i}`);
    }
  }

  assert.ok(firstHash !== null);
  assert.ok(firstHash.length === 64);
  assertions += 2;
}

// 3. 10 Parallel Worker Concurrency Isolation
{
  portfolioConstructionRepository.clear();

  const parallelRuns = Array.from({ length: 10 }, (_, idx) => {
    return new Promise(resolve => {
      setTimeout(() => {
        const opt = PortfolioOptimizerEngine.optimize({
          method: OptimizationMethod.MEAN_VARIANCE,
          universeSecurities: universe,
          expectedReturns: expReturns,
          covarianceMatrix: cov,
          config: PORTFOLIO_OPTIMIZATION_CONFIG_V1
        });

        const pkg = PortfolioConstructionPackageBuilder.buildPackage({
          packageId: `PKG-PARALLEL-${idx}`,
          workspaceId: `WS-TENANT-${idx % 3}`,
          portfolioId: `PORT-${idx}`,
          optimizationMethod: OptimizationMethod.MEAN_VARIANCE,
          targetWeights: opt.weights,
          asOf: "2026-09-06T12:00:00.000Z"
        });

        portfolioConstructionRepository.savePackage(pkg);
        resolve(pkg);
      }, Math.floor(Math.random() * 20));
    });
  });

  const results = await Promise.all(parallelRuns);
  assert.strictEqual(results.length, 10);
  assert.strictEqual(portfolioConstructionRepository.packages.size, 10);

  // Tenant isolation checks
  const tenant0Pkgs = portfolioConstructionRepository.listPackagesByWorkspace("WS-TENANT-0");
  const tenant1Pkgs = portfolioConstructionRepository.listPackagesByWorkspace("WS-TENANT-1");
  assert.ok(tenant0Pkgs.length >= 1);
  assert.ok(tenant1Pkgs.length >= 1);
  assert.ok(tenant0Pkgs.every(p => p.workspaceId === "WS-TENANT-0"));
  assert.ok(tenant1Pkgs.every(p => p.workspaceId === "WS-TENANT-1"));
  assertions += 6;
}

console.log(`✓ Phase 14 Suite 10 Policy Hardening Passed: ${assertions} assertions`);
export { assertions };
