/**
 * Phase 14 Test Suite 9: Golden E2E Trace & Cryptographic Lineage Test
 * Traces complete deterministic chain:
 * Truth Facts -> Valuation -> Risk -> Expected Return -> Covariance -> Constraints -> Optimizer ->
 * Target Weights -> Risk Budget -> Turnover -> Scenarios -> Explanation DAG -> Sealed Package -> Hash -> Copilot -> Human Review
 */

import assert from 'assert';
import { ExpectedReturnEngine } from '../portfolioConstruction/portfolioConstruction.expectedReturn.engine.js';
import { CovarianceEngine } from '../portfolioConstruction/portfolioConstruction.covariance.engine.js';
import { ConstraintEngine } from '../portfolioConstruction/portfolioConstruction.constraints.engine.js';
import { PortfolioOptimizerEngine } from '../portfolioConstruction/portfolioConstruction.optimizer.engine.js';
import { TurnoverEngine } from '../portfolioConstruction/portfolioConstruction.turnover.engine.js';
import { LiquidityEngine } from '../portfolioConstruction/portfolioConstruction.liquidity.engine.js';
import { TransactionCostEngine } from '../portfolioConstruction/portfolioConstruction.transactionCost.engine.js';
import { ScenarioEngine } from '../portfolioConstruction/portfolioConstruction.scenario.engine.js';
import { StressTestEngine } from '../portfolioConstruction/portfolioConstruction.stressTest.engine.js';
import { ExplanationEngine } from '../portfolioConstruction/portfolioConstruction.explanation.engine.js';
import { PortfolioConstructionPackageBuilder } from '../portfolioConstruction/portfolioConstruction.package.js';
import { portfolioConstructionRepository } from '../portfolioConstruction/portfolioConstruction.repository.js';
import { getPortfolioConstructionPackage, explainTickerAllocation } from '../copilot/tools/portfolioConstruction.tool.js';
import { OptimizationMethod, OptimizationStatus, ExecutionStatus } from '../portfolioConstruction/portfolioConstruction.types.js';
import { PORTFOLIO_OPTIMIZATION_CONFIG_V1 } from '../portfolioConstruction/portfolioConstructionConfig.js';

console.log("Starting Phase 14 Suite 9: Golden E2E Trace...");

let assertions = 0;

// Golden Trace Definition
const workspaceId = "WS-GOLDEN-01";
const portfolioId = "PORT-GOLDEN-INSTITUTIONAL";
const asOf = "2026-09-06T12:00:00.000Z";

const goldenUniverse = [
  { ticker: "AAPL", securityName: "Apple Inc.", sector: "Technology", geography: "US" },
  { ticker: "MSFT", securityName: "Microsoft Corp.", sector: "Technology", geography: "US" },
  { ticker: "JPM", securityName: "JPMorgan Chase & Co.", sector: "Financials", geography: "US" }
];

const currentHoldings = { AAPL: 0.40, MSFT: 0.30, JPM: 0.30 };

// 1. Truth & Valuation Derived Expected Returns
const expectedReturns = {
  AAPL: ExpectedReturnEngine.deriveSecurityExpectedReturn({
    ticker: "AAPL",
    valuation: { fairValue: 250.0, confidence: 0.90, evidenceIds: ["FACT-AAPL-10K-2025"], truthPackageHash: "hash-aapl-val" },
    currentPrice: 200.0
  }, asOf),
  MSFT: ExpectedReturnEngine.deriveSecurityExpectedReturn({
    ticker: "MSFT",
    valuation: { fairValue: 480.0, confidence: 0.85, evidenceIds: ["FACT-MSFT-10K-2025"], truthPackageHash: "hash-msft-val" },
    currentPrice: 400.0
  }, asOf),
  JPM: ExpectedReturnEngine.deriveSecurityExpectedReturn({
    ticker: "JPM",
    valuation: { fairValue: 240.0, confidence: 0.80, evidenceIds: ["FACT-JPM-10K-2025"], truthPackageHash: "hash-jpm-val" },
    currentPrice: 220.0
  }, asOf)
};
assert.strictEqual(expectedReturns.AAPL.expectedReturn, 0.25); // (250/200)-1
assert.strictEqual(expectedReturns.MSFT.expectedReturn, 0.20); // (480/400)-1
assert.ok(Math.abs(expectedReturns.JPM.expectedReturn - 0.090909) < 0.0001);
assertions += 3;

// 2. Validated Covariance Matrix
const covMatrix = [
  [0.0484, 0.0250, 0.0150],
  [0.0250, 0.0400, 0.0180],
  [0.0150, 0.0180, 0.0361]
];
const covVal = CovarianceEngine.validateCovarianceMatrix(covMatrix);
assert.strictEqual(covVal.isValid, true);
assertions += 1;

