/**
 * server/test-script/test-scenario-core-math.js
 * 
 * Phase 19: Unit Tests for Core Math Transforms and Security Sensitivity
 */

import assert from 'assert';
import {
  applyPercentShock,
  applyBpsShock,
  applyMultiplierShock,
  applyAbsoluteShock,
  applyShock,
  calculateDelta,
  calculatePercentDelta
} from '../scenario/scenario.transform.js';
import { evaluateSecurityScenario } from '../scenario/scenario.sensitivity.js';
import { ShockUnit, ValueStatus } from '../scenario/scenario.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 19 CORE MATH & SENSITIVITY TESTS ---');

// 1. applyPercentShock
testAssert(Math.abs(applyPercentShock(100, -0.20) - 80) < 1e-10, 'Percent shock -20% on 100 = 80');
testAssert(Math.abs(applyPercentShock(200, 0.15) - 230) < 1e-10, 'Percent shock +15% on 200 = 230');
testAssert(Math.abs(applyPercentShock(50, 0) - 50) < 1e-10, 'Percent shock 0% on 50 = 50');
testAssert(Math.abs(applyPercentShock(100, -1.0) - 0) < 1e-10, 'Percent shock -100% on 100 = 0');

// 2. applyBpsShock
testAssert(Math.abs(applyBpsShock(0.04, 100, true) - 0.05) < 1e-10, 'Bps shock +100bps on 4% yield = 5% yield');
testAssert(Math.abs(applyBpsShock(0.05, -50, true) - 0.045) < 1e-10, 'Bps shock -50bps on 5% yield = 4.5% yield');
testAssert(Math.abs(applyBpsShock(10, 25, false) - 35) < 1e-10, 'Bps direct shock +25 on 10 = 35');

// 3. applyMultiplierShock
testAssert(Math.abs(applyMultiplierShock(100, 2.5) - 250) < 1e-10, 'Multiplier shock 2.5x on 100 = 250');
testAssert(Math.abs(applyMultiplierShock(100, 0.5) - 50) < 1e-10, 'Multiplier shock 0.5x on 100 = 50');

// 4. applyAbsoluteShock
testAssert(Math.abs(applyAbsoluteShock(100, -15) - 85) < 1e-10, 'Absolute shock -15 on 100 = 85');
testAssert(Math.abs(applyAbsoluteShock(100, 30) - 130) < 1e-10, 'Absolute shock +30 on 100 = 130');

// 5. applyShock generic router
testAssert(Math.abs(applyShock(100, ShockUnit.PERCENT, -0.10) - 90) < 1e-10, 'Generic shock PERCENT');
testAssert(Math.abs(applyShock(0.03, ShockUnit.BPS, 200) - 0.05) < 1e-10, 'Generic shock BPS');
testAssert(Math.abs(applyShock(50, ShockUnit.MULTIPLIER, 3.0) - 150) < 1e-10, 'Generic shock MULTIPLIER');
testAssert(Math.abs(applyShock(50, ShockUnit.ABSOLUTE, -10) - 40) < 1e-10, 'Generic shock ABSOLUTE');

// 6. calculateDelta & calculatePercentDelta
testAssert(Math.abs(calculateDelta(100, 80) - (-20)) < 1e-10, 'Delta 80 - 100 = -20');
testAssert(Math.abs(calculatePercentDelta(100, 80) - (-0.20)) < 1e-10, 'Percent delta (80-100)/100 = -0.20');
testAssert(calculatePercentDelta(0, 0) === 0.0, 'Percent delta 0 to 0 is 0');
testAssert(calculatePercentDelta(0, 50) === null, 'Percent delta 0 to 50 is null');

// 7. Security Sensitivity: Direct Security Shock
const testEquity = {
  ticker: 'AAPL',
  price: 150,
  shares: 100,
  marketValue: 15000,
  beta: 1.2,
  sector: 'Information Technology',
  currency: 'USD',
  assetClass: 'EQUITY'
};
const secDirectShock = [{ targetType: 'SECURITY', target: 'AAPL', shockUnit: 'PERCENT', shockValue: -0.10 }];
const resDirect = evaluateSecurityScenario(testEquity, secDirectShock);
testAssert(resDirect.stressed.price === 135, 'AAPL stressed price is 135 (-10%)');
testAssert(resDirect.stressed.marketValue === 13500, 'AAPL stressed market value is 13500');
testAssert(resDirect.deltas.pnlDollar === -1500, 'AAPL pnlDollar is -1500');
testAssert(resDirect.deltas.pnlPercent === -0.10, 'AAPL pnlPercent is -0.10');
testAssert(resDirect.baseline.status === ValueStatus.DERIVED, 'Baseline is DERIVED');
testAssert(resDirect.stressed.status === ValueStatus.SCENARIO_OUTPUT, 'Stressed is SCENARIO_OUTPUT');

