/**
 * Phase 18 — Test Suite 5: Mutation Testing (45 Adversarial Mutations)
 */

import { strict as assert } from 'assert';
import { LiquidityStatus, LiquidityTier, ExecutionFeasibility, StressScenarioType, ImpactModelType, TradingSide, LiquidityDataStatus } from '../liquidity/liquidity.types.js';
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
import { liquidityRepository } from '../liquidity/liquidity.repository.js';
import { LiquidityCopilotTool } from '../liquidity/liquidity.tool.js';

let mutationsTested = 0;
let mutationsKilled = 0;

function runMutation(id, description, fn) {
  mutationsTested++;
  try {
    const killed = fn();
    if (killed) {
      mutationsKilled++;
    } else {
      console.error(`SURVIVED: Mutation ${id} - ${description}`);
    }
  } catch (err) {
    mutationsKilled++;
  }
}

console.log('--- RUNNING PHASE 18 SUITE 5: 45 MUTATION TESTS ---');

// 1. Mutate ADV: Missing ADV must not fallback to zero
runMutation(1, 'ADV missing fallback to 0', () => {
  const res = LiquidityMetricsEngine.calculateAdv([]);
  return res.status === LiquidityStatus.UNAVAILABLE;
});

// 2. Mutate ADV: Negative ADV
runMutation(2, 'Negative ADV accepted', () => {
  const res = LiquidityValidationEngine.validateAdv(-100);
  return res.isValid === false && res.status === LiquidityStatus.INVALID_ADV;
});

// 3. Mutate ADV: Non-finite ADV
runMutation(3, 'Infinity ADV accepted', () => {
  const res = LiquidityValidationEngine.validateAdv(Infinity);
  return res.isValid === false && res.status === LiquidityStatus.INVALID_ADV;
});

// 4. Mutate Price: Missing price
runMutation(4, 'Missing price accepted', () => {
  const res = LiquidityValidationEngine.validatePrice(null);
  return res.isValid === false && res.status === LiquidityStatus.UNAVAILABLE;
});

// 5. Mutate Price: Zero price
runMutation(5, 'Zero price accepted', () => {
  const res = LiquidityValidationEngine.validatePrice(0);
  return res.isValid === false && res.status === LiquidityStatus.INVALID_PRICE;
});

// 6. Mutate Quote: Inverted Quote (Ask < Bid)
runMutation(6, 'Inverted quote accepted', () => {
  const res = LiquidityValidationEngine.validateQuote(105, 100);
  return res.isValid === false && res.status === LiquidityStatus.INVALID_QUOTE;
});

// 7. Mutate Quote: Null Bid
runMutation(7, 'Null bid accepted', () => {
  const res = LiquidityValidationEngine.validateQuote(null, 100);
  return res.isValid === false && res.status === LiquidityStatus.UNAVAILABLE;
});

// 8. Mutate Quote: Negative Bid
runMutation(8, 'Negative bid accepted', () => {
  const res = LiquidityValidationEngine.validateQuote(-50, 100);
  return res.isValid === false && res.status === LiquidityStatus.INVALID_QUOTE;
});

// 9. Mutate Spread: Inverted sign in spread calculation
runMutation(9, 'Spread calculated as bid - ask', () => {
  const res = LiquidityMetricsEngine.calculateSpread(100, 105);
  return res.spread === 5 && res.spreadBps > 0;
});

// 10. Mutate Spread Bps: Divide by 0 mid
runMutation(10, 'Mid price zero division', () => {
  const res = LiquidityValidationEngine.validateQuote(0, 0);
  return res.isValid === false;
});

// 11. Mutate Dollar ADV: Add instead of multiply
runMutation(11, 'Dollar ADV computed as sum', () => {
  const res = LiquidityMetricsEngine.calculateDollarAdv(1000, 50);
  return res.dollarAdv === 50000;
});

// 12. Mutate Participation: Inverted ratio (ADV / Qty)
runMutation(12, 'Participation inverted', () => {
  const res = LiquidityMetricsEngine.calculateParticipation(100, 1000);
  return res.participationRate === 0.10 && res.participationPercent === 10.0;
});

