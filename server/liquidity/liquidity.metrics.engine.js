/**
 * Phase 18 — Institutional Liquidity Metrics Engine
 * Calculates ADV, Dollar ADV, Bid-Ask Spread, Participation Rate, Liquidity Tier & Score.
 */

import { LiquidityStatus, LiquidityTier, LiquidityDataStatus, ValueStatus, deepFreeze } from './liquidity.types.js';
import { LIQUIDITY_POLICY_V1 } from './liquidity.config.js';
import { LiquidityValidationEngine } from './liquidity.validation.engine.js';

export class LiquidityMetricsEngine {
  /**
   * Calculates Average Daily Volume (ADV) from an array of valid trading volume observations.
   */
  static calculateAdv(volumeObservations, window = '20D') {
    if (!Array.isArray(volumeObservations) || volumeObservations.length === 0) {
      return deepFreeze({
        status: LiquidityStatus.UNAVAILABLE,
        valueStatus: ValueStatus.UNAVAILABLE,
        reason: 'Volume observations missing or empty'
      });
    }

    const windowSizes = { '5D': 5, '20D': 20, '30D': 30, '60D': 60, '90D': 90 };
    const maxObservations = windowSizes[window] || 20;

    const validVolumes = [];
    const includedObservationIds = [];

    for (let i = 0; i < volumeObservations.length; i++) {
      const obs = volumeObservations[i];
      const vol = typeof obs === 'object' && obs !== null ? obs.volume : obs;
      const obsId = typeof obs === 'object' && obs !== null ? (obs.observationId || obs.evidenceId || `OBS-VOL-${i}`) : `OBS-VOL-${i}`;
      const numVol = Number(vol);
      if (!isNaN(numVol) && isFinite(numVol) && numVol >= 0) {
        validVolumes.push(numVol);
        includedObservationIds.push(obsId);
      }
    }

    if (validVolumes.length === 0) {
      return deepFreeze({
        status: LiquidityStatus.UNAVAILABLE,
        valueStatus: ValueStatus.UNAVAILABLE,
        reason: 'No valid positive volume observations found'
      });
    }

    // Take the most recent N observations up to window
    const slice = validVolumes.slice(-maxObservations);
    const sliceIds = includedObservationIds.slice(-maxObservations);
    const sum = slice.reduce((acc, v) => acc + v, 0);
    const adv = sum / slice.length;

    if (adv <= 0) {
      return deepFreeze({
        status: LiquidityStatus.INVALID_ADV,
        valueStatus: ValueStatus.UNAVAILABLE,
        reason: 'Calculated ADV is zero or negative'
      });
    }

    return deepFreeze({
      status: LiquidityStatus.PASS,
      adv,
      window,
      observationCount: slice.length,
      requestedWindow: window,
      includedObservationIds: sliceIds,
      methodologyVersion: 'ADV_CALC_V1.0',
      valueStatus: ValueStatus.DERIVED,
      inputStatuses: [ValueStatus.REAL_DATA],
      dataStatus: LiquidityDataStatus.REAL_DATA
    });
  }

  /**
   * Calculates Dollar ADV = ADV * referencePrice
   */
  static calculateDollarAdv(adv, referencePrice, options = {}) {
    const advVal = LiquidityValidationEngine.validateAdv(adv);
    if (!advVal.isValid) return advVal;

    const priceVal = LiquidityValidationEngine.validatePrice(referencePrice);
    if (!priceVal.isValid) return priceVal;

    const dollarAdv = advVal.adv * priceVal.price;
    return deepFreeze({
      status: LiquidityStatus.PASS,
      adv: advVal.adv,
      price: priceVal.price,
      dollarAdv,
      priceObservationId: options.priceObservationId || 'OBS-PRICE-REF',
      methodologyVersion: 'DOLLAR_ADV_V1.0',
      valueStatus: ValueStatus.DERIVED,
      inputs: {
        adv: ValueStatus.DERIVED,
        referencePrice: ValueStatus.REAL_DATA
      },
      inputStatuses: [ValueStatus.DERIVED, ValueStatus.REAL_DATA],
      dataStatus: LiquidityDataStatus.REAL_DATA
    });
  }

