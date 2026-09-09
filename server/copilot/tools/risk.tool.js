/**
 * @file risk.tool.js
 * Deterministic tool adapter for retrieving risk profiles, signals, and category breakdowns.
 */

import { workspaceRepository } from '../../workspace/workspace.repository.js';

/**
 * Retrieves institutional risk metrics for a ticker.
 * @param {string} workspaceId
 * @param {string} ticker
 * @returns {Object} Risk context
 */
export async function getRiskContext(workspaceId = 'DEFAULT_WORKSPACE', ticker) {
  if (!ticker) return { status: 'UNAVAILABLE', overallRisk: 'UNKNOWN' };
  const upperTicker = ticker.toUpperCase();
  const snapshot = workspaceRepository.getLatestSnapshot(workspaceId, upperTicker);

  const risk = snapshot?.risk || {};

  return {
    ticker: upperTicker,
    status: snapshot?.risk ? 'AVAILABLE' : 'UNAVAILABLE',
    overallRisk: risk.overallRisk || risk.riskLevel || 'UNKNOWN',
    riskScore: risk.riskScore !== undefined ? risk.riskScore : null,
    categoryBreakdowns: risk.categoryBreakdowns || {},
    signals: risk.signals || [],
    evidenceIds: risk.evidenceIds || []
  };
}
