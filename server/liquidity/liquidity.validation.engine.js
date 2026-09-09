/**
 * Phase 18 — Institutional Liquidity Validation Engine
 * Validates quotes, prices, volumes, ADV, currency, and freshness.
 */

import { LiquidityStatus, DataFreshnessStatus, deepFreeze } from './liquidity.types.js';

export class LiquidityValidationEngine {
  /**
   * Validates a bid-ask quote.
   */
  static validateQuote(bid, ask) {
    if (bid === undefined || bid === null || ask === undefined || ask === null) {
      return deepFreeze({
        isValid: false,
        status: LiquidityStatus.UNAVAILABLE,
        reason: 'Bid or ask quote is missing'
      });
    }

    const numBid = Number(bid);
    const numAsk = Number(ask);

    if (isNaN(numBid) || isNaN(numAsk) || !isFinite(numBid) || !isFinite(numAsk)) {
      return deepFreeze({
        isValid: false,
        status: LiquidityStatus.INVALID_QUOTE,
        reason: 'Bid or ask is NaN or non-finite'
      });
    }

    if (numBid <= 0 || numAsk <= 0) {
      return deepFreeze({
        isValid: false,
        status: LiquidityStatus.INVALID_QUOTE,
        reason: 'Bid and ask quotes must be strictly positive'
      });
    }

    if (numAsk < numBid) {
      return deepFreeze({
        isValid: false,
        status: LiquidityStatus.INVALID_QUOTE,
        reason: 'Inverted quote: Ask price is lower than bid price'
      });
    }

    const mid = (numBid + numAsk) / 2;
    if (mid <= 0) {
      return deepFreeze({
        isValid: false,
        status: LiquidityStatus.INVALID_QUOTE,
        reason: 'Mid price must be strictly positive'
      });
    }

    return deepFreeze({
      isValid: true,
      status: LiquidityStatus.PASS,
      bid: numBid,
      ask: numAsk,
      mid
    });
  }

  /**
   * Validates ADV (Average Daily Volume).
   */
  static validateAdv(adv) {
    if (adv === undefined || adv === null) {
      return deepFreeze({
        isValid: false,
        status: LiquidityStatus.UNAVAILABLE,
        reason: 'ADV is missing'
      });
    }

    const numAdv = Number(adv);
    if (isNaN(numAdv) || !isFinite(numAdv) || numAdv <= 0) {
      return deepFreeze({
        isValid: false,
        status: LiquidityStatus.INVALID_ADV,
        reason: 'ADV must be a strictly positive finite number'
      });
    }

    return deepFreeze({
      isValid: true,
      status: LiquidityStatus.PASS,
      adv: numAdv
    });
  }

  /**
   * Validates reference price.
   */
  static validatePrice(price) {
    if (price === undefined || price === null) {
      return deepFreeze({
        isValid: false,
        status: LiquidityStatus.UNAVAILABLE,
        reason: 'Price is missing'
      });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || !isFinite(numPrice) || numPrice <= 0) {
      return deepFreeze({
        isValid: false,
        status: LiquidityStatus.INVALID_PRICE,
        reason: 'Price must be a strictly positive finite number'
      });
    }

    return deepFreeze({
      isValid: true,
      status: LiquidityStatus.PASS,
      price: numPrice
    });
  }

  /**
   * Validates trade order quantity / notional.
   */
  static validateOrder(quantity, notional, price) {
    let numQty = quantity !== undefined && quantity !== null ? Number(quantity) : null;
    let numNotional = notional !== undefined && notional !== null ? Number(notional) : null;

    if (numQty === null && numNotional === null) {
      return deepFreeze({
        isValid: false,
        status: LiquidityStatus.INVALID_QUANTITY,
        reason: 'Either order quantity or notional must be provided'
      });
    }

    if (numQty !== null) {
      if (isNaN(numQty) || !isFinite(numQty) || numQty <= 0) {
        return deepFreeze({
          isValid: false,
          status: LiquidityStatus.INVALID_QUANTITY,
          reason: 'Order quantity must be a strictly positive finite number'
        });
      }
      if (numNotional === null && price) {
        numNotional = numQty * price;
      }
    }

    if (numNotional !== null) {
      if (isNaN(numNotional) || !isFinite(numNotional) || numNotional <= 0) {
        return deepFreeze({
          isValid: false,
          status: LiquidityStatus.INVALID_QUANTITY,
          reason: 'Order notional must be a strictly positive finite number'
        });
      }
      if (numQty === null && price) {
        numQty = numNotional / price;
      }
    }

    return deepFreeze({
      isValid: true,
      status: LiquidityStatus.PASS,
      quantity: numQty,
      notional: numNotional
    });
  }

  /**
   * Validates data freshness against asOf date.
   */
  static validateFreshness(observationTimestamp, asOfTimestamp, maxAgeDays = 5) {
    if (!observationTimestamp) {
      return deepFreeze({
        status: DataFreshnessStatus.UNAVAILABLE,
        reason: 'Observation timestamp missing'
      });
    }

    const obsTime = new Date(observationTimestamp).getTime();
    const asOfTime = asOfTimestamp ? new Date(asOfTimestamp).getTime() : Date.now();

    if (isNaN(obsTime) || isNaN(asOfTime)) {
      return deepFreeze({
        status: DataFreshnessStatus.UNAVAILABLE,
        reason: 'Invalid timestamp format'
      });
    }

    if (obsTime > asOfTime) {
      return deepFreeze({
        status: LiquidityStatus.TEMPORAL_VIOLATION,
        reason: 'Look-ahead temporal violation: observation timestamp is in the future relative to asOf'
      });
    }

    const diffDays = (asOfTime - obsTime) / (1000 * 60 * 60 * 24);
    if (diffDays > maxAgeDays) {
      return deepFreeze({
        status: DataFreshnessStatus.STALE,
        ageDays: diffDays,
        reason: `Observation is ${diffDays.toFixed(1)} days old (exceeds max ${maxAgeDays} days)`
      });
    }

    return deepFreeze({
      status: diffDays <= 1 ? DataFreshnessStatus.PRIME : DataFreshnessStatus.ACCEPTABLE,
      ageDays: diffDays
    });
  }
}
