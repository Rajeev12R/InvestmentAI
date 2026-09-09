/**
 * Phase 17 — Unrealized Gain/Loss Engine
 * Deterministic Mark-to-Market Tax Valuation of Open Lots
 */

import { deepFreeze, HoldingPeriodClass, TaxLabel, TaxStatus } from './tax.types.js';
import { TaxJurisdictionEngine } from './tax.jurisdiction.js';
import { TaxHoldingPeriodEngine } from './tax.holdingPeriod.engine.js';

export class TaxUnrealizedGainEngine {
  /**
   * Calculates unrealized gains/losses across open lots using verified market prices.
   */
  static calculateUnrealizedGains(openLots, currentPrices, asOf, jurisdiction = 'US', accountType = 'TAXABLE') {
    if (!Array.isArray(openLots) || openLots.length === 0) {
      return deepFreeze({
        status: TaxStatus.TAX_LOT_UNAVAILABLE,
        reason: 'No open tax lots provided'
      });
    }

    if (!currentPrices || typeof currentPrices !== 'object') {
      return deepFreeze({
        status: TaxStatus.AFTER_TAX_RESULT_UNAVAILABLE,
        reason: 'Market prices map is missing or invalid'
      });
    }

    const ruleRes = TaxJurisdictionEngine.getJurisdictionRule(jurisdiction, asOf);
    if (ruleRes.status !== TaxStatus.PASS) {
      return deepFreeze({
        status: ruleRes.status,
        reason: ruleRes.reason
      });
    }
    const rule = ruleRes.rule;

    let totalMarketValue = 0;
    let totalCostBasis = 0;
    let totalUnrealizedGain = 0;
    let totalUnrealizedLoss = 0;
    let totalEmbeddedTaxLiability = 0;

    const evaluatedLots = [];

    for (const lot of openLots) {
      const price = currentPrices[lot.securityId];
      if (typeof price !== 'number' || isNaN(price) || price <= 0) {
        return deepFreeze({
          status: TaxStatus.AFTER_TAX_RESULT_UNAVAILABLE,
          reason: `Verified market price unavailable or invalid for security ${lot.securityId}`
        });
      }

      const hpRes = TaxHoldingPeriodEngine.evaluateHoldingPeriod(lot.acquisitionDate, asOf, jurisdiction);
      if (hpRes.status !== TaxStatus.PASS) {
        return deepFreeze({
          status: hpRes.status,
          reason: hpRes.reason
        });
      }

      const currentMktVal = lot.quantity * price;
      const basis = lot.costBasis;
      const unrealizedGainLoss = currentMktVal - basis;

      totalMarketValue += currentMktVal;
      totalCostBasis += basis;

      const isLongTerm = hpRes.holdingClass === HoldingPeriodClass.LONG_TERM;
      let embeddedTax = 0;

      if (unrealizedGainLoss > 0) {
        totalUnrealizedGain += unrealizedGainLoss;
        if (accountType === 'TAXABLE') {
          const rate = isLongTerm ? rule.ltcgRate : rule.stcgRate;
          embeddedTax = unrealizedGainLoss * rate;
          totalEmbeddedTaxLiability += embeddedTax;
        }
      } else {
        totalUnrealizedLoss += Math.abs(unrealizedGainLoss);
      }

      evaluatedLots.push({
        lotId: lot.lotId,
        securityId: lot.securityId,
        quantity: lot.quantity,
        acquisitionDate: lot.acquisitionDate,
        acquisitionPrice: lot.acquisitionPrice,
        costBasis: basis,
        currentPrice: price,
        currentMarketValue: currentMktVal,
        unrealizedGainLoss,
        unrealizedGainPercent: basis > 0 ? unrealizedGainLoss / basis : 0,
        daysHeld: hpRes.daysHeld,
        holdingClass: hpRes.holdingClass,
        embeddedTax,
        taxLabel: TaxLabel.ESTIMATED
      });
    }

    const netUnrealizedGainLoss = totalMarketValue - totalCostBasis;

    return deepFreeze({
      status: TaxStatus.PASS,
      asOf,
      jurisdiction: jurisdiction.toUpperCase(),
      accountType,
      totalMarketValue,
      totalCostBasis,
      netUnrealizedGainLoss,
      totalUnrealizedGain,
      totalUnrealizedLoss,
      totalEmbeddedTaxLiability,
      taxLabel: TaxLabel.ESTIMATED,
      formula: 'UnrealizedGainLoss = CurrentMarketValue - RemainingCostBasis',
      evaluatedLots
    });
  }
}
