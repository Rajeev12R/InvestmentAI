/**
 * Phase 18 — Test Suite 2: Feasibility, Stress Testing, Rebalancing & Portfolio Liquidity Tests
 */

import { strict as assert } from 'assert';
import { LiquidityStatus, ExecutionFeasibility, StressScenarioType, LiquidityTier, LiquidityDataStatus } from '../liquidity/liquidity.types.js';
import { LiquidityFeasibilityEngine } from '../liquidity/liquidity.feasibility.engine.js';
import { LiquidityStressEngine } from '../liquidity/liquidity.stress.engine.js';
import { LiquidityRebalanceEngine } from '../liquidity/liquidity.rebalance.engine.js';
import { LiquidityEngine } from '../liquidity/liquidity.engine.js';
import { LIQUIDITY_POLICY_V1 } from '../liquidity/liquidity.config.js';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 18 SUITE 2: FEASIBILITY, STRESS, REBALANCE & PORTFOLIO TESTS ---');

// 1. Feasibility: Standard liquid order -> FEASIBLE
const feasPass = LiquidityFeasibilityEngine.evaluateFeasibility({
  ticker: 'AAPL',
  orderQuantity: 10000,
  adv: 1000000,
  bid: 150.0,
  ask: 150.05,
  referencePrice: 150.0
});
testAssert(feasPass.status === LiquidityStatus.PASS, 'Standard feasibility evaluation passes');
testAssert(feasPass.feasibility === ExecutionFeasibility.FEASIBLE, '10k shares on 1M ADV is FEASIBLE');
testAssert(feasPass.participationRate === 0.01, '1% participation rate');
testAssert(feasPass.requiredTradingDays === 1, '1 trading day required');

// 2. Feasibility: Multi-day order -> CONDITIONALLY_FEASIBLE
const feasMultiDay = LiquidityFeasibilityEngine.evaluateFeasibility({
  ticker: 'MIDCAP',
  orderQuantity: 30000,
  adv: 100000,
  bid: 50.0,
  ask: 50.10,
  referencePrice: 50.0
});
testAssert(feasMultiDay.status === LiquidityStatus.PASS, 'Multi-day feasibility passes');
testAssert(feasMultiDay.feasibility === ExecutionFeasibility.CONDITIONALLY_FEASIBLE, '30k on 100k ADV is CONDITIONALLY_FEASIBLE');
testAssert(feasMultiDay.requiredTradingDays === 3, 'Requires 3 trading days');
testAssert(feasMultiDay.constraints.length > 0, 'Flagged participation constraint');

// 3. Feasibility: Excessive days order -> INFEASIBLE
const feasInfeasible = LiquidityFeasibilityEngine.evaluateFeasibility({
  ticker: 'ILLIQ',
  orderQuantity: 100000,
  adv: 10000,
  bid: 10.0,
  ask: 10.50,
  referencePrice: 10.0
});
testAssert(feasInfeasible.feasibility === ExecutionFeasibility.INFEASIBLE, '100k on 10k ADV is INFEASIBLE');
testAssert(feasInfeasible.requiredTradingDays === 100, 'Requires 100 trading days (exceeds max 5)');

// 4. Feasibility: Missing ADV -> UNKNOWN / UNAVAILABLE
const feasMissingAdv = LiquidityFeasibilityEngine.evaluateFeasibility({
  ticker: 'NOADV',
  orderQuantity: 5000,
  adv: null,
  referencePrice: 100.0
});
testAssert(feasMissingAdv.feasibility === ExecutionFeasibility.UNKNOWN, 'Missing ADV returns UNKNOWN feasibility');
testAssert(feasMissingAdv.status === LiquidityStatus.UNAVAILABLE, 'Status is UNAVAILABLE');

// 5. Stress Testing: Individual Scenarios
const stressAdv50 = LiquidityStressEngine.evaluateStressScenario({
  orderNotional: 1000000,
  dollarAdv: 20000000,
  scenarioType: StressScenarioType.ADV_CONTRACTION_50
});
testAssert(stressAdv50.status === LiquidityStatus.PASS, 'ADV -50% stress test passes');
testAssert(stressAdv50.stressed.dollarAdv === 10000000, 'Stressed dollar ADV is cut in half ($10M)');
testAssert(stressAdv50.delta.costIncreaseBps > 0, 'Cost in bps increases');

const stressSpread3X = LiquidityStressEngine.evaluateStressScenario({
  orderNotional: 1000000,
  dollarAdv: 20000000,
  spreadBps: 10.0,
  scenarioType: StressScenarioType.SPREAD_EXPANSION_3X
});
testAssert(stressSpread3X.status === LiquidityStatus.PASS, 'Spread 3X stress test passes');
testAssert(stressSpread3X.stressed.spreadBps === 30.0, 'Stressed spread expands to 30 bps');