// 8. Security Sensitivity: Beta-Adjusted Index Shock
const indexShock = [{ targetType: 'INDEX', target: 'SPX', shockUnit: 'PERCENT', shockValue: -0.20, betaAdjusted: true }];
const resBeta = evaluateSecurityScenario(testEquity, indexShock);
// Shock = 1.2 * -0.20 = -0.24 (-24%)
// Stressed price = 150 * (1 - 0.24) = 114
testAssert(Math.abs(resBeta.stressed.price - 114) < 1e-10, 'AAPL beta-adjusted price is 114');
testAssert(Math.abs(resBeta.deltas.pnlDollar - (-3600)) < 1e-10, 'AAPL beta-adjusted PnL is -3600');
testAssert(Math.abs(resBeta.deltas.pnlPercent - (-0.24)) < 1e-10, 'AAPL beta-adjusted pnlPercent is -0.24');
testAssert(resBeta.sensitivities.betaUsed === 1.2, 'Beta 1.2 recorded in sensitivities');

// 9. Security Sensitivity: Fixed Income Duration & Convexity
const testBond = {
  ticker: 'UST10Y',
  price: 100,
  shares: 1000,
  marketValue: 100000,
  duration: 7.5,
  convexity: 60.0,
  sector: 'Government',
  currency: 'USD',
  assetClass: 'FIXED_INCOME'
};
// +150 bps rate shock = +0.015 yield change
// Price shock = -7.5 * 0.015 + 0.5 * 60 * (0.015^2) = -0.1125 + 30 * 0.000225 = -0.1125 + 0.00675 = -0.10575 (-10.575%)
const rateShock = [{ targetType: 'FACTOR', target: 'RATE_US_10Y', shockUnit: 'BPS', shockValue: 150 }];
const resBond = evaluateSecurityScenario(testBond, rateShock);
const expectedPriceBond = 100 * (1 - 0.10575);
testAssert(Math.abs(resBond.stressed.price - expectedPriceBond) < 1e-8, `Bond stressed price matches duration/convexity: ${resBond.stressed.price}`);
testAssert(Math.abs(resBond.deltas.pnlPercent - (-0.10575)) < 1e-8, 'Bond pnlPercent matches duration/convexity model');
testAssert(resBond.sensitivities.durationUsed === 7.5, 'Duration 7.5 recorded in sensitivities');

// 10. Security Sensitivity: FX Shock on Foreign Asset
const testForeignEquity = {
  ticker: 'ASML',
  price: 600,
  shares: 50,
  marketValue: 30000,
  sector: 'Information Technology',
  currency: 'EUR',
  assetClass: 'EQUITY'
};
const fxShock = [{ targetType: 'FX', target: 'EUR/USD', shockUnit: 'PERCENT', shockValue: -0.08 }];
const resFx = evaluateSecurityScenario(testForeignEquity, fxShock, { baseCurrency: 'USD' });
testAssert(Math.abs(resFx.stressed.price - 552) < 1e-10, 'EUR asset shocked by -8% FX');
testAssert(Math.abs(resFx.deltas.pnlDollar - (-2400)) < 1e-10, 'EUR asset PnL dollar matches FX shock');

// 11. Security Sensitivity: Stressed Liquidity Metrics
const testLiquidityStock = {
  ticker: 'MSFT',
  price: 300,
  shares: 100,
  marketValue: 30000,
  adv: 20000000,
  spreadBps: 2.0,
  assetClass: 'EQUITY'
};
const liqShocks = [
  { targetType: 'LIQUIDITY', target: 'ADV', shockUnit: 'PERCENT', shockValue: -0.40 },
  { targetType: 'LIQUIDITY', target: 'SPREAD_BPS', shockUnit: 'MULTIPLIER', shockValue: 3.0 }
];
const resLiq = evaluateSecurityScenario(testLiquidityStock, liqShocks);
testAssert(resLiq.stressed.adv === 12000000, 'ADV shocked from 20M to 12M (-40%)');
testAssert(resLiq.stressed.spreadBps === 6.0, 'Spread shocked from 2.0 bps to 6.0 bps (3x)');

console.log(`[PASS] Phase 19 Core Math & Sensitivity tests passed: ${assertionCount} assertions`);

export default { assertionCount };
