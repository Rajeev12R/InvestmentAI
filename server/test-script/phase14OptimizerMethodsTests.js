/**
 * Phase 14 Test Suite 3: Optimization Methods & Execution Mechanics Tests
 */

import assert from 'assert';
import { PortfolioOptimizerEngine } from '../portfolioConstruction/portfolioConstruction.optimizer.engine.js';
import { TurnoverEngine } from '../portfolioConstruction/portfolioConstruction.turnover.engine.js';
import { LiquidityEngine } from '../portfolioConstruction/portfolioConstruction.liquidity.engine.js';
import { TransactionCostEngine } from '../portfolioConstruction/portfolioConstruction.transactionCost.engine.js';
import { OptimizationMethod, OptimizationStatus } from '../portfolioConstruction/portfolioConstruction.types.js';

console.log("Starting Phase 14 Suite 3: Optimization Methods & Execution Mechanics...");

let assertions = 0;

const universe = [
  { ticker: "AAPL", sector: "Technology" },
  { ticker: "MSFT", sector: "Technology" },
  { ticker: "GOOGL", sector: "Communication Services" }
];

const covMatrix = [
  [0.04, 0.02, 0.01],
  [0.02, 0.05, 0.015],
  [0.01, 0.015, 0.06]
];

const expReturns = {
  AAPL: 0.15,
  MSFT: 0.12,
  GOOGL: 0.10
};

// 1. Equal Weight
{
  const res = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.EQUAL_WEIGHT,
    universeSecurities: universe,
    covarianceMatrix: covMatrix
  });
  assert.strictEqual(res.status, OptimizationStatus.OPTIMAL);
  assert.ok(Math.abs(res.weights.AAPL - 0.333333) < 0.001);
  assert.ok(Math.abs(res.weights.MSFT - 0.333333) < 0.001);
  assert.ok(Math.abs(res.weights.GOOGL - 0.333333) < 0.001);
  assertions += 4;
}

// 2. Minimum Variance
{
  const res = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.MINIMUM_VARIANCE,
    universeSecurities: universe,
    covarianceMatrix: covMatrix
  });
  assert.strictEqual(res.status, OptimizationStatus.OPTIMAL);
  assert.ok(res.portfolioVolatility > 0);
  // AAPL has lowest individual variance (0.04), should receive highest or equal weight
  assert.ok(res.weights.AAPL >= res.weights.GOOGL);
  assertions += 3;
}

// 3. Mean-Variance Optimization
{
  const res = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.MEAN_VARIANCE,
    universeSecurities: universe,
    expectedReturns: expReturns,
    covarianceMatrix: covMatrix
  });
  assert.strictEqual(res.status, OptimizationStatus.OPTIMAL);
  assert.ok(res.portfolioExpectedReturn > 0);
  assert.ok(res.weights.AAPL > res.weights.GOOGL); // AAPL has highest return (15%) and lowest vol
  assertions += 3;
}

// 4. Risk Parity
{
  const res = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.RISK_PARITY,
    universeSecurities: universe,
    covarianceMatrix: covMatrix
  });
  assert.strictEqual(res.status, OptimizationStatus.OPTIMAL);
  assert.ok(res.weights.AAPL > 0);
  assert.ok(res.weights.MSFT > 0);
  assert.ok(res.weights.GOOGL > 0);
  assertions += 4;
}

// 5. Maximum Diversification
{
  const res = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.MAXIMUM_DIVERSIFICATION,
    universeSecurities: universe,
    covarianceMatrix: covMatrix
  });
  assert.strictEqual(res.status, OptimizationStatus.OPTIMAL);
  assert.ok(res.diversification.effectiveN > 1.0);
  assertions += 2;
}

// 6. Conviction Weighted
{
  const convictions = { AAPL: 90, MSFT: 60, GOOGL: 30 };
  const res = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.CONVICTION_WEIGHTED,
    universeSecurities: universe,
    convictions
  });
  assert.strictEqual(res.status, OptimizationStatus.OPTIMAL);
  assert.ok(res.weights.AAPL > res.weights.MSFT);
  assert.ok(res.weights.MSFT > res.weights.GOOGL);
  assertions += 3;
}

// 7. Hybrid Valuation / Conviction
{
  const res = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.VALUATION_CONVICTION_HYBRID,
    universeSecurities: universe,
    expectedReturns: expReturns,
    convictions: { AAPL: "HIGH", MSFT: "MEDIUM", GOOGL: "LOW" },
    covarianceMatrix: covMatrix
  });
  assert.strictEqual(res.status, OptimizationStatus.OPTIMAL);
  assert.ok(res.weights.AAPL > res.weights.GOOGL);
  assertions += 2;
}

// 8. Turnover Engine Test
{
  const current = { AAPL: 0.50, MSFT: 0.30, GOOGL: 0.20 };
  const target = { AAPL: 0.40, MSFT: 0.40, GOOGL: 0.20 };
  const turnover = TurnoverEngine.calculateTurnover(current, target);
  assert.strictEqual(turnover.oneWayTurnover, 0.10); // | -0.10 | + | +0.10 | = 0.20 / 2 = 0.10
  assert.strictEqual(turnover.twoWayTurnover, 0.20);
  assert.strictEqual(turnover.tradeCount, 2);
  assertions += 3;
}

// 9. Liquidity Engine Test
{
  const target = { AAPL: 0.40, MSFT: 0.60 };
  const liquidityMap = {
    AAPL: { adv: 10000000 },
    MSFT: { adv: 10000000 }
  };
  const liq = LiquidityEngine.evaluateLiquidity(target, liquidityMap, 1000000);
  assert.strictEqual(liq.isFullyLiquid, true);
  assert.ok(liq.positions.length === 2);
  assert.ok(liq.maxDaysToLiquidate < 5.0);
  assertions += 3;
}

// 10. Transaction Cost Model Test
{
  const turnover = { oneWayTurnover: 0.10, twoWayTurnover: 0.20 };
  const costs = TransactionCostEngine.estimateTransactionCosts(turnover, 1000000);
  assert.ok(costs.tradedValue === 200000);
  assert.ok(costs.totalCostAmount > 0);
  assert.ok(costs.totalCostBps > 0);
  assertions += 3;
}

console.log(`✓ Phase 14 Suite 3 Passed: ${assertions} assertions`);
export { assertions };
