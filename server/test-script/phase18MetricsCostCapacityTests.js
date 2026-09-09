/**
 * Phase 18 — Test Suite 1: Metrics, Cost, Impact, Horizon & Capacity Tests
 */

import { strict as assert } from 'assert';
import { LiquidityStatus, LiquidityTier, ImpactModelType, TradingSide, LiquidityDataStatus } from '../liquidity/liquidity.types.js';
import { LiquidityMetricsEngine } from '../liquidity/liquidity.metrics.engine.js';
import { LiquidityValidationEngine } from '../liquidity/liquidity.validation.engine.js';
import { LiquidityImpactEngine } from '../liquidity/liquidity.impact.engine.js';
import { LiquidityCostEngine } from '../liquidity/liquidity.cost.engine.js';
import { LiquidityHorizonEngine } from '../liquidity/liquidity.horizon.engine.js';
import { LiquidityCapacityEngine } from '../liquidity/liquidity.capacity.engine.js';
import { LiquidityConstraintEngine } from '../liquidity/liquidity.constraint.engine.js';
import { LIQUIDITY_POLICY_V1 } from '../liquidity/liquidity.config.js';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 18 SUITE 1: METRICS, COST, IMPACT, HORIZON & CAPACITY TESTS ---');

// 1. Validation Engine Quotes
const validQuote = LiquidityValidationEngine.validateQuote(100.0, 100.20);
testAssert(validQuote.isValid === true, 'Valid quote passes');
testAssert(validQuote.mid === 100.10, 'Mid price calculated accurately');

const invalidQuoteInverted = LiquidityValidationEngine.validateQuote(105.0, 100.0);
testAssert(invalidQuoteInverted.isValid === false, 'Inverted quote rejected');
testAssert(invalidQuoteInverted.status === LiquidityStatus.INVALID_QUOTE, 'Status is INVALID_QUOTE');

const invalidQuoteNull = LiquidityValidationEngine.validateQuote(null, 100.0);
testAssert(invalidQuoteNull.isValid === false, 'Null quote rejected');
testAssert(invalidQuoteNull.status === LiquidityStatus.UNAVAILABLE, 'Null quote is UNAVAILABLE');

const invalidQuoteZero = LiquidityValidationEngine.validateQuote(0, 100.0);
testAssert(invalidQuoteZero.isValid === false, 'Zero quote rejected');

// 2. ADV Calculations across windows
const sampleVolumes = [
  1000000, 1200000, 900000, 1100000, 1050000,
  950000, 1300000, 850000, 1000000, 1150000,
  1000000, 1050000, 980000, 1020000, 1100000,
  990000, 1010000, 1040000, 970000, 1060000
];

const adv5D = LiquidityMetricsEngine.calculateAdv(sampleVolumes, '5D');
testAssert(adv5D.status === LiquidityStatus.PASS, '5D ADV passes');
testAssert(adv5D.observationCount === 5, '5D ADV uses 5 observations');
const expected5D = (990000 + 1010000 + 1040000 + 970000 + 1060000) / 5;
testAssert(Math.abs(adv5D.adv - expected5D) < 1e-6, '5D ADV value is exact');

const adv20D = LiquidityMetricsEngine.calculateAdv(sampleVolumes, '20D');
testAssert(adv20D.status === LiquidityStatus.PASS, '20D ADV passes');
testAssert(adv20D.observationCount === 20, '20D ADV uses 20 observations');

// Empty / Invalid ADV
const advEmpty = LiquidityMetricsEngine.calculateAdv([]);
testAssert(advEmpty.status === LiquidityStatus.UNAVAILABLE, 'Empty volume is UNAVAILABLE');

// 3. Dollar ADV
const dollarAdvRes = LiquidityMetricsEngine.calculateDollarAdv(1000000, 150.0);
testAssert(dollarAdvRes.status === LiquidityStatus.PASS, 'Dollar ADV passes');
testAssert(dollarAdvRes.dollarAdv === 150000000, 'Dollar ADV is $150M');

