/**
 * server/test-script/test-scenario-tax-liquidity-integration.js
 * 
 * Phase 19: Tax & Liquidity Stress Integration Tests
 */

import assert from 'assert';
import { ScenarioEngine } from '../scenario/scenario.engine.js';
import { ShockUnit, ScenarioType, ValueStatus } from '../scenario/scenario.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 19 TAX & LIQUIDITY STRESS INTEGRATION TESTS ---');

const engine = new ScenarioEngine();

const portfolio = {
  id: 'PORT-INTEG-001',
  currency: 'USD',
  cash: 20000,
  positions: [
    {
      ticker: 'AAPL',
      price: 150,
      shares: 100,
      marketValue: 15000,
      costBasis: 10000, // $5,000 baseline unrealized gain
      adv: 100000,
      spreadBps: 4.0,
      beta: 1.0,
      assetClass: 'EQUITY'
    },
    {
      ticker: 'NVDA',
      price: 500,
      shares: 40,
      marketValue: 20000,
      costBasis: 8000, // $12,000 baseline unrealized gain
      adv: 50000,
      spreadBps: 8.0,
      beta: 1.5,
      assetClass: 'EQUITY'
    }
  ]
};
// Total Baseline NAV = 15000 + 20000 + 20000 = 55,000

const scenarioDef = {
  id: 'SCEN-CRASH-WITH-LIQ',
  name: 'Severe Market & Liquidity Crunch',
  scenarioType: ScenarioType.HYPOTHETICAL_STRESS,
  shocks: [
    { targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT, shockValue: -0.20, betaAdjusted: true },
    { targetType: 'LIQUIDITY', target: 'ADV', shockUnit: ShockUnit.PERCENT, shockValue: -0.50 }, // 50% ADV dryup
    { targetType: 'LIQUIDITY', target: 'SPREAD_BPS', shockUnit: ShockUnit.MULTIPLIER, shockValue: 2.5 } // 2.5x spread widening
  ]
};

const options = {
  includeTaxAnalysis: true,
  taxOptions: { effectiveTaxRate: 0.20 },
  includeLiquidityAnalysis: true,
  liquidityOptions: { povLimit: 0.10, horizonDays: 1 }
};

const result = engine.evaluatePortfolio(portfolio, scenarioDef, options);

// 1. Core Portfolio Stress Verification
// AAPL: -20% -> price = 120 -> marketValue = 12,000 (PnL: -3000)
// NVDA: beta 1.5 * -20% = -30% -> price = 350 -> marketValue = 14,000 (PnL: -6000)
// Stressed Total NAV = 12,000 + 14,000 + 20,000 (cash) = 46,000 (PnL: -9000, -16.36%)
testAssert(result.baseline.nav === 55000, 'Baseline NAV is 55,000');
testAssert(result.stressed.nav === 46000, 'Stressed NAV is 46,000');
testAssert(result.deltas.pnlDollar === -9000, 'Portfolio PnL dollar is -9,000');

// 2. Tax Stress Integration Verification
// Baseline Gains: AAPL = 15000 - 10000 = 5000; NVDA = 20000 - 8000 = 12000. Total = 17,000
// Baseline Tax (20%): 5000 * 0.2 + 12000 * 0.2 = 1000 + 2400 = 3400
// Stressed Gains: AAPL = 12000 - 10000 = 2000; NVDA = 14000 - 8000 = 6000. Total = 8,000
// Stressed Tax (20%): 2000 * 0.2 + 6000 * 0.2 = 400 + 1200 = 1600
// Tax Shield/Drag Delta: 1600 - 3400 = -1800 (tax liability reduced by 1800)
// After-Tax Baseline NAV: 55,000 - 3,400 = 51,600
// After-Tax Stressed NAV: 46,000 - 1,600 = 44,400
// After-Tax PnL: 44,400 - 51,600 = -7,200 (vs pre-tax -9,000)
const taxRes = result.taxAnalysis;
testAssert(taxRes !== null, 'Tax analysis is present');
testAssert(taxRes.status === ValueStatus.MODEL_ESTIMATE, 'Tax analysis classification is MODEL_ESTIMATE');
testAssert(taxRes.baselineTotalTaxLiability === 3400, `Baseline tax liability is 3,400, got ${taxRes.baselineTotalTaxLiability}`);
testAssert(taxRes.stressedTotalTaxLiability === 1600, `Stressed tax liability is 1,600, got ${taxRes.stressedTotalTaxLiability}`);
testAssert(taxRes.taxShieldOrDragDelta === -1800, `Tax liability reduction is -1,800`);
testAssert(taxRes.afterTaxBaselineNav === 51600, `After-tax baseline NAV is 51,600`);
testAssert(taxRes.afterTaxStressedNav === 44400, `After-tax stressed NAV is 44,400`);
testAssert(taxRes.afterTaxPnlDollar === -7200, `After-tax PnL is -7,200`);

// 3. Liquidity Stress Integration Verification
// Baseline Spreads: AAPL 4 bps (0.0004), NVDA 8 bps (0.0008)
// Stressed Spreads: AAPL 4 * 2.5 = 10 bps (0.001), NVDA 8 * 2.5 = 20 bps (0.002)
// Stressed ADV: AAPL 100k * 0.5 = 50,000; NVDA 50k * 0.5 = 25,000
// Baseline Liquidation Costs (half-spread):
// AAPL: 15,000 * (0.0004 / 2) = $3.00
// NVDA: 20,000 * (0.0008 / 2) = $8.00
// Total Baseline Liquidation Cost = $11.00
// Stressed Liquidation Costs (half-spread on stressed market value):
// AAPL: 12,000 * (0.001 / 2) = $6.00
// NVDA: 14,000 * (0.002 / 2) = $14.00
// Total Stressed Liquidation Cost = $20.00
// Cost increase = $9.00
const liqRes = result.liquidityAnalysis;
testAssert(liqRes !== null, 'Liquidity analysis is present');
testAssert(liqRes.status === ValueStatus.MODEL_ESTIMATE, 'Liquidity analysis classification is MODEL_ESTIMATE');
testAssert(Math.abs(liqRes.totalBaselineLiquidationCost - 11.0) < 1e-6, `Baseline liquidation cost is $11.00`);
testAssert(Math.abs(liqRes.totalStressedLiquidationCost - 20.0) < 1e-6, `Stressed liquidation cost is $20.00`);
testAssert(Math.abs(liqRes.stressedLiquidityCostIncreaseDollar - 9.0) < 1e-6, `Stressed liquidity cost increase is $9.00`);

// Stressed Days to Liquidate:
// AAPL: 100 shares / (50,000 * 0.10) = 100 / 5,000 = 0.02 days (FEASIBLE)
// NVDA: 40 shares / (25,000 * 0.10) = 40 / 2,500 = 0.016 days (FEASIBLE)
const aaplLiq = liqRes.positions.find(p => p.ticker === 'AAPL');
testAssert(aaplLiq.stressedAdv === 50000, 'AAPL stressed ADV is 50,000');
testAssert(aaplLiq.feasibilityUnderStress === 'FEASIBLE', 'AAPL feasible under stress');

console.log(`[PASS] Phase 19 Tax & Liquidity Stress Integration tests passed: ${assertionCount} assertions`);

export default { assertionCount };
