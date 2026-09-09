/**
 * Phase 18 — Institutional Rebalancing Liquidity Engine
 * Integrates proposed portfolio rebalancing trades with liquidity feasibility, impact, and horizon constraints.
 */

import { LiquidityStatus, ExecutionFeasibility, LiquidityDataStatus, deepFreeze } from './liquidity.types.js';
import { LIQUIDITY_POLICY_V1 } from './liquidity.config.js';
import { LiquidityFeasibilityEngine } from './liquidity.feasibility.engine.js';
import { LiquidityCostEngine } from './liquidity.cost.engine.js';
import { LiquidityHorizonEngine } from './liquidity.horizon.engine.js';

export class LiquidityRebalanceEngine {
  /**
   * Evaluates the liquidity feasibility and implementation cost of a proposed portfolio rebalance.
   */
  static evaluateRebalanceTrades(params) {
    const {
      portfolioValue,
      trades,
      policy = LIQUIDITY_POLICY_V1
    } = params;

    const numPortVal = Number(portfolioValue);
    if (isNaN(numPortVal) || numPortVal <= 0) {
      return deepFreeze({
        status: LiquidityStatus.INVALID_INPUT,
        reason: 'Portfolio value must be a strictly positive number'
      });
    }

    if (!Array.isArray(trades) || trades.length === 0) {
      return deepFreeze({
        status: LiquidityStatus.INVALID_INPUT,
        reason: 'Trades array is missing or empty'
      });
    }

    const evaluatedTrades = [];
    let totalTradeNotional = 0;
    let totalEstimatedCost = 0;
    let maxDaysAcrossTrades = 1;
    let hasInfeasibleTrade = false;
    let bottleneckTrade = null;

    for (const trade of trades) {
      const ticker = trade.ticker || 'UNKNOWN';
      const currentWeight = Number(trade.currentWeight || 0);
      const targetWeight = Number(trade.targetWeight || 0);
      const weightDelta = targetWeight - currentWeight;
      const price = Number(trade.price || trade.referencePrice || 100.0);
      const adv = Number(trade.adv);
      const dollarAdv = Number(trade.dollarAdv || (adv ? adv * price : 0));
      const spreadBps = Number(trade.spreadBps || 10.0);

      let tradeNotional = trade.tradeNotional !== undefined ? Number(trade.tradeNotional) : Math.abs(weightDelta) * numPortVal;
      let tradeQuantity = trade.tradeQuantity !== undefined ? Number(trade.tradeQuantity) : (tradeNotional / price);

      if (isNaN(tradeNotional) || tradeNotional < 0) tradeNotional = 0;
      if (isNaN(tradeQuantity) || tradeQuantity < 0) tradeQuantity = 0;

      // Skip negligible trades
      if (tradeNotional < 1.0) continue;

      totalTradeNotional += tradeNotional;

      const feasibilityResult = LiquidityFeasibilityEngine.evaluateFeasibility({
        ticker,
        orderQuantity: tradeQuantity,
        orderNotional: tradeNotional,
        adv,
        dollarAdv,
        referencePrice: price,
        policy
      });

      const costResult = LiquidityCostEngine.calculateTradingCost({
        orderNotional: tradeNotional,
        dollarAdv,
        spreadBps,
        side: weightDelta >= 0 ? 'BUY' : 'SELL',
        policy
      });

      const horizonResult = LiquidityHorizonEngine.calculateLiquidationHorizon({
        orderQuantity: tradeQuantity,
        orderNotional: tradeNotional,
        adv,
        dollarAdv,
        referencePrice: price,
        policy
      });

      const days = horizonResult.requiredTradingDays || 1;
      if (days > maxDaysAcrossTrades) {
        maxDaysAcrossTrades = days;
        bottleneckTrade = ticker;
      }

      if (feasibilityResult.feasibility === ExecutionFeasibility.INFEASIBLE) {
        hasInfeasibleTrade = true;
      }

      totalEstimatedCost += costResult.totalEstimatedCost;

      evaluatedTrades.push({
        ticker,
        currentWeight,
        targetWeight,
        weightDelta: Math.round(weightDelta * 10000) / 10000,
        tradeNotional: Math.round(tradeNotional * 100) / 100,
        tradeQuantity: Math.round(tradeQuantity * 100) / 100,
        price,
        adv,
        dollarAdv,
        participationPercent: Math.round((tradeQuantity / (adv || 1)) * 10000) / 100,
        estimatedCostBps: costResult.totalCostBps,
        estimatedCost: costResult.totalEstimatedCost,
        requiredTradingDays: days,
        feasibility: feasibilityResult.feasibility,
        constraints: feasibilityResult.constraints
      });
    }

    const portfolioTurnoverPercent = Math.round((totalTradeNotional / numPortVal) * 5000) / 100; // sum(abs(deltas))/2
    const aggregateCostBps = totalTradeNotional > 0 ? (totalEstimatedCost / totalTradeNotional) * 10000 : 0;

    let overallStatus = LiquidityStatus.FEASIBLE;
    if (hasInfeasibleTrade) {
      overallStatus = LiquidityStatus.INFEASIBLE;
    } else if (maxDaysAcrossTrades > 1) {
      overallStatus = LiquidityStatus.CONDITIONALLY_FEASIBLE;
    }

    return deepFreeze({
      status: overallStatus,
      portfolioValue: numPortVal,
      totalTradeNotional: Math.round(totalTradeNotional * 100) / 100,
      portfolioTurnoverPercent,
      totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
      aggregateCostBps: Math.round(aggregateCostBps * 100) / 100,
      maxLiquidationDays: maxDaysAcrossTrades,
      bottleneckTrade,
      trades: evaluatedTrades,
      dataStatus: LiquidityDataStatus.ESTIMATED
    });
  }
}
