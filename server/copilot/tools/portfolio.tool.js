/**
 * @file portfolio.tool.js
 * Deterministic tool adapter for retrieving HHI, N_eff, exposure, and correlation clustering.
 */

import { buildPortfolioDailyState } from '../../portfolioIntelligence/portfolioIntelligence.engine.js';
import { calculatePortfolioExposure } from '../../portfolioIntelligence/exposure.engine.js';
import { workspaceRepository } from '../../workspace/workspace.repository.js';

/**
 * Retrieves portfolio concentration, exposure, and risk cluster metrics.
 * @param {string} workspaceId
 * @returns {Object} Portfolio analytics context
 */
export async function getPortfolioContext(workspaceId = 'DEFAULT_WORKSPACE') {
  const workspace = workspaceRepository.getWorkspace(workspaceId);
  const holdings = workspace?.holdings || [];

  const exposure = calculatePortfolioExposure(holdings);

  return {
    workspaceId,
    status: holdings.length > 0 ? 'AVAILABLE' : 'EMPTY_PORTFOLIO',
    holdingsCount: holdings.length,
    holdings: holdings.map(h => ({
      ticker: h.ticker,
      weight: h.weight,
      sector: h.sector || 'Unassigned',
      decision: h.decision || 'UNKNOWN'
    })),
    top1Weight: exposure.top1Weight,
    top3Weight: exposure.top3Weight,
    top5Weight: exposure.top5Weight,
    hhi: exposure.hhi,
    nEff: exposure.nEff,
    concentrationLevel: exposure.concentrationLevel,
    sectorExposure: exposure.sectorExposure,
    correlationClusters: exposure.correlationClusters || [],
    correlationLevel: exposure.correlationLevel
  };
}
