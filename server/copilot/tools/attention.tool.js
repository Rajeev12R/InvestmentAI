/**
 * @file attention.tool.js
 * Deterministic tool adapter for retrieving Phase 7 Attention Intelligence packages & items.
 */

import { attentionRepository } from '../../attention/attention.repository.js';

/**
 * Retrieves Attention Package and items for a workspace or ticker.
 * @param {string} workspaceId
 * @param {string} [ticker]
 * @returns {Object} Attention context
 */
export async function getAttentionContext(workspaceId = 'DEFAULT_WORKSPACE', ticker = null) {
  const pkg = attentionRepository.getLatestPackage(workspaceId);
  if (!pkg) {
    return {
      status: 'UNAVAILABLE',
      packageId: null,
      attentionItems: [],
      prioritySummary: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFORMATIONAL: 0 }
    };
  }

  const items = ticker
    ? pkg.attentionItems.filter(i => i.ticker?.toUpperCase() === ticker.toUpperCase())
    : pkg.attentionItems;

  return {
    status: 'AVAILABLE',
    packageId: pkg.packageId,
    packageHash: pkg.packageHash,
    prioritySummary: pkg.prioritySummary,
    attentionItems: items,
    totalCount: items.length
  };
}
