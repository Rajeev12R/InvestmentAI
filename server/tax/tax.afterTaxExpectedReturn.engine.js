/**
 * Phase 17 — After-Tax Expected Return Engine
 * Deterministic Integration with Phase 14 Forecasts
 */

import { deepFreeze, TaxLabel, TaxStatus } from './tax.types.js';

export class TaxAfterTaxExpectedReturnEngine {
  /**
   * Computes deterministic after-tax expected return without arbitrary haircuts.
   * @param {number} verifiedExpectedReturn Nominal expected return from Phase 14 / DCF / Forecasts
   * @param {number} expectedTaxDrag Expected annual tax drag rate
   * @param {Object} metadata Source provenance
   */
  static computeAfterTaxExpectedReturn(verifiedExpectedReturn, expectedTaxDrag, metadata = {}) {
    if (typeof verifiedExpectedReturn !== 'number' || isNaN(verifiedExpectedReturn)) {
      return deepFreeze({
        status: TaxStatus.AFTER_TAX_RESULT_UNAVAILABLE,
        reason: 'Verified expected return from Phase 14 is unavailable or invalid'
      });
    }

    if (typeof expectedTaxDrag !== 'number' || isNaN(expectedTaxDrag)) {
      return deepFreeze({
        status: TaxStatus.AFTER_TAX_RESULT_UNAVAILABLE,
        reason: 'Expected tax drag is unavailable or invalid'
      });
    }

    const afterTaxExpectedReturn = verifiedExpectedReturn - expectedTaxDrag;

    return deepFreeze({
      status: TaxStatus.PASS,
      verifiedExpectedReturn,
      expectedTaxDrag,
      afterTaxExpectedReturn,
      taxLabel: TaxLabel.ESTIMATED,
      formula: 'AfterTaxExpectedReturn = VerifiedExpectedReturn - ExpectedTaxDrag',
      sourceProvenance: metadata.sourceProvenance || 'PHASE_14_CONSTRUCTION_PACKAGE'
    });
  }
}
