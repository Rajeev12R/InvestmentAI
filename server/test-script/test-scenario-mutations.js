/**
 * server/test-script/test-scenario-mutations.js
 * 
 * Phase 19: Mutation Testing Suite (25+ Mutations Killed)
 */

import assert from 'assert';
import {
  applyPercentShock,
  applyBpsShock,
  applyMultiplierShock,
  applyAbsoluteShock,
  calculateDelta,
  calculatePercentDelta
} from '../scenario/scenario.transform.js';
import { evaluateSecurityScenario } from '../scenario/scenario.sensitivity.js';
import { aggregatePortfolioScenario } from '../scenario/scenario.aggregation.js';
import { solveReverseScenario } from '../scenario/scenario.solver.js';
import { sealScenarioPackage, verifyScenarioPackage } from '../scenario/scenario.package.js';
import { ShockUnit, ScenarioType, ValueStatus } from '../scenario/scenario.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 19 MUTATION KILLING SUITE ---');

// Mutation 1: Inverted percent shock sign (V * (1 - shock))
const m1_val = applyPercentShock(100, 0.20);
testAssert(m1_val === 120, 'Kills M1: percent shock must add shock return (100 * 1.20 = 120, not 80)');

// Mutation 2: Bps shock dividing by 100 instead of 10000
const m2_val = applyBpsShock(0.05, 100);
testAssert(Math.abs(m2_val - 0.06) < 1e-10, 'Kills M2: 100 bps on 0.05 is 0.06 (not 1.05)');

// Mutation 3: Multiplier shock adding instead of multiplying
const m3_val = applyMultiplierShock(100, 3.0);
testAssert(m3_val === 300, 'Kills M3: multiplier multiplies baseline (100 * 3 = 300, not 103)');

// Mutation 4: calculateDelta inverted (baseline - stressed)
const m4_delta = calculateDelta(100, 70);
testAssert(m4_delta === -30, 'Kills M4: delta is stressed - baseline (70 - 100 = -30, not +30)');

// Mutation 5: calculatePercentDelta dividing by stressed instead of baseline
const m5_pct = calculatePercentDelta(100, 50);
testAssert(m5_pct === -0.50, 'Kills M5: percent delta is (50-100)/100 = -0.50 (not -1.00)');

// Mutation 6: Fixed income duration missing negative sign (+D * deltaY)
const bond = { ticker: 'BOND', price: 100, shares: 1, duration: 5.0, convexity: 0.0, assetClass: 'FIXED_INCOME' };
const rateUp = [{ targetType: 'FACTOR', target: 'RATE', shockUnit: ShockUnit.BPS, shockValue: 100 }];
const resBond = evaluateSecurityScenario(bond, rateUp);
testAssert(resBond.stressed.price === 95, 'Kills M6: Rate increase must DECREASE bond price (-D * dy -> 95, not 105)');

// Mutation 7: Equity Beta applied in reverse (shock / beta)
const eq = { ticker: 'AAPL', price: 100, shares: 1, beta: 2.0, assetClass: 'EQUITY' };
const mktDrop = [{ targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT, shockValue: -0.10, betaAdjusted: true }];
const resEq = evaluateSecurityScenario(eq, mktDrop);
testAssert(resEq.stressed.price === 80, 'Kills M7: Beta 2.0 on -10% drop causes -20% drop (price 80, not 95)');

// Mutation 8: Reverse solver returning fixed minBound
const port = { positions: [{ ticker: 'AAPL', price: 100, shares: 100, marketValue: 10000, beta: 1.0, assetClass: 'EQUITY' }] };
const solverRes = solveReverseScenario(port, {
  targetMetric: 'NAV_CHANGE_PERCENT',
  targetValue: -0.10,
  variableParameter: { targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT },
  minBound: -0.50,
  maxBound: 0.50
});
testAssert(Math.abs(solverRes.solution - (-0.10)) < 1e-6, 'Kills M8: Solver returns actual root -0.10, not minBound -0.50');

// Mutation 9: Cash ignored in baseline Total NAV
const portCash = { cash: 20000, positions: [{ ticker: 'AAPL', price: 100, shares: 100, marketValue: 10000, assetClass: 'EQUITY' }] };
const aggRes = aggregatePortfolioScenario(portCash, { shocks: [{ targetType: 'SECURITY', target: 'AAPL', shockUnit: ShockUnit.PERCENT, shockValue: -0.10 }] });
testAssert(aggRes.baseline.nav === 30000, 'Kills M9: Baseline total NAV includes cash (10,000 + 20,000 = 30,000)');

// Mutation 10: Cash shocked when only equity shock specified
testAssert(aggRes.stressed.cash === 20000, 'Kills M10: Cash remains preserved under pure equity shock');

// Mutation 11: Sector attribution ignoring negative sign in PnL
const portSec = { positions: [{ ticker: 'AAPL', price: 100, shares: 100, marketValue: 10000, sector: 'Tech', assetClass: 'EQUITY' }] };
const aggSec = aggregatePortfolioScenario(portSec, { shocks: [{ targetType: 'SECTOR', target: 'Tech', shockUnit: ShockUnit.PERCENT, shockValue: -0.15 }] });
const techAttr = aggSec.sectorAttribution.find(s => s.sector === 'Tech');
testAssert(techAttr.pnlDollar === -1500, 'Kills M11: Sector PnL is negative on sector drawdown');

