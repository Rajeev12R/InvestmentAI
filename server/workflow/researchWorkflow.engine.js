import { executeResearch } from '../research/research.engine.js';
import { workspaceRepository } from '../workspace/workspace.repository.js';

/**
 * Initiates an actionable research workflow for a ticker and question.
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {string} params.ticker
 * @param {string} params.question
 * @returns {Promise<Object>} Research Workflow Result
 */
export async function initiateResearchWorkflow({ workspaceId = 'DEFAULT_WORKSPACE', ticker, question }) {
  if (!ticker || !question) {
    throw new Error('Ticker and investigation question are required for research workflow');
  }

  const upperTicker = ticker.toUpperCase();
  const snapshot = workspaceRepository.getLatestSnapshot(workspaceId, upperTicker);

  const truthPackage = snapshot || {
    ticker: upperTicker,
    financialFacts: {},
    calculatedMetrics: {},
    isSealed: true,
    packageHash: 'TRUTH-HASH-FALLBACK'
  };

  // Execute Phase 4 research engine with grounded facts
  const researchPackage = await executeResearch({
    truthPackage,
    researchQuestion: question,
    options: { forceDeterministic: true }
  });

  return {
    workflowId: `WF-RES-${upperTicker}-${Date.now()}`,
    ticker: upperTicker,
    question,
    status: 'COMPLETED',
    researchPackageId: researchPackage?.packageId || `RES-PKG-${upperTicker}`,
    packageHash: researchPackage?.packageHash || 'HASH_UNKNOWN',
    findingsCount: researchPackage?.findings?.length || 0,
    findings: researchPackage?.findings || [],
    suggestedInvestigation: researchPackage?.suggestedInvestigation || null,
    initiatedAt: new Date().toISOString()
  };
}
