/**
 * Phase 18 — Institutional Transaction Cost Engine
 * Componentized implementation costs: Explicit commissions, spread cost, market impact, fees, and taxes.
 */

import { LiquidityStatus, TradingSide, CostComponentStatus, LiquidityDataStatus, ValueStatus, deepFreeze } from './liquidity.types.js';
import { LIQUIDITY_POLICY_V1 } from './liquidity.config.js';
import { LiquidityImpactEngine } from './liquidity.impact.engine.js';
import { LiquidityValidationEngine } from './liquidity.validation.engine.js';

export class LiquidityCostEngine {
  /**
   * Calculates componentized estimated trading cost for a trade.
   */
  static calculateTradingCost(params) {
    const {
      orderNotional,
      dollarAdv,
      spreadBps = 10.0,
      side = TradingSide.BUY,
      direction = 'ONE_WAY',
      jurisdiction = 'US',
      policy = LIQUIDITY_POLICY_V1,
      customCommissionBps = null
    } = params;

    const notionalVal = LiquidityValidationEngine.validateOrder(null, orderNotional, 1.0);
    if (!notionalVal.isValid) return { ...notionalVal, valueStatus: ValueStatus.UNAVAILABLE };

    const advVal = LiquidityValidationEngine.validateAdv(dollarAdv);
    if (!advVal.isValid) return { ...advVal, valueStatus: ValueStatus.UNAVAILABLE };

    const notional = notionalVal.notional;
    const dAdv = advVal.adv;
    const isRoundTrip = direction === 'ROUND_TRIP' || side === TradingSide.ROUND_TRIP;

    // 1. Explicit Commission & Brokerage Fees
    let commBps = customCommissionBps !== null ? Number(customCommissionBps) :
      (jurisdiction === 'IN' ? policy.explicitCosts.inEquityCommissionBps : policy.explicitCosts.usEquityCommissionBps);
    if (isRoundTrip) commBps *= 2;
    const explicitCommissionCost = notional * (commBps / 10000);

    // 2. Spread Cost (One-way = half spread; Round-trip = full spread)
    const rawSpreadBps = Number(spreadBps) || 0;
    const effectiveSpreadBps = isRoundTrip ? rawSpreadBps : (rawSpreadBps / 2);
    const spreadCost = notional * (effectiveSpreadBps / 10000);

    // 3. Market Impact Cost
    const impactResult = LiquidityImpactEngine.calculateMarketImpact(notional, dAdv, { policy });
    const marketImpactBps = isRoundTrip ? (impactResult.impactBps * 2) : impactResult.impactBps;
    const marketImpactCost = notional * (marketImpactBps / 10000);

    // 4. Exchange & Regulatory Fees
    let exchangeFeeBps = jurisdiction === 'US' ? policy.explicitCosts.usExchangeFeeBps : 0.5;
    if (isRoundTrip) exchangeFeeBps *= 2;
    const exchangeFeeCost = notional * (exchangeFeeBps / 10000);

    // 5. Transaction Taxes (e.g. STT in India 0.1% on delivery/equity trades)
    let taxBps = 0;
    if (jurisdiction === 'IN') {
      taxBps = policy.explicitCosts.inSttBps; // 10 bps
      if (isRoundTrip) taxBps *= 2;
    }
    const taxCost = notional * (taxBps / 10000);

    // Total Estimated Cost
    const totalCostBps = commBps + effectiveSpreadBps + marketImpactBps + exchangeFeeBps + taxBps;
    const totalEstimatedCost = explicitCommissionCost + spreadCost + marketImpactCost + exchangeFeeCost + taxCost;

    return deepFreeze({
      status: LiquidityStatus.PASS,
      orderNotional: notional,
      dollarAdv: dAdv,
      side,
      direction: isRoundTrip ? 'ROUND_TRIP' : 'ONE_WAY',
      jurisdiction,
      components: {
        explicitCommission: {
          bps: Math.round(commBps * 100) / 100,
          cost: Math.round(explicitCommissionCost * 100) / 100,
          status: CostComponentStatus.CONFIGURED
        },
        spreadCost: {
          bps: Math.round(effectiveSpreadBps * 100) / 100,
          cost: Math.round(spreadCost * 100) / 100,
          status: CostComponentStatus.ESTIMATED
        },
        marketImpact: {
          bps: Math.round(marketImpactBps * 100) / 100,
          cost: Math.round(marketImpactCost * 100) / 100,
          status: CostComponentStatus.ESTIMATED
        },
        exchangeFees: {
          bps: Math.round(exchangeFeeBps * 100) / 100,
          cost: Math.round(exchangeFeeCost * 100) / 100,
          status: CostComponentStatus.CONFIGURED
        },
        transactionTaxes: {
          bps: Math.round(taxBps * 100) / 100,
          cost: Math.round(taxCost * 100) / 100,
          status: CostComponentStatus.CONFIGURED
        }
      },
      totalCostBps: Math.round(totalCostBps * 100) / 100,
      totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
      valueStatus: ValueStatus.MODEL_ESTIMATE,
      inputStatuses: [ValueStatus.CONFIGURED, ValueStatus.DERIVED, ValueStatus.MODEL_ESTIMATE],
      dataStatus: LiquidityDataStatus.ESTIMATED
    });
  }
}