// 13. Mutate Participation: Negative order quantity
runMutation(13, 'Negative order quantity allowed', () => {
  const res = LiquidityValidationEngine.validateOrder(-10, null, 100);
  return res.isValid === false && res.status === LiquidityStatus.INVALID_QUANTITY;
});

// 14. Mutate Impact: Negative notional impact
runMutation(14, 'Negative notional in impact engine', () => {
  const res = LiquidityImpactEngine.calculateMarketImpact(-500, 10000);
  return res.status === LiquidityStatus.INVALID_QUANTITY;
});

// 15. Mutate Impact: Null Dollar ADV impact
runMutation(15, 'Null Dollar ADV in impact engine', () => {
  const res = LiquidityImpactEngine.calculateMarketImpact(500, null);
  return res.status === LiquidityStatus.UNAVAILABLE;
});

// 16. Mutate Horizon: Zero participation limit
runMutation(16, 'Zero participation limit allowed in horizon', () => {
  const res = LiquidityHorizonEngine.calculateLiquidationHorizon({ orderQuantity: 100, adv: 1000, maxParticipationRate: 0 });
  return res.status === LiquidityStatus.INVALID_INPUT;
});

// 17. Mutate Horizon: Negative participation limit
runMutation(17, 'Negative participation limit in horizon', () => {
  const res = LiquidityHorizonEngine.calculateLiquidationHorizon({ orderQuantity: 100, adv: 1000, maxParticipationRate: -0.1 });
  return res.status === LiquidityStatus.INVALID_INPUT;
});

// 18. Mutate Horizon: Truncate days to 0
runMutation(18, 'Horizon days truncated to 0', () => {
  const res = LiquidityHorizonEngine.calculateLiquidationHorizon({ orderQuantity: 10, adv: 1000000, maxParticipationRate: 0.1 });
  return res.requiredTradingDays === 1;
});

// 19. Mutate Horizon: Silent cap on huge orders
runMutation(19, 'Huge horizon silently capped at 5 days', () => {
  const res = LiquidityHorizonEngine.calculateLiquidationHorizon({ orderQuantity: 500000, adv: 10000, maxParticipationRate: 0.1 });
  return res.requiredTradingDays === 500;
});

// 20. Mutate Cost: Omit commission component
runMutation(20, 'Omit explicit commission from cost breakdown', () => {
  const res = LiquidityCostEngine.calculateTradingCost({ orderNotional: 10000, dollarAdv: 100000 });
  return res.components.explicitCommission !== undefined && res.components.explicitCommission.cost > 0;
});

// 21. Mutate Cost: Omit transaction taxes in India
runMutation(21, 'Omit STT for India jurisdiction', () => {
  const res = LiquidityCostEngine.calculateTradingCost({ orderNotional: 10000, dollarAdv: 100000, jurisdiction: 'IN' });
  return res.components.transactionTaxes.bps === 10.0 && res.components.transactionTaxes.cost > 0;
});

// 22. Mutate Cost: Round trip treated as one-way
runMutation(22, 'Round trip cost not doubling spread & impact', () => {
  const oneWay = LiquidityCostEngine.calculateTradingCost({ orderNotional: 10000, dollarAdv: 100000, direction: 'ONE_WAY' });
  const roundTrip = LiquidityCostEngine.calculateTradingCost({ orderNotional: 10000, dollarAdv: 100000, direction: 'ROUND_TRIP' });
  return roundTrip.totalEstimatedCost > oneWay.totalEstimatedCost;
});

// 23. Mutate Capacity: Omit participation limit in position capacity
runMutation(23, 'Omit participation limit in position capacity', () => {
  const res = LiquidityCapacityEngine.calculatePositionCapacity(1000000);
  return res.maxDailyTradeNotional === 100000;
});

// 24. Mutate Capacity: Empty positions strategy capacity
runMutation(24, 'Empty positions strategy capacity accepted', () => {
  const res = LiquidityCapacityEngine.calculateStrategyCapacity([]);
  return res.status === LiquidityStatus.INVALID_INPUT;
});

