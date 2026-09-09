/**
 * Phase 15 — Implementation Package Builder
 * 
 * Assembles and cryptographically seals the complete ImplementationIntelligencePackage.
 */

import { ImplementationStatus, canonicalHash, deepFreeze } from './implementation.types.js';
import { IMPLEMENTATION_POLICY_V1 } from './implementation.config.js';
import { ImplementationExplanationEngine } from './implementationExplanation.engine.js';

export class ImplementationPackageBuilder {
  /**
   * Build an immutable, sealed ImplementationIntelligencePackage.
   */
  static buildPackage(params) {
    const {
      workspaceId,
      portfolioId,
      asOf = new Date().toISOString(),
      policyVersion = IMPLEMENTATION_POLICY_V1.policyId,
      targetPackage,
      plan = null,
      holdingsSnapshot = null,
      transactionSnapshot = null,
      reconciliation = null,
      driftReport = null,
      constraintReport = null,
      triggerReport = null,
      impactReport = null,
      qualityReport = null,
      rebalanceCandidate = null
    } = params;

    const packageId = params.packageId || `PKG-IMPL-${portfolioId || 'PORT'}-${asOf.replace(/[:.]/g, '-')}`;

    const targetPkg = params.targetPackage || params.targetPortfolio;
    const planObj = params.plan || params.implementationPlan || null;
    const holdingsSnap = params.holdingsSnapshot || null;
    const txSnap = params.transactionSnapshot || null;

    if (!workspaceId || !portfolioId) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_PACKAGE_METADATA', package: null };
    }
    if (!targetPkg) {
      return { status: ImplementationStatus.INSUFFICIENT_DATA, reasonCode: 'MISSING_TARGET_PACKAGE', package: null };
    }

    // Build explanation DAG
    const dagResult = ImplementationExplanationEngine.buildExplanationGraph({
      workspaceId,
      portfolioId,
      asOf,
      targetPackage: targetPkg,
      plan: planObj,
      holdingsSnapshot: holdingsSnap,
      reconciliation,
      driftReport,
      constraintReport,
      triggerReport,
      impactReport,
      qualityReport
    });

    const packagePayload = {
      packageId,
      workspaceId,
      portfolioId,
      asOf,
      policyVersion,
      status: planObj?.approvalStatus === 'APPROVED' ? ImplementationStatus.HUMAN_APPROVED : ImplementationStatus.PLAN_GENERATED,
      targetPortfolio: {
        packageHash: targetPkg.packageHash || null,
        targetWeights: targetPkg.targetWeights || {}
      },
      targetPortfolioHash: targetPkg.packageHash || null,
      implementationPlan: planObj || null,
      implementationPlanHash: planObj ? (planObj.approvalHash || planObj.planHash || null) : null,
      holdingsSnapshot: holdingsSnap || null,
      holdingsSnapshotHash: holdingsSnap ? (holdingsSnap.snapshotHash || null) : null,
      transactionSnapshot: txSnap || null,
      reconciliation: reconciliation || null,
      driftReport: driftReport || null,
      constraintReport: constraintReport || null,
      triggerReport: triggerReport || null,
      impactReport: impactReport || null,
      qualityReport: qualityReport || null,
      rebalanceCandidate: rebalanceCandidate || null,
      explanationGraph: dagResult.explanationGraph || null,
      createdAt: asOf
    };

    const hash = canonicalHash(packagePayload);
    const sealedPackage = deepFreeze({
      ...packagePayload,
      packageHash: hash
    });

    return {
      status: ImplementationStatus.PLAN_GENERATED,
      package: sealedPackage
    };
  }
}
