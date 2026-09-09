/**
 * server/test-script/test-scenario-golden.js
 * 
 * Phase 19: Golden Institutional E2E Scenario Test Suite
 * Explicitly covers Golden A through Golden E as required by Institutional Scenario DoD.
 */

import assert from 'assert';
import { ScenarioEngine } from '../scenario/scenario.engine.js';
import { generateScenarioExplanation } from '../scenario/scenario.explanation.js';
import { sealScenarioPackage, verifyScenarioPackage } from '../scenario/scenario.package.js';
import { ValueStatus, ShockUnit, ScenarioType } from '../scenario/scenario.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 19 GOLDEN INSTITUTIONAL SCENARIOS (GOLDEN A–E) ---');

const engine = new ScenarioEngine();

// Institutional Multi-Asset Benchmark Portfolio
const goldenPortfolio = {
  id: 'PORT-INST-GOLDEN-01',
  name: 'Institutional Global Multi-Asset Foundation',
  currency: 'USD',
  cash: 100000, // $100,000 Cash
  positions: [
    {
      ticker: 'AAPL',
      price: 180,
      shares: 1000,
      marketValue: 180000,
      beta: 1.25,
      sector: 'Information Technology',
      currency: 'USD',
      operatingMargin: 0.30, // 30% operating margin
      adv: 50000000,
      spreadBps: 2.0,
      costBasis: 120000,
      assetClass: 'EQUITY'
    },
    {
      ticker: 'NVDA',
      price: 600,
      shares: 400,
      marketValue: 240000,
      beta: 1.80,
      sector: 'Information Technology',
      currency: 'USD',
      operatingMargin: 0.50, // 50% operating margin
      adv: 40000000,
      spreadBps: 3.0,
      costBasis: 100000,
      assetClass: 'EQUITY'
    },
    {
      ticker: 'ASML',
      price: 600,
      shares: 200,
      marketValue: 120000,
      beta: 1.20,
      sector: 'Information Technology',
      currency: 'EUR', // European foreign asset
      operatingMargin: 0.35,
      adv: 5000000,
      spreadBps: 4.0,
      costBasis: 90000,
      assetClass: 'EQUITY'
    },
    {
      ticker: 'JNJ',
      price: 160,
      shares: 750,
      marketValue: 120000,
      beta: 0.55,
      sector: 'Healthcare',
      currency: 'USD',
      operatingMargin: 0.25,
      adv: 10000000,
      spreadBps: 2.5,
      costBasis: 110000,
      assetClass: 'EQUITY'
    },
    {
      ticker: 'XOM',
      price: 110,
      shares: 1000,
      marketValue: 110000,
      beta: 0.85,
      sector: 'Energy',
      currency: 'USD',
      operatingMargin: 0.15,
      adv: 15000000,
      spreadBps: 3.5,
      costBasis: 90000,
      assetClass: 'EQUITY'
    },
    {
      ticker: 'UST10Y',
      price: 100,
      shares: 2300,
      marketValue: 230000,
      duration: 7.2,
      convexity: 65.0,
      sector: 'Government',
      currency: 'USD',
      adv: 100000000,
      spreadBps: 0.5,
      costBasis: 230000,
      assetClass: 'FIXED_INCOME'
    }
  ]
};

// Total Baseline NAV = 180k + 240k + 120k + 120k + 110k + 230k + 100k (cash) = 1,100,000 ($1.1M)

// =========================================================================
// Golden A: Broad Equity Market Shock: -20%
// =========================================================================
console.log('Evaluating Golden A: Broad Equity Market Shock (-20%)...');
const goldenADef = {
  id: 'GOLDEN_SCENARIO_A',
  name: 'Golden A: Broad Equity Market Shock -20%',
  scenarioType: ScenarioType.HYPOTHETICAL_STRESS,
  shocks: [
    { targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT, shockValue: -0.20, betaAdjusted: true }
  ]
};

