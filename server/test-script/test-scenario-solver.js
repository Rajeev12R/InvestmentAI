/**
 * server/test-script/test-scenario-solver.js
 * 
 * Phase 19: Reverse / Break-Even Scenario Solver Unit Tests
 */

import assert from 'assert';
import { solveReverseScenario, SolverConvergenceError } from '../scenario/scenario.solver.js';
import { ShockUnit, ValueStatus, SolverMethod } from '../scenario/scenario.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 19 REVERSE SOLVER TESTS ---');

const portfolio = {
  id: 'PORT-SOLVER-01',
  name: 'Solver Test Portfolio',
  currency: 'USD',
  cash: 0,
  positions: [
    { ticker: 'AAPL', price: 100, shares: 1000, marketValue: 100000, beta: 1.5, assetClass: 'EQUITY' }
  ]
};

// 1. Solve for Index SPX shock that causes -15% Portfolio NAV change
// Formula: Portfolio PnL% = Beta (1.5) * SPX_Shock
// -0.15 = 1.5 * SPX_Shock => SPX_Shock = -0.10 (-10%)
const reverseReq1 = {
  targetMetric: 'NAV_CHANGE_PERCENT',
  targetValue: -0.15,
  variableParameter: {
    targetType: 'INDEX',
    target: 'SPX',
    shockUnit: ShockUnit.PERCENT,
    betaAdjusted: true
  },
  minBound: -0.50,
  maxBound: 0.50,
  tolerance: 1e-7
};

const res1 = solveReverseScenario(portfolio, reverseReq1);
testAssert(res1.converged === true, 'Solver converged on root');
testAssert(Math.abs(res1.solution - (-0.10)) < 1e-6, `Solution found SPX shock of -10%: got ${res1.solution}`);
testAssert(Math.abs(res1.residual) < 1e-7, `Residual within tolerance: got ${res1.residual}`);
testAssert(res1.iterations > 0 && res1.iterations <= 50, `Iterations within bounds: got ${res1.iterations}`);
testAssert(res1.status === ValueStatus.SCENARIO_OUTPUT, 'Status is SCENARIO_OUTPUT');

// 2. Solve for Dollar PnL Target
// Find SPX shock causing -$30,000 loss on $100,000 portfolio (i.e. -30% portfolio return => SPX shock = -20%)
const reverseReq2 = {
  targetMetric: 'NAV_CHANGE_DOLLAR',
  targetValue: -30000,
  variableParameter: {
    targetType: 'INDEX',
    target: 'SPX',
    shockUnit: ShockUnit.PERCENT,
    betaAdjusted: true
  },
  minBound: -0.60,
  maxBound: 0.20,
  tolerance: 1e-5
};

const res2 = solveReverseScenario(portfolio, reverseReq2);
testAssert(res2.converged === true, 'Dollar PnL solver converged');
testAssert(Math.abs(res2.solution - (-0.20)) < 1e-5, `Solution is -20% SPX shock: got ${res2.solution}`);
testAssert(Math.abs(res2.resultingPortfolioOutcome.pnlDollar - (-30000)) < 1.0, 'Resulting portfolio PnL matches target');

// 3. Solve for Target Stressed Portfolio Value ($80,000 from $100,000 base => -20% NAV => -13.333% SPX)
const reverseReq3 = {
  targetMetric: 'PORTFOLIO_VALUE',
  targetValue: 80000,
  variableParameter: {
    targetType: 'INDEX',
    target: 'SPX',
    shockUnit: ShockUnit.PERCENT,
    betaAdjusted: true
  },
  minBound: -0.40,
  maxBound: 0.10,
  tolerance: 1e-6
};
const res3 = solveReverseScenario(portfolio, reverseReq3);
testAssert(res3.converged === true, 'Target Portfolio Value solver converged');
testAssert(Math.abs(res3.solution - (-0.20 / 1.5)) < 1e-5, `Solution matches analytical -13.33%: got ${res3.solution}`);

// 4. Fixed Income Rate Shock Solver
const bondPortfolio = {
  id: 'PORT-BOND-01',
  currency: 'USD',
  cash: 0,
  positions: [
    { ticker: 'T-BOND', price: 100, shares: 1000, marketValue: 100000, duration: 8.0, convexity: 0.0, assetClass: 'FIXED_INCOME' }
  ]
};
// Target: -$4,000 loss (-4% price shock). Duration = 8.0. Delta yield = 0.04 / 8.0 = 0.005 = 50 bps (+50 bps)
const reverseReq4 = {
  targetMetric: 'NAV_CHANGE_DOLLAR',
  targetValue: -4000,
  variableParameter: {
    targetType: 'FACTOR',
    target: 'RATE_US_10Y',
    shockUnit: ShockUnit.BPS
  },
  minBound: -500,
  maxBound: 500,
  tolerance: 1e-5
};
const res4 = solveReverseScenario(bondPortfolio, reverseReq4);
testAssert(res4.converged === true, 'Bond rate shock solver converged');
testAssert(Math.abs(res4.solution - 50) < 1e-3, `Solution is +50 bps rate shock: got ${res4.solution}`);

// 5. Unbracketed Interval Error Handling
const impossibleReq = {
  targetMetric: 'NAV_CHANGE_PERCENT',
  targetValue: -0.80, // -80% loss
  variableParameter: {
    targetType: 'INDEX',
    target: 'SPX',
    shockUnit: ShockUnit.PERCENT,
    betaAdjusted: true
  },
  minBound: 0.0, // Interval [0.0, 0.5] cannot produce -80% loss
  maxBound: 0.50,
  tolerance: 1e-6
};

let errorCaught = false;
try {
  solveReverseScenario(portfolio, impossibleReq);
} catch (err) {
  errorCaught = true;
  testAssert(err instanceof SolverConvergenceError, 'Throws SolverConvergenceError for unbracketed interval');
  testAssert(err.diagnostics !== undefined, 'Diagnostics present in error');
}
testAssert(errorCaught, 'Unbracketed solver correctly throws');

console.log(`[PASS] Phase 19 Reverse Solver tests passed: ${assertionCount} assertions`);

export default { assertionCount };
