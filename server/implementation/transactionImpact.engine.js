/**
 * Phase 15 — Transaction Impact & Cost Analysis Engine
 * 
 * Computes deterministic rebalance execution costs (linear brokerage fees, bid-ask spread,
 * quadratic market impact, liquidity participation, days-to-trade, and tax liability estimates).
 */

import { ImplementationStatus, canonicalHash, deepFreeze } from './implementation.types.js';
import { IMPLEMENTATION_POLICY_V1 } from './implementation.config.js';

export class TransactionImpactEngine {
  /**
   * Evaluate transaction costs, liquidity impact, and net benefit for a proposed trade plan.
   */
  static evaluateImpact(params) {
    const {
      workspaceId,
      portfolioId,
      asOf = new Date().toISOString(),
      plan,
      liquidityMap = {}, // ticker -> { advUsd: number }
      expectedReturnImprovementBps = null,
      policy = IMPLEMENTATION_POLICY_V1
    } = params;

    if (!workspaceId || !portfolioId) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_WORKSPACE_OR_PORTFOLIO_ID', impactReport: null };
    }
    if (!plan || !Array.isArray(plan.orders)) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'INVALID_IMPLEMENTATION_PLAN', impactReport: null };
    }

    const portfolioValue = plan.portfolioValue || 1.0;
    const orders = plan.orders;
    const linearFeeBps = policy.linearTransactionCostBps || 10;
    const defaultSpreadBps = policy.defaultSpreadBps || 5;
    const quadraticImpactBps = policy.marketImpactQuadraticBps || 5;
    const advCap = policy.maxADVParticipationCap || 0.10;

    let totalGrossTradeValue = 0;
    let totalLinearCost = 0;
    let totalSpreadCost = 0;
    let totalMarketImpactCost = 0;
    let totalEstimatedTaxImpact = 0;
    let hasTaxData = false;
    let maxDaysToTrade = 0;
    let maxParticipationRate = 0;

    const tradeImpacts = [];

    for (const order of orders) {
      const tradeValue = order.estimatedTradeValue;
      if (tradeValue <= 0) continue;

      totalGrossTradeValue += tradeValue;

      // Linear broker fee: TradeValue * (linearFeeBps / 10000)
      const linearCost = tradeValue * (linearFeeBps / 10000.0);
      totalLinearCost += linearCost;

      // Half-spread execution cost: TradeValue * (spreadBps / 10000)
      const spreadCost = tradeValue * (defaultSpreadBps / 10000.0);
      totalSpreadCost += spreadCost;

      // Liquidity & Market Impact
      const liq = liquidityMap[order.ticker];
      const advUsd = liq && typeof liq.advUsd === 'number' && isFinite(liq.advUsd) && liq.advUsd > 0
        ? liq.advUsd
        : null;

      let participationRate = null;
      let daysToTrade = 0;
      let marketImpactCost = 0;

      if (advUsd !== null) {
        participationRate = Number((tradeValue / advUsd).toFixed(4));
        if (participationRate > maxParticipationRate) maxParticipationRate = participationRate;

        // Days to trade under participation cap
        daysToTrade = Number((tradeValue / (advUsd * advCap)).toFixed(2));
        if (daysToTrade > maxDaysToTrade) maxDaysToTrade = daysToTrade;

        // Quadratic impact: TradeValue * quadraticImpactBps * (participationRate^2) / 10000
        marketImpactCost = tradeValue * (quadraticImpactBps / 10000.0) * Math.min(4.0, Math.pow(participationRate, 2));
      } else {
        // Conservative fallback quadratic impact on turnover
        const turnoverRatio = tradeValue / portfolioValue;
        marketImpactCost = tradeValue * (quadraticImpactBps / 10000.0) * Math.min(2.0, turnoverRatio);
      }

      totalMarketImpactCost += marketImpactCost;

      // Capital Gains Tax estimation for SELL orders if cost basis provided
      let taxEstimate = null;
      if (order.action === 'SELL' && typeof order.costBasis === 'number' && isFinite(order.costBasis)) {
        const gain = order.currentPrice - order.costBasis;
        if (gain > 0) {
          const realizedGain = gain * Math.abs(order.shareDelta);
          const taxRate = order.holdingPeriodDays && order.holdingPeriodDays > 365
            ? policy.longTermCapitalGainsRate
            : policy.shortTermCapitalGainsRate;
          taxEstimate = Number((realizedGain * taxRate).toFixed(4));
          totalEstimatedTaxImpact += taxEstimate;
          hasTaxData = true;
        } else {
          taxEstimate = 0.0;
          hasTaxData = true;
        }
      }

      const totalPositionCost = linearCost + spreadCost + marketImpactCost + (taxEstimate || 0);

      tradeImpacts.push({
        ticker: order.ticker,
        action: order.action,
        tradeValue: Number(tradeValue.toFixed(4)),
        linearCost: Number(linearCost.toFixed(4)),
        spreadCost: Number(spreadCost.toFixed(4)),
        marketImpactCost: Number(marketImpactCost.toFixed(4)),
        taxEstimate: taxEstimate !== null ? Number(taxEstimate.toFixed(4)) : null,
        totalPositionCost: Number(totalPositionCost.toFixed(4)),
        advUsd,
        participationRate,
        estimatedDaysToTrade: daysToTrade
      });
    }

    const totalImplementationCost = totalLinearCost + totalSpreadCost + totalMarketImpactCost + totalEstimatedTaxImpact;
    const totalCostBps = portfolioValue > 0
      ? Number(((totalImplementationCost / portfolioValue) * 10000.0).toFixed(2))
      : 0;

    let netExpectedBenefitBps = null;
    let isEconomicallyJustified = true;

    if (typeof expectedReturnImprovementBps === 'number' && isFinite(expectedReturnImprovementBps)) {
      netExpectedBenefitBps = Number((expectedReturnImprovementBps - totalCostBps).toFixed(2));
      isEconomicallyJustified = netExpectedBenefitBps >= (policy.minNetBenefitBpsForRebalance || 10);
    }

    const payload = {
      impactId: `IMPACT-${portfolioId}-${asOf.replace(/[:.]/g, '-')}`,
      workspaceId,
      portfolioId,
      asOf,
      grossTradeValue: Number(totalGrossTradeValue.toFixed(4)),
      totalLinearCost: Number(totalLinearCost.toFixed(4)),
      totalSpreadCost: Number(totalSpreadCost.toFixed(4)),
      totalMarketImpactCost: Number(totalMarketImpactCost.toFixed(4)),
      totalEstimatedTaxImpact: hasTaxData ? Number(totalEstimatedTaxImpact.toFixed(4)) : null,
      totalImplementationCost: Number(totalImplementationCost.toFixed(4)),
      totalCostBps,
      maxDaysToTrade: Number(maxDaysToTrade.toFixed(2)),
      maxParticipationRate: Number(maxParticipationRate.toFixed(4)),
      expectedReturnImprovementBps,
      netExpectedBenefitBps,
      isEconomicallyJustified,
      trades: tradeImpacts,
      createdAt: asOf
    };

    const hash = canonicalHash(payload);
    const sealedImpactReport = deepFreeze({
      ...payload,
      impactHash: hash
    });

    return {
      status: ImplementationStatus.RECONCILED,
      impactReport: sealedImpactReport
    };
  }
}
