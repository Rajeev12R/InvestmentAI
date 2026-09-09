/**
 * Phase 18 — Test Suite 8: Golden End-to-End Deterministic Trace
 * Tests Golden Cases A through G and executes full end-to-end trace from Truth Layer facts to Sealed Package.
 */

import { strict as assert } from 'assert';
import { LiquidityStatus, LiquidityTier, ExecutionFeasibility, StressScenarioType, TradingSide, LiquidityDataStatus } from '../liquidity/liquidity.types.js';
import { LiquidityValidationEngine } from '../liquidity/liquidity.validation.engine.js';
import { LiquidityMetricsEngine } from '../liquidity/liquidity.metrics.engine.js';
import { LiquidityImpactEngine } from '../liquidity/liquidity.impact.engine.js';
import { LiquidityCostEngine } from '../liquidity/liquidity.cost.engine.js';
import { LiquidityHorizonEngine } from '../liquidity/liquidity.horizon.engine.js';
import { LiquidityCapacityEngine } from '../liquidity/liquidity.capacity.engine.js';
import { LiquidityStressEngine } from '../liquidity/liquidity.stress.engine.js';
import { LiquidityFeasibilityEngine } from '../liquidity/liquidity.feasibility.engine.js';
import { LiquidityRebalanceEngine } from '../liquidity/liquidity.rebalance.engine.js';
import { LiquidityConstraintEngine } from '../liquidity/liquidity.constraint.engine.js';
import { LiquidityEngine } from '../liquidity/liquidity.engine.js';
import { SealedLiquidityIntelligencePackage } from '../liquidity/liquidity.package.js';
import { LiquidityExplanationEngine } from '../liquidity/liquidity.explanation.engine.js';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 18 SUITE 8: GOLDEN END-TO-END TRACE & GOLDEN CASES A–G ---');

// ==========================================
// GOLDEN CASE A: Liquid Large Cap
// Price = 100, ADV = 1,000,000 shares, Order = 10,000 shares
// Expected: Participation = 1%
// ==========================================
const goldenA = LiquidityMetricsEngine.calculateParticipation(10000, 1000000);
testAssert(goldenA.status === LiquidityStatus.PASS, 'Golden A: Participation calculation status PASS');
testAssert(goldenA.participationRate === 0.01, 'Golden A: Participation rate is 0.01 (1%)');
testAssert(goldenA.participationPercent === 1.0, 'Golden A: Participation percent is 1.0%');

// ==========================================
// GOLDEN CASE B: Illiquid Position
// Price = 100, ADV = 10,000 shares, Order = 10,000 shares, MaxParticipation = 10%
// Expected: TradingDays = 10
// ==========================================
const goldenB = LiquidityHorizonEngine.calculateLiquidationHorizon({
  orderQuantity: 10000,
  adv: 10000,
  referencePrice: 100.0,
  maxParticipationRate: 0.10
});
testAssert(goldenB.status === LiquidityStatus.PASS, 'Golden B: Liquidation horizon status PASS');
testAssert(goldenB.allowedDailyQuantity === 1000, 'Golden B: Allowed daily quantity is 1,000 shares');
testAssert(goldenB.requiredTradingDays === 10, 'Golden B: Required trading days is exactly 10 days');
testAssert(goldenB.schedule.length === 10, 'Golden B: Liquidation schedule contains 10 daily steps');

// ==========================================
// GOLDEN CASE C: Invalid Quote
// Bid = 110, Ask = 100
// Expected: UNAVAILABLE / INVALID_QUOTE
// ==========================================
const goldenC = LiquidityValidationEngine.validateQuote(110.0, 100.0);
testAssert(goldenC.isValid === false, 'Golden C: Inverted quote is rejected');
testAssert(goldenC.status === LiquidityStatus.INVALID_QUOTE, 'Golden C: Status is INVALID_QUOTE');
testAssert(goldenC.reason.includes('Inverted quote'), 'Golden C: Diagnostic reason indicates inverted quote');

// ==========================================
// GOLDEN CASE D: Missing ADV
// Expected: UNAVAILABLE
// ==========================================
const goldenD = LiquidityValidationEngine.validateAdv(null);
testAssert(goldenD.isValid === false, 'Golden D: Missing ADV is rejected');
testAssert(goldenD.status === LiquidityStatus.UNAVAILABLE, 'Golden D: Status is UNAVAILABLE');

const goldenDFeas = LiquidityFeasibilityEngine.evaluateFeasibility({
  ticker: 'MISSING_ADV',
  orderQuantity: 1000,
  adv: null
});
testAssert(goldenDFeas.feasibility === ExecutionFeasibility.UNKNOWN, 'Golden D: Feasibility is UNKNOWN for missing ADV');
testAssert(goldenDFeas.status === LiquidityStatus.UNAVAILABLE, 'Golden D: Feasibility status is UNAVAILABLE');

