/**
 * @file followUp.engine.js
 * Manages follow-up research tasks and investigation tracking for Decision Operations.
 */

import { WorkflowStatus } from './operations.types.js';

/**
 * Creates a follow-up item from an attention item and question.
 * @param {Object} params
 * @param {string} params.ticker
 * @param {string} params.attentionId
 * @param {string} params.question
 * @param {string} [params.assignedTo]
 * @returns {Object} FollowUpItem
 */
export function createFollowUpItem({
  ticker,
  attentionId,
  question,
  assignedTo = 'ANALYST'
}) {
  const now = new Date().toISOString();
  return {
    followUpId: `FUP-${ticker}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    ticker,
    attentionId,
    question,
    status: WorkflowStatus.INVESTIGATING,
    assignedTo,
    notes: [],
    findings: null,
    createdAt: now,
    updatedAt: now
  };
}
