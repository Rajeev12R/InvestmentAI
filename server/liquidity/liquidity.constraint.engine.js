/**
 * Phase 18 — Institutional Liquidity Constraint Engine
 * Generates hard and soft liquidity constraints for portfolio construction and sizing.
 */

import { LiquidityStatus, LiquidityDataStatus, deepFreeze } from './liquidity.types.js';
import { LIQUIDITY_POLICY_V1 } from './liquidity.config.js';
import { LiquidityValidationEngine } from './liquidity.validation.engine.js';

export class LiquidityConstraintEngine {
  /**
   * Generates maximum allowable position size and weight based on liquidity constraints.
   */
  static generatePositionConstraints(params) {
    const {
      ticker,
      dollarAdv,
      portfolioValue,
      policy = LIQUIDITY_POLICY_V1,
      maxParticipationRate = null,
      maxLiquidationDays = null
    } = params;

    const advVal = LiquidityValidationEngine.validateAdv(dollarAdv);
    if (!advVal.isValid) return advVal;

    const numPortVal = Number(portfolioValue);
    if (isNaN(numPortVal) || numPortVal <= 0) {
      return deepFreeze({
        status: LiquidityStatus.INVALID_INPUT,
        reason: 'Portfolio value must be a strictly positive number'
      });
    }

    const maxPart = maxParticipationRate || policy.defaultMaxParticipationRate || 0.10;
    const maxDays = maxLiquidationDays || policy.defaultMaxLiquidationDays || 5;

    const dAdv = advVal.adv;
    const maxDailyTradeNotional = dAdv * maxPart;
    const maxPositionNotional = maxDailyTradeNotional * maxDays;
    const maxWeight = Math.min(1.0, maxPositionNotional / numPortVal);

    return deepFreeze({
      status: LiquidityStatus.PASS,
      ticker: ticker || 'UNKNOWN',
      dollarAdv: dAdv,
      portfolioValue: numPortVal,
      constraints: {
        maxParticipationRate: maxPart,
        maxLiquidationDays: maxDays,
        maxDailyTradeNotional: Math.round(maxDailyTradeNotional * 100) / 100,
        maxPositionNotional: Math.round(maxPositionNotional * 100) / 100,
        maxAllowedWeight: Math.round(maxWeight * 10000) / 10000,
        maxAllowedWeightPercent: Math.round(maxWeight * 10000) / 100
      },
      formula: 'MaxPositionNotional = DollarADV * MaxParticipationRate * MaxLiquidationDays',
      dataStatus: LiquidityDataStatus.CONFIGURED
    });
  }

  /**
   * Validates whether a proposed position size violates liquidity constraints.
   */
  static validatePositionSize(params) {
    const {
      ticker,
      proposedNotional,
      dollarAdv,
      portfolioValue,
      policy = LIQUIDITY_POLICY_V1
    } = params;

    const constraint = this.generatePositionConstraints({
      ticker,
      dollarAdv,
      portfolioValue,
      policy
    });

    if (constraint.status !== LiquidityStatus.PASS) return constraint;

    const numNotional = Number(proposedNotional);
    if (isNaN(numNotional) || numNotional < 0) {
      return deepFreeze({
        status: LiquidityStatus.INVALID_INPUT,
        reason: 'Proposed notional must be a non-negative number'
      });
    }

    const maxAllowed = constraint.constraints.maxPositionNotional;
    const isCompliant = numNotional <= maxAllowed;
    const excessNotional = isCompliant ? 0 : numNotional - maxAllowed;

    return deepFreeze({
      status: isCompliant ? LiquidityStatus.PASS : LiquidityStatus.LIQUIDITY_INSUFFICIENT,
      isCompliant,
      ticker: ticker || 'UNKNOWN',
      proposedNotional: numNotional,
      maxAllowedNotional: maxAllowed,
      excessNotional: Math.round(excessNotional * 100) / 100,
      constraintDetails: constraint.constraints,
      dataStatus: LiquidityDataStatus.CONFIGURED
    });
  }
}
