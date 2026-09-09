/**
 * Phase 17 — Transaction Tax Impact Engine
 * Pre-Trade Tax & Economic Impact Analysis
 */

import { CostBasisMethod, deepFreeze, TaxLabel, TaxStatus } from './tax.types.js';
import { TaxCostBasisEngine } from './tax.costBasis.engine.js';
import { TaxRealizedGainEngine } from './tax.realizedGain.engine.js';
import { TaxJurisdictionEngine } from './tax.jurisdiction.js';

export class TaxTransactionTaxEngine {
  /**
   * Evaluates the tax and economic impact of a proposed transaction.
   */
  static evaluateTransactionTax(tradeProposal) {
    const {
      securityId,
      side, // 'BUY' or 'SELL'
      quantity,
      price,
      openLots = [],
      basisMethod = CostBasisMethod.FIFO,
      asOf,
      jurisdiction = 'US',
      accountType = 'TAXABLE',
      estimatedTransactionCost = 0
    } = tradeProposal;

    if (!securityId || !side || !quantity || !price || !asOf) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Required trade proposal parameters missing'
      });
    }

    if (side !== 'BUY' && side !== 'SELL') {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: `Invalid transaction side: ${side}`
      });
    }

    const ruleRes = TaxJurisdictionEngine.getJurisdictionRule(jurisdiction, asOf);
    if (ruleRes.status !== TaxStatus.PASS) {
      return deepFreeze({
        status: ruleRes.status,
        reason: ruleRes.reason
      });
    }

    const grossAmount = quantity * price;

    if (side === 'BUY') {
      // Buys establish basis, no immediate capital gains tax.
      // Indian jurisdiction STT on purchases where applicable.
      const sttTax = grossAmount * (ruleRes.rule.sttRate || 0);
      const totalOutlay = grossAmount + estimatedTransactionCost + sttTax;

      return deepFreeze({
        status: TaxStatus.PASS,
        securityId,
        side: 'BUY',
        quantity,
        price,
        grossAmount,
        estimatedTransactionCost,
        estimatedTax: sttTax,
        netEconomicImpact: -totalOutlay,
        taxLabel: TaxLabel.ESTIMATED,
        jurisdiction: jurisdiction.toUpperCase(),
        ruleVersion: ruleRes.rule.taxRuleVersion
      });
    }

    // Side === 'SELL'
    const basisAllocRes = TaxCostBasisEngine.allocateCostBasis(openLots, quantity, basisMethod);
    if (basisAllocRes.status !== TaxStatus.PASS) {
      return deepFreeze({
        status: basisAllocRes.status,
        reason: basisAllocRes.reason
      });
    }

    const gainRes = TaxRealizedGainEngine.calculateRealizedGain({
      securityId,
      disposalQuantity: quantity,
      salePrice: price,
      allocatedLots: basisAllocRes.allocations,
      disposalDate: asOf,
      jurisdiction,
      accountType,
      transactionCosts: estimatedTransactionCost
    });

    if (gainRes.status !== TaxStatus.PASS) {
      return deepFreeze({
        status: gainRes.status,
        reason: gainRes.reason
      });
    }

    const netProceedsAfterTaxAndCosts = grossAmount - estimatedTransactionCost - gainRes.estimatedTax;

    return deepFreeze({
      status: TaxStatus.PASS,
      securityId,
      side: 'SELL',
      quantity,
      price,
      grossAmount,
      totalAllocatedCostBasis: gainRes.totalAllocatedCostBasis,
      netRealizedGainLoss: gainRes.netRealizedGainLoss,
      estimatedTax: gainRes.estimatedTax,
      estimatedTransactionCost,
      netEconomicImpact: netProceedsAfterTaxAndCosts,
      taxLabel: TaxLabel.ESTIMATED,
      jurisdiction: jurisdiction.toUpperCase(),
      ruleVersion: ruleRes.rule.taxRuleVersion,
      gainDetails: gainRes
    });
  }
}
