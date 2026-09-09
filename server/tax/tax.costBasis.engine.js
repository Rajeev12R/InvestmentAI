/**
 * Phase 17 — Cost Basis Allocation Engine
 * Supports FIFO, LIFO, and SPECIFIC_LOT
 */

import { CostBasisMethod, deepFreeze, TaxStatus } from './tax.types.js';

export class TaxCostBasisEngine {
  /**
   * Allocates cost basis for a proposed or realized disposal.
   * @param {Array} openLots List of available open tax lots for the security
   * @param {number} disposalQty Total quantity being sold/disposed
   * @param {string} basisMethod FIFO, LIFO, or SPECIFIC_LOT
   * @param {Array} specificLotSelections Array of { lotId, quantity } if SPECIFIC_LOT
   */
  static allocateCostBasis(openLots, disposalQty, basisMethod = CostBasisMethod.FIFO, specificLotSelections = null) {
    if (!Array.isArray(openLots) || openLots.length === 0) {
      return deepFreeze({
        status: TaxStatus.TAX_LOT_UNAVAILABLE,
        reason: 'No open tax lots provided for cost basis allocation'
      });
    }

    if (typeof disposalQty !== 'number' || isNaN(disposalQty) || disposalQty <= 0) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Disposal quantity must be a positive number'
      });
    }

    if (!Object.values(CostBasisMethod).includes(basisMethod)) {
      return deepFreeze({
        status: TaxStatus.COST_BASIS_UNAVAILABLE,
        reason: `Unknown cost basis method: ${basisMethod}`
      });
    }

    // Check total open lot quantity
    const totalAvailableQty = openLots.reduce((sum, l) => sum + l.quantity, 0);
    if (disposalQty > totalAvailableQty + 0.00001) {
      return deepFreeze({
        status: TaxStatus.CONFLICT,
        reason: `Disposal quantity (${disposalQty}) exceeds available open lot quantity (${totalAvailableQty})`
      });
    }

    let sortedLots = [];
    if (basisMethod === CostBasisMethod.FIFO) {
      sortedLots = [...openLots].sort((a, b) => new Date(a.acquisitionDate) - new Date(b.acquisitionDate));
    } else if (basisMethod === CostBasisMethod.LIFO) {
      sortedLots = [...openLots].sort((a, b) => new Date(b.acquisitionDate) - new Date(a.acquisitionDate));
    } else if (basisMethod === CostBasisMethod.SPECIFIC_LOT) {
      if (!Array.isArray(specificLotSelections) || specificLotSelections.length === 0) {
        return deepFreeze({
          status: TaxStatus.COST_BASIS_UNAVAILABLE,
          reason: 'SPECIFIC_LOT method requires specificLotSelections array'
        });
      }
      const lotMap = new Map(openLots.map(l => [l.lotId, l]));
      let requestedTotal = 0;
      const selectedLots = [];

      for (const sel of specificLotSelections) {
        const lot = lotMap.get(sel.lotId);
        if (!lot) {
          return deepFreeze({
            status: TaxStatus.TAX_LOT_UNAVAILABLE,
            reason: `Specific lot ${sel.lotId} not found in open lots`
          });
        }
        if (sel.quantity > lot.quantity + 0.00001) {
          return deepFreeze({
            status: TaxStatus.CONFLICT,
            reason: `Requested quantity ${sel.quantity} exceeds available quantity ${lot.quantity} for lot ${sel.lotId}`
          });
        }
        requestedTotal += sel.quantity;
        selectedLots.push({ ...lot, targetQty: sel.quantity });
      }

      if (Math.abs(requestedTotal - disposalQty) > 0.00001) {
        return deepFreeze({
          status: TaxStatus.CONFLICT,
          reason: `Sum of specific lot quantities (${requestedTotal}) does not match disposal quantity (${disposalQty})`
        });
      }

      sortedLots = selectedLots;
    }

    let remainingToAllocate = disposalQty;
    const allocations = [];
    let totalAllocatedCostBasis = 0;

    for (const lot of sortedLots) {
      if (remainingToAllocate <= 0) break;

      const availableInLot = basisMethod === CostBasisMethod.SPECIFIC_LOT ? lot.targetQty : lot.quantity;
      const qtyToTake = Math.min(remainingToAllocate, availableInLot);
      const basisPortion = qtyToTake * lot.acquisitionPrice;

      allocations.push({
        lotId: lot.lotId,
        securityId: lot.securityId,
        acquisitionDate: lot.acquisitionDate,
        acquisitionPrice: lot.acquisitionPrice,
        allocatedQuantity: qtyToTake,
        allocatedCostBasis: basisPortion,
        remainingLotQuantity: lot.quantity - qtyToTake,
        currency: lot.currency
      });

      totalAllocatedCostBasis += basisPortion;
      remainingToAllocate -= qtyToTake;
    }

    return deepFreeze({
      status: TaxStatus.PASS,
      basisMethod,
      disposalQuantity: disposalQty,
      totalAllocatedCostBasis,
      allocations,
      formula: 'AllocatedCostBasis = Σ(AllocatedQuantity_i × AcquisitionPrice_i)'
    });
  }
}
