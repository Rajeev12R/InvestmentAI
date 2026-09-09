/**
 * @file portfolioConstruction.tool.js
 * Read-only Copilot Tool Adapter for Phase 14 Portfolio Construction & Optimization Packages.
 * AI consumes only sealed packages; cannot calculate, alter, or override target weights or execute trades.
 */

import { portfolioConstructionRepository } from '../../portfolioConstruction/portfolioConstruction.repository.js';
import { ScenarioEngine } from '../../portfolioConstruction/portfolioConstruction.scenario.engine.js';
import { PortfolioComparisonEngine } from '../../portfolioConstruction/portfolioConstruction.comparison.engine.js';

/**
 * Retrieves the latest sealed portfolio construction package for Copilot interpretation.
 */
export async function getPortfolioConstructionPackage(portfolioId, workspaceId = 'DEFAULT_WS') {
  const packages = portfolioConstructionRepository.listPackagesByPortfolio(portfolioId, workspaceId);
  if (!packages || packages.length === 0) {
    return {
      status: 'UNAVAILABLE',
      reason: `No portfolio construction package found for portfolioId: ${portfolioId} in workspace: ${workspaceId}`
    };
  }

  const pkg = packages[0];
  return {
    packageId: pkg.packageId,
    workspaceId: pkg.workspaceId,
    portfolioId: pkg.portfolioId,
    optimizationMethod: pkg.optimizationMethod,
    optimizationStatus: pkg.optimizationStatus,
    executionStatus: pkg.executionStatus,
    targetWeights: pkg.targetWeights,
    currentWeights: pkg.currentWeights,
    expectedReturn: pkg.expectedReturn,
    portfolioRisk: pkg.portfolioRisk,
    turnover: pkg.turnover,
    riskBudget: pkg.riskBudget,
    diversification: pkg.diversification,
    liquidity: pkg.liquidity,
    transactionCosts: pkg.transactionCosts,
    explanationGraph: pkg.explanationGraph,
    stressTesting: pkg.stressTesting,
    packageHash: pkg.packageHash,
    asOf: pkg.asOf,
    createdAt: pkg.createdAt
  };
}

/**
 * Explains allocation for a specific ticker using the sealed explanation graph.
 */
export async function explainTickerAllocation(portfolioId, ticker, workspaceId = 'DEFAULT_WS') {
  const pkgRes = await getPortfolioConstructionPackage(portfolioId, workspaceId);
  if (pkgRes.status === 'UNAVAILABLE') return pkgRes;

  const targetWeight = pkgRes.targetWeights[ticker];
  if (targetWeight === undefined) {
    return {
      status: 'NOT_FOUND',
      message: `Ticker ${ticker} is not part of target portfolio allocation for ${portfolioId}`
    };
  }

  const graph = pkgRes.explanationGraph;
  const tickerNodes = graph?.nodes?.filter(n => n.ticker === ticker) || [];
  const riskContribution = pkgRes.riskBudget?.byTicker?.find(b => b.ticker === ticker);

  return {
    ticker,
    portfolioId,
    targetWeight,
    optimizationMethod: pkgRes.optimizationMethod,
    riskContribution,
    causalNodes: tickerNodes,
    packageHash: pkgRes.packageHash
  };
}

/**
 * Simulates a what-if scenario through Copilot (read-only, does not mutate state).
 */
export async function simulateCopilotScenario(portfolioId, scenarioSpec, workspaceId = 'DEFAULT_WS') {
  const pkgRes = await getPortfolioConstructionPackage(portfolioId, workspaceId);
  if (pkgRes.status === 'UNAVAILABLE') return pkgRes;

  const baseline = {
    weights: pkgRes.targetWeights,
    portfolioVolatility: pkgRes.portfolioRisk
  };

  const sim = ScenarioEngine.runScenario(baseline, scenarioSpec);
  return {
    portfolioId,
    scenarioName: scenarioSpec.name || scenarioSpec.action,
    baselineAllocation: pkgRes.targetWeights,
    simulatedAllocation: sim.scenarioWeights,
    turnover: sim.turnover,
    impact: sim.impact,
    warning: "Hypothetical what-if simulation only. Real portfolio state is immutable."
  };
}
