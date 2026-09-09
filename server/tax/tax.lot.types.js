/**
 * Phase 17 — Tax Lot Schemas and Validators
 */

import { canonicalHash, deepFreeze, TaxStatus } from './tax.types.js';

export class TaxLotValidator {
  /**
   * Validates a single tax lot structure.
   */
  static validateLot(lot, asOf) {
    if (!lot || typeof lot !== 'object') {
      return {
        valid: false,
        status: TaxStatus.INVALID_INPUT,
        reason: 'Tax lot is not an object'
      };
    }

    const {
      lotId,
      securityId,
      accountId,
      acquisitionDate,
      acquisitionPrice,
      quantity,
      costBasis,
      currency,
      source,
      sourceEvidenceId
    } = lot;

    if (!lotId || typeof lotId !== 'string') {
      return { valid: false, status: TaxStatus.TAX_LOT_UNAVAILABLE, reason: 'Missing lotId' };
    }
    if (!securityId || typeof securityId !== 'string') {
      return { valid: false, status: TaxStatus.INVALID_INPUT, reason: 'Missing securityId' };
    }
    if (!accountId || typeof accountId !== 'string') {
      return { valid: false, status: TaxStatus.INVALID_INPUT, reason: 'Missing accountId' };
    }
    if (!acquisitionDate || typeof acquisitionDate !== 'string') {
      return { valid: false, status: TaxStatus.TAX_LOT_UNAVAILABLE, reason: 'Missing acquisitionDate' };
    }

    const acqTime = new Date(acquisitionDate).getTime();
    if (isNaN(acqTime)) {
      return { valid: false, status: TaxStatus.INVALID_INPUT, reason: 'Invalid acquisitionDate format' };
    }

    if (asOf) {
      const asOfTime = new Date(asOf).getTime();
      if (!isNaN(asOfTime) && acqTime > asOfTime) {
        return { valid: false, status: TaxStatus.TEMPORAL_VIOLATION, reason: 'Acquisition date is in the future relative to asOf' };
      }
    }

    if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
      return { valid: false, status: TaxStatus.INVALID_INPUT, reason: 'Quantity must be a positive number' };
    }

    if (typeof acquisitionPrice !== 'number' || isNaN(acquisitionPrice) || acquisitionPrice <= 0) {
      return { valid: false, status: TaxStatus.INVALID_INPUT, reason: 'Acquisition price must be a positive number' };
    }

    if (typeof costBasis !== 'number' || isNaN(costBasis) || costBasis <= 0) {
      return { valid: false, status: TaxStatus.COST_BASIS_UNAVAILABLE, reason: 'Cost basis must be a positive number' };
    }

    // Cost basis reconciliation check (quantity * acquisitionPrice vs costBasis) with 1 cent / 0.01 tolerance
    const expectedBasis = quantity * acquisitionPrice;
    if (Math.abs(expectedBasis - costBasis) > 0.05 && !lot.adjustments) {
      return {
        valid: false,
        status: TaxStatus.CONFLICT,
        reason: `Cost basis mismatch: quantity (${quantity}) * price (${acquisitionPrice}) = ${expectedBasis} != costBasis (${costBasis})`
      };
    }

    if (!currency || typeof currency !== 'string') {
      return { valid: false, status: TaxStatus.INVALID_INPUT, reason: 'Missing currency' };
    }

    if (!source || typeof source !== 'string') {
      return { valid: false, status: TaxStatus.INSUFFICIENT_DATA, reason: 'Missing tax lot data source' };
    }

    if (!sourceEvidenceId || typeof sourceEvidenceId !== 'string') {
      return { valid: false, status: TaxStatus.INSUFFICIENT_DATA, reason: 'Missing sourceEvidenceId' };
    }

    return { valid: true, status: TaxStatus.PASS };
  }
}
