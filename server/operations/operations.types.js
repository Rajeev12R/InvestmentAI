/**
 * @file operations.types.js
 * Canonical schema definitions and enumerations for Phase 7 Decision Operations & Review Queue.
 */

export const WorkflowStatus = Object.freeze({
  REVIEW: 'REVIEW',
  INVESTIGATING: 'INVESTIGATING',
  DISMISSED: 'DISMISSED',
  RESOLVED: 'RESOLVED'
});

export const ReviewUrgency = Object.freeze({
  IMMEDIATE: 'IMMEDIATE',
  HIGH: 'HIGH',
  NORMAL: 'NORMAL',
  LOW: 'LOW'
});

export const RecommendedReviewAction = Object.freeze({
  CONSIDER_EXIT: 'CONSIDER_EXIT',
  REASSESS_THESIS: 'REASSESS_THESIS',
  REVIEW_POSITION_SIZING: 'REVIEW_POSITION_SIZING',
  REVIEW_VALUATION: 'REVIEW_VALUATION',
  MONITOR_METRICS: 'MONITOR_METRICS',
  NO_ACTION_REQUIRED: 'NO_ACTION_REQUIRED'
});

/**
 * Validates a DecisionReviewItem object.
 * @param {Object} item
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateDecisionReviewItem(item) {
  const errors = [];
  if (!item || typeof item !== 'object') {
    return { valid: false, errors: ['DecisionReviewItem must be an object'] };
  }

  const requiredFields = [
    'reviewId', 'ticker', 'currentDecision', 'reason', 'urgency',
    'status', 'recommendedAction', 'createdAt', 'packageHash'
  ];

  for (const field of requiredFields) {
    if (item[field] === undefined || item[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (item.status && !Object.values(WorkflowStatus).includes(item.status)) {
    errors.push(`Invalid workflow status: ${item.status}`);
  }

  if (item.urgency && !Object.values(ReviewUrgency).includes(item.urgency)) {
    errors.push(`Invalid urgency: ${item.urgency}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