const resA = engine.evaluatePortfolio(goldenPortfolio, goldenADef);
testAssert(resA.baseline.nav === 1100000, 'Golden A: Baseline NAV is $1,100,000');
// AAPL: beta 1.25 * -20% = -25% -> marketValue = 180k * 0.75 = 135,000 (PnL: -45,000)
// NVDA: beta 1.80 * -20% = -36% -> marketValue = 240k * 0.64 = 153,600 (PnL: -86,400)
// ASML: beta 1.20 * -20% = -24% -> marketValue = 120k * 0.76 = 91,200 (PnL: -28,800)
// JNJ:  beta 0.55 * -20% = -11% -> marketValue = 120k * 0.89 = 106,800 (PnL: -13,200)
// XOM:  beta 0.85 * -20% = -17% -> marketValue = 110k * 0.83 = 91,300 (PnL: -18,700)
// UST10Y: unshocked (PnL: 0) -> 230,000
// Cash: unshocked (PnL: 0) -> 100,000
// Stressed NAV = 135k + 153.6k + 91.2k + 106.8k + 91.3k + 230k + 100k = 907,900
// PnL Dollar = 907,900 - 1,100,000 = -192,100 (-17.4636%)
testAssert(Math.abs(resA.stressed.nav - 907900) < 1e-6, `Golden A: Stressed NAV is 907,900, got ${resA.stressed.nav}`);
testAssert(Math.abs(resA.deltas.pnlDollar - (-192100)) < 1e-6, `Golden A: PnL is -$192,100, got ${resA.deltas.pnlDollar}`);
testAssert(resA.stressed.status === ValueStatus.SCENARIO_OUTPUT, 'Golden A status is SCENARIO_OUTPUT');

// =========================================================================
// Golden B: Interest Rates: +200 bps
// =========================================================================
console.log('Evaluating Golden B: Interest Rates +200 bps...');
const goldenBDef = {
  id: 'GOLDEN_SCENARIO_B',
  name: 'Golden B: Interest Rates +200 bps Shock',
  scenarioType: ScenarioType.MACRO_FACTOR,
  shocks: [
    { targetType: 'FACTOR', target: 'RATE_US_10Y', shockUnit: ShockUnit.BPS, shockValue: 200 }
  ]
};

const resB = engine.evaluatePortfolio(goldenPortfolio, goldenBDef);
// Yield delta = +0.02. Bond duration = 7.2, convexity = 65.0
// Price shock = -7.2 * 0.02 + 0.5 * 65 * (0.02^2) = -0.144 + 32.5 * 0.0004 = -0.144 + 0.013 = -0.131 (-13.1%)
// UST10Y stressed price = 100 * (1 - 0.131) = 86.9 -> marketValue = 86.9 * 2300 = 199,870 (PnL: -30,130)
// Equity & cash unaffected -> Total Stressed NAV = 1,100,000 - 30,130 = 1,069,870
const bondB = resB.positions.find(p => p.ticker === 'UST10Y');
testAssert(Math.abs(bondB.stressed.price - 86.9) < 1e-6, `Golden B: Stressed bond price is 86.9, got ${bondB.stressed.price}`);
testAssert(Math.abs(bondB.deltas.pnlDollar - (-30130)) < 1e-6, `Golden B: Bond PnL is -$30,130`);
testAssert(Math.abs(resB.stressed.nav - 1069870) < 1e-6, `Golden B: Stressed NAV is $1,069,870`);

// =========================================================================
// Golden C: FX Shock: -10% (EUR depreciation vs USD)
// =========================================================================
console.log('Evaluating Golden C: FX Shock -10%...');
const goldenCDef = {
  id: 'GOLDEN_SCENARIO_C',
  name: 'Golden C: EUR/USD -10% Depreciation',
  scenarioType: ScenarioType.MACRO_FACTOR,
  shocks: [
    { targetType: 'FX', target: 'EUR/USD', shockUnit: ShockUnit.PERCENT, shockValue: -0.10 }
  ]
};

const resC = engine.evaluatePortfolio(goldenPortfolio, goldenCDef, { baseCurrency: 'USD' });
// Only ASML (EUR currency) is affected: -10% -> 120k * 0.9 = 108,000 (PnL: -12,000)
// Total Stressed NAV = 1,100,000 - 12,000 = 1,088,000
const asmlC = resC.positions.find(p => p.ticker === 'ASML');
const aaplC = resC.positions.find(p => p.ticker === 'AAPL');
testAssert(asmlC.deltas.pnlDollar === -12000, `Golden C: ASML suffered -$12,000 FX loss`);
testAssert(aaplC.deltas.pnlDollar === 0, `Golden C: AAPL (USD) unaffected by EUR FX shock`);
testAssert(resC.stressed.nav === 1088000, `Golden C: Portfolio stressed NAV is 1,088,000`);

