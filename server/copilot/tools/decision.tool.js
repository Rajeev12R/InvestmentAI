/**
 * @file decision.tool.js
 * Deterministic tool adapter for retrieving conviction scores, thesis states, and investment decisions.
 */

import { workspaceRepository } from '../../workspace/workspace.repository.js';

/**
 * Retrieves deterministic decision and conviction state for a ticker.
 * @param {string} workspaceId
 * @param {string} ticker
 * @returns {Object} Decision context
 */
export async function getDecisionContext(workspaceId = 'DEFAULT_WORKSPACE', ticker) {
  if (!ticker) return { status: 'UNAVAILABLE', decision: 'UNKNOWN' };
  const upperTicker = ticker.toUpperCase();
  const snapshot = workspaceRepository.getLatestSnapshot(workspaceId, upperTicker);

  const dec = snapshot?.decision || {};
  const thesis = snapshot?.thesis || {};

  return {
    ticker: upperTicker,
    status: snapshot?.decision ? 'AVAILABLE' : 'UNAVAILABLE',
    decision: dec.decision || 'UNKNOWN',
    convictionScore: dec.convictionScore !== undefined ? dec.convictionScore : null,
    convictionLevel: dec.convictionLevel || 'UNKNOWN',
    rationale: dec.rationale || [],
    thesis: {
      status: thesis.status || 'ACTIVE',
      coreThesis: thesis.coreThesis || null,
      breakers: snapshot?.thesisBreakers || thesis.breakers || [],
      catalysts: thesis.catalysts || []
    },
    evidenceIds: dec.evidenceIds || []
  };
}
