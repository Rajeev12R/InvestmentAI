/**
 * server/test-script/test-portfolio-opt-scenarios.js
 * 
 * Phase 33 — Suite 8: Multi-Scenario & Robust Optimization
 */

import { PortfolioOptimizationScenarios } from '../portfolioOptimization/portfolioOptimization.scenarios.js';
import { OptimizationObjective } from '../portfolioOptimization/portfolioOptimization.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 8: Multi-Scenario & Robust Optimization ---');

const symbols = ['GROWTH', 'DEFENSIVE'];
const cov = [
  [0.09, 0.01],
  [0.01, 0.02]
];
const expReturns = [0.15, 0.06];

const scenarioResult = PortfolioOptimizationScenarios.runMultiScenarioOptimization({
  objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
  symbols,
  expectedReturns: expReturns,
  covarianceMatrix: cov,
  constraints: { longOnly: true },
  periodsPerYear: 252
});

assert(scenarioResult.type === 'MULTI_SCENARIO_ANALYSIS', 'Multi-scenario analysis object returned');
assert(scenarioResult.scenarios.length === 4, 'Evaluated all 4 macro scenarios (Base, Bull, Bear, Stagflation)');

const baseCase = scenarioResult.scenarios.find(s => s.scenarioId === 'BASE_CASE');
const bearCase = scenarioResult.scenarios.find(s => s.scenarioId === 'BEAR_CONTRACTION');
const stagCrisis = scenarioResult.scenarios.find(s => s.scenarioId === 'STAGFLATION_CRISIS');

assert(baseCase !== undefined, 'Base case scenario present');
assert(bearCase !== undefined, 'Bear case scenario present');
assert(stagCrisis !== undefined, 'Stagflation crisis scenario present');

assert(baseCase.result.status === 'OPTIMAL', 'Base case optimization is optimal');
assert(bearCase.result.status === 'OPTIMAL', 'Bear case optimization is optimal');
assert(stagCrisis.result.status === 'OPTIMAL', 'Stagflation crisis optimization is optimal');

// Bear & Stagflation scenarios experience higher stressed volatility
assert(bearCase.result.portfolioMetrics.portfolioVolatility > baseCase.result.portfolioMetrics.portfolioVolatility, 'Bear market volatility exceeds base case');
assert(stagCrisis.result.portfolioMetrics.portfolioVolatility > bearCase.result.portfolioMetrics.portfolioVolatility, 'Stagflation crisis volatility exceeds bear case');

assert(scenarioResult.robustSummary.isAllScenariosFeasible === true, 'All scenarios are feasible');

console.log(`PASSED: ${passed}`);
