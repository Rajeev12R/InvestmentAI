/**
 * Phase 17 — Tax Validation & Complete Lot Reconciliation Engine
 * Zero Fallback Prohibition, Corporate Action Boundaries & Lot Reconciliation
 */

import { deepFreeze, TaxStatus } from './tax.types.js';

export class TaxValidationEngine {
  /**
   * Enforces the Non-Silent Fallback Contract.
   */
  static checkZeroFallbackContract(data) {
    if (!data || typeof data !== 'object') {
      return { valid: false, status: TaxStatus.INVALID_INPUT, reason: 'Data object is missing' };
    }

    // Check for prohibited substitutions where source is missing
    if (data.taxRate === 0 && !data.sourceProvesZeroRate) {
      return { valid: false, status: TaxStatus.CONFLICT, reason: 'taxRate=0 detected without explicit legal proof of zero rate' };
    }
    if (data.costBasis === 0 && !data.sourceProvesZeroBasis) {
      return { valid: false, status: TaxStatus.COST_BASIS_UNAVAILABLE, reason: 'costBasis=0 detected without explicit proof of zero cost basis' };
    }
    if (data.jurisdiction === 'US' && data.isJurisdictionDefaulted) {
      return { valid: false, status: TaxStatus.JURISDICTION_UNAVAILABLE, reason: 'Silent default to US jurisdiction is strictly prohibited' };
    }
    if (data.basisMethod === 'FIFO' && data.isBasisMethodDefaulted) {
      return { valid: false, status: TaxStatus.COST_BASIS_UNAVAILABLE, reason: 'Silent default to FIFO basis method without account configuration is prohibited' };
    }

    return { valid: true, status: TaxStatus.PASS };
  }

  /**
   * Reconciles tax lots and cost basis across transactions and corporate action adjustments:
   * Opening + Purchases - Sales +/- CorporateActionAdjustments = Closing
   * OpeningBasis + PurchaseBasis - DisposedBasis +/- BasisAdjustments = ClosingBasis
   */
  static reconcileTaxLots(reconciliationParams) {
    const {
      securityId,
      openingQuantity,
      purchasedQuantity,
      soldQuantity,
      corporateActionAdjustmentsQuantity = 0,
      closingQuantity,
      openingCostBasis,
      purchasedCostBasis,
      disposedCostBasis,
      corporateActionAdjustmentsCostBasis = 0,
      closingCostBasis,
      corporateActionRule = null
    } = reconciliationParams;

    // Check corporate action validity if adjustment is present
    if ((corporateActionAdjustmentsQuantity !== 0 || corporateActionAdjustmentsCostBasis !== 0) && !corporateActionRule) {
      return deepFreeze({
        status: TaxStatus.TAX_RULE_UNAVAILABLE,
        reconciled: false,
        reason: `Corporate action adjustment present on ${securityId} without configured corporateActionRule`
      });
    }

    const expectedClosingQty = openingQuantity + purchasedQuantity - soldQuantity + corporateActionAdjustmentsQuantity;
    const qtyDiff = Math.abs(expectedClosingQty - closingQuantity);

    if (qtyDiff > 0.0001) {
      return deepFreeze({
        status: TaxStatus.CONFLICT,
        reconciled: false,
        reason: `Quantity reconciliation mismatch for ${securityId}: Opening (${openingQuantity}) + Buys (${purchasedQuantity}) - Sells (${soldQuantity}) + CorpActions (${corporateActionAdjustmentsQuantity}) = ${expectedClosingQty} != Closing (${closingQuantity})`
      });
    }

    const expectedClosingBasis = openingCostBasis + purchasedCostBasis - disposedCostBasis + corporateActionAdjustmentsCostBasis;
    const basisDiff = Math.abs(expectedClosingBasis - closingCostBasis);

    if (basisDiff > 0.05) { // 5 cent tolerance
      return deepFreeze({
        status: TaxStatus.CONFLICT,
        reconciled: false,
        reason: `Cost basis reconciliation mismatch for ${securityId}: OpeningBasis (${openingCostBasis}) + BuyBasis (${purchasedCostBasis}) - SoldBasis (${disposedCostBasis}) + CorpBasis (${corporateActionAdjustmentsCostBasis}) = ${expectedClosingBasis} != ClosingBasis (${closingCostBasis})`
      });
    }

    return deepFreeze({
      status: TaxStatus.PASS,
      reconciled: true,
      securityId,
      closingQuantity,
      closingCostBasis,
      formulaQty: 'ClosingQty = OpeningQty + PurchasedQty - SoldQty ± CorporateActionAdjustmentsQty',
      formulaBasis: 'ClosingBasis = OpeningBasis + PurchasedBasis - DisposedBasis ± BasisAdjustments'
    });
  }
}
