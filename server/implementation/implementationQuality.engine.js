/**
 * Phase 15 — Implementation Quality Scoring Engine
 * 
 * Audits execution fidelity across Target -> Approved -> Planned -> Reported -> Reconciled.
 * Computes root-mean-square tracking error, position completeness, delay, and quality tiers.
 */

import { ImplementationQualityStatus, ImplementationStatus, canonicalHash, deepFreeze } from './implementation.types.js';
import { IMPLEMENTATION_POLICY_V1 } from './implementation.config.js';

export class ImplementationQualityEngine {
  /**
   * Score the quality and fidelity of a portfolio implementation.
   */
  static evaluateQuality(params) {
    const {
      workspaceId,
      portfolioId,
      asOf = new Date().toISOString(),
      reconciliation,
      policy = IMPLEMENTATION_POLICY_V1,
      constraintReport = null
    } = params;

    if (!workspaceId || !portfolioId) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_WORKSPACE_OR_PORTFOLIO_ID', qualityReport: null };
    }
    if (!reconciliation || !Array.isArray(reconciliation.positions)) {
      return { status: ImplementationStatus.INSUFFICIENT_DATA, reasonCode: 'MISSING_RECONCILIATION_REPORT', qualityReport: null };
    }

    const positions = reconciliation.positions;
    const n = positions.length;

    if (n === 0) {
      return {
        status: ImplementationStatus.INSUFFICIENT_DATA,
        reasonCode: 'EMPTY_RECONCILIATION_POSITIONS',
        qualityReport: null
      };
    }

    let sumSqWeightError = 0;
    let maxAbsWeightError = 0;
    let totalShareError = 0;
    let totalValueDelta = 0;

    for (const p of positions) {
      const wErr = p.weightDifference;
      const absWErr = Math.abs(wErr);
      sumSqWeightError += wErr * wErr;
      if (absWErr > maxAbsWeightError) maxAbsWeightError = absWErr;

      totalShareError += Math.abs(p.shareDifference);
      totalValueDelta += Math.abs(p.valueDifference);
    }

    const rmsWeightTrackingError = Number(Math.sqrt(sumSqWeightError / n).toFixed(6));
    const missingCount = reconciliation.missingCount || 0;
    const unexpectedCount = reconciliation.unexpectedCount || 0;
    const completenessRatio = reconciliation.completenessRatio || 0;
    const hasConstraintBreach = constraintReport && constraintReport.breachCount > 0;

    let qualityScore = ImplementationQualityStatus.ACCEPTABLE;

    if (missingCount > 1 || unexpectedCount > 1 || maxAbsWeightError > 0.07 || hasConstraintBreach) {
      qualityScore = ImplementationQualityStatus.FAILED;
    } else if (missingCount > 0 || unexpectedCount > 0 || maxAbsWeightError > policy.maxAcceptableWeightError) {
      qualityScore = ImplementationQualityStatus.DEGRADED;
    } else if (maxAbsWeightError <= 0.015 && rmsWeightTrackingError <= 0.01 && completenessRatio >= 0.98) {
      qualityScore = ImplementationQualityStatus.EXCELLENT;
    } else {
      qualityScore = ImplementationQualityStatus.ACCEPTABLE;
    }

    const payload = {
      qualityId: `QUAL-${portfolioId}-${asOf.replace(/[:.]/g, '-')}`,
      workspaceId,
      portfolioId,
      asOf,
      qualityScore,
      rmsWeightTrackingError,
      maxAbsWeightError: Number(maxAbsWeightError.toFixed(6)),
      totalShareError,
      totalValueDelta: Number(totalValueDelta.toFixed(4)),
      completenessRatio,
      missingPositionCount: missingCount,
      unexpectedPositionCount: unexpectedCount,
      hasConstraintBreach: !!hasConstraintBreach,
      createdAt: asOf
    };

    const hash = canonicalHash(payload);
    const sealedQualityReport = deepFreeze({
      ...payload,
      qualityHash: hash
    });

    return {
      status: ImplementationStatus.RECONCILED,
      qualityReport: sealedQualityReport
    };
  }
}
