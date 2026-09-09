/**
 * Phase 18 — Test Suite 7: Real Ticker Liquidity Validation
 * Tests AAPL, JPM, RELIANCE, TMPV, TSM with explicit data provenance classification.
 */

import { strict as assert } from 'assert';
import { LiquidityStatus, LiquidityTier, ExecutionFeasibility, LiquidityDataStatus } from '../liquidity/liquidity.types.js';
import { LiquidityEngine } from '../liquidity/liquidity.engine.js';
import { LiquidityFeasibilityEngine } from '../liquidity/liquidity.feasibility.engine.js';
import { LiquidityCostEngine } from '../liquidity/liquidity.cost.engine.js';
import { LiquidityHorizonEngine } from '../liquidity/liquidity.horizon.engine.js';
import { LiquidityStressEngine } from '../liquidity/liquidity.stress.engine.js';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 18 SUITE 7: REAL TICKER LIQUIDITY VALIDATION (AAPL, JPM, RELIANCE, TMPV, TSM) ---');

const REAL_MARKET_SECURITIES = [
  {
    ticker: 'AAPL',
    jurisdiction: 'US',
    currency: 'USD',
    price: 224.50,
    adv: 45000000,
    bid: 224.48,
    ask: 224.52,
    spreadBps: 1.78,
    marketCap: 3400000000000,
    expectedTier: LiquidityTier.TIER_1_HIGH_LIQUIDITY
  },
  {
    ticker: 'JPM',
    jurisdiction: 'US',
    currency: 'USD',
    price: 215.30,
    adv: 9500000,
    bid: 215.25,
    ask: 215.35,
    spreadBps: 4.64,
    marketCap: 615000000000,
    expectedTier: LiquidityTier.TIER_1_HIGH_LIQUIDITY
  },
  {
    ticker: 'RELIANCE',
    jurisdiction: 'IN',
    currency: 'INR',
    price: 2950.00,
    adv: 4200000,
    bid: 2949.00,
    ask: 2951.00,
    spreadBps: 6.78,
    marketCap: 19900000000000,
    expectedTier: LiquidityTier.TIER_1_HIGH_LIQUIDITY
  },
  {
    ticker: 'TMPV',
    jurisdiction: 'IN',
    currency: 'INR',
    price: 985.50,
    adv: 12500000,
    bid: 985.00,
    ask: 986.00,
    spreadBps: 10.15,
    marketCap: 3600000000000,
    expectedTier: LiquidityTier.TIER_1_HIGH_LIQUIDITY
  },
  {
    ticker: 'TSM',
    jurisdiction: 'US',
    currency: 'USD',
    price: 172.40,
    adv: 14000000,
    bid: 172.35,
    ask: 172.45,
    spreadBps: 5.80,
    marketCap: 890000000000,
    expectedTier: LiquidityTier.TIER_1_HIGH_LIQUIDITY
  }
];

for (const sec of REAL_MARKET_SECURITIES) {
  console.log(`Evaluating real security: ${sec.ticker} (${sec.jurisdiction})`);

  // 1. Single-Security Liquidity Evaluation
  const evalResult = LiquidityEngine.evaluateSecurityLiquidity({
    ticker: sec.ticker,
    price: sec.price,
    adv: sec.adv,
    bid: sec.bid,
    ask: sec.ask,
    marketCap: sec.marketCap,
    currency: sec.currency,
    dataStatus: LiquidityDataStatus.REAL_DATA
  });

  testAssert(evalResult.status === LiquidityStatus.PASS, `${sec.ticker}: evaluation status PASS`);
  testAssert(evalResult.dollarAdv > 10000000, `${sec.ticker}: Dollar ADV > $10M`);
  testAssert(evalResult.tier === sec.expectedTier, `${sec.ticker}: matches expected liquidity tier ${sec.expectedTier}`);
  testAssert(evalResult.liquidityScore >= 75, `${sec.ticker}: high liquidity score >= 75`);

  // 2. Realistic Institutional Block Trade Feasibility ($5M Notional)
  const blockTradeNotional = 5000000;
  const blockQuantity = blockTradeNotional / sec.price;

  const feasResult = LiquidityFeasibilityEngine.evaluateFeasibility({
    ticker: sec.ticker,
    orderQuantity: blockQuantity,
    orderNotional: blockTradeNotional,
    adv: sec.adv,
    dollarAdv: sec.adv * sec.price,
    bid: sec.bid,
    ask: sec.ask,
    referencePrice: sec.price
  });

  testAssert(feasResult.status === LiquidityStatus.PASS, `${sec.ticker}: block trade feasibility evaluated`);
  testAssert(feasResult.feasibility === ExecutionFeasibility.FEASIBLE, `${sec.ticker}: $5M block trade is FEASIBLE`);
  testAssert(feasResult.requiredTradingDays === 1, `${sec.ticker}: $5M block executes in 1 day`);

  // 3. Trading Cost & Impact Breakdown
  const costResult = LiquidityCostEngine.calculateTradingCost({
    orderNotional: blockTradeNotional,
    dollarAdv: sec.adv * sec.price,
    spreadBps: sec.spreadBps,
    jurisdiction: sec.jurisdiction
  });

  testAssert(costResult.status === LiquidityStatus.PASS, `${sec.ticker}: cost calculation PASS`);
  testAssert(costResult.totalCostBps > 0, `${sec.ticker}: total cost bps strictly positive`);

  // 4. Stress Test
  const stressResult = LiquidityStressEngine.evaluateStressScenario({
    orderNotional: blockTradeNotional,
    dollarAdv: sec.adv * sec.price,
    spreadBps: sec.spreadBps,
    referencePrice: sec.price
  });

  testAssert(stressResult.status === LiquidityStatus.PASS, `${sec.ticker}: stress scenario evaluates`);
  testAssert(stressResult.delta.costIncreaseBps > 0, `${sec.ticker}: stress increases cost in bps`);
}

// Multi-asset Portfolio Aggregation with Real Tickers
const realPortfolio = {
  portfolioId: 'PORT-REAL-BASKET',
  baseCurrency: 'USD',
  positions: [
    { ticker: 'AAPL', price: 224.50, adv: 45000000, quantity: 10000, currency: 'USD', spreadBps: 1.78 },
    { ticker: 'JPM', price: 215.30, adv: 9500000, quantity: 10000, currency: 'USD', spreadBps: 4.64 },
    { ticker: 'TSM', price: 172.40, adv: 14000000, quantity: 10000, currency: 'USD', spreadBps: 5.80 }
  ]
};

const portRes = LiquidityEngine.evaluatePortfolioLiquidity(realPortfolio, {});
testAssert(portRes.status === LiquidityStatus.PASS, 'Real ticker portfolio evaluates cleanly');
testAssert(portRes.portfolioLiquidityScore >= 80, 'Real ticker portfolio score >= 80');
testAssert(portRes.illiquidExposurePercent === 0, 'Real ticker portfolio has 0% illiquid exposure');

console.log(`PASSED: Suite 7 completed with ${totalAssertions} assertions.`);
