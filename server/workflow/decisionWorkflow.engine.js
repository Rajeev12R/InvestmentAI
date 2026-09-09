/**
 * @file decisionWorkflow.engine.js
 * Manages human confirmation workflows on decision shifts, thesis alterations, and exit proposals.
 */

import { operationsRepository } from '../operations/operations.repository.js';
import { WorkflowStatus } from '../operations/operations.types.js';

/**
 * Initiates or updates a decision review item in the human review queue.
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {string} params.ticker
 * @param {string} params.attentionId
 * @param {string} [params.requestedAction]
 * @param {string} [params.note]
 * @returns {Object} Workflow Review Item
 */
export function handleDecisionReviewWorkflow({
  workspaceId = 'DEFAULT_WORKSPACE',
  ticker,
  attentionId,
  requestedAction = 'REVIEW',
  note = null
}) {
  const upperTicker = (ticker || 'PORTFOLIO').toUpperCase();
  const randomSuffix = Math.floor(Math.random() * 10000);
  const reviewId = `REV-${upperTicker}-${Date.now()}-${randomSuffix}`;

  const reviewItem = {
    reviewId,
    attentionId: attentionId || `ATT-${upperTicker}-DIRECT`,
    ticker: upperTicker,
    urgency: 'HIGH',
    status: WorkflowStatus.REVIEW,
    recommendedAction: requestedAction,
    notes: note ? [{ text: note, addedAt: new Date().toISOString() }] : [],
    createdAt: new Date().toISOString()
  };

  operationsRepository.syncReviews(workspaceId, [reviewItem]);

  return {
    workflowId: `WF-DEC-${upperTicker}-${Date.now()}-${randomSuffix}`,
    reviewId,
    ticker: upperTicker,
    status: 'IN_REVIEW_QUEUE',
    actionRequired: 'HUMAN_CONFIRMATION',
    isTradeExecuted: false
  };
}
