/**
 * @file investorWorkflow.types.js
 * Workflow types, states, action schemas, and transitions for Phase 8.
 */

export const WorkflowActionType = Object.freeze({
  INITIATE_RESEARCH: 'INITIATE_RESEARCH',
  REQUEST_DECISION_REVIEW: 'REQUEST_DECISION_REVIEW',
  DISMISS_ATTENTION: 'DISMISS_ATTENTION',
  RESOLVE_REVIEW: 'RESOLVE_REVIEW',
  LOG_INVESTOR_NOTE: 'LOG_INVESTOR_NOTE',
  CREATE_FOLLOW_UP: 'CREATE_FOLLOW_UP'
});

export const DecisionReviewState = Object.freeze({
  PENDING_REVIEW: 'PENDING_REVIEW',
  UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
  DISMISSED: 'DISMISSED',
  RESOLVED: 'RESOLVED'
});

/**
 * Validates a workflow execution request.
 * @param {Object} req
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateWorkflowRequest(req) {
  const errors = [];
  if (!req || typeof req !== 'object') {
    return { valid: false, errors: ['Request body must be an object'] };
  }
  if (!req.actionType || !Object.values(WorkflowActionType).includes(req.actionType)) {
    errors.push(`Invalid or missing actionType: ${req.actionType}`);
  }
  if (!req.workspaceId) {
    errors.push('Missing workspaceId');
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
