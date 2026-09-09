/**
 * @file investorWorkflow.engine.js
 * Master orchestrator for Phase 8 Investor Workflows.
 */

import { WorkflowActionType, validateWorkflowRequest } from './investorWorkflow.types.js';
import { initiateResearchWorkflow } from './researchWorkflow.engine.js';
import { handleDecisionReviewWorkflow } from './decisionWorkflow.engine.js';
import { updateReviewWorkflowItem } from './reviewWorkflow.engine.js';
import { createFollowUpWorkflow } from './followupWorkflow.engine.js';

/**
 * Dispatches and executes an investor workflow action.
 * @param {Object} req
 * @returns {Promise<Object>} Workflow execution result
 */
export async function executeInvestorWorkflow(req) {
  const val = validateWorkflowRequest(req);
  if (!val.valid) {
    throw new Error(`Invalid workflow request: ${val.errors.join(', ')}`);
  }

  const { actionType, workspaceId, ticker, question, attentionId, reviewId, status, note } = req;

  switch (actionType) {
    case WorkflowActionType.INITIATE_RESEARCH:
      return initiateResearchWorkflow({ workspaceId, ticker, question });

    case WorkflowActionType.REQUEST_DECISION_REVIEW:
      return handleDecisionReviewWorkflow({ workspaceId, ticker, attentionId, note });

    case WorkflowActionType.DISMISS_ATTENTION:
      return updateReviewWorkflowItem({ workspaceId, reviewId, status: 'DISMISSED', note });

    case WorkflowActionType.RESOLVE_REVIEW:
      return updateReviewWorkflowItem({ workspaceId, reviewId, status: 'RESOLVED', note });

    case WorkflowActionType.CREATE_FOLLOW_UP:
      return createFollowUpWorkflow({ workspaceId, ticker, question, attentionId });

    default:
      throw new Error(`Unsupported workflow action type: ${actionType}`);
  }
}
