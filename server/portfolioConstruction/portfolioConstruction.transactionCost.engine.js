import { PORTFOLIO_COST_CONFIG_V1 } from "./portfolioConstructionConfig.js";

/**
 * Deterministic Transaction Cost Engine for Phase 14
 */
export class TransactionCostEngine {
  /**
   * Estimate total transaction costs from one-way/two-way turnover.
   * Total Cost = Linear Fee (bps) + Spread (bps) + Market Impact (bps * turnover^2)
   */
  static estimateTransactionCosts(turnoverSummary, portfolioValue = 1000000, costConfig = PORTFOLIO_COST_CONFIG_V1) {
    const twoWayTurnover = turnoverSummary?.twoWayTurnover || 0;
    const tradedValue = twoWayTurnover * portfolioValue;

    const linearBps = costConfig.linearTransactionCostBps || 10;
    const spreadBps = costConfig.defaultSpreadBps || 5;
    const impactCoeff = costConfig.marketImpactQuadraticBps || 5;

    // Linear costs (commission + half-spread)
    const linearCostRate = (linearBps + spreadBps) / 10000.0;
    const linearCostAmount = tradedValue * linearCostRate;

    // Non-linear market impact cost
    const impactRate = (impactCoeff * twoWayTurnover) / 10000.0;
    const impactCostAmount = tradedValue * impactRate;

    const totalCostAmount = linearCostAmount + impactCostAmount;
    const totalCostBps = (totalCostAmount / Math.max(1, portfolioValue)) * 10000.0;

    return {
      portfolioValue,
      tradedValue: Number(tradedValue.toFixed(2)),
      twoWayTurnover: Number(twoWayTurnover.toFixed(6)),
      linearCostAmount: Number(linearCostAmount.toFixed(2)),
      marketImpactCostAmount: Number(impactCostAmount.toFixed(2)),
      totalCostAmount: Number(totalCostAmount.toFixed(2)),
      totalCostBps: Number(totalCostBps.toFixed(2)),
      costBreakdownBps: {
        linearBps,
        spreadBps,
        marketImpactBps: Number((impactRate * 10000).toFixed(2))
      }
    };
  }
}
