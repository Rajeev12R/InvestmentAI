/**
 * @file copilot.types.js
 * Domain types, canonical intent taxonomy, claim types, citation schemas, and response interfaces for Phase 8 Investor Copilot.
 */

export const CopilotIntent = Object.freeze({
  FACT_LOOKUP: 'FACT_LOOKUP',
  METRIC_EXPLANATION: 'METRIC_EXPLANATION',
  VALUATION_EXPLANATION: 'VALUATION_EXPLANATION',
  RISK_EXPLANATION: 'RISK_EXPLANATION',
  DECISION_EXPLANATION: 'DECISION_EXPLANATION',
  THESIS_EXPLANATION: 'THESIS_EXPLANATION',
  THESIS_BREAKER_QUERY: 'THESIS_BREAKER_QUERY',
  CATALYST_QUERY: 'CATALYST_QUERY',
  CHANGE_QUERY: 'CHANGE_QUERY',
  ATTENTION_QUERY: 'ATTENTION_QUERY',
  PORTFOLIO_QUERY: 'PORTFOLIO_QUERY',
  COMPARISON_QUERY: 'COMPARISON_QUERY',
  COMPANY_COMPARISON: 'COMPANY_COMPARISON',
  HISTORICAL_CHANGE_QUERY: 'HISTORICAL_CHANGE_QUERY',
  NEWS_QUERY: 'NEWS_QUERY',
  EVIDENCE_QUERY: 'EVIDENCE_QUERY',
  SOURCE_QUERY: 'SOURCE_QUERY',
  RESEARCH_REQUEST: 'RESEARCH_REQUEST',
  FOLLOWUP_REQUEST: 'FOLLOWUP_REQUEST',
  DECISION_REVIEW: 'DECISION_REVIEW',
  WORKFLOW_STATUS: 'WORKFLOW_STATUS',
  UNKNOWN: 'UNKNOWN'
});

export const ResponseDepth = Object.freeze({
  QUICK: 'QUICK',
  STANDARD: 'STANDARD',
  DEEP: 'DEEP'
});

export const ClaimClassification = Object.freeze({
  FACT: 'FACT',
  CALCULATION: 'CALCULATION',
  MODEL_OUTPUT: 'MODEL_OUTPUT',
  SYSTEM_DECISION: 'SYSTEM_DECISION',
  AI_INTERPRETATION: 'AI_INTERPRETATION',
  AI_SUGGESTED_RESEARCH: 'AI_SUGGESTED_RESEARCH',
  UNAVAILABLE: 'UNAVAILABLE',
  UNSUPPORTED: 'UNSUPPORTED'
});

export const DataStateClassification = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
  UNKNOWN: 'UNKNOWN',
  CONFLICTING: 'CONFLICTING',
  STALE: 'STALE',
  INSUFFICIENT: 'INSUFFICIENT'
});

/**
 * Validates a citation object.
 * @param {Object} citation
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCitation(citation) {
  const errors = [];
  if (!citation || typeof citation !== 'object') {
    return { valid: false, errors: ['Citation must be a valid object'] };
  }
  if (!citation.citationId || typeof citation.citationId !== 'string') {
    errors.push('Missing or invalid citationId');
  }
  if (!citation.evidenceId || typeof citation.evidenceId !== 'string') {
    errors.push('Missing or invalid evidenceId');
  }
  if (!citation.claim || typeof citation.claim !== 'string') {
    errors.push('Missing or invalid claim');
  }
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates Copilot Chat Request DTO.
 * @param {Object} req
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCopilotRequest(req) {
  const errors = [];
  if (!req || typeof req !== 'object') {
    return { valid: false, errors: ['Request body must be an object'] };
  }
  if (!req.message || typeof req.message !== 'string' || req.message.trim().length === 0) {
    errors.push('Message cannot be empty');
  }
  if (req.depth && !Object.values(ResponseDepth).includes(req.depth)) {
    errors.push(`Invalid response depth: ${req.depth}`);
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
