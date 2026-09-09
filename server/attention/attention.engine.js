/**
 * @file attention.engine.js
 * Master orchestrator for Phase 7 Attention Intelligence.
 * Aggregates company and portfolio signals, deduplicates, prioritizes, and produces
 * a cryptographically sealed AttentionIntelligencePackage.
 */

import crypto from 'crypto';
import { evaluateCompanyAttention } from './attention.company.engine.js';
import { evaluatePortfolioAttention } from './attention.portfolio.engine.js';
import { deduplicateAttentionItems } from './attention.deduplication.js';
import { validateAttentionItem } from './attention.types.js';

/**
 * Builds and seals a complete AttentionIntelligencePackage.
 * @param {Object} params
 * @param {string} [params.workspaceId]
 * @param {Array<Object>} [params.companyTransitions] Array of { ticker, previousSnapshot, currentSnapshot, changePackage, recentEvents, portfolioWeight }
 * @param {Object} [params.portfolioState] Output from portfolioIntelligence.engine.js
 * @returns {Object} Sealed AttentionIntelligencePackage
 */
export function generateAttentionPackage({
  workspaceId = 'DEFAULT_WORKSPACE',
  companyTransitions = [],
  portfolioState = null,
  generatedAt = null
}) {
  const rawCandidates = [];
  const packageTimestamp = generatedAt || new Date().toISOString();

  // 1. Process Company Transitions & Events
  for (const trans of companyTransitions) {
    const items = evaluateCompanyAttention({ ...trans, generatedAt: packageTimestamp });
    rawCandidates.push(...items);
  }

  // 2. Process Portfolio Signals
  if (portfolioState) {
    const portItems = evaluatePortfolioAttention({ portfolioState });
    rawCandidates.push(...portItems);
  }

  // 3. Deduplicate and Cluster
  const attentionItems = deduplicateAttentionItems(rawCandidates);

  // 4. Validate each attention item
  for (const item of attentionItems) {
    const val = validateAttentionItem(item);
    if (!val.valid) {
      throw new Error(`Invalid AttentionItem generated: ${val.errors.join(', ')}`);
    }
  }

  // 5. Aggregate Summary & Priority Counters
  const prioritySummary = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFORMATIONAL: 0
  };
  for (const item of attentionItems) {
    if (prioritySummary[item.priority] !== undefined) {
      prioritySummary[item.priority]++;
    }
  }

  // 6. Assemble Package
  const rawPackage = {
    packageId: `ATT-PKG-${workspaceId}`,
    workspaceId,
    generatedAt: packageTimestamp,
    prioritySummary,
    attentionItems,
    portfolioSummary: portfolioState?.exposureMetrics || null,
    snapshotIds: Array.from(new Set(companyTransitions.map(t => t.currentSnapshot?.snapshotId || t.currentSnapshot?.id).filter(Boolean))),
    totalItemCount: attentionItems.length
  };

function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(canonicalize);
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = canonicalize(obj[key]);
  }
  return sorted;
}

  // 7. Canonical Cryptographic SHA-256 Seal
  const canonicalString = JSON.stringify(canonicalize(rawPackage));
  const packageHash = crypto.createHash('sha256').update(canonicalString).digest('hex');

  return {
    ...rawPackage,
    packageHash,
    isSealed: true
  };
}
