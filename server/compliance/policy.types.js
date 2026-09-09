/**
 * Phase 16 — Policy Rule Schema, Policy Types & Rule Definitions
 */

import { OperatorType, SeverityLevel, deepFreeze } from './compliance.types.js';

export const PolicyRuleType = Object.freeze({
  POSITION_LIMIT: 'POSITION_LIMIT',
  SECTOR_LIMIT: 'SECTOR_LIMIT',
  INDUSTRY_LIMIT: 'INDUSTRY_LIMIT',
  GEOGRAPHY_LIMIT: 'GEOGRAPHY_LIMIT',
  CONCENTRATION_LIMIT: 'CONCENTRATION_LIMIT',
  LIQUIDITY_LIMIT: 'LIQUIDITY_LIMIT',
  TURNOVER_LIMIT: 'TURNOVER_LIMIT',
  CASH_LIMIT: 'CASH_LIMIT',
  LEVERAGE_LIMIT: 'LEVERAGE_LIMIT',
  SHORTING_LIMIT: 'SHORTING_LIMIT',
  SECURITY_ELIGIBILITY: 'SECURITY_ELIGIBILITY',
  MARKET_CAP_LIMIT: 'MARKET_CAP_LIMIT',
  RATING_LIMIT: 'RATING_LIMIT',
  ESG_OR_CUSTOM_RESTRICTION: 'ESG_OR_CUSTOM_RESTRICTION',
  DECISION_AUTHORITY: 'DECISION_AUTHORITY'
});

export const RuleScope = Object.freeze({
  PORTFOLIO: 'PORTFOLIO',
  ASSET: 'ASSET',
  SECTOR: 'SECTOR',
  INDUSTRY: 'INDUSTRY',
  GEOGRAPHY: 'GEOGRAPHY',
  DECISION: 'DECISION',
  TRANSACTION: 'TRANSACTION'
});

/**
 * Validates a single Policy Rule object structure.
 * @param {Object} rule 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateRuleSchema(rule) {
  if (!rule || typeof rule !== 'object') {
    return { valid: false, error: 'Rule must be a non-null object' };
  }
  const requiredFields = ['ruleId', 'ruleType', 'description', 'operator', 'severity'];
  for (const field of requiredFields) {
    if (!rule[field]) {
      return { valid: false, error: `Missing required rule field: ${field}` };
    }
  }

  if (!Object.values(PolicyRuleType).includes(rule.ruleType)) {
    return { valid: false, error: `Invalid ruleType: ${rule.ruleType}` };
  }

  if (!Object.values(OperatorType).includes(rule.operator)) {
    return { valid: false, error: `Invalid operator: ${rule.operator}` };
  }

  if (!Object.values(SeverityLevel).includes(rule.severity)) {
    return { valid: false, error: `Invalid severity: ${rule.severity}` };
  }

  if (rule.threshold === undefined && rule.allowedValues === undefined && rule.prohibitedValues === undefined) {
    return { valid: false, error: 'Rule must specify threshold, allowedValues, or prohibitedValues' };
  }

  return { valid: true };
}
