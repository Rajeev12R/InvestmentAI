/**
 * Phase 18 — Institutional Liquidation Horizon Engine
 * Deterministic liquidation horizon calculation based on ADV and max participation limits.
 */

import { LiquidityStatus, LiquidityDataStatus, ValueStatus, deepFreeze } from './liquidity.types.js';
import { LIQUIDITY_POLICY_V1 } from './liquidity.config.js';
import { LiquidityValidationEngine } from './liquidity.validation.engine.js';

export class LiquidityHorizonEngine {
  /**
   * Calculates required trading days to execute an order without exceeding max participation rate.
   */
  static calculateLiquidationHorizon(params) {
    const {
      orderQuantity,
      orderNotional,
      adv,
      dollarAdv,
      referencePrice,
      maxParticipationRate = LIQUIDITY_POLICY_V1.defaultMaxParticipationRate,
      policy = LIQUIDITY_POLICY_V1
    } = params;

    const notionalVal = LiquidityValidationEngine.validateOrder(orderQuantity, orderNotional, referencePrice || 1.0);
    if (!notionalVal.isValid) return { ...notionalVal, valueStatus: ValueStatus.UNAVAILABLE };

    const qty = notionalVal.quantity;
    const notional = notionalVal.notional;

    // Check ADV
    let effectiveAdv = adv;
    if (!effectiveAdv && dollarAdv && referencePrice) {
      effectiveAdv = dollarAdv / referencePrice;
    }
    const advVal = LiquidityValidationEngine.validateAdv(effectiveAdv);
    if (!advVal.isValid) return { ...advVal, valueStatus: ValueStatus.UNAVAILABLE };

    const participationLimit = Number(maxParticipationRate);
    if (isNaN(participationLimit) || participationLimit <= 0 || participationLimit > 1.0) {
      return deepFreeze({
        status: LiquidityStatus.INVALID_INPUT,
        valueStatus: ValueStatus.UNAVAILABLE,
        reason: 'Max participation rate must be strictly between 0 and 1.0 (e.g. 0.10 for 10%)'
      });
    }

    const allowedDailyQuantity = advVal.adv * participationLimit;
    if (allowedDailyQuantity <= 0) {
      return deepFreeze({
        status: LiquidityStatus.LIQUIDITY_INSUFFICIENT,
        valueStatus: ValueStatus.UNAVAILABLE,
        reason: 'Allowed daily quantity is zero or negative'
      });
    }

    const exactDays = qty / allowedDailyQuantity;
    const requiredTradingDays = Math.ceil(exactDays);

    // Build deterministic daily schedule
    const schedule = [];
    let remainingQty = qty;
    for (let day = 1; day <= requiredTradingDays; day++) {
      const dayQty = Math.min(remainingQty, allowedDailyQuantity);
      remainingQty -= dayQty;
      schedule.push({
        day,
        tradeQuantity: Math.round(dayQty * 100) / 100,
        tradeNotional: referencePrice ? Math.round(dayQty * referencePrice * 100) / 100 : null,
        participationPercent: Math.round((dayQty / advVal.adv) * 10000) / 100,
        remainingQuantity: Math.max(0, Math.round(remainingQty * 100) / 100)
      });
    }

    const maxAllowedDays = policy.defaultMaxLiquidationDays || 5;
    const isFeasibleWithinLimit = requiredTradingDays <= maxAllowedDays;

    return deepFreeze({
      status: LiquidityStatus.PASS,
      orderQuantity: qty,
      orderNotional: notional,
      adv: advVal.adv,
      maxParticipationRate: participationLimit,
      allowedDailyQuantity: Math.round(allowedDailyQuantity * 100) / 100,
      exactDays: Math.round(exactDays * 100) / 100,
      requiredTradingDays,
      isFeasibleWithinLimit,
      maxAllowedDays,
      schedule,
      valueStatus: ValueStatus.DERIVED,
      inputStatuses: [ValueStatus.CONFIGURED, ValueStatus.DERIVED, ValueStatus.CONFIGURED],
      dataStatus: LiquidityDataStatus.ESTIMATED
    });
  }
}
