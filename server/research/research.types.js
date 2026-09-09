/**
 * Research Intelligence Types & Canonical Constants
 * Phase 4 Institutional AI Research Analyst Layer
 */

export const STATEMENT_TYPES = Object.freeze({
  FACT: 'FACT',                       // Grounded raw primary fact (e.g. 10-K revenue, spot price)
  CALCULATION: 'CALCULATION',         // Exact deterministic mathematical derivation (e.g. DCF fair value, Net Debt)
  ESTIMATE: 'ESTIMATE',               // Stated quantitative approximation or projection assumption (e.g. terminal growth rate 2.0%)
  INTERPRETATION: 'INTERPRETATION',   // Analytical conclusion grounded in calculations and facts (e.g. "asset trades at a discount")
  OPINION: 'OPINION',                 // Perspective, subjective judgment, or strategic point of view
  UNAVAILABLE: 'UNAVAILABLE'          // Missing or ungrounded data
});

export const RESEARCH_QUESTION_TYPES = Object.freeze({
  COMPANY_OVERVIEW: 'COMPANY_OVERVIEW',
  INVESTMENT_THESIS: 'INVESTMENT_THESIS',
  WHY_BUY: 'WHY_BUY',
  WHY_NOT_BUY: 'WHY_NOT_BUY',
  VALUATION: 'VALUATION',
  RISK: 'RISK',
  EARNINGS_QUALITY: 'EARNINGS_QUALITY',
  GROWTH: 'GROWTH',
  COMPETITIVE_POSITION: 'COMPETITIVE_POSITION',
  CATALYSTS: 'CATALYSTS',
  THESIS_BREAKERS: 'THESIS_BREAKERS',
  PORTFOLIO_IMPACT: 'PORTFOLIO_IMPACT',
  INVESTOR_FIT: 'INVESTOR_FIT',
  COMPARE_COMPANIES: 'COMPARE_COMPANIES',
  FULL_RESEARCH_REPORT: 'FULL_RESEARCH_REPORT'
});

export const CATALYST_TYPES = Object.freeze({
  EARNINGS: 'EARNINGS',
  PRODUCT: 'PRODUCT',
  MARGIN: 'MARGIN',
  GROWTH: 'GROWTH',
  CAPITAL_ALLOCATION: 'CAPITAL_ALLOCATION',
  REGULATORY: 'REGULATORY',
  INDUSTRY: 'INDUSTRY',
  VALUATION: 'VALUATION',
  BALANCE_SHEET: 'BALANCE_SHEET',
  EVENT: 'EVENT'
});

export const THESIS_BREAKER_SEVERITY = Object.freeze({
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
});

export const AI_CONFIDENCE_LEVELS = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE'
});
