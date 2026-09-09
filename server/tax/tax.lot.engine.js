/**
 * Phase 17 — Tax Lot Engine
 * Immutable Tax Lot Lifecycle & Correction Tracking
 */

import { canonicalHash, deepFreeze, TaxStatus } from './tax.types.js';
import { TaxLotValidator } from './tax.lot.types.js';

export class TaxLotEngine {
  /**
   * Registers a new immutable tax lot.
   */
  static createTaxLot(lotData, asOf) {
    const validation = TaxLotValidator.validateLot(lotData, asOf);
    if (!validation.valid) {
      return deepFreeze({
        status: validation.status,
        reason: validation.reason
      });
    }

    const version = lotData.version || 1;
    const createdAt = asOf || new Date().toISOString();

    const rawLot = {
      lotId: lotData.lotId,
      version,
      securityId: lotData.securityId,
      accountId: lotData.accountId,
      acquisitionDate: lotData.acquisitionDate,
      acquisitionPrice: lotData.acquisitionPrice,
      quantity: lotData.quantity,
      costBasis: lotData.costBasis,
      currency: lotData.currency,
      source: lotData.source,
      sourceEvidenceId: lotData.sourceEvidenceId,
      transactionId: lotData.transactionId || `TX-${lotData.lotId}`,
      createdAt,
      validFrom: lotData.validFrom || lotData.acquisitionDate,
      validTo: lotData.validTo || null,
      supersedesLotId: lotData.supersedesLotId || null,
      previousHash: lotData.previousHash || null
    };

    const lotHash = canonicalHash(rawLot);
    return deepFreeze({
      status: TaxStatus.PASS,
      lot: {
        ...rawLot,
        lotHash
      }
    });
  }

  /**
   * Creates a corrected version of an existing lot (V2 referencing V1).
   */
  static correctTaxLot(originalLot, updates, asOf, reason) {
    if (!originalLot || !originalLot.lotHash) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Original immutable lot is invalid or missing lotHash'
      });
    }

    const newVersion = (originalLot.version || 1) + 1;
    const newLotId = `${originalLot.lotId}-V${newVersion}`;

    const correctedData = {
      ...originalLot,
      ...updates,
      lotId: newLotId,
      version: newVersion,
      supersedesLotId: originalLot.lotId,
      previousHash: originalLot.lotHash,
      correctionReason: reason || 'Correction applied to historical tax lot'
    };

    return this.createTaxLot(correctedData, asOf);
  }
}