// 4. Spread & Basis Points
const spreadRes = LiquidityMetricsEngine.calculateSpread(99.95, 100.05);
testAssert(spreadRes.status === LiquidityStatus.PASS, 'Spread calculation passes');
testAssert(Math.abs(spreadRes.spread - 0.10) < 1e-6, 'Spread is 0.10');
testAssert(spreadRes.mid === 100.0, 'Mid is 100.0');
testAssert(Math.abs(spreadRes.spreadBps - 10.0) < 1e-6, 'Spread Bps is 10.0 bps');
testAssert(Math.abs(spreadRes.halfSpreadBps - 5.0) < 1e-6, 'Half-spread is 5.0 bps');

// 5. Participation Rate & Percent
const partRes = LiquidityMetricsEngine.calculateParticipation(50000, 1000000);
testAssert(partRes.status === LiquidityStatus.PASS, 'Participation rate passes');
testAssert(partRes.participationRate === 0.05, 'Participation rate is 0.05');
testAssert(partRes.participationPercent === 5.0, 'Participation percent is 5%');

// 6. Liquidity Tier
const tier1 = LiquidityMetricsEngine.determineLiquidityTier(100000000, 10.0);
testAssert(tier1 === LiquidityTier.TIER_1_HIGH_LIQUIDITY, 'Tier 1 High Liquidity identified');

const tier2 = LiquidityMetricsEngine.determineLiquidityTier(25000000, 30.0);
testAssert(tier2 === LiquidityTier.TIER_2_MODERATE_LIQUIDITY, 'Tier 2 Moderate Liquidity identified');

const tier3 = LiquidityMetricsEngine.determineLiquidityTier(5000000, 80.0);
testAssert(tier3 === LiquidityTier.TIER_3_LOW_LIQUIDITY, 'Tier 3 Low Liquidity identified');

const tier4 = LiquidityMetricsEngine.determineLiquidityTier(500000, 150.0);
testAssert(tier4 === LiquidityTier.TIER_4_ILLIQUID, 'Tier 4 Illiquid identified');

const tierUnknown = LiquidityMetricsEngine.determineLiquidityTier(null, null);
testAssert(tierUnknown === LiquidityTier.UNKNOWN, 'Missing ADV returns UNKNOWN tier');

// 7. Liquidity Score
const scoreRes = LiquidityMetricsEngine.calculateLiquidityScore(100000000, 10.0, 50000000000);
testAssert(scoreRes.status === LiquidityStatus.PASS, 'Liquidity score passes');
testAssert(scoreRes.score >= 80, 'High liquidity score >= 80');
testAssert(scoreRes.components.mktCapScore === 15, 'Large cap gets max market cap component');

// 8. Market Impact Engine
const impactSqrt = LiquidityImpactEngine.calculateMarketImpact(5000000, 100000000);
testAssert(impactSqrt.status === LiquidityStatus.PASS, 'Market impact calculation passes');
testAssert(impactSqrt.participationRatio === 0.05, 'Participation ratio is 0.05');
testAssert(impactSqrt.impactBps > 0, 'Impact Bps is strictly positive');
testAssert(impactSqrt.dataStatus === LiquidityDataStatus.CONFIGURED, 'Impact model status is CONFIGURED');
testAssert(impactSqrt.provenance.sourceAuthority.length > 0, 'Impact provenance has source authority');

// 9. Componentized Transaction Costs
const costOneWay = LiquidityCostEngine.calculateTradingCost({
  orderNotional: 1000000,
  dollarAdv: 50000000,
  spreadBps: 10.0,
  side: TradingSide.BUY,
  direction: 'ONE_WAY',
  jurisdiction: 'US'
});
testAssert(costOneWay.status === LiquidityStatus.PASS, 'One-way cost passes');
testAssert(costOneWay.components.explicitCommission.cost > 0, 'Explicit commission present');
testAssert(costOneWay.components.spreadCost.cost > 0, 'Spread cost present');
testAssert(costOneWay.components.marketImpact.cost > 0, 'Market impact cost present');
testAssert(costOneWay.components.exchangeFees.cost > 0, 'Exchange fees present');
testAssert(costOneWay.direction === 'ONE_WAY', 'Direction is ONE_WAY');