  /**
   * Calculates Bid-Ask Spread, Mid Price, and Spread in Basis Points.
   */
  static calculateSpread(bid, ask, options = {}) {
    const quoteVal = LiquidityValidationEngine.validateQuote(bid, ask);
    if (!quoteVal.isValid) return quoteVal;

    const spread = quoteVal.ask - quoteVal.bid;
    const mid = quoteVal.mid;
    const spreadBps = (spread / mid) * 10000;

    return deepFreeze({
      status: LiquidityStatus.PASS,
      bid: quoteVal.bid,
      ask: quoteVal.ask,
      mid,
      spread,
      spreadBps,
      halfSpreadBps: spreadBps / 2,
      bidObservationId: options.bidObservationId || 'OBS-QUOTE-BID',
      askObservationId: options.askObservationId || 'OBS-QUOTE-ASK',
      methodologyVersion: 'SPREAD_CALC_V1.0',
      valueStatus: ValueStatus.DERIVED,
      inputs: {
        bid: ValueStatus.REAL_DATA,
        ask: ValueStatus.REAL_DATA
      },
      inputStatuses: [ValueStatus.REAL_DATA, ValueStatus.REAL_DATA],
      dataStatus: LiquidityDataStatus.REAL_DATA
    });
  }

  /**
   * Calculates Participation Rate for a proposed trade quantity.
   */
  static calculateParticipation(orderQuantity, adv) {
    const advVal = LiquidityValidationEngine.validateAdv(adv);
    if (!advVal.isValid) return advVal;

    if (orderQuantity === undefined || orderQuantity === null) {
      return deepFreeze({
        status: LiquidityStatus.INVALID_QUANTITY,
        valueStatus: ValueStatus.UNAVAILABLE,
        reason: 'Order quantity missing'
      });
    }

    const numQty = Number(orderQuantity);
    if (isNaN(numQty) || !isFinite(numQty) || numQty < 0) {
      return deepFreeze({
        status: LiquidityStatus.INVALID_QUANTITY,
        valueStatus: ValueStatus.UNAVAILABLE,
        reason: 'Order quantity must be a non-negative finite number'
      });
    }

    const participationRate = numQty / advVal.adv;
    const participationPercent = participationRate * 100;

    return deepFreeze({
      status: LiquidityStatus.PASS,
      orderQuantity: numQty,
      adv: advVal.adv,
      participationRate,
      participationPercent,
      methodologyVersion: 'PARTICIPATION_V1.0',
      valueStatus: ValueStatus.DERIVED,
      inputStatuses: [ValueStatus.CONFIGURED, ValueStatus.DERIVED],
      dataStatus: LiquidityDataStatus.REAL_DATA
    });
  }

  /**
   * Determines Liquidity Tier based on Dollar ADV and Spread Bps.
   */
  static determineLiquidityTier(dollarAdv, spreadBps, policy = LIQUIDITY_POLICY_V1) {
    if (dollarAdv === undefined || dollarAdv === null || isNaN(Number(dollarAdv)) || Number(dollarAdv) <= 0) {
      return LiquidityTier.UNKNOWN;
    }

    const numDollarAdv = Number(dollarAdv);
    const numSpreadBps = spreadBps !== undefined && spreadBps !== null ? Number(spreadBps) : 0;
    const tiers = policy.tierThresholds;

    if (numDollarAdv >= tiers[LiquidityTier.TIER_1_HIGH_LIQUIDITY].minDollarAdv &&
        numSpreadBps <= tiers[LiquidityTier.TIER_1_HIGH_LIQUIDITY].maxSpreadBps) {
      return LiquidityTier.TIER_1_HIGH_LIQUIDITY;
    }
    if (numDollarAdv >= tiers[LiquidityTier.TIER_2_MODERATE_LIQUIDITY].minDollarAdv &&
        numSpreadBps <= tiers[LiquidityTier.TIER_2_MODERATE_LIQUIDITY].maxSpreadBps) {
      return LiquidityTier.TIER_2_MODERATE_LIQUIDITY;
    }
    if (numDollarAdv >= tiers[LiquidityTier.TIER_3_LOW_LIQUIDITY].minDollarAdv &&
        numSpreadBps <= tiers[LiquidityTier.TIER_3_LOW_LIQUIDITY].maxSpreadBps) {
      return LiquidityTier.TIER_3_LOW_LIQUIDITY;
    }

    return LiquidityTier.TIER_4_ILLIQUID;
  }

