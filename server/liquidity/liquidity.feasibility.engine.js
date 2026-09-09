/**
 * Phase 18 — Institutional Execution Feasibility Engine
 * Evaluates trade feasibility: FEASIBLE, CONDITIONALLY_FEASIBLE, INFEASIBLE, UNKNOWN.
 */

import { ExecutionFeasibility, LiquidityStatus, LiquidityDataStatus, deepFreeze } from './liquidity.types.js';
import { LIQUIDITY_POLICY_V1 } from './liquidity.config.js';
import { LiquidityValidationEngine } from './liquidity.validation.engine.js';
import { LiquidityHorizonEngine } from './liquidity.horizon.engine.js';
import { LiquidityCostEngine } from './liquidity.cost.engine.js';

export class LiquidityFeasibilityEngine {
  /**
   * Evaluates feasibility for a proposed trade order.
   */
  static evaluateFeasibility(params) {
    const {
      ticker,
      orderQuantity,
      orderNotional,
      adv,
      dollarAdv,
      bid,
      ask,
      referencePrice = 100.0,
      policy = LIQUIDITY_POLICY_V1,
      maxAllowedParticipationRate = null,
      maxAllowedTradingDays = null
    } = params;

    // 1. Validate inputs
    const notionalVal = LiquidityValidationEngine.validateOrder(orderQuantity, orderNotional, referencePrice);
    if (!notionalVal.isValid) {
      return deepFreeze({
        feasibility: ExecutionFeasibility.UNKNOWN,
        status: notionalVal.status,
        reason: notionalVal.reason,
        dataStatus: LiquidityDataStatus.UNAVAILABLE
      });
    }

    const qty = notionalVal.quantity;
    const notional = notionalVal.notional;

    // 2. Validate ADV
    const effectiveAdv = adv || (dollarAdv && referencePrice ? dollarAdv / referencePrice : null);
    const advVal = LiquidityValidationEngine.validateAdv(effectiveAdv);
    if (!advVal.isValid) {
      return deepFreeze({
        feasibility: ExecutionFeasibility.UNKNOWN,
        status: advVal.status,
        reason: advVal.reason,
        dataStatus: LiquidityDataStatus.UNAVAILABLE
      });
    }

    // 3. Validate Quote if provided
    let spreadBps = params.spreadBps !== undefined && params.spreadBps !== null ? Number(params.spreadBps) : 15.0;
    if (bid !== undefined && ask !== undefined && bid !== null && ask !== null) {
      const quoteVal = LiquidityValidationEngine.validateQuote(bid, ask);
      if (!quoteVal.isValid) {
        return deepFreeze({
          feasibility: ExecutionFeasibility.INFEASIBLE,
          status: quoteVal.status,
          reason: `Invalid quote: ${quoteVal.reason}`,
          dataStatus: LiquidityDataStatus.UNAVAILABLE
        });
      }
      spreadBps = ((quoteVal.ask - quoteVal.bid) / quoteVal.mid) * 10000;
    }

    // 4. Calculate Horizon
    const maxPart = maxAllowedParticipationRate || policy.defaultMaxParticipationRate || 0.10;
    const maxDays = maxAllowedTradingDays || policy.defaultMaxLiquidationDays || 5;

    const horizonResult = LiquidityHorizonEngine.calculateLiquidationHorizon({
      orderQuantity: qty,
      orderNotional: notional,
      adv: advVal.adv,
      dollarAdv: dollarAdv || (advVal.adv * referencePrice),
      referencePrice,
      maxParticipationRate: maxPart,
      policy
    });

    if (horizonResult.status !== LiquidityStatus.PASS) {
      return deepFreeze({
        feasibility: ExecutionFeasibility.INFEASIBLE,
        status: horizonResult.status,
        reason: horizonResult.reason,
        dataStatus: LiquidityDataStatus.UNAVAILABLE
      });
    }

    // 5. Calculate Cost
    const costResult = LiquidityCostEngine.calculateTradingCost({
      orderNotional: notional,
      dollarAdv: dollarAdv || (advVal.adv * referencePrice),
      spreadBps,
      policy
    });

    // 6. Feasibility Decision Matrix
    const participationRate = qty / advVal.adv;
    const requiredDays = horizonResult.requiredTradingDays;

    let feasibility = ExecutionFeasibility.FEASIBLE;
    const constraints = [];

    // Constraint 1: Single-day participation limit check
    if (participationRate > maxPart) {
      constraints.push({
        constraint: 'SINGLE_DAY_PARTICIPATION_EXCEEDED',
        limit: maxPart,
        actual: Math.round(participationRate * 10000) / 10000,
        message: `Order requires ${(participationRate * 100).toFixed(2)}% participation (exceeds single-day limit of ${(maxPart * 100)}%). Multi-day execution required.`
      });
    }

    // Constraint 2: Total liquidation horizon limit check
    if (requiredDays > maxDays) {
      feasibility = ExecutionFeasibility.INFEASIBLE;
      constraints.push({
        constraint: 'MAX_LIQUIDATION_DAYS_EXCEEDED',
        limit: maxDays,
        actual: requiredDays,
        message: `Order requires ${requiredDays} trading days (exceeds max allowed horizon of ${maxDays} days).`
      });
    } else if (requiredDays > 1) {
      feasibility = ExecutionFeasibility.CONDITIONALLY_FEASIBLE;
    }

    // Constraint 3: Spread friction check
    if (spreadBps > policy.maxAcceptableSpreadBps) {
      if (feasibility === ExecutionFeasibility.FEASIBLE) {
        feasibility = ExecutionFeasibility.CONDITIONALLY_FEASIBLE;
      }
      constraints.push({
        constraint: 'WIDE_SPREAD_FRICTION',
        limit: policy.maxAcceptableSpreadBps,
        actual: Math.round(spreadBps * 100) / 100,
        message: `Bid-ask spread is ${spreadBps.toFixed(1)} bps (exceeds normal threshold of ${policy.maxAcceptableSpreadBps} bps).`
      });
    }

    return deepFreeze({
      status: LiquidityStatus.PASS,
      ticker: ticker || 'UNKNOWN',
      feasibility,
      orderQuantity: qty,
      orderNotional: notional,
      adv: advVal.adv,
      participationRate: Math.round(participationRate * 10000) / 10000,
      requiredTradingDays: requiredDays,
      totalEstimatedCostBps: costResult.totalCostBps,
      totalEstimatedCost: costResult.totalEstimatedCost,
      constraints,
      dataStatus: LiquidityDataStatus.ESTIMATED
    });
  }
}