const costRoundTrip = LiquidityCostEngine.calculateTradingCost({
  orderNotional: 1000000,
  dollarAdv: 50000000,
  spreadBps: 10.0,
  side: TradingSide.ROUND_TRIP,
  direction: 'ROUND_TRIP',
  jurisdiction: 'IN'
});
testAssert(costRoundTrip.status === LiquidityStatus.PASS, 'Round-trip cost passes');
testAssert(costRoundTrip.direction === 'ROUND_TRIP', 'Direction is ROUND_TRIP');
testAssert(costRoundTrip.components.transactionTaxes.bps === 20.0, 'India round-trip STT is 20 bps');
testAssert(costRoundTrip.totalEstimatedCost > costOneWay.totalEstimatedCost, 'Round-trip cost exceeds one-way');

// 10. Liquidation Horizon Engine
const horizonRes = LiquidityHorizonEngine.calculateLiquidationHorizon({
  orderQuantity: 20000,
  adv: 100000,
  referencePrice: 100.0,
  maxParticipationRate: 0.10
});
testAssert(horizonRes.status === LiquidityStatus.PASS, 'Liquidation horizon passes');
testAssert(horizonRes.allowedDailyQuantity === 10000, 'Allowed daily quantity is 10,000 shares');
testAssert(horizonRes.requiredTradingDays === 2, '20k order requires 2 trading days at 10% ADV');
testAssert(horizonRes.schedule.length === 2, 'Daily schedule has 2 steps');
testAssert(horizonRes.schedule[0].tradeQuantity === 10000, 'Day 1 trades 10,000');
testAssert(horizonRes.schedule[1].tradeQuantity === 10000, 'Day 2 trades 10,000');

// 11. Single Position Capacity
const capRes = LiquidityCapacityEngine.calculatePositionCapacity(100000000);
testAssert(capRes.status === LiquidityStatus.PASS, 'Position capacity passes');
testAssert(capRes.maxDailyTradeNotional === 10000000, 'Max daily trade notional is $10M (10% of $100M)');
testAssert(capRes.maxPositionNotional === 50000000, 'Max position notional is $50M (5 days x $10M)');

// 12. Strategy Aggregate Capacity & Bottleneck
const strategyPositions = [
  { ticker: 'AAPL', weight: 0.40, dollarAdv: 200000000 },
  { ticker: 'MSFT', weight: 0.40, dollarAdv: 150000000 },
  { ticker: 'SMALL', weight: 0.20, dollarAdv: 10000000 } // Bottleneck
];
const stratCap = LiquidityCapacityEngine.calculateStrategyCapacity(strategyPositions);
testAssert(stratCap.status === LiquidityStatus.PASS, 'Strategy capacity passes');
testAssert(stratCap.bottleneckSecurity === 'SMALL', 'SMALL cap security identified as capacity bottleneck');
testAssert(stratCap.maxFeasibleNotional > 0, 'Max feasible strategy notional computed');

// 13. Liquidity Constraint Engine
const constraintRes = LiquidityConstraintEngine.generatePositionConstraints({
  ticker: 'AAPL',
  dollarAdv: 100000000,
  portfolioValue: 100000000
});
testAssert(constraintRes.status === LiquidityStatus.PASS, 'Position constraint generation passes');
testAssert(constraintRes.constraints.maxPositionNotional === 50000000, 'Max position notional is $50M');
testAssert(constraintRes.constraints.maxAllowedWeight === 0.50, 'Max allowed weight is 50%');

const complianceCheckPass = LiquidityConstraintEngine.validatePositionSize({
  ticker: 'AAPL',
  proposedNotional: 30000000,
  dollarAdv: 100000000,
  portfolioValue: 100000000
});
testAssert(complianceCheckPass.isCompliant === true, '$30M position is compliant with $50M limit');

const complianceCheckFail = LiquidityConstraintEngine.validatePositionSize({
  ticker: 'AAPL',
  proposedNotional: 60000000,
  dollarAdv: 100000000,
  portfolioValue: 100000000
});
testAssert(complianceCheckFail.isCompliant === false, '$60M position breaches $50M limit');
testAssert(complianceCheckFail.status === LiquidityStatus.LIQUIDITY_INSUFFICIENT, 'Status is LIQUIDITY_INSUFFICIENT');
testAssert(complianceCheckFail.excessNotional === 10000000, 'Excess notional is $10M');

console.log(`PASSED: Suite 1 completed with ${totalAssertions} assertions.`);