// 6. Stress Testing: Joint Stress Severe (ADV -50%, Spread x2, Impact x2)
const stressJoint = LiquidityStressEngine.evaluateStressScenario({
  orderNotional: 2000000,
  dollarAdv: 10000000,
  spreadBps: 20.0,
  scenarioType: StressScenarioType.JOINT_STRESS_SEVERE
});
testAssert(stressJoint.status === LiquidityStatus.PASS, 'Joint severe stress passes');
testAssert(stressJoint.stressed.dollarAdv === 5000000, 'ADV cut by 50%');
testAssert(stressJoint.stressed.spreadBps === 40.0, 'Spread doubled to 40 bps');
testAssert(stressJoint.delta.costIncreaseRatio >= 1.5, 'Cost increase ratio >= 1.5x');

// 7. Battery of all standard stress scenarios
const allStress = LiquidityStressEngine.runAllStandardScenarios({
  orderNotional: 500000,
  dollarAdv: 10000000
});
testAssert(allStress.status === LiquidityStatus.PASS, 'All standard scenarios executed');
testAssert(Object.keys(allStress.scenarios).length === 9, '9 standard scenarios covered');

// 8. Rebalancing Integration Engine
const rebalanceTrades = [
  { ticker: 'AAPL', currentWeight: 0.20, targetWeight: 0.25, price: 150.0, adv: 2000000, spreadBps: 5.0 }, // +$500k
  { ticker: 'MSFT', currentWeight: 0.30, targetWeight: 0.25, price: 300.0, adv: 1500000, spreadBps: 6.0 }, // -$500k
  { ticker: 'SMALL', currentWeight: 0.05, targetWeight: 0.10, price: 50.0, adv: 20000, spreadBps: 40.0 }   // +$500k (bottleneck)
];

const rebalanceRes = LiquidityRebalanceEngine.evaluateRebalanceTrades({
  portfolioValue: 10000000,
  trades: rebalanceTrades
});
testAssert(rebalanceRes.status === LiquidityStatus.CONDITIONALLY_FEASIBLE, 'Rebalance status evaluated');
testAssert(rebalanceRes.totalTradeNotional === 1500000, 'Total trade notional is $1.5M');
testAssert(rebalanceRes.portfolioTurnoverPercent === 7.5, 'Turnover percent is 7.5%');
testAssert(rebalanceRes.bottleneckTrade === 'SMALL', 'SMALL cap identified as rebalancing bottleneck');
testAssert(rebalanceRes.maxLiquidationDays > 1, 'Multi-day rebalancing required');

// 9. Portfolio Liquidity & Currency Normalization
const multiAssetPortfolio = {
  portfolioId: 'PORT-GLOBAL-1',
  baseCurrency: 'USD',
  positions: [
    { ticker: 'AAPL', currency: 'USD', price: 150.0, quantity: 20000, adv: 1000000, spreadBps: 5.0, marketCap: 2500000000000 },
    { ticker: 'MSFT', currency: 'USD', price: 300.0, quantity: 10000, adv: 800000, spreadBps: 6.0, marketCap: 2000000000000 },
    { ticker: 'RELIANCE', currency: 'INR', price: 3000.0, quantity: 50000, adv: 2000000, spreadBps: 15.0, marketCap: 20000000000000 }
  ]
};

// FX Rates: USD_INR = 83.50, INR_USD = 0.011976
const fxRates = {
  'INR_USD': 0.012
};

const portEval = LiquidityEngine.evaluatePortfolioLiquidity(multiAssetPortfolio, fxRates);
testAssert(portEval.status === LiquidityStatus.PASS, 'Portfolio liquidity evaluation passes');
testAssert(portEval.totalPortfolioValue > 0, 'Total portfolio value calculated');
testAssert(portEval.portfolioDollarAdv > 0, 'Portfolio Dollar ADV aggregated in base USD');
testAssert(portEval.weightedSpreadBps > 0, 'Weighted spread bps calculated');
testAssert(portEval.portfolioLiquidityScore > 0, 'Portfolio liquidity score calculated');
testAssert(portEval.concentration.liquidityHHI > 0, 'Liquidity HHI calculated');
testAssert(portEval.concentration.top1LiquidityDependence > 0, 'Top 1 liquidity dependence calculated');

// 10. FX Missing Fail-Safe
const portEvalMissingFx = LiquidityEngine.evaluatePortfolioLiquidity(multiAssetPortfolio, {});
testAssert(portEvalMissingFx.status === LiquidityStatus.FX_UNAVAILABLE, 'Missing FX returns FX_UNAVAILABLE');

console.log(`PASSED: Suite 2 completed with ${totalAssertions} assertions.`);
