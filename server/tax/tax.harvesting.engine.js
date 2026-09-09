/**
 * Phase 17 — Tax-Loss Harvesting Engine
 * Deterministic Candidate Identification with Wash-Sale & Hurdle Checks
 */

import { deepFreeze, HarvestStatus, HoldingPeriodClass, TaxLabel, TaxStatus, WashSaleStatus } from './tax.types.js';
import { TaxJurisdictionEngine } from './tax.jurisdiction.js';
import { TaxWashSaleEngine } from './tax.washSale.engine.js';
import { TaxHoldingPeriodEngine } from './tax.holdingPeriod.engine.js';

export class TaxHarvestingEngine {
  /**
   * Scans open lots for tax-loss harvesting opportunities.
   */
  static identifyHarvestCandidates(params) {
    const {
      openLots,
      currentPrices,
      transactionHistory = [],
      replacementMap = {}, // securityId -> replacementCandidate
      asOf,
      jurisdiction = 'US',
      accountType = 'TAXABLE',
      minLossDollars = 100.0,
      minLossPercent = 0.02,
      estimatedTransactionCostPerLot = 5.0,
      hurdleMultiple = 1.5
    } = params;

    if (!Array.isArray(openLots) || openLots.length === 0) {
      return deepFreeze({
        status: TaxStatus.INSUFFICIENT_DATA,
        candidates: [],
        reason: 'No open tax lots provided'
      });
    }

    if (!currentPrices || typeof currentPrices !== 'object') {
      return deepFreeze({
        status: TaxStatus.AFTER_TAX_RESULT_UNAVAILABLE,
        candidates: [],
        reason: 'Market prices unavailable'
      });
    }

    const ruleRes = TaxJurisdictionEngine.getJurisdictionRule(jurisdiction, asOf);
    if (ruleRes.status !== TaxStatus.PASS) {
      return deepFreeze({
        status: ruleRes.status,
        candidates: [],
        reason: ruleRes.reason
      });
    }
    const rule = ruleRes.rule;

    if (accountType !== 'TAXABLE') {
      return deepFreeze({
        status: TaxStatus.PASS,
        candidates: [],
        reason: `Account type '${accountType}' is not subject to capital loss tax deductions`
      });
    }

    const candidates = [];
    let totalHarvestableLoss = 0;
    let totalEstimatedTaxBenefit = 0;

    for (const lot of openLots) {
      const price = currentPrices[lot.securityId];
      if (typeof price !== 'number' || isNaN(price) || price <= 0) {
        continue;
      }

      const mktVal = lot.quantity * price;
      const basis = lot.costBasis;
      const unrealizedGainLoss = mktVal - basis;

      // Only evaluate lots with an unrealized loss
      if (unrealizedGainLoss >= 0) {
        continue;
      }

      const unrealizedLoss = Math.abs(unrealizedGainLoss);
      const lossPercent = basis > 0 ? unrealizedLoss / basis : 0;

      // Check loss thresholds
      if (unrealizedLoss < minLossDollars || lossPercent < minLossPercent) {
        continue;
      }

      const hpRes = TaxHoldingPeriodEngine.evaluateHoldingPeriod(lot.acquisitionDate, asOf, jurisdiction);
      if (hpRes.status !== TaxStatus.PASS) {
        continue;
      }

      const isLongTerm = hpRes.holdingClass === HoldingPeriodClass.LONG_TERM;
      const taxRate = isLongTerm ? rule.ltcgRate : rule.stcgRate;
      const estimatedTaxBenefit = unrealizedLoss * taxRate;

      const replacementCandidate = replacementMap[lot.securityId] || null;

      // Wash Sale Evaluation
      const washSaleRes = TaxWashSaleEngine.evaluateWashSale({
        securityId: lot.securityId,
        saleDate: asOf,
        isLoss: true,
        replacementSecurityId: replacementCandidate
      }, transactionHistory, jurisdiction);

      let status = HarvestStatus.HARVEST_CANDIDATE;
      let reason = 'Eligible for tax-loss harvesting';

      if (washSaleRes.washSaleStatus === WashSaleStatus.DISALLOWED) {
        status = HarvestStatus.WASH_SALE_RISK;
        reason = washSaleRes.reason;
      } else if (washSaleRes.washSaleStatus === WashSaleStatus.POTENTIAL_RESTRICTION) {
        status = HarvestStatus.WASH_SALE_RISK;
        reason = washSaleRes.reason;
      } else if (estimatedTaxBenefit < estimatedTransactionCostPerLot * hurdleMultiple) {
        status = HarvestStatus.COST_EXCEEDS_BENEFIT;
        reason = `Estimated tax benefit ($${estimatedTaxBenefit.toFixed(2)}) is below cost hurdle ($${(estimatedTransactionCostPerLot * hurdleMultiple).toFixed(2)})`;
      }

      const netBenefit = estimatedTaxBenefit - estimatedTransactionCostPerLot;

      if (status === HarvestStatus.HARVEST_CANDIDATE) {
        totalHarvestableLoss += unrealizedLoss;
        totalEstimatedTaxBenefit += estimatedTaxBenefit;
      }

      candidates.push({
        lotId: lot.lotId,
        securityId: lot.securityId,
        quantity: lot.quantity,
        acquisitionDate: lot.acquisitionDate,
        acquisitionPrice: lot.acquisitionPrice,
        costBasis: basis,
        currentPrice: price,
        currentMarketValue: mktVal,
        unrealizedLoss,
        lossPercent,
        daysHeld: hpRes.daysHeld,
        holdingClass: hpRes.holdingClass,
        estimatedTaxBenefit,
        estimatedTransactionCost: estimatedTransactionCostPerLot,
        netBenefit,
        replacementCandidate,
        washSaleStatus: washSaleRes.washSaleStatus,
        status,
        reason,
        taxLabel: TaxLabel.ESTIMATED
      });
    }

    return deepFreeze({
      status: TaxStatus.PASS,
      asOf,
      jurisdiction: jurisdiction.toUpperCase(),
      accountType,
      candidateCount: candidates.filter(c => c.status === HarvestStatus.HARVEST_CANDIDATE).length,
      totalHarvestableLoss,
      totalEstimatedTaxBenefit,
      candidates,
      ruleVersion: rule.taxRuleVersion,
      formula: 'TaxBenefit = UnrealizedLoss × ApplicableTaxRate'
    });
  }
}
