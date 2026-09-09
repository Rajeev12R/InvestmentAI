/**
 * server/test-script/test-portfolio-opt-phase32-bridge.js
 * 
 * Phase 33 — Suite 7: Phase 32 Risk Attribution Integration Bridge
 */

import { PortfolioOptimizationEngine } from '../portfolioOptimization/portfolioOptimization.engine.js';
import { PortfolioOptimizationBridges } from '../portfolioOptimization/portfolioOptimization.bridges.js';
import { OptimizationObjective } from '../portfolioOptimization/portfolioOptimization.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 7: Phase 32 Risk Attribution Integration Bridge ---');

const symbols = ['TECH_1', 'TECH_2', 'FIN_1'];
const initialWeights = [0.60, 0.30, 0.10];
const cov = [
  [0.08, 0.04, 0.01],
  [0.04, 0.06, 0.01],
  [0.01, 0.01, 0.03]
];
const sectors = { TECH_1: 'Technology', TECH_2: 'Technology', FIN_1: 'Financials' };

// 1. Run Optimization with Phase 32 Attribution Bridge Enabled
const result = PortfolioOptimizationEngine.runOptimization({
  objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
  symbols,
  covarianceMatrix: cov,
  initialWeights,
  sectors,
  constraints: { longOnly: true },
  periodsPerYear: 252
});

assert(result.phase32Attribution !== undefined, 'Phase 32 attribution object present in result');
assert(result.phase32Attribution.current !== null, 'Current portfolio risk attribution generated');
assert(result.phase32Attribution.optimized !== null, 'Optimized portfolio risk attribution generated');
assert(result.phase32Attribution.delta !== null, 'Risk attribution delta computed');

// 2. Risk Reduction Check
const curVol = result.phase32Attribution.current.portfolioMetrics.portfolioVolatility;
const optVol = result.phase32Attribution.optimized.portfolioMetrics.portfolioVolatility;
assert(optVol < curVol, 'Optimized portfolio volatility is strictly less than initial portfolio volatility');
assert(result.phase32Attribution.delta.volatilityDelta < 0, 'Volatility delta is negative (risk reduced)');

// 3. Euler Conservation in both Current and Optimized States
const curCRC = result.phase32Attribution.current.reconciliation.sumComponentRisk;
const optCRC = result.phase32Attribution.optimized.reconciliation.sumComponentRisk;
assert(Math.abs(curCRC - curVol) < 1e-6, 'Euler theorem holds for initial portfolio');
assert(Math.abs(optCRC - optVol) < 1e-6, 'Euler theorem holds for optimized portfolio');

// 4. Sector Risk Attribution Shifts
const curTechCRC = result.phase32Attribution.current.sectors.groups.find(g => g.name === 'Technology').componentRiskContribution;
const optTechCRC = result.phase32Attribution.optimized.sectors.groups.find(g => g.name === 'Technology').componentRiskContribution;
assert(optTechCRC < curTechCRC, 'Technology sector component risk contribution was reduced by the optimizer');

// 5. Direct Bridge Invocation Test
const directAttr = PortfolioOptimizationBridges.bridgeToPhase32Attribution({
  symbols,
  weights: result.optimizedWeights,
  covarianceMatrix: cov,
  sectors
});
assert(directAttr.portfolioMetrics.portfolioVolatility > 0, 'Direct bridge invocation succeeds');

console.log(`PASSED: ${passed}`);
