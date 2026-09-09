/**
 * Phase 17 — Realized Gain/Loss Engine
 * Deterministic Disposal Accounting and Tax Liability Estimation
 */

import { deepFreeze, HoldingPeriodClass, TaxLabel, TaxStatus } from './tax.types.js';
import { TaxJurisdictionEngine } from './tax.jurisdiction.js';
import { TaxHoldingPeriodEngine } from './tax.holdingPeriod.engine.js';

export class TaxRealizedGainEngine {
  /**
   * Calculates realized gain/loss and estimated tax for an allocated disposal.
   */
  static calculateRealizedGain(disposalParams) {
    const {
      securityId,
      disposalQuantity,
      salePrice,
      allocatedLots, // Array from TaxCostBasisEngine.allocateCostBasis
      disposalDate,
      jurisdiction = 'US',
      accountType = 'TAXABLE',
      transactionCosts = 0
    } = disposalParams;

    if (!securityId || typeof securityId !== 'string') {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Missing securityId'
      });
    }

    if (typeof disposalQuantity !== 'number' || disposalQuantity <= 0) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Invalid disposalQuantity'
      });
    }

    if (typeof salePrice !== 'number' || salePrice <= 0) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Invalid salePrice'
      });
    }

    if (!Array.isArray(allocatedLots) || allocatedLots.length === 0) {
      return deepFreeze({
        status: TaxStatus.TAX_LOT_UNAVAILABLE,
        reason: 'Missing allocatedLots'
      });
    }

    if (!disposalDate) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Missing disposalDate'
      });
    }

    const ruleRes = TaxJurisdictionEngine.getJurisdictionRule(jurisdiction, disposalDate);
    if (ruleRes.status !== TaxStatus.PASS) {
      return deepFreeze({
        status: ruleRes.status,
        reason: ruleRes.reason
      });
    }
    const rule = ruleRes.rule;

    const grossProceeds = disposalQuantity * salePrice;
    let totalAllocatedCostBasis = 0;
    let totalStcgGain = 0;
    let totalLtcgGain = 0;
    let totalStcgLoss = 0;
    let totalLtcgLoss = 0;
    const lotResults = [];

    for (const alloc of allocatedLots) {
      const hpRes = TaxHoldingPeriodEngine.evaluateHoldingPeriod(alloc.acquisitionDate, disposalDate, jurisdiction);
      if (hpRes.status !== TaxStatus.PASS) {
        return deepFreeze({
          status: hpRes.status,
          reason: hpRes.reason
        });
      }

      const lotProceeds = alloc.allocatedQuantity * salePrice;
      const lotBasis = alloc.allocatedCostBasis;
      totalAllocatedCostBasis += lotBasis;
      const lotGainLoss = lotProceeds - lotBasis;

      const isLongTerm = hpRes.holdingClass === HoldingPeriodClass.LONG_TERM;
      if (lotGainLoss >= 0) {
        if (isLongTerm) totalLtcgGain += lotGainLoss;
        else totalStcgGain += lotGainLoss;
      } else {
        if (isLongTerm) totalLtcgLoss += Math.abs(lotGainLoss);
        else totalStcgLoss += Math.abs(lotGainLoss);
      }

      lotResults.push({
        lotId: alloc.lotId,
        allocatedQuantity: alloc.allocatedQuantity,
        acquisitionDate: alloc.acquisitionDate,
        acquisitionPrice: alloc.acquisitionPrice,
        allocatedCostBasis: lotBasis,
        proceeds: lotProceeds,
        realizedGainLoss: lotGainLoss,
        daysHeld: hpRes.daysHeld,
        holdingClass: hpRes.holdingClass
      });
    }

    const netRealizedGainLoss = grossProceeds - totalAllocatedCostBasis - transactionCosts;

    // Tax Liability Estimation
    let estimatedTax = 0;
    if (accountType === 'TAXABLE') {
      const netStcg = Math.max(0, totalStcgGain - totalStcgLoss);
      const netLtcg = Math.max(0, totalLtcgGain - totalLtcgLoss);

      const stcgTax = netStcg * rule.stcgRate;
      const ltcgTax = netLtcg * rule.ltcgRate;
      const sttTax = grossProceeds * (rule.sttRate || 0);

      estimatedTax = stcgTax + ltcgTax + sttTax;
    }

    return deepFreeze({
      status: TaxStatus.PASS,
      securityId,
      disposalQuantity,
      salePrice,
      disposalDate,
      grossProceeds,
      totalAllocatedCostBasis,
      transactionCosts,
      netRealizedGainLoss,
      totalStcgGain,
      totalLtcgGain,
      totalStcgLoss,
      totalLtcgLoss,
      estimatedTax,
      taxLabel: TaxLabel.ESTIMATED,
      accountType,
      jurisdiction: jurisdiction.toUpperCase(),
      ruleVersion: rule.taxRuleVersion,
      formula: 'RealizedGainLoss = GrossProceeds - TotalAllocatedCostBasis - TransactionCosts',
      lotResults
    });
  }
}
