/**
 * Phase 14 Test Suite 4: Scenarios, Stress Testing, Comparison & DAG Tests
 */

import assert from 'assert';
import { ScenarioEngine } from '../portfolioConstruction/portfolioConstruction.scenario.engine.js';
import { StressTestEngine } from '../portfolioConstruction/portfolioConstruction.stressTest.engine.js';
import { PortfolioComparisonEngine } from '../portfolioConstruction/portfolioConstruction.comparison.engine.js';
import { ExplanationEngine } from '../portfolioConstruction/portfolioConstruction.explanation.engine.js';
import { OptimizationValidator } from '../portfolioConstruction/portfolioConstruction.validation.engine.js';
import { OptimizationStatus } from '../portfolioConstruction/portfolioConstruction.types.js';
import { PORTFOLIO_OPTIMIZATION_CONFIG_V1 } from '../portfolioConstruction/portfolioConstructionConfig.js';

console.log("Starting Phase 14 Suite 4: Scenarios, Stress Testing, Comparison & DAG...");

let assertions = 0;

const universe = [
  { ticker: "AAPL", sector: "Technology" },
  { ticker: "MSFT", sector: "Technology" },
  { ticker: "JPM", sector: "Financials" }
];

const covMatrix = [
  [0.04, 0.02, 0.01],
  [0.02, 0.05, 0.015],
  [0.01, 0.015, 0.06]
];

const targetWeights = { AAPL: 0.50, MSFT: 0.30, JPM: 0.20 };
const currentWeights = { AAPL: 0.40, MSFT: 0.30, JPM: 0.30 };

// 1. What-If Scenario: Adjust Weight without mutating baseline
{
  const baseline = { weights: targetWeights, portfolioVolatility: 0.18 };
  const spec = { action: "ADJUST_WEIGHT", params: { ticker: "AAPL", newWeight: 0.60 } };
  const res = ScenarioEngine.runScenario(baseline, spec, covMatrix);
  assert.strictEqual(res.status, OptimizationStatus.OPTIMAL);
  assert.strictEqual(res.scenarioWeights.AAPL, 0.60);
  assert.strictEqual(targetWeights.AAPL, 0.50); // baseline immutable!
  assert.ok(res.turnover.oneWayTurnover > 0);
  assertions += 4;
}

// 2. What-If Scenario: Exclude Ticker
{
  const baseline = { weights: targetWeights, portfolioVolatility: 0.18 };
  const spec = { action: "EXCLUDE_TICKER", params: { ticker: "JPM" } };
  const res = ScenarioEngine.runScenario(baseline, spec, covMatrix);
  assert.strictEqual(res.scenarioWeights.JPM, undefined);
  assert.ok(Math.abs((res.scenarioWeights.AAPL + res.scenarioWeights.MSFT) - 1.0) < 0.001);
  assertions += 2;
}

// 3. Stress Testing Engine
{
  const stress = StressTestEngine.runStressTestSuite(targetWeights, covMatrix, universe);
  assert.ok(stress.stressScenarios.length >= 4);
  assert.ok(stress.stressScenarios.some(s => s.scenarioId === "STRESS_EQUITY_CRASH_20"));
  assert.ok(stress.stressScenarios.some(s => s.scenarioId === "STRESS_VOLATILITY_SPIKE_50"));
  assert.ok(stress.stressScenarios.some(s => s.scenarioId === "STRESS_CORRELATION_CONVERGENCE"));
  assertions += 4;
}

// 4. Portfolio Comparison Engine
{
  const comparison = PortfolioComparisonEngine.compare(currentWeights, targetWeights, universe, covMatrix, { AAPL: 0.15, MSFT: 0.12, JPM: 0.08 });
  assert.ok(comparison.turnover.oneWayTurnover > 0);
  assert.ok(comparison.summary.currentExpectedReturn > 0);
  assert.ok(comparison.summary.targetExpectedReturn > 0);
  assert.ok(comparison.sectorComparison.length >= 2);
  assertions += 4;
}

// 5. Explanation DAG Engine
{
  const riskBudget = {
    byTicker: [
      { ticker: "AAPL", riskContribution: 0.08, percentageRiskContribution: 0.45, marginalRiskContribution: 0.16 },
      { ticker: "MSFT", riskContribution: 0.05, percentageRiskContribution: 0.30, marginalRiskContribution: 0.17 },
      { ticker: "JPM", riskContribution: 0.04, percentageRiskContribution: 0.25, marginalRiskContribution: 0.20 }
    ]
  };
  const dag = ExplanationEngine.buildExplanationGraph(
    targetWeights,
    "MEAN_VARIANCE",
    universe,
    { AAPL: { expectedReturn: 0.15, source: "VALUATION_DCF" } },
    riskBudget,
    { minWeight: 0.05, maxWeight: 0.50 },
    PORTFOLIO_OPTIMIZATION_CONFIG_V1
  );
  assert.ok(dag.nodes.length > 5);
  assert.ok(dag.edges.length > 5);
  assert.ok(dag.nodes.some(n => n.type === "TARGET_WEIGHT" && n.ticker === "AAPL"));
  assert.ok(dag.nodes.some(n => n.type === "OPTIMIZATION_OBJECTIVE"));
  assertions += 4;
}

// 6. Post-Optimization Validator (Valid case)
{
  const optResult = {
    status: OptimizationStatus.OPTIMAL,
    weights: targetWeights
  };
  const val = OptimizationValidator.validate(optResult, universe, { minWeight: 0.05, maxWeight: 0.60 });
  assert.strictEqual(val.isValid, true);
  assert.strictEqual(val.status, OptimizationStatus.OPTIMAL);
  assertions += 2;
}

// 7. Post-Optimization Validator (Weight sum mismatch)
{
  const optResult = {
    status: OptimizationStatus.OPTIMAL,
    weights: { AAPL: 0.60, MSFT: 0.60, JPM: 0.20 } // Sum = 1.40
  };
  const val = OptimizationValidator.validate(optResult, universe, {});
  assert.strictEqual(val.isValid, false);
  assert.strictEqual(val.status, OptimizationStatus.OPTIMIZATION_INVALID);
  assert.ok(val.errors.some(e => e.includes("sum to 1.400000")));
  assertions += 3;
}

console.log(`✓ Phase 14 Suite 4 Passed: ${assertions} assertions`);
export { assertions };
