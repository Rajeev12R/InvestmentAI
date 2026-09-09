/**
 * Phase 17 — Sealed Tax Intelligence Package
 * Immutable, Cryptographically Hashed Institutional Package
 */

import { canonicalHash, deepFreeze, TaxStatus } from './tax.types.js';

export class TaxIntelligencePackageBuilder {
  /**
   * Seals a complete TaxIntelligencePackage with SHA-256 canonical hash and deepFreeze.
   */
  static sealPackage(payload) {
    const {
      packageVersion = '1.0.0',
      policyVersion = 'TAX_POLICY_V1',
      workspaceId,
      portfolioId,
      asOf,
      jurisdiction = 'US',
      taxAccountContext,
      taxLots = [],
      costBasis = null,
      realizedGains = [],
      unrealizedGains = null,
      dividends = [],
      taxEstimates = null,
      taxDrag = null,
      afterTaxReturns = null,
      afterTaxExpectedReturns = null,
      harvestingCandidates = [],
      taxAwareRebalance = null,
      scenarios = [],
      complianceImpact = { status: 'PASS', inherited: true },
      implementationImpact = { status: 'PASS', inherited: true },
      evidenceGraph = null,
      dataProvenance = 'REAL_DATA + GOLDEN_SYNTHETIC TAX LOTS'
    } = payload;

    if (!workspaceId || !portfolioId || !asOf) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Missing workspaceId, portfolioId, or asOf in package payload'
      });
    }

    const rawPackage = {
      packageId: `PKG-TAX-${portfolioId}-${asOf.replace(/[:.]/g, '-')}`,
      packageVersion,
      policyVersion,
      workspaceId,
      portfolioId,
      asOf,
      jurisdiction,
      taxAccountContext,
      taxLots,
      costBasis,
      realizedGains,
      unrealizedGains,
      dividends,
      taxEstimates,
      taxDrag,
      afterTaxReturns,
      afterTaxExpectedReturns,
      harvestingCandidates,
      taxAwareRebalance,
      scenarios,
      complianceImpact,
      implementationImpact,
      evidenceGraph,
      dataProvenance,
      ledgerHash: payload.ledgerHash || afterTaxReturns?.ledgerHash || 'LEDGER_NOT_RECORDED',
      afterTaxReturnMethodology: payload.afterTaxReturnMethodology || afterTaxReturns?.afterTaxReturnMethodology || 'ACTUAL_AFTER_TAX',
      isExecuted: false, // Invariant: strict decision-support only
      disclaimer: 'InvestmentAI is a decision-support intelligence platform and does not provide legal or tax advice.'
    };

    const packageHash = canonicalHash(rawPackage);

    const sealed = {
      ...rawPackage,
      packageHash
    };

    return deepFreeze(sealed);
  }

  /**
   * Verifies the cryptographic integrity of a sealed TaxIntelligencePackage.
   */
  static verifyPackage(pkg) {
    if (!pkg || typeof pkg !== 'object' || !pkg.packageHash) {
      return { valid: false, reason: 'Invalid or missing packageHash' };
    }

    const { packageHash, ...unhashed } = pkg;
    const computedHash = canonicalHash(unhashed);

    if (computedHash !== packageHash) {
      return {
        valid: false,
        reason: `Hash mismatch: computed ${computedHash} != expected ${packageHash}`
      };
    }

    return { valid: true, packageHash };
  }
}