// 3. Institutional Constraints & Feasibility
const constraints = {
  minWeight: 0.10,
  maxWeight: 0.60,
  minCash: 0.0,
  maxCash: 0.10,
  sectorMaxWeights: { Technology: 0.80, Financials: 0.40 }
};
const feas = ConstraintEngine.evaluateConstraints(goldenUniverse, constraints);
assert.strictEqual(feas.isFeasible, true);
assertions += 1;

// 4. Deterministic Optimization (Mean-Variance)
const opt = PortfolioOptimizerEngine.optimize({
  method: OptimizationMethod.MEAN_VARIANCE,
  universeSecurities: goldenUniverse,
  expectedReturns,
  covarianceMatrix: covMatrix,
  constraints,
  config: PORTFOLIO_OPTIMIZATION_CONFIG_V1
});
assert.strictEqual(opt.status, OptimizationStatus.OPTIMAL);
assert.ok(opt.weights.AAPL > opt.weights.JPM);
assertions += 2;

// 5. Risk Budget & Turnover & Costs
const turnover = TurnoverEngine.calculateTurnover(currentHoldings, opt.weights);
const costs = TransactionCostEngine.estimateTransactionCosts(turnover, 5000000);
const liquidity = LiquidityEngine.evaluateLiquidity(opt.weights, { AAPL: { adv: 50000000 }, MSFT: { adv: 50000000 }, JPM: { adv: 50000000 } }, 5000000);
const stress = StressTestEngine.runStressTestSuite(opt.weights, covMatrix, goldenUniverse);
const dag = ExplanationEngine.buildExplanationGraph(opt.weights, "MEAN_VARIANCE", goldenUniverse, expectedReturns, opt.riskBudget, constraints, PORTFOLIO_OPTIMIZATION_CONFIG_V1);
assert.ok(turnover.oneWayTurnover >= 0);
assert.ok(costs.totalCostAmount >= 0);
assert.ok(liquidity.isFullyLiquid);
assert.ok(stress.stressScenarios.length >= 4);
assert.ok(dag.nodes.length > 5);
assertions += 5;

// 6. Sealed Immutable Package & Hash
const sealedPkg = PortfolioConstructionPackageBuilder.buildPackage({
  packageId: `PKG-${portfolioId}-GOLDEN`,
  workspaceId,
  portfolioId,
  portfolioSnapshotId: "SNAP-GOLDEN-01",
  optimizationMethod: OptimizationMethod.MEAN_VARIANCE,
  constraints,
  targetWeights: opt.weights,
  currentWeights: currentHoldings,
  turnover,
  expectedReturn: opt.portfolioExpectedReturn,
  portfolioRisk: opt.portfolioVolatility,
  riskBudget: opt.riskBudget,
  diversification: opt.diversification,
  liquidity,
  transactionCosts: costs,
  stressTesting: stress,
  explanationGraph: dag,
  evidenceIds: ["FACT-AAPL-10K-2025", "FACT-MSFT-10K-2025", "FACT-JPM-10K-2025"],
  asOf
});
assert.strictEqual(typeof sealedPkg.packageHash, "string");
assert.strictEqual(sealedPkg.packageHash.length, 64);
assert.strictEqual(Object.isFrozen(sealedPkg), true);
assertions += 3;

// 7. Storage in Repository & Copilot Safe Consumption
portfolioConstructionRepository.savePackage(sealedPkg);
const copilotPkg = await getPortfolioConstructionPackage(portfolioId, workspaceId);
assert.strictEqual(copilotPkg.packageHash, sealedPkg.packageHash);
const explanation = await explainTickerAllocation(portfolioId, "AAPL", workspaceId);
assert.strictEqual(explanation.ticker, "AAPL");
assert.ok(explanation.causalNodes.length >= 1);
assertions += 3;

// 8. Human Review & Execution Boundary
const review = portfolioConstructionRepository.saveReview({
  packageId: sealedPkg.packageId,
  workspaceId,
  reviewedBy: "SENIOR_PORTFOLIO_MANAGER",
  decision: "APPROVED",
  notes: "Golden trace approved for mandate deployment."
});
assert.strictEqual(review.executionStatus, ExecutionStatus.HUMAN_APPROVED);
assert.strictEqual(review.reviewedBy, "SENIOR_PORTFOLIO_MANAGER");
assertions += 2;

console.log(`✓ Phase 14 Suite 9 Golden E2E Trace Passed: ${assertions} assertions`);
export { assertions };
