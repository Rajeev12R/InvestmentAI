/**
 * @file reviewWorkflow.engine.js
 * Bridges Copilot interactions directly with the Phase 7 Operations Decision Review Queue.
 */

import { operationsRepository } from '../operations/operations.repository.js';
import { WorkflowStatus } from '../operations/operations.types.js';

/**
 * Updates review state (REVIEW -> INVESTIGATING -> DISMISSED -> RESOLVED).
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {string} params.reviewId
 * @param {string} params.status
 * @param {string} [params.note]
 * @returns {Object} Updated Review item
 */
export function updateReviewWorkflowItem({ workspaceId = 'DEFAULT_WORKSPACE', reviewId, status, note = null }) {
  return operationsRepository.updateReviewStatus(workspaceId, reviewId, status, note);
}
