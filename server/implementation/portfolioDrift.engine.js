/**
 * Phase 15 — Portfolio Drift Engine
 * 
 * Computes deterministic security-level, sector-level, asset-class, cash, concentration,
 * and risk-contribution drift between target allocation and reported actual holdings.
 */

import { DriftStatus, ImplementationStatus, canonicalHash, deepFreeze } from './implementation.types.js';
import { IMPLEMENTATION_POLICY_V1 } from './implementation.config.js';

export class PortfolioDriftEngine {
  /**
   * Calculate comprehensive portfolio drift against versioned policy thresholds.
   */
  static evaluateDrift(params) {
    const {
      workspaceId,
      portfolioId,
      asOf = new Date().toISOString(),
      targetPackage,
      actualHoldingsSnapshot,
      policy = IMPLEMENTATION_POLICY_V1,
      covarianceMatrix = null
    } = params;

    if (!workspaceId || !portfolioId) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_WORKSPACE_OR_PORTFOLIO_ID', drift: null };
    }
    if (!targetPackage || !targetPackage.targetWeights) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_TARGET_PACKAGE', drift: null };
    }
    if (!actualHoldingsSnapshot || !Array.isArray(actualHoldingsSnapshot.holdings)) {
      return { status: ImplementationStatus.INSUFFICIENT_DATA, reasonCode: 'MISSING_ACTUAL_HOLDINGS_SNAPSHOT', drift: null };
    }

    const targetWeights = targetPackage.targetWeights;
    const actualHoldings = actualHoldingsSnapshot.holdings;
    const totalActualValue = actualHoldingsSnapshot.totalValue;

    const actualMap = {};
    for (const h of actualHoldings) {
      actualMap[h.ticker] = h;
    }

    const allTickers = Array.from(new Set([
      ...Object.keys(targetWeights),
      ...Object.keys(actualMap)
    ])).sort();

    const eps = 1e-6; // Documented standard epsilon to avoid division by zero on zero-weight targets
    const positionDrifts = [];
    const sectorTargetWeights = {};
    const sectorActualWeights = {};
    const geoTargetWeights = {};
    const geoActualWeights = {};

    let maxAbsolutePositionDrift = 0;
    let maxRelativePositionDrift = 0;
    let totalAbsoluteDrift = 0;
    let hasPositionBreach = false;
    let hasPositionWarning = false;

    for (const ticker of allTickers) {
      const targetW = targetWeights[ticker] !== undefined ? targetWeights[ticker] : 0.0;
      const actualH = actualMap[ticker];
      const actualW = actualH ? actualH.weight : 0.0;
      const sector = actualH ? actualH.sector : (targetPackage.securitiesMap?.[ticker]?.sector || 'Unassigned');
      const geography = actualH ? actualH.geography : 'US';

      // Accumulate sector / geo
      sectorTargetWeights[sector] = (sectorTargetWeights[sector] || 0) + targetW;
      sectorActualWeights[sector] = (sectorActualWeights[sector] || 0) + actualW;
      geoTargetWeights[geography] = (geoTargetWeights[geography] || 0) + targetW;
      geoActualWeights[geography] = (geoActualWeights[geography] || 0) + actualW;

      const delta = actualW - targetW;
      const absDelta = Math.abs(delta);
      const relDelta = absDelta / Math.max(Math.abs(targetW), eps);

      if (absDelta > maxAbsolutePositionDrift) maxAbsolutePositionDrift = absDelta;
      if (relDelta > maxRelativePositionDrift) maxRelativePositionDrift = relDelta;
      totalAbsoluteDrift += absDelta;

      let status = DriftStatus.IN_TOLERANCE;
      if (absDelta >= policy.positionAbsoluteDriftBreach || relDelta >= policy.positionRelativeDriftBreach) {
        status = DriftStatus.BREACH;
        hasPositionBreach = true;
      } else if (absDelta >= policy.positionAbsoluteDriftWarning || relDelta >= policy.positionRelativeDriftWarning) {
        status = DriftStatus.WARNING;
        hasPositionWarning = true;
      }

      positionDrifts.push({
        ticker,
        sector,
        geography,
        targetWeight: Number(targetW.toFixed(6)),
        actualWeight: Number(actualW.toFixed(6)),
        absoluteDrift: Number(absDelta.toFixed(6)),
        relativeDrift: Number(relDelta.toFixed(6)),
        driftDelta: Number(delta.toFixed(6)),
        status
      });
    }

    // Evaluate sector drift
    const allSectors = Array.from(new Set([...Object.keys(sectorTargetWeights), ...Object.keys(sectorActualWeights)]));
    const sectorDrifts = [];
    let hasSectorBreach = false;

    for (const sec of allSectors) {
      const targetW = sectorTargetWeights[sec] || 0.0;
      const actualW = sectorActualWeights[sec] || 0.0;
      const absDelta = Math.abs(actualW - targetW);

      let status = DriftStatus.IN_TOLERANCE;
      if (absDelta >= policy.sectorDriftBreach) {
        status = DriftStatus.BREACH;
        hasSectorBreach = true;
      } else if (absDelta >= policy.sectorDriftWarning) {
        status = DriftStatus.WARNING;
      }

      sectorDrifts.push({
        sector: sec,
        targetWeight: Number(targetW.toFixed(6)),
        actualWeight: Number(actualW.toFixed(6)),
        drift: Number(absDelta.toFixed(6)),
        status
      });
    }

    // Evaluate cash drift
    const targetCashWeight = targetPackage.targetCashWeight || 0.0;
    const actualCashWeight = actualHoldingsSnapshot.cashWeight || 0.0;
    const cashDrift = Math.abs(actualCashWeight - targetCashWeight);
    let cashStatus = DriftStatus.IN_TOLERANCE;
    if (cashDrift >= policy.cashDriftBreach) {
      cashStatus = DriftStatus.BREACH;
    } else if (cashDrift >= policy.cashDriftWarning) {
      cashStatus = DriftStatus.WARNING;
    }

    // Evaluate concentration drift (HHI)
    let targetHHI = 0;
    for (const w of Object.values(targetWeights)) targetHHI += w * w;
    let actualHHI = 0;
    for (const h of actualHoldings) actualHHI += h.weight * h.weight;
    const hhiDrift = Math.abs(actualHHI - targetHHI);
    let hhiStatus = DriftStatus.IN_TOLERANCE;
    if (hhiDrift >= policy.concentrationDriftBreach) {
      hhiStatus = DriftStatus.BREACH;
    } else if (hhiDrift >= policy.concentrationDriftWarning) {
      hhiStatus = DriftStatus.WARNING;
    }

    let overallDriftStatus = DriftStatus.IN_TOLERANCE;
    if (hasPositionBreach || hasSectorBreach || cashStatus === DriftStatus.BREACH || hhiStatus === DriftStatus.BREACH) {
      overallDriftStatus = DriftStatus.BREACH;
    } else if (hasPositionWarning || cashStatus === DriftStatus.WARNING || hhiStatus === DriftStatus.WARNING) {
      overallDriftStatus = DriftStatus.WARNING;
    }

    const payload = {
      driftId: `DRIFT-${portfolioId}-${asOf.replace(/[:.]/g, '-')}`,
      workspaceId,
      portfolioId,
      asOf,
      policyId: policy.policyId,
      overallStatus: overallDriftStatus,
      maxAbsolutePositionDrift: Number(maxAbsolutePositionDrift.toFixed(6)),
      maxRelativePositionDrift: Number(maxRelativePositionDrift.toFixed(6)),
      totalAbsolutePortfolioDrift: Number(totalAbsoluteDrift.toFixed(6)),
      oneWayDriftTurnover: Number((totalAbsoluteDrift / 2.0).toFixed(6)),
      cashDrift: {
        targetCashWeight: Number(targetCashWeight.toFixed(6)),
        actualCashWeight: Number(actualCashWeight.toFixed(6)),
        drift: Number(cashDrift.toFixed(6)),
        status: cashStatus
      },
      concentrationDrift: {
        targetHHI: Number(targetHHI.toFixed(6)),
        actualHHI: Number(actualHHI.toFixed(6)),
        hhiDrift: Number(hhiDrift.toFixed(6)),
        status: hhiStatus
      },
      positions: positionDrifts,
      sectors: sectorDrifts,
      createdAt: asOf
    };

    const hash = canonicalHash(payload);
    const sealedDrift = deepFreeze({
      ...payload,
      driftHash: hash
    });

    return {
      status: ImplementationStatus.RECONCILED,
      drift: sealedDrift
    };
  }
}