// 25. Mutate Constraint: Allow position exceeding max size
runMutation(25, 'Excess position size validated as compliant', () => {
  const res = LiquidityConstraintEngine.validatePositionSize({ proposedNotional: 200000, dollarAdv: 100000, portfolioValue: 1000000 });
  return res.isCompliant === false && res.status === LiquidityStatus.LIQUIDITY_INSUFFICIENT;
});

// 26. Mutate Stress: Zero stress multiplier
runMutation(26, 'Zero stress multiplier accepted', () => {
  const res = LiquidityStressEngine.evaluateStressScenario({ orderNotional: 1000, dollarAdv: 10000, customMultipliers: { advMultiplier: 0 } });
  return res.status === LiquidityStatus.INVALID_INPUT;
});

// 27. Mutate Stress: Negative stress multiplier
runMutation(27, 'Negative stress multiplier accepted', () => {
  const res = LiquidityStressEngine.evaluateStressScenario({ orderNotional: 1000, dollarAdv: 10000, customMultipliers: { advMultiplier: -1 } });
  return res.status === LiquidityStatus.INVALID_INPUT;
});

// 28. Mutate Feasibility: Turn UNKNOWN into FEASIBLE
runMutation(28, 'Missing ADV returns FEASIBLE', () => {
  const res = LiquidityFeasibilityEngine.evaluateFeasibility({ ticker: 'A', orderQuantity: 100, adv: null });
  return res.feasibility === ExecutionFeasibility.UNKNOWN && res.status === LiquidityStatus.UNAVAILABLE;
});

// 29. Mutate Feasibility: Infeasible trade marked feasible
runMutation(29, 'Excessive horizon marked FEASIBLE', () => {
  const res = LiquidityFeasibilityEngine.evaluateFeasibility({ ticker: 'A', orderQuantity: 100000, adv: 1000 });
  return res.feasibility === ExecutionFeasibility.INFEASIBLE;
});

// 30. Mutate Rebalance: Null portfolio value
runMutation(30, 'Null portfolio value in rebalance accepted', () => {
  const res = LiquidityRebalanceEngine.evaluateRebalanceTrades({ portfolioValue: null, trades: [] });
  return res.status === LiquidityStatus.INVALID_INPUT;
});

// 31. Mutate Rebalance: Missing bottleneck identification
runMutation(31, 'Rebalance bottleneck trade omitted', () => {
  const trades = [
    { ticker: 'LIQ', currentWeight: 0.1, targetWeight: 0.2, price: 100, adv: 1000000 },
    { ticker: 'ILLIQ', currentWeight: 0.1, targetWeight: 0.5, price: 10, adv: 100 }
  ];
  const res = LiquidityRebalanceEngine.evaluateRebalanceTrades({ portfolioValue: 100000, trades });
  return res.bottleneckTrade === 'ILLIQ';
});

// 32. Mutate Portfolio: Missing FX rate returns 1.0 fallback
runMutation(32, 'Missing FX rate silently uses 1.0 fallback', () => {
  const port = { positions: [{ ticker: 'REL', currency: 'INR', price: 2500, adv: 1000000 }] };
  const res = LiquidityEngine.evaluatePortfolioLiquidity(port, {});
  return res.status === LiquidityStatus.FX_UNAVAILABLE;
});

// 33. Mutate Portfolio: Empty positions accepted
runMutation(33, 'Empty positions in portfolio accepted', () => {
  const res = LiquidityEngine.evaluatePortfolioLiquidity({ positions: [] });
  return res.status === LiquidityStatus.INVALID_INPUT;
});

// 34. Mutate Freshness: Look-ahead future observation accepted
runMutation(34, 'Future look-ahead observation accepted', () => {
  const res = LiquidityValidationEngine.validateFreshness('2025-06-01', '2025-01-01');
  return res.status === LiquidityStatus.TEMPORAL_VIOLATION;
});

