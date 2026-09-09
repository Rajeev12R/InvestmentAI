/**
 * Phase 15 — Holdings Reconciliation Engine
 * 
 * Performs 3-way reconciliation comparing Approved Target vs Implementation Plan vs Reported Actual Holdings.
 * Identifies position mismatches, missing holdings, unexpected holdings, and implementation tracking error.
 */

import { ImplementationStatus, ReconciliationStatus, canonicalHash, deepFreeze } from './implementation.types.js';

export class HoldingsReconciliationEngine {
  /**
   * Reconcile reported actual holdings against approved target weights and implementation plan.
   */
  static reconcile(params) {
    const {
      workspaceId,
      portfolioId,
      asOf = new Date().toISOString(),
      targetPackage,
      implementationPlan,
      actualHoldingsSnapshot,
      toleranceWeight = 0.005, // 50 bps tolerance
      toleranceShare = 1       // 1 share rounding tolerance
    } = params;

    if (!workspaceId || !portfolioId) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_WORKSPACE_OR_PORTFOLIO_ID', reconciliation: null };
    }
    if (!targetPackage || !targetPackage.targetWeights) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_TARGET_PACKAGE', reconciliation: null };
    }
    if (!actualHoldingsSnapshot || !Array.isArray(actualHoldingsSnapshot.holdings)) {
      return { status: ImplementationStatus.INSUFFICIENT_DATA, reasonCode: 'MISSING_ACTUAL_HOLDINGS_SNAPSHOT', reconciliation: null };
    }

    const targetWeights = targetPackage.targetWeights;
    const actualHoldings = actualHoldingsSnapshot.holdings;
    const totalActualValue = actualHoldingsSnapshot.totalValue;

    const actualMap = {};
    for (const h of actualHoldings) {
      actualMap[h.ticker] = h;
    }

    const planOrdersMap = {};
    if (implementationPlan && Array.isArray(implementationPlan.orders)) {
      for (const o of implementationPlan.orders) {
        planOrdersMap[o.ticker] = o;
      }
    }

    const allTickers = Array.from(new Set([
      ...Object.keys(targetWeights),
      ...Object.keys(actualMap)
    ])).sort();

    const positionReconciliations = [];
    let matchedCount = 0;
    let driftedCount = 0;
    let missingCount = 0;
    let unexpectedCount = 0;
    let totalWeightError = 0;
    let totalValueDifference = 0;

    for (const ticker of allTickers) {
      const targetWeight = targetWeights[ticker] !== undefined ? targetWeights[ticker] : 0.0;
      const targetValue = targetWeight * totalActualValue;
      const actualH = actualMap[ticker];
      const planO = planOrdersMap[ticker];

      const actualShares = actualH ? actualH.shares : 0;
      const actualPrice = actualH ? actualH.price : (planO ? planO.currentPrice : 0);
      const actualValue = actualH ? actualH.value : 0;
      const actualWeight = totalActualValue > 0 ? (actualValue / totalActualValue) : 0;

      const expectedShares = planO ? planO.targetShares : (actualPrice > 0 ? Math.floor(targetValue / actualPrice) : 0);
      const expectedValue = planO ? planO.targetValue : targetValue;

      const shareDifference = actualShares - expectedShares;
      const valueDifference = actualValue - expectedValue;
      const weightDifference = actualWeight - targetWeight;

      totalWeightError += Math.abs(weightDifference);
      totalValueDifference += Math.abs(valueDifference);

      let status = ReconciliationStatus.MATCHED;

      if (targetWeight > 0 && actualShares === 0) {
        status = ReconciliationStatus.MISSING;
        missingCount++;
      } else if (targetWeight === 0 && actualShares > 0) {
        status = ReconciliationStatus.UNEXPECTED_POSITION;
        unexpectedCount++;
      } else if (Math.abs(weightDifference) > toleranceWeight) {
        if (weightDifference > toleranceWeight) {
          status = ReconciliationStatus.OVER_IMPLEMENTED;
        } else {
          status = ReconciliationStatus.UNDER_IMPLEMENTED;
        }
        driftedCount++;
      } else {
        matchedCount++;
      }

      positionReconciliations.push({
        ticker,
        sector: actualH ? actualH.sector : 'Unassigned',
        targetWeight: Number(targetWeight.toFixed(6)),
        actualWeight: Number(actualWeight.toFixed(6)),
        weightDifference: Number(weightDifference.toFixed(6)),
        targetValue: Number(targetValue.toFixed(4)),
        actualValue: Number(actualValue.toFixed(4)),
        valueDifference: Number(valueDifference.toFixed(4)),
        expectedShares,
        actualShares,
        shareDifference,
        status
      });
    }

    const completenessRatio = allTickers.length > 0
      ? Number((matchedCount / allTickers.length).toFixed(4))
      : 1.0;

    let overallStatus = ImplementationStatus.RECONCILED;
    if (missingCount > 0 || unexpectedCount > 0) {
      overallStatus = ImplementationStatus.INCOMPLETE_RECONCILIATION;
    } else if (driftedCount > 0) {
      overallStatus = ImplementationStatus.DRIFTED;
    }

    const payload = {
      reconciliationId: `RECON-${portfolioId}-${asOf.replace(/[:.]/g, '-')}`,
      workspaceId,
      portfolioId,
      asOf,
      targetPackageHash: targetPackage.packageHash || null,
      actualHoldingsSnapshotHash: actualHoldingsSnapshot.snapshotHash || null,
      planHash: implementationPlan ? implementationPlan.planHash : null,
      overallStatus,
      completenessRatio,
      totalPositionsAudited: allTickers.length,
      matchedCount,
      driftedCount,
      missingCount,
      unexpectedCount,
      totalWeightError: Number(totalWeightError.toFixed(6)),
      totalValueDifference: Number(totalValueDifference.toFixed(4)),
      positions: positionReconciliations,
      createdAt: asOf
    };

    const hash = canonicalHash(payload);
    const sealedReconciliation = deepFreeze({
      ...payload,
      reconciliationHash: hash
    });

    return {
      status: overallStatus,
      reconciliation: sealedReconciliation
    };
  }
}
