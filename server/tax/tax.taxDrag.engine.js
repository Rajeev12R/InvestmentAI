/**
 * Phase 17 — Tax Drag Engine
 * Deterministic Tax Drag and Drag Percentage Computation
 */

import { deepFreeze, TaxLabel, TaxStatus } from './tax.types.js';

export class TaxDragEngine {
  /**
   * Computes tax drag and drag percentage between pre-tax and after-tax return series or scalars.
   */
  static computeTaxDrag(preTaxReturn, afterTaxReturn) {
    if (typeof preTaxReturn !== 'number' || isNaN(preTaxReturn)) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'preTaxReturn is not a valid number'
      });
    }

    if (typeof afterTaxReturn !== 'number' || isNaN(afterTaxReturn)) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'afterTaxReturn is not a valid number'
      });
    }

    const taxDrag = preTaxReturn - afterTaxReturn;

    let taxDragPercent = null;
    let taxDragPercentStatus = 'VALID';

    if (Math.abs(preTaxReturn) < 0.000001) {
      taxDragPercent = 0.0;
      taxDragPercentStatus = 'ZERO_PRETAX_RETURN';
    } else if (preTaxReturn < 0) {
      // Pre-tax return is negative: standard drag percentage formula is non-standard
      taxDragPercent = taxDrag / Math.abs(preTaxReturn);
      taxDragPercentStatus = 'NEGATIVE_PRETAX_RETURN';
    } else {
      taxDragPercent = taxDrag / preTaxReturn;
    }

    return deepFreeze({
      status: TaxStatus.PASS,
      preTaxReturn,
      afterTaxReturn,
      taxDrag,
      taxDragPercent,
      taxDragPercentStatus,
      taxLabel: TaxLabel.ESTIMATED,
      formulaDrag: 'TaxDrag = PreTaxReturn - AfterTaxReturn',
      formulaDragPercent: 'TaxDragPercent = (PreTaxReturn - AfterTaxReturn) / PreTaxReturn'
    });
  }
}
