/**
 * @file attention.types.js
 * Canonical schema definitions and enumerations for Phase 7 Attention Intelligence.
 */

export const AttentionPriority = Object.freeze({
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFORMATIONAL: 'INFORMATIONAL'
});

export const AttentionSeverity = Object.freeze({
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO'
});

export const AttentionCategory = Object.freeze({
  DECISION_CHANGE: 'DECISION_CHANGE',
  THESIS_BREAKER: 'THESIS_BREAKER',
  THESIS_DRIFT: 'THESIS_DRIFT',
  VALUATION_DRIFT: 'VALUATION_DRIFT',
  RISK_ESCALATION: 'RISK_ESCALATION',
  RISK_DETERIORATION: 'RISK_DETERIORATION',
  EARNINGS_CHANGE: 'EARNINGS_CHANGE',
  GUIDANCE_CHANGE: 'GUIDANCE_CHANGE',
  MATERIAL_EVENT: 'MATERIAL_EVENT',
  MARKET_DISLOCATION: 'MARKET_DISLOCATION',
  PORTFOLIO_CONCENTRATION: 'PORTFOLIO_CONCENTRATION',
  CORRELATION_RISK: 'CORRELATION_RISK',
  POSITION_SIZE_RISK: 'POSITION_SIZE_RISK',
  DATA_QUALITY: 'DATA_QUALITY',
  STALE_INFORMATION: 'STALE_INFORMATION',
  CONFLICTING_SIGNAL: 'CONFLICTING_SIGNAL',
  NEW_CATALYST: 'NEW_CATALYST',
  WATCHLIST_CHANGE: 'WATCHLIST_CHANGE',
  HOLDING_CHANGE: 'HOLDING_CHANGE',
  RESEARCH_FOLLOWUP: 'RESEARCH_FOLLOWUP'
});

export const TriggerType = Object.freeze({
  SNAPSHOT_TRANSITION: 'SNAPSHOT_TRANSITION',
  EXTERNAL_EVENT: 'EXTERNAL_EVENT',
  PORTFOLIO_DRIFT: 'PORTFOLIO_DRIFT',
  DATA_INTEGRITY: 'DATA_INTEGRITY',
  MANUAL_FOLLOWUP: 'MANUAL_FOLLOWUP'
});

export const ThesisBreakerAttentionStatus = Object.freeze({
  TRIGGERED: 'TRIGGERED',
  APPROACHING: 'APPROACHING',
  STABLE: 'STABLE',
  UNKNOWN: 'UNKNOWN'
});

/**
 * Validates the structure of a canonical AttentionItem.
 * @param {Object} item 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAttentionItem(item) {
  const errors = [];
  if (!item || typeof item !== 'object') {
    return { valid: false, errors: ['AttentionItem must be a non-null object'] };
  }

  const requiredFields = [
    'attentionId', 'ticker', 'priority', 'category', 'title', 'summary',
    'triggerType', 'detectedAt', 'changeIds', 'eventIds', 'alertIds',
    'evidenceIds', 'metrics', 'investigationQuestions', 'packageHash'
  ];

  for (const field of requiredFields) {
    if (item[field] === undefined || item[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (item.priority && !Object.values(AttentionPriority).includes(item.priority)) {
    errors.push(`Invalid priority: ${item.priority}`);
  }

  if (item.category && !Object.values(AttentionCategory).includes(item.category)) {
    errors.push(`Invalid category: ${item.category}`);
  }

  if (item.triggerType && !Object.values(TriggerType).includes(item.triggerType)) {
    errors.push(`Invalid triggerType: ${item.triggerType}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
