/**
 * Phase 15 — Constraint Monitoring Engine
 * 
 * Reuses Phase 14 constraint definitions and continuously audits actual holdings against
 * institutional mandate boundaries (max/min position, sector caps, cash, leverage, liquidity).
 */

import { ConstraintStatus, ImplementationStatus, canonicalHash, deepFreeze } from './implementation.types.js';
import { IMPLEMENTATION_POLICY_V1 } from './implementation.config.js';

export class ConstraintMonitoringEngine {
  /**
   * Evaluate actual holdings against active constraints specification.
   */
  static monitorConstraints(params) {
    const {
      workspaceId,
      portfolioId,
      asOf = new Date().toISOString(),
      actualHoldingsSnapshot,
      constraints = {},
      policy = IMPLEMENTATION_POLICY_V1
    } = params;

    if (!workspaceId || !portfolioId) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_WORKSPACE_OR_PORTFOLIO_ID', constraintReport: null };
    }
    if (!actualHoldingsSnapshot || !Array.isArray(actualHoldingsSnapshot.holdings)) {
      return { status: ImplementationStatus.INSUFFICIENT_DATA, reasonCode: 'MISSING_ACTUAL_HOLDINGS_SNAPSHOT', constraintReport: null };
    }

    const holdings = actualHoldingsSnapshot.holdings;
    const cashWeight = actualHoldingsSnapshot.cashWeight || 0.0;
    const evaluatedConstraints = [];

    let hasBreach = false;
    let hasWarning = false;

    // 1. Max Position Limit
    const defaultMaxWeight = constraints.defaultMaxWeight ?? 0.40;
    const positionMaxWeights = constraints.positionMaxWeights || {};
    for (const h of holdings) {
      const limit = positionMaxWeights[h.ticker] ?? defaultMaxWeight;
      const actual = h.weight;
      const distance = limit - actual;

      let status = ConstraintStatus.PASS;
      if (actual > limit + 1e-5) {
        status = ConstraintStatus.BREACH;
        hasBreach = true;
      } else if (actual > limit * 0.90) {
        status = ConstraintStatus.WARNING;
        hasWarning = true;
      }

      evaluatedConstraints.push({
        constraintId: `MAX_POSITION_${h.ticker}`,
        type: 'MAX_POSITION',
        targetEntity: h.ticker,
        configuredLimit: Number(limit.toFixed(6)),
        actualValue: Number(actual.toFixed(6)),
        distanceToLimit: Number(distance.toFixed(6)),
        status
      });
    }

    // 2. Min Position Limit (if asset held)
    const positionMinWeights = constraints.positionMinWeights || {};
    for (const h of holdings) {
      if (positionMinWeights[h.ticker] !== undefined) {
        const limit = positionMinWeights[h.ticker];
        const actual = h.weight;
        const distance = actual - limit;

        let status = ConstraintStatus.PASS;
        if (actual < limit - 1e-5) {
          status = ConstraintStatus.BREACH;
          hasBreach = true;
        }

        evaluatedConstraints.push({
          constraintId: `MIN_POSITION_${h.ticker}`,
          type: 'MIN_POSITION',
          targetEntity: h.ticker,
          configuredLimit: Number(limit.toFixed(6)),
          actualValue: Number(actual.toFixed(6)),
          distanceToLimit: Number(distance.toFixed(6)),
          status
        });
      }
    }

    // 3. Sector Max Limits
    const sectorMaxWeights = constraints.sectorMaxWeights || {};
    const sectorHoldingsMap = {};
    for (const h of holdings) {
      const sec = h.sector || 'Unassigned';
      sectorHoldingsMap[sec] = (sectorHoldingsMap[sec] || 0) + h.weight;
    }

    for (const [sec, actual] of Object.entries(sectorHoldingsMap)) {
      const limit = sectorMaxWeights[sec] ?? (constraints.defaultMaxSectorWeight ?? 1.0);
      const distance = limit - actual;

      let status = ConstraintStatus.PASS;
      if (actual > limit + 1e-5) {
        status = ConstraintStatus.BREACH;
        hasBreach = true;
      } else if (actual > limit * 0.90) {
        status = ConstraintStatus.WARNING;
        hasWarning = true;
      }

      evaluatedConstraints.push({
        constraintId: `MAX_SECTOR_${sec}`,
        type: 'MAX_SECTOR',
        targetEntity: sec,
        configuredLimit: Number(limit.toFixed(6)),
        actualValue: Number(actual.toFixed(6)),
        distanceToLimit: Number(distance.toFixed(6)),
        status
      });
    }

    // 4. Cash Limits
    const minCash = constraints.defaultMinCash ?? 0.0;
    const maxCash = constraints.defaultMaxCash ?? 0.25;

    let minCashStatus = ConstraintStatus.PASS;
    if (cashWeight < minCash - 1e-5) {
      minCashStatus = ConstraintStatus.BREACH;
      hasBreach = true;
    }
    evaluatedConstraints.push({
      constraintId: 'MIN_CASH_BUFFER',
      type: 'MIN_CASH',
      targetEntity: 'PORTFOLIO_CASH',
      configuredLimit: Number(minCash.toFixed(6)),
      actualValue: Number(cashWeight.toFixed(6)),
      distanceToLimit: Number((cashWeight - minCash).toFixed(6)),
      status: minCashStatus
    });

    let maxCashStatus = ConstraintStatus.PASS;
    if (cashWeight > maxCash + 1e-5) {
      maxCashStatus = ConstraintStatus.BREACH;
      hasBreach = true;
    }
    evaluatedConstraints.push({
      constraintId: 'MAX_CASH_CAP',
      type: 'MAX_CASH',
      targetEntity: 'PORTFOLIO_CASH',
      configuredLimit: Number(maxCash.toFixed(6)),
      actualValue: Number(cashWeight.toFixed(6)),
      distanceToLimit: Number((maxCash - cashWeight).toFixed(6)),
      status: maxCashStatus
    });

    // 5. Long-Only & Leverage Invariants
    const allowShorting = constraints.defaultAllowShorting ?? false;
    let shortingBreach = false;
    for (const h of holdings) {
      if (!allowShorting && (h.shares < 0 || h.weight < -1e-6)) {
        shortingBreach = true;
        hasBreach = true;
      }
    }
    evaluatedConstraints.push({
      constraintId: 'LONG_ONLY_MANDATE',
      type: 'LONG_ONLY',
      targetEntity: 'ALL_SECURITIES',
      configuredLimit: 0.0,
      actualValue: shortingBreach ? -1 : 0,
      distanceToLimit: shortingBreach ? -1 : 0,
      status: shortingBreach ? ConstraintStatus.BREACH : ConstraintStatus.PASS
    });

    const overallStatus = hasBreach
      ? ConstraintStatus.BREACH
      : (hasWarning ? ConstraintStatus.WARNING : ConstraintStatus.PASS);

    const payload = {
      reportId: `CONST-MON-${portfolioId}-${asOf.replace(/[:.]/g, '-')}`,
      workspaceId,
      portfolioId,
      asOf,
      overallStatus,
      breachCount: evaluatedConstraints.filter(c => c.status === ConstraintStatus.BREACH).length,
      warningCount: evaluatedConstraints.filter(c => c.status === ConstraintStatus.WARNING).length,
      totalAudited: evaluatedConstraints.length,
      constraints: evaluatedConstraints,
      createdAt: asOf
    };

    const hash = canonicalHash(payload);
    const sealedReport = deepFreeze({
      ...payload,
      reportHash: hash
    });

    return {
      status: ImplementationStatus.RECONCILED,
      constraintReport: sealedReport
    };
  }
}
