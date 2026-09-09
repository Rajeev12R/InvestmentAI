/**
 * @file processIntelligence.tool.js
 * Deterministic tool adapter for Phase 13 Investment Process Intelligence Packages.
 * AI consumes only sealed packages; cannot calculate or alter process metrics.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { processIntelligenceService } = require('../../processIntelligence/processIntelligencePackage.js');
const { decisionSnapshotEngine } = require('../../processIntelligence/decisionSnapshot.engine.js');

/**
 * Retrieves sealed process intelligence package for a given decision/workspace.
 * @param {string} decisionId
 * @param {string} workspaceId
 * @returns {Object} Sealed ProcessIntelligencePackage
 */
export async function getProcessIntelligencePackage(decisionId, workspaceId = 'default-workspace') {
  const pkg = processIntelligenceService.getPackage(`pip-${decisionId}`, workspaceId);
  if (!pkg) {
    // Attempt evaluation if snapshot exists
    const snapshot = decisionSnapshotEngine.getSnapshot(decisionId, workspaceId);
    if (snapshot) {
      return processIntelligenceService.evaluateDecision({ decisionId, workspaceId });
    }
    return {
      status: 'UNAVAILABLE',
      reason: `No decision snapshot or evaluation package found for decisionId: ${decisionId}`
    };
  }

  return {
    packageId: pkg.packageId,
    decisionId: pkg.decisionId,
    ticker: pkg.ticker,
    workspaceId: pkg.workspaceId,
    packageHash: pkg.packageHash,
    decisionSnapshot: pkg.decisionSnapshot,
    thesisVersion: pkg.thesisVersion,
    forecasts: pkg.forecasts,
    thesisEvaluation: pkg.thesisEvaluation,
    decisionQuality: pkg.decisionQuality,
    decisionVsOutcome: pkg.decisionVsOutcome,
    portfolioAttribution: pkg.portfolioAttribution,
    generatedAt: pkg.generatedAt
  };
}

/**
 * Retrieves aggregate workspace scorecard and learning insights
 * @param {string} workspaceId
 * @returns {Object} Workspace Scorecard & Insights
 */
export async function getWorkspaceProcessScorecard(workspaceId = 'default-workspace') {
  return processIntelligenceService.getWorkspaceScorecard(workspaceId);
}
