/**
 * @file operations.engine.js
 * Master orchestrator for Phase 7 Decision Operations.
 * Syncs attention items to the Decision Review Queue and manages operational workflows.
 */

import { generateDecisionReviews } from './decisionReview.engine.js';
import { operationsRepository } from './operations.repository.js';

/**
 * Evaluates attention items and updates the Decision Review Queue for a workspace.
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {Array<Object>} params.attentionItems
 * @returns {Array<Object>} Updated DecisionReviewItems
 */
export function processDecisionOperations({
  workspaceId = 'DEFAULT_WORKSPACE',
  attentionItems = []
}) {
  const generatedReviews = generateDecisionReviews(attentionItems);
  return operationsRepository.syncReviews(workspaceId, generatedReviews);
}
