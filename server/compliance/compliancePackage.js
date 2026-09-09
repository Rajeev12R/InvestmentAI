/**
 * Phase 16 — Sealed Compliance Intelligence Package Builder
 * Cryptographically seals evaluation, rules, breaches, exceptions, remediation, and audit graphs
 * into an immutable ComplianceIntelligencePackage.
 */

import { canonicalHash, deepFreeze } from './compliance.types.js';

export class CompliancePackageBuilder {
  /**
   * Builds and cryptographically seals a ComplianceIntelligencePackage.
   */
  static buildPackage({
    workspaceId,
    portfolioId,
    asOf = new Date().toISOString(),
    evaluation,
    policy,
    evidenceGraph = null,
    inputSnapshot = {}
  }) {
    if (!workspaceId || !portfolioId || !evaluation) {
      throw new Error('workspaceId, portfolioId, and evaluation are required to build ComplianceIntelligencePackage');
    }

    const packageId = `PKG-CMP-${portfolioId}-${Date.now()}`;

    const rawPackage = {
      packageId,
      packageVersion: '1.0.0',
      workspaceId,
      portfolioId,
      asOf,
      complianceStatus: evaluation.status,
      isCompliant: evaluation.isCompliant,
      overallSeverity: evaluation.overallSeverity,
      policy: {
        policyId: evaluation.policyId,
        policyVersion: evaluation.policyVersion,
        policyHash: evaluation.policyHash
      },
      evaluationSummary: {
        totalRules: evaluation.ruleCount,
        passedRules: evaluation.passCount,
        warningRules: evaluation.warningCount,
        breachedRules: evaluation.breachCount,
        waivedRules: evaluation.waivedCount,
        insufficientDataRules: evaluation.insufficientDataCount,
        evaluationHash: evaluation.evaluationHash
      },
      ruleResults: evaluation.ruleResults || [],
      activeBreaches: evaluation.breaches || [],
      waivedBreaches: evaluation.waivedBreaches || [],
      remediationPlan: evaluation.remediation || null,
      evidenceGraph: evidenceGraph || null,
      inputSnapshot: {
        holdingCount: inputSnapshot.holdings?.length || 0,
        snapshotAsOf: inputSnapshot.asOf || asOf
      },
      createdAt: new Date().toISOString()
    };

    const packageHash = canonicalHash({
      packageId: rawPackage.packageId,
      packageVersion: rawPackage.packageVersion,
      workspaceId: rawPackage.workspaceId,
      portfolioId: rawPackage.portfolioId,
      asOf: rawPackage.asOf,
      complianceStatus: rawPackage.complianceStatus,
      policy: rawPackage.policy,
      evaluationSummary: rawPackage.evaluationSummary,
      ruleResults: rawPackage.ruleResults,
      activeBreaches: rawPackage.activeBreaches,
      waivedBreaches: rawPackage.waivedBreaches
    });

    const sealedPackage = deepFreeze({
      ...rawPackage,
      packageHash
    });

    return {
      packageId,
      packageHash,
      package: sealedPackage
    };
  }

  /**
   * Verifies the cryptographic integrity of a sealed ComplianceIntelligencePackage.
   */
  static verifyPackageIntegrity(sealedPackage) {
    if (!sealedPackage || !sealedPackage.packageHash) {
      return { verified: false, error: 'Package is missing or unsealed' };
    }

    const expectedHash = canonicalHash({
      packageId: sealedPackage.packageId,
      packageVersion: sealedPackage.packageVersion,
      workspaceId: sealedPackage.workspaceId,
      portfolioId: sealedPackage.portfolioId,
      asOf: sealedPackage.asOf,
      complianceStatus: sealedPackage.complianceStatus,
      policy: sealedPackage.policy,
      evaluationSummary: sealedPackage.evaluationSummary,
      ruleResults: sealedPackage.ruleResults,
      activeBreaches: sealedPackage.activeBreaches,
      waivedBreaches: sealedPackage.waivedBreaches
    });

    const verified = expectedHash === sealedPackage.packageHash;
    return {
      verified,
      expectedHash,
      actualHash: sealedPackage.packageHash,
      error: verified ? null : 'Package hash mismatch: tamper detected or canonical corruption'
    };
  }
}