// Mutation 12: Classification of stressed NAV tagged as REAL_DATA instead of SCENARIO_OUTPUT
testAssert(aggSec.stressed.status === ValueStatus.SCENARIO_OUTPUT, 'Kills M12: Stressed NAV classification must be SCENARIO_OUTPUT');

// Mutation 13: Baseline status tagged as SCENARIO_OUTPUT instead of DERIVED
testAssert(aggSec.baseline.status === ValueStatus.DERIVED, 'Kills M13: Baseline NAV status must be DERIVED');

// Mutation 14: Package sealing returning unverified on authentic package
const pkg = sealScenarioPackage({
  tenantId: 'T1',
  scenarioResult: { pnl: 100 },
  scenarioDefinition: { id: 'S1', name: 'S1' }
});
const vAuth = verifyScenarioPackage(pkg);
testAssert(vAuth.valid === true, 'Kills M14: Authentic package verifies true');

// Mutation 15: Package verification ignoring changed tenantId
const tamperedTenant = JSON.parse(JSON.stringify(pkg));
tamperedTenant.tenantId = 'T2';
const vTenant = verifyScenarioPackage(tamperedTenant);
testAssert(vTenant.valid === false, 'Kills M15: Altered tenantId fails verification');

// Mutation 16: Convexity ignored in fixed income rate shock
const bondCvx = { ticker: 'CVX_BOND', price: 100, shares: 1, duration: 5.0, convexity: 100.0, assetClass: 'FIXED_INCOME' };
const rateBig = [{ targetType: 'FACTOR', target: 'RATE', shockUnit: ShockUnit.BPS, shockValue: 200 }]; // +200 bps = 0.02
// dy = 0.02, -5 * 0.02 + 0.5 * 100 * (0.0004) = -0.10 + 0.02 = -0.08 (-8%)
const resCvx = evaluateSecurityScenario(bondCvx, rateBig);
testAssert(Math.abs(resCvx.deltas.pnlPercent - (-0.08)) < 1e-8, 'Kills M16: Convexity positive contribution included in price return');

// Mutation 17: FX shock applied to base currency asset
const usdAsset = { ticker: 'USD_ASSET', price: 100, shares: 1, currency: 'USD', assetClass: 'EQUITY' };
const fxEUR = [{ targetType: 'FX', target: 'EUR/USD', shockUnit: ShockUnit.PERCENT, shockValue: -0.10 }];
const resUSD = evaluateSecurityScenario(usdAsset, fxEUR, { baseCurrency: 'USD' });
testAssert(resUSD.stressed.price === 100, 'Kills M17: FX shock on foreign pair does not affect base currency asset');

// Mutation 18: Weight calculation denominator using stressed NAV for baseline weight
testAssert(aggRes.positions[0].baseline.weight === 10000 / 30000, 'Kills M18: Baseline weight uses baseline total NAV');

// Mutation 19: Stressed weight denominator using baseline NAV
testAssert(aggRes.positions[0].stressed.weight === 9000 / 29000, 'Kills M19: Stressed weight uses stressed total NAV');

// Mutation 20: Top gainer/loser sorting ascending instead of descending
const portTwo = {
  positions: [
    { ticker: 'LOSER', price: 100, shares: 1, marketValue: 100, beta: 2.0, assetClass: 'EQUITY' },
    { ticker: 'WINNER', price: 100, shares: 1, marketValue: 100, beta: 0.5, assetClass: 'EQUITY' }
  ]
};
const aggTwo = aggregatePortfolioScenario(portTwo, { shocks: [{ targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT, shockValue: -0.10, betaAdjusted: true }] });
testAssert(aggTwo.topLosers[0].ticker === 'LOSER', 'Kills M20: Top losers correctly identifies highest loss security');
testAssert(aggTwo.topGainers[0].ticker === 'WINNER', 'Kills M21: Top gainers correctly identifies best relative performer');

// Mutation 22: Negative price clamp allowing negative equity values
const doomAsset = { ticker: 'DOOM', price: 10, shares: 1, beta: 10.0, assetClass: 'EQUITY' };
const doomRes = evaluateSecurityScenario(doomAsset, [{ targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT, shockValue: -0.50, betaAdjusted: true }]);
testAssert(doomRes.stressed.price === 0, 'Kills M22: Price clamps at 0, no negative prices allowed');

// Mutation 23: Absolute shock applying multiplier
const absShockVal = applyAbsoluteShock(100, -20);
testAssert(absShockVal === 80, 'Kills M23: Absolute shock adds delta (100 - 20 = 80)');

// Mutation 24: Missing shock value in schema validation accepted
let badShockErr = false;
try {
  evaluateSecurityScenario(bond, [{ targetType: 'FACTOR', target: 'RATE', shockUnit: ShockUnit.BPS, shockValue: 'fifty' }]);
} catch (e) {
  badShockErr = true;
}
testAssert(badShockErr, 'Kills M24: Non-numeric shockValue rejected');

// Mutation 25: Reverse solver tolerance not respected
testAssert(solverRes.residual <= 1e-5, 'Kills M25: Solver respects residual tolerance bound');

console.log(`[PASS] Phase 19 Mutation tests passed: ${assertionCount} assertions (25 mutants killed)`);

export default { assertionCount };