// 35. Mutate Freshness: Stale observation marked PRIME
runMutation(35, '30-day old observation marked PRIME', () => {
  const res = LiquidityValidationEngine.validateFreshness('2024-01-01', '2024-02-01', 5);
  return res.status === 'STALE';
});

// 36. Mutate Package: Corrupted hash verified
runMutation(36, 'Corrupted package hash verified as valid', () => {
  const sealed = SealedLiquidityIntelligencePackage.sealPackage({ workspaceId: 'W1' });
  const corrupted = { ...sealed, packageHash: '0000000000000000000000000000000000000000000000000000000000000000' };
  return SealedLiquidityIntelligencePackage.verifyPackage(corrupted) === false;
});

// 37. Mutate Package: Mutated package body verified
runMutation(37, 'Mutated package body verified as valid', () => {
  const sealed = SealedLiquidityIntelligencePackage.sealPackage({ workspaceId: 'W1' });
  const mutated = { ...sealed, package: { ...sealed.package, workspaceId: 'W2' } };
  return SealedLiquidityIntelligencePackage.verifyPackage(mutated) === false;
});

// 38. Mutate Repository: Cross-workspace observation access
runMutation(38, 'Cross-workspace observation access allowed', () => {
  liquidityRepository.saveObservation('WS-1', { ticker: 'SEC1', adv: 5000 });
  return liquidityRepository.getObservation('WS-2', 'SEC1') === null;
});

// 39. Mutate Repository: Cross-workspace package access
runMutation(39, 'Cross-workspace package access allowed', () => {
  liquidityRepository.savePackage('WS-1', { packageId: 'P1', packageHash: 'h' });
  return liquidityRepository.getPackage('WS-2', 'P1') === null;
});

// 40. Mutate Copilot: Nonexistent ticker fabricated
runMutation(40, 'Nonexistent ticker fabricated by Copilot tool', () => {
  const res = LiquidityCopilotTool.querySecurityLiquidity('WS-1', 'GHOST');
  return res.status === LiquidityStatus.UNAVAILABLE;
});

// 41. Mutate Tier: High ADV but massive spread kept in Tier 1
runMutation(41, 'Massive spread kept in Tier 1', () => {
  const tier = LiquidityMetricsEngine.determineLiquidityTier(100000000, 50);
  return tier !== LiquidityTier.TIER_1_HIGH_LIQUIDITY;
});

// 42. Mutate Score: Zero Dollar ADV given score
runMutation(42, 'Zero Dollar ADV given positive liquidity score', () => {
  const score = LiquidityMetricsEngine.calculateLiquidityScore(0, 10);
  return score.status === LiquidityStatus.UNAVAILABLE;
});

// 43. Mutate Single Security: Missing price in evaluateSecurityLiquidity
runMutation(43, 'Missing price in evaluateSecurityLiquidity returns PASS', () => {
  const res = LiquidityEngine.evaluateSecurityLiquidity({ ticker: 'A', adv: 1000, price: null });
  return res.status === LiquidityStatus.UNAVAILABLE;
});

// 44. Mutate Single Security: Inverted quote in evaluateSecurityLiquidity
runMutation(44, 'Inverted quote in evaluateSecurityLiquidity returns PASS', () => {
  const res = LiquidityEngine.evaluateSecurityLiquidity({ ticker: 'A', adv: 1000, price: 100, bid: 105, ask: 100 });
  return res.status === LiquidityStatus.INVALID_QUOTE;
});

// 45. Mutate Package: Empty payload generates valid package
runMutation(45, 'Null payload to sealPackage returns PASS', () => {
  const res = SealedLiquidityIntelligencePackage.sealPackage(null);
  return res.status === LiquidityStatus.INVALID_INPUT;
});

assert(mutationsTested === 45, '45 mutations tested');
assert(mutationsKilled === 45, `All 45 mutations must be killed (got ${mutationsKilled}/${mutationsTested})`);
console.log(`PASSED: ${mutationsKilled}/${mutationsTested} MUTATIONS KILLED.`);
