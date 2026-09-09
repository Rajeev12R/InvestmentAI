/**
 * @file valuation.tool.js
 * Deterministic tool adapter for retrieving DCF, relative valuation, and model agreements.
 */

import { workspaceRepository } from '../../workspace/workspace.repository.js';

/**
 * Retrieves valuation models and metrics for a ticker.
 * @param {string} workspaceId
 * @param {string} ticker
 * @returns {Object} Valuation context
 */
export async function getValuationContext(workspaceId = 'DEFAULT_WORKSPACE', ticker) {
  if (!ticker) return { status: 'UNAVAILABLE', dcf: null, relative: null };
  const upperTicker = ticker.toUpperCase();
  const snapshot = workspaceRepository.getLatestSnapshot(workspaceId, upperTicker);

  const val = snapshot?.valuation || {};

  return {
    ticker: upperTicker,
    status: snapshot?.valuation ? 'AVAILABLE' : 'UNAVAILABLE',
    dcfValue: val.dcfValue || val.fairValue || null,
    currentPrice: val.currentPrice || snapshot?.currentPrice || null,
    marginOfSafety: val.marginOfSafety !== undefined ? val.marginOfSafety : null,
    relativeValuation: val.relativeValuation || null,
    modelAgreement: val.modelAgreement || null,
    evidenceIds: val.evidenceIds || []
  };
}