// ==========================================
// GOLDEN CASE E: Stress
// Apply: ADV -50%, Spread x2, Impact x2
// Verify deterministic increase in trading cost / horizon
// ==========================================
const goldenE = LiquidityStressEngine.evaluateStressScenario({
  orderNotional: 2000000,
  dollarAdv: 20000000,
  spreadBps: 10.0,
  scenarioType: StressScenarioType.JOINT_STRESS_SEVERE
});
testAssert(goldenE.status === LiquidityStatus.PASS, 'Golden E: Joint severe stress evaluated');
testAssert(goldenE.stressed.dollarAdv === 10000000, 'Golden E: Stressed Dollar ADV is $10M (50% contraction)');
testAssert(goldenE.stressed.spreadBps === 20.0, 'Golden E: Stressed Spread is 20 bps (2x expansion)');
testAssert(goldenE.delta.costIncreaseBps > 0, 'Golden E: Cost increase bps > 0');
testAssert(goldenE.delta.costIncreaseRatio >= 1.5, 'Golden E: Cost increase ratio >= 1.5x');

// ==========================================
// GOLDEN CASE F: Cross-Currency
// USD / INR Normalization using Truth Layer FX data
// ==========================================
const crossCurrencyPortfolio = {
  portfolioId: 'PORT-CROSS-CCY',
  baseCurrency: 'USD',
  positions: [
    { ticker: 'US_STOCK', currency: 'USD', price: 100.0, quantity: 10000, adv: 500000, spreadBps: 5.0 },
    { ticker: 'IN_STOCK', currency: 'INR', price: 1000.0, quantity: 83500, adv: 1000000, spreadBps: 10.0 }
  ]
};
// 83,500 shares * 1000 INR = 83,500,000 INR / 83.5 = $1,000,000 USD
const fxRates = {
  'INR_USD': 1 / 83.5
};
const goldenF = LiquidityEngine.evaluatePortfolioLiquidity(crossCurrencyPortfolio, fxRates);
testAssert(goldenF.status === LiquidityStatus.PASS, 'Golden F: Cross-currency portfolio evaluated');
testAssert(Math.abs(goldenF.totalPortfolioValue - 2000000) < 100, 'Golden F: Total portfolio value is $2,000,000 USD');
testAssert(goldenF.positions.length === 2, 'Golden F: Both positions converted to USD base');

// ==========================================
// GOLDEN CASE G: Rebalance
// Target vs actual trade notional feeds into participation and feasibility
// ==========================================
const goldenG = LiquidityRebalanceEngine.evaluateRebalanceTrades({
  portfolioValue: 5000000,
  trades: [
    { ticker: 'OVERWEIGHT', currentWeight: 0.60, targetWeight: 0.40, price: 100.0, adv: 1000000 }, // Sell $1M
    { ticker: 'UNDERWEIGHT', currentWeight: 0.40, targetWeight: 0.60, price: 50.0, adv: 1000000 }  // Buy $1M
  ]
});
testAssert(goldenG.status === LiquidityStatus.FEASIBLE, 'Golden G: Rebalance trade feasibility evaluated');
testAssert(goldenG.totalTradeNotional === 2000000, 'Golden G: Total rebalancing notional is $2,000,000');
testAssert(goldenG.portfolioTurnoverPercent === 20.0, 'Golden G: Portfolio turnover is 20%');

// ==========================================
// COMPLETE END-TO-END TRACE & SEALED PACKAGE
// ==========================================
const e2ePayload = {
  workspaceId: 'WS-INST-GOLDEN',
  portfolioId: 'PORT-INST-GOLDEN-01',
  timestamp: '2025-01-15T12:00:00.000Z',
  observations: [
    { ticker: 'AAPL', adv: 1000000, price: 150.0, bid: 149.95, ask: 150.05, spreadBps: 6.67 }
  ],
  metrics: {
    portfolioDollarAdv: 150000000,
    weightedSpreadBps: 6.67,
    liquidityScore: 92.5
  },
  costs: {
    totalEstimatedCostBps: 8.5
  },
  feasibility: {
    overallFeasibility: 'FEASIBLE'
  },
  stressResults: {
    severeStressCostIncreaseBps: 12.4
  },
  evidenceGraph: [
    { evidenceId: 'EVID-SRC-LIQ-INST-2024', hash: 'a71e860959086f6d5423f0545f44e1837494f6c4ff98444a161bb774fcfbaae9' }
  ]
};

const sealedPkg = SealedLiquidityIntelligencePackage.sealPackage(e2ePayload);
testAssert(sealedPkg.status === LiquidityStatus.PASS, 'E2E Trace: Package sealed successfully');
testAssert(sealedPkg.packageHash.length === 64, 'E2E Trace: 64-char cryptographic SHA-256 hash');
testAssert(SealedLiquidityIntelligencePackage.verifyPackage(sealedPkg) === true, 'E2E Trace: Package verified true');

// Explainability Trace
const explanation = LiquidityExplanationEngine.explainSecurityLiquidity({
  status: LiquidityStatus.PASS,
  ticker: 'AAPL',
  adv: 1000000,
  dollarAdv: 150000000,
  spreadBps: 6.67,
  tier: LiquidityTier.TIER_1_HIGH_LIQUIDITY,
  score: 92.5
});
testAssert(typeof explanation === 'string' && explanation.includes('AAPL'), 'E2E Trace: Copilot explanation verified');

console.log(`PASSED: Suite 8 completed with ${totalAssertions} assertions.`);
