/**
 * @file research.tool.js
 * Deterministic tool adapter for querying and initiating Phase 4 Research packages.
 */

import { researchCache } from '../../research/researchCache.js';

/**
 * Retrieves existing or grounded research intelligence.
 * @param {string} workspaceId
 * @param {string} ticker
 * @param {string} [question]
 * @returns {Object} Research intelligence context
 */
export async function getResearchContext(workspaceId = 'DEFAULT_WORKSPACE', ticker, question = null) {
  if (!ticker) return { status: 'UNAVAILABLE', findings: [] };
  const upperTicker = ticker.toUpperCase();

  const existing = researchCache.get?.(upperTicker) || null;

  return {
    ticker: upperTicker,
    status: existing ? 'AVAILABLE' : 'NO_PREVIOUS_RESEARCH',
    packageId: existing?.packageId || null,
    packageHash: existing?.packageHash || 'HASH_UNKNOWN',
    primaryQuestion: existing?.question || question || `Grounded research on ${upperTicker}`,
    findings: existing?.findings || [],
    keyRisks: existing?.keyRisks || [],
    evidenceIds: existing?.evidenceIds || []
  };
}