  /**
   * Deterministic Liquidity Score (0 - 100).
   * Fully reproducible additive scoring model with explicit weights and bounds.
   */
  static calculateLiquidityScore(dollarAdv, spreadBps, marketCap = null) {
    if (dollarAdv === undefined || dollarAdv === null || isNaN(Number(dollarAdv)) || Number(dollarAdv) <= 0) {
      return deepFreeze({
        status: LiquidityStatus.UNAVAILABLE,
        scoreStatus: LiquidityStatus.UNAVAILABLE,
        valueStatus: ValueStatus.UNAVAILABLE,
        reason: 'INSUFFICIENT_LIQUIDITY_DATA: Dollar ADV is missing or invalid'
      });
    }

    const dAdv = Number(dollarAdv);

    // Component 1: Dollar ADV score (0 - 50 pts, weight: 0.50)
    // Formula: min(50, log10(max(1, DollarADV / 100000)) * 12.5)
    // Scale: $100k -> 0 pts, $1M -> 12.5 pts, $10M -> 25.0 pts, $100M -> 37.5 pts, >=$1B -> 50 pts
    let advRaw = Math.log10(Math.max(1, dAdv / 100000)) * 12.5;
    let advScore = Math.min(50, Math.max(0, advRaw));

    // Component 2: Spread score (0 - 35 pts, weight: 0.35)
    // Formula: max(0, min(35, 35 - (SpreadBps * 0.35)))
    // Scale: 0 bps -> 35 pts, 10 bps -> 31.5 pts, 50 bps -> 17.5 pts, >=100 bps -> 0 pts
    let spreadScore = 25.0; // Default when spread is not provided
    if (spreadBps !== null && spreadBps !== undefined && !isNaN(Number(spreadBps))) {
      const s = Number(spreadBps);
      spreadScore = Math.max(0, Math.min(35, 35 - (s * 0.35)));
    }

    // Component 3: Market cap ground (0 - 15 pts, weight: 0.15)
    // Scale: Large Cap (>= $10B) -> 15 pts, Mid Cap (>= $2B) -> 10 pts, Small Cap -> 5 pts
    let mktCapScore = 10.0;
    if (marketCap !== null && marketCap !== undefined && Number(marketCap) > 0) {
      const cap = Number(marketCap);
      mktCapScore = cap >= 10000000000 ? 15.0 : (cap >= 2000000000 ? 10.0 : 5.0);
    }

    const totalRaw = advScore + spreadScore + mktCapScore;
    const totalScore = Math.min(100, Math.max(0, Math.round(totalRaw * 10) / 10));

    return deepFreeze({
      status: LiquidityStatus.PASS,
      scoreStatus: LiquidityStatus.PASS,
      score: totalScore,
      scoreVersion: 'LIQUIDITY_SCORE_V1',
      methodologyVersion: 'LIQUIDITY_SCORE_V1.0',
      valueStatus: ValueStatus.DERIVED,
      inputs: {
        dollarAdv: ValueStatus.DERIVED,
        spreadBps: ValueStatus.DERIVED,
        marketCap: ValueStatus.REAL_DATA,
        methodology: ValueStatus.CONFIGURED
      },
      inputStatuses: [ValueStatus.DERIVED, ValueStatus.DERIVED, ValueStatus.REAL_DATA],
      components: {
        advComponent: {
          points: Math.round(advScore * 10) / 10,
          maxPoints: 50,
          weight: 0.50,
          formula: 'min(50, log10(max(1, DollarADV / 100000)) * 12.5)'
        },
        spreadComponent: {
          points: Math.round(spreadScore * 10) / 10,
          maxPoints: 35,
          weight: 0.35,
          formula: 'max(0, min(35, 35 - (SpreadBps * 0.35)))'
        },
        mktCapComponent: {
          points: mktCapScore,
          maxPoints: 15,
          weight: 0.15,
          formula: 'cap >= $10B ? 15 : (cap >= $2B ? 10 : 5)'
        },
        // Backward-compatible aliases
        advScore: Math.round(advScore * 10) / 10,
        spreadScore: Math.round(spreadScore * 10) / 10,
        mktCapScore
      },
      componentWeights: {
        adv: 0.50,
        spread: 0.35,
        marketCap: 0.15
      },
      normalizationRules: 'Bounded additive component sum clamped to [0, 100]',
      thresholds: {
        maxAdvPointsThreshold: 1000000000,
        zeroSpreadPointsThreshold: 100.0
      },
      missingDataPolicy: 'REJECT_MISSING_ADV',
      dataStatus: LiquidityDataStatus.ESTIMATED
    });
  }
}
