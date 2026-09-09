/**
 * Phase 17 — 3-Way After-Tax Portfolio Comparison Engine
 * Compares Current vs Phase 14 Target vs Tax-Aware Target
 */

import { deepFreeze, TaxLabel, TaxStatus } from './tax.types.js';

export class TaxComparisonEngine {
  /**
   * Builds the 3-way comparative matrix.
   */
  static comparePortfolios(currentProfile, nominalTargetProfile, taxAwareProfile) {
    if (!currentProfile || !nominalTargetProfile || !taxAwareProfile) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'One or more portfolio profiles missing for 3-way comparison'
      });
    }

    const comparisonMatrix = {
      expectedReturn: {
        current: currentProfile.expectedReturn ?? null,
        target: nominalTargetProfile.expectedReturn ?? null,
        taxAware: taxAwareProfile.expectedReturn ?? null
      },
      afterTaxExpectedReturn: {
        current: currentProfile.afterTaxExpectedReturn ?? null,
        target: nominalTargetProfile.afterTaxExpectedReturn ?? null,
        taxAware: taxAwareProfile.afterTaxExpectedReturn ?? null
      },
      volatility: {
        current: currentProfile.volatility ?? null,
        target: nominalTargetProfile.volatility ?? null,
        taxAware: taxAwareProfile.volatility ?? null
      },
      sharpeRatio: {
        current: (currentProfile.expectedReturn && currentProfile.volatility) ? currentProfile.expectedReturn / currentProfile.volatility : null,
        target: (nominalTargetProfile.expectedReturn && nominalTargetProfile.volatility) ? nominalTargetProfile.expectedReturn / nominalTargetProfile.volatility : null,
        taxAware: (taxAwareProfile.expectedReturn && taxAwareProfile.volatility) ? taxAwareProfile.expectedReturn / taxAwareProfile.volatility : null
      },
      taxDrag: {
        current: currentProfile.taxDrag ?? 0.0,
        target: nominalTargetProfile.taxDrag ?? null,
        taxAware: taxAwareProfile.taxDrag ?? null
      },
      estimatedRealizedTax: {
        current: 0.0,
        target: nominalTargetProfile.realizedTax ?? null,
        taxAware: taxAwareProfile.realizedTax ?? null
      },
      turnover: {
        current: 0.0,
        target: nominalTargetProfile.turnover ?? null,
        taxAware: taxAwareProfile.turnover ?? null
      },
      transactionCost: {
        current: 0.0,
        target: nominalTargetProfile.transactionCost ?? null,
        taxAware: taxAwareProfile.transactionCost ?? null
      },
      complianceStatus: {
        current: currentProfile.complianceStatus || 'PASS',
        target: nominalTargetProfile.complianceStatus || 'PASS',
        taxAware: taxAwareProfile.complianceStatus || 'PASS'
      }
    };

    return deepFreeze({
      status: TaxStatus.PASS,
      comparisonMatrix,
      taxSavings: (nominalTargetProfile.realizedTax || 0) - (taxAwareProfile.realizedTax || 0),
      taxLabel: TaxLabel.ESTIMATED
    });
  }
}
