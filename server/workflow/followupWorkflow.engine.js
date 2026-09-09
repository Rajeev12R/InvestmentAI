/**
 * @file followupWorkflow.engine.js
 * Tracks actionable investigation follow-ups initiated from Copilot conversations.
 */

import { operationsRepository } from '../operations/operations.repository.js';
import { createFollowUpItem } from '../operations/followUp.engine.js';
import { WorkflowStatus } from '../operations/operations.types.js';
import { sanitizePrompt } from '../copilot/copilot.safety.engine.js';

/**
 * Creates or updates an investigation follow-up task.
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {string} params.ticker
 * @param {string} params.question
 * @param {string} [params.attentionId]
 * @returns {Object} Follow-up item
 */
export function createFollowUpWorkflow({
  workspaceId = 'DEFAULT_WORKSPACE',
  ticker,
  question,
  attentionId = null
}) {
  const upperTicker = ticker.toUpperCase();
  const cleanQ = sanitizePrompt(question);
  const followUp = createFollowUpItem({
    ticker: upperTicker,
    attentionId: attentionId || `ATT-${upperTicker}-DIRECT`,
    investigationQuestion: cleanQ,
    priority: 'HIGH'
  });

  followUp.question = cleanQ;
  operationsRepository.saveFollowUp(workspaceId, followUp);
  return followUp;
}