// =========================================================================
// Golden D: Operating Margin Compression (-300 bps across Tech)
// =========================================================================
console.log('Evaluating Golden D: Operating Margin Compression...');
const goldenDDef = {
  id: 'GOLDEN_SCENARIO_D',
  name: 'Golden D: Operating Margin Compression',
  scenarioType: ScenarioType.HYPOTHETICAL_STRESS,
  shocks: [
    { targetType: 'FACTOR', target: 'OPERATING_MARGIN', shockUnit: ShockUnit.BPS, shockValue: -300 } // -300 bps (-0.03)
  ]
};

const resD = engine.evaluatePortfolio(goldenPortfolio, goldenDDef);
// AAPL: base margin 30% (0.30). Delta margin -0.03 -> Price impact = -0.03 / 0.30 = -10% -> 180k * 0.9 = 162k (PnL: -18k)
// NVDA: base margin 50% (0.50). Delta margin -0.03 -> Price impact = -0.03 / 0.50 = -6% -> 240k * 0.94 = 225.6k (PnL: -14.4k)
// ASML: base margin 35% (0.35). Delta margin -0.03 -> Price impact = -0.03 / 0.35 = -8.5714% -> 120k * (1 - 0.085714) = 109,714.29
const aaplD = resD.positions.find(p => p.ticker === 'AAPL');
const nvdaD = resD.positions.find(p => p.ticker === 'NVDA');
testAssert(Math.abs(aaplD.deltas.pnlPercent - (-0.10)) < 1e-6, `Golden D: AAPL suffered -10% earnings shock from -300bps margin compression`);
testAssert(Math.abs(nvdaD.deltas.pnlPercent - (-0.06)) < 1e-6, `Golden D: NVDA suffered -6% earnings shock from -300bps margin compression`);

// =========================================================================
// Golden E: Combined Multi-Factor Stress (Market + Rates + FX + Liquidity + Tax)
// =========================================================================
console.log('Evaluating Golden E: Combined Multi-Factor Stress...');
const goldenEDef = {
  id: 'GOLDEN_SCENARIO_E',
  name: 'Golden E: Combined Multi-Factor Institutional Stress',
  scenarioType: ScenarioType.HYPOTHETICAL_STRESS,
  shocks: [
    { targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT, shockValue: -0.20, betaAdjusted: true },
    { targetType: 'FACTOR', target: 'RATE_US_10Y', shockUnit: ShockUnit.BPS, shockValue: +150 },
    { targetType: 'FX', target: 'EUR/USD', shockUnit: ShockUnit.PERCENT, shockValue: -0.10 },
    { targetType: 'LIQUIDITY', target: 'ADV', shockUnit: ShockUnit.PERCENT, shockValue: -0.40 },
    { targetType: 'LIQUIDITY', target: 'SPREAD_BPS', shockUnit: ShockUnit.MULTIPLIER, shockValue: 3.0 }
  ]
};

const resE = engine.evaluatePortfolio(goldenPortfolio, goldenEDef, {
  includeTaxAnalysis: true,
  taxOptions: { effectiveTaxRate: 0.20 },
  includeLiquidityAnalysis: true,
  liquidityOptions: { povLimit: 0.10, horizonDays: 1 }
});

testAssert(resE.taxAnalysis !== null, 'Golden E: Tax analysis included');
testAssert(resE.liquidityAnalysis !== null, 'Golden E: Liquidity analysis included');
testAssert(resE.taxAnalysis.status === ValueStatus.MODEL_ESTIMATE, 'Golden E: Tax status is MODEL_ESTIMATE');
testAssert(resE.liquidityAnalysis.status === ValueStatus.MODEL_ESTIMATE, 'Golden E: Liquidity status is MODEL_ESTIMATE');
testAssert(resE.liquidityAnalysis.stressedLiquidityCostIncreaseDollar > 0, 'Golden E: Stressed liquidity costs increase under shock');

// Cryptographic Package Sealing of Golden E
const sealedE = sealScenarioPackage({
  tenantId: 'TENANT-INST-GOLDEN',
  scenarioResult: resE,
  portfolioSnapshot: goldenPortfolio,
  scenarioDefinition: goldenEDef,
  sealedBy: 'USR-MANAGING-DIRECTOR'
});
testAssert(sealedE.sealId.startsWith('SEAL-SCEN-'), 'Golden E package sealed');
const verifyE = verifyScenarioPackage(sealedE);
testAssert(verifyE.valid === true, 'Golden E sealed package cryptographically authentic');

console.log(`[PASS] Phase 19 Golden Institutional Scenarios (A–E) passed: ${assertionCount} assertions`);

export default { assertionCount };
