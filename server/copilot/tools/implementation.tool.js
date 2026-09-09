/**
 * @file implementation.tool.js
 * Read-only Copilot Tool Adapter for Phase 15 Portfolio Implementation, Monitoring & Rebalancing.
 * AI consumes only sealed packages; cannot fabricate holdings, approve plans, or execute trades.
 */

import { implementationRepository } from '../../implementation/implementation.repository.js';

/**
 * Retrieves the latest sealed implementation package for Copilot interpretation.
 */
export async function getImplementationPackage(portfolioId, workspaceId = 'DEFAULT_WS') {
  if (portfolioId && typeof portfolioId === 'object') {
    const params = portfolioId;
    portfolioId = params.portfolioId;
    workspaceId = params.workspaceId || 'DEFAULT_WS';
  }
  const packages = implementationRepository.listPackagesByPortfolio(portfolioId, workspaceId);
  if (!packages || packages.length === 0) {
    return {
      status: 'UNAVAILABLE',
      reason: `No implementation package found for portfolioId: ${portfolioId} in workspace: ${workspaceId}`
    };
  }

  const pkg = packages[0];
  return {
    status: 'SUCCESS',
    package: pkg,
    packageId: pkg.packageId,
    workspaceId: pkg.workspaceId,
    portfolioId: pkg.portfolioId,
    asOf: pkg.asOf,
    policyVersion: pkg.policyVersion,
    targetPortfolio: pkg.targetPortfolio,
    implementationPlan: pkg.implementationPlan,
    holdingsSnapshot: pkg.holdingsSnapshot,
    reconciliation: pkg.reconciliation,
    driftReport: pkg.driftReport,
    constraintReport: pkg.constraintReport,
    triggerReport: pkg.triggerReport,
    impactReport: pkg.impactReport,
    qualityReport: pkg.qualityReport,
    rebalanceCandidate: pkg.rebalanceCandidate,
    packageHash: pkg.packageHash,
    createdAt: pkg.createdAt
  };
}

/**
 * Explains allocation drift for a specific ticker using the sealed drift report.
 */
export async function explainDrift(portfolioId, ticker, workspaceId = 'DEFAULT_WS') {
  const pkgRes = await getImplementationPackage(portfolioId, workspaceId);
  if (pkgRes.status === 'UNAVAILABLE') return pkgRes;

  const positionDrifts = pkgRes.driftReport?.positions || [];
  const pos = positionDrifts.find(p => p.ticker === ticker);

  if (!pos) {
    return {
      status: 'NOT_FOUND',
      message: `Ticker ${ticker} is not part of tracked positions for ${portfolioId}`
    };
  }

  return {
    ticker: pos.ticker,
    sector: pos.sector,
    targetWeight: pos.targetWeight,
    actualWeight: pos.actualWeight,
    driftDelta: pos.driftDelta,
    absoluteDrift: pos.absoluteDrift,
    relativeDrift: pos.relativeDrift,
    status: pos.status,
    packageHash: pkgRes.packageHash,
    explanation: `Ticker ${ticker} has an actual weight of ${(pos.actualWeight * 100).toFixed(2)}% vs target ${(pos.targetWeight * 100).toFixed(2)}%, resulting in absolute drift of ${(pos.absoluteDrift * 100).toFixed(2)}% (Status: ${pos.status}).`
  };
}

/**
 * Explains why rebalancing is or is not recommended.
 */
export async function explainRebalanceRecommendation(portfolioId, workspaceId = 'DEFAULT_WS') {
  const pkgRes = await getImplementationPackage(portfolioId, workspaceId);
  if (pkgRes.status === 'UNAVAILABLE') return pkgRes;

  const triggerReport = pkgRes.triggerReport;
  const impactReport = pkgRes.impactReport;

  return {
    rebalanceStatus: triggerReport?.rebalanceStatus || 'NO_REBALANCE',
    activeTriggerCount: triggerReport?.activeTriggerCount || 0,
    primaryTrigger: triggerReport?.primaryTrigger || 'NONE',
    activeTriggers: triggerReport?.activeTriggers || [],
    totalCostBps: impactReport?.totalCostBps || 0,
    netExpectedBenefitBps: impactReport?.netExpectedBenefitBps || 'UNAVAILABLE',
    isEconomicallyJustified: impactReport?.isEconomicallyJustified ?? true,
    packageHash: pkgRes.packageHash,
    summary: triggerReport?.activeTriggerCount > 0
      ? `Rebalance ${triggerReport.rebalanceStatus} due to: ${triggerReport.activeTriggers.map(t => t.reason).join('; ')}`
      : 'Portfolio remains within mandate tolerances; no rebalance required.'
  };
}

/**
 * Returns any active mandate constraint violations.
 */
export async function explainConstraintViolations(portfolioId, workspaceId = 'DEFAULT_WS') {
  const pkgRes = await getImplementationPackage(portfolioId, workspaceId);
  if (pkgRes.status === 'UNAVAILABLE') return pkgRes;

  const constraintReport = pkgRes.constraintReport;
  const breaches = (constraintReport?.constraints || []).filter(c => c.status === 'BREACH');
  const warnings = (constraintReport?.constraints || []).filter(c => c.status === 'WARNING');

  return {
    overallStatus: constraintReport?.overallStatus || 'PASS',
    breachCount: breaches.length,
    warningCount: warnings.length,
    breaches,
    warnings,
    packageHash: pkgRes.packageHash
  };
}

/**
 * Explains reconciliation discrepancy for a specific holding.
 */
export async function explainHoldingDiscrepancy(portfolioId, ticker, workspaceId = 'DEFAULT_WS') {
  if (typeof portfolioId === 'object') {
    const params = portfolioId;
    portfolioId = params.portfolioId;
    ticker = params.ticker;
    workspaceId = params.workspaceId || 'DEFAULT_WS';
  }

  const pkgRes = await getImplementationPackage(portfolioId, workspaceId);
  if (pkgRes.status === 'UNAVAILABLE') return pkgRes;

  const reconPositions = pkgRes.reconciliation?.positions || [];
  const pos = reconPositions.find(p => p.ticker === ticker);

  if (!pos) {
    return {
      status: 'NOT_FOUND',
      ticker,
      message: `Holding ${ticker} was not found in reconciliation for portfolio ${portfolioId}`
    };
  }

  return {
    status: 'SUCCESS',
    ticker: pos.ticker,
    reconciliationStatus: pos.status,
    targetWeight: pos.targetWeight,
    actualWeight: pos.actualWeight,
    weightDifference: pos.weightDifference,
    packageHash: pkgRes.packageHash,
    explanation: `Position ${ticker} is ${pos.status} (target: ${(pos.targetWeight * 100).toFixed(2)}%, actual: ${(pos.actualWeight * 100).toFixed(2)}%).`
  };
}
