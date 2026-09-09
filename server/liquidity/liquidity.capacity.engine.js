/**
 * Phase 18 — Institutional Portfolio & Strategy Capacity Engine
 * Calculates maximum feasible notional, position size, daily trade notional, and turnover capacity.
 */

import { LiquidityStatus, LiquidityDataStatus, ValueStatus, deepFreeze } from './liquidity.types.js';
import { LIQUIDITY_POLICY_V1 } from './liquidity.config.js';
import { LiquidityValidationEngine } from './liquidity.validation.engine.js';

export class LiquidityCapacityEngine {
  /**
   * Calculates capacity limits for a single security position.
   */
  static calculatePositionCapacity(dollarAdv, options = {}) {
    const advVal = LiquidityValidationEngine.validateAdv(dollarAdv);
    if (!advVal.isValid) return { ...advVal, valueStatus: ValueStatus.UNAVAILABLE };

    const policy = options.policy || LIQUIDITY_POLICY_V1;
    const maxParticipation = options.maxParticipationRate || policy.defaultMaxParticipationRate || 0.10;
    const maxLiquidationDays = options.maxLiquidationDays || policy.defaultMaxLiquidationDays || 5;

    const dAdv = advVal.adv;
    const maxDailyTradeNotional = dAdv * maxParticipation;
    const maxPositionNotional = maxDailyTradeNotional * maxLiquidationDays;

    return deepFreeze({
      status: LiquidityStatus.PASS,
      dollarAdv: dAdv,
      maxParticipationRate: maxParticipation,
      maxLiquidationDays,
      maxDailyTradeNotional: Math.round(maxDailyTradeNotional * 100) / 100,
      maxPositionNotional: Math.round(maxPositionNotional * 100) / 100,
      valueStatus: ValueStatus.DERIVED,
      inputStatuses: [ValueStatus.DERIVED, ValueStatus.CONFIGURED],
      dataStatus: LiquidityDataStatus.ESTIMATED
    });
  }

  /**
   * Calculates aggregate strategy capacity for a basket of target weights.
   */
  static calculateStrategyCapacity(positions, options = {}) {
    if (!Array.isArray(positions) || positions.length === 0) {
      return deepFreeze({
        status: LiquidityStatus.INVALID_INPUT,
        valueStatus: ValueStatus.UNAVAILABLE,
        reason: 'Positions array is missing or empty'
      });
    }

    const policy = options.policy || LIQUIDITY_POLICY_V1;
    const maxParticipation = options.maxParticipationRate || policy.defaultMaxParticipationRate || 0.10;
    const maxLiquidationDays = options.maxLiquidationDays || policy.defaultMaxLiquidationDays || 5;

    const capacityByPosition = [];
    let minImpliedPortfolioCapacity = Infinity;
    let bottleneckSecurity = null;

    for (const pos of positions) {
      const ticker = pos.ticker || 'UNKNOWN';
      const weight = Number(pos.weight);
      const dollarAdv = Number(pos.dollarAdv);

      if (isNaN(weight) || weight <= 0) continue;
      if (isNaN(dollarAdv) || dollarAdv <= 0) {
        return deepFreeze({
          status: LiquidityStatus.UNAVAILABLE,
          valueStatus: ValueStatus.UNAVAILABLE,
          reason: `Dollar ADV missing or invalid for ticker ${ticker}`
        });
      }

      const maxPosNotional = dollarAdv * maxParticipation * maxLiquidationDays;
      const impliedPortfolioCap = maxPosNotional / weight;

      capacityByPosition.push({
        ticker,
        weight,
        dollarAdv,
        maxPositionNotional: Math.round(maxPosNotional * 100) / 100,
        impliedPortfolioCapacity: Math.round(impliedPortfolioCap * 100) / 100
      });

      if (impliedPortfolioCap < minImpliedPortfolioCapacity) {
        minImpliedPortfolioCapacity = impliedPortfolioCap;
        bottleneckSecurity = ticker;
      }
    }

    const maxFeasibleNotional = isFinite(minImpliedPortfolioCapacity) ?
      Math.round(minImpliedPortfolioCapacity * 100) / 100 : 0;

    return deepFreeze({
      status: LiquidityStatus.PASS,
      maxFeasibleNotional,
      bottleneckSecurity,
      positionCapacities: capacityByPosition,
      parameters: {
        maxParticipationRate: maxParticipation,
        maxLiquidationDays
      },
      valueStatus: ValueStatus.DERIVED,
      inputStatuses: [ValueStatus.DERIVED, ValueStatus.CONFIGURED],
      dataStatus: LiquidityDataStatus.ESTIMATED
    });
  }
}
