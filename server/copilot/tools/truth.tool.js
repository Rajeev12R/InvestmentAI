import { workspaceRepository } from '../../workspace/workspace.repository.js';

/**
 * Retrieves the latest sealed Truth state for a ticker.
 * @param {string} workspaceId
 * @param {string} ticker
 * @returns {Object} Sealed truth summary and facts
 */
export async function getTruthContext(workspaceId = 'DEFAULT_WORKSPACE', ticker) {
  if (!ticker) return { status: 'UNAVAILABLE', financialFacts: {}, calculatedMetrics: {}, evidenceIds: [] };
  const upperTicker = ticker.toUpperCase();
  const snapshot = workspaceRepository.getLatestSnapshot(workspaceId, upperTicker);

  return {
    ticker: upperTicker,
    snapshotId: snapshot?.snapshotId || null,
    packageHash: snapshot?.packageHash || 'HASH_UNKNOWN',
    financialFacts: snapshot?.financialFacts || {},
    calculatedMetrics: snapshot?.calculatedMetrics || {},
    evidenceIds: snapshot?.evidenceIds || [],
    status: snapshot ? 'AVAILABLE' : 'UNAVAILABLE'
  };
}
