import { OptimizationStatus } from "./portfolioConstruction.types.js";
import { PORTFOLIO_CONSTRAINT_CONFIG_V1 } from "./portfolioConstructionConfig.js";

/**
 * Deterministic Liquidity Engine for Phase 14
 */
export class LiquidityEngine {
  /**
   * Evaluate liquidity feasibility for target weights against Average Daily Volume (ADV).
   */
  static evaluateLiquidity(targetWeights = {}, liquidityMap = {}, portfolioValue = 1000000, config = PORTFOLIO_CONSTRAINT_CONFIG_V1) {
    const maxParticipation = config.defaultMaxADVParticipation || 0.10; // default 10%
    const results = [];
    let isFullyLiquid = true;
    let maxDaysToLiquidate = 0;

    for (const [ticker, weight] of Object.entries(targetWeights)) {
      if (ticker === "CASH") continue;
      const posValue = weight * portfolioValue;
      const adv = liquidityMap[ticker]?.adv; // Average Daily Volume in currency terms (shares * price or dollar volume)

      if (adv === undefined || adv === null || isNaN(adv) || adv <= 0) {
        isFullyLiquid = false;
        results.push({
          ticker,
          weight,
          positionValue: posValue,
          adv: null,
          participationRate: null,
          requiredTradingDays: null,
          status: OptimizationStatus.UNAVAILABLE,
          reasonCode: "LIQUIDITY_DATA_UNAVAILABLE"
        });
        continue;
      }

      const participationRate = adv > 0 ? posValue / adv : 1.0;
      const allowedDaily = adv * maxParticipation;
      const requiredDays = allowedDaily > 0 ? posValue / allowedDaily : 999;

      if (requiredDays > maxDaysToLiquidate) {
        maxDaysToLiquidate = requiredDays;
      }

      const exceedsParticipation = participationRate > maxParticipation;
      if (exceedsParticipation) {
        isFullyLiquid = false;
      }

      results.push({
        ticker,
        weight: Number(weight.toFixed(6)),
        positionValue: Number(posValue.toFixed(2)),
        adv: Number(adv.toFixed(2)),
        participationRate: Number(participationRate.toFixed(4)),
        maxAllowedParticipation: maxParticipation,
        requiredTradingDays: Number(requiredDays.toFixed(2)),
        isFeasible: !exceedsParticipation,
        status: exceedsParticipation ? OptimizationStatus.FEASIBLE : OptimizationStatus.OPTIMAL
      });
    }

    return {
      isFullyLiquid,
      maxDaysToLiquidate: Number(maxDaysToLiquidate.toFixed(2)),
      positions: results
    };
  }
}
