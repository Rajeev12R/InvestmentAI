/**
 * @file fact.types.js
 * Canonical Types & Enums for Institutional Fundamental Data Quality & Fact Intelligence in Phase 11.
 */

export const CanonicalMetric = Object.freeze({
  REVENUE: 'REVENUE',
  GROSS_PROFIT: 'GROSS_PROFIT',
  OPERATING_INCOME: 'OPERATING_INCOME',
  NET_INCOME: 'NET_INCOME',
  EBITDA: 'EBITDA',
  CFO: 'CFO',
  OPERATING_CASH_FLOW: 'OPERATING_CASH_FLOW',
  CAPEX: 'CAPEX',
  FCF: 'FCF',
  FREE_CASH_FLOW: 'FREE_CASH_FLOW',
  CASH: 'CASH',
  CASH_AND_EQUIVALENTS: 'CASH_AND_EQUIVALENTS',
  TOTAL_DEBT: 'TOTAL_DEBT',
  NET_DEBT: 'NET_DEBT',
  DILUTED_SHARES: 'DILUTED_SHARES',
  DILUTED_EPS: 'DILUTED_EPS',
  BOOK_VALUE: 'BOOK_VALUE',
  DIVIDENDS: 'DIVIDENDS',
  MARKET_CAP: 'MARKET_CAP'
});

export const PeriodType = Object.freeze({
  ANNUAL: 'ANNUAL',
  FY: 'FY',
  QUARTERLY: 'QUARTERLY',
  Q1: 'Q1',
  Q2: 'Q2',
  Q3: 'Q3',
  Q4: 'Q4',
  YTD: 'YTD',
  TTM: 'TTM',
  POINT_IN_TIME: 'POINT_IN_TIME'
});

export const FactStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  ACTIVE_TRUTH: 'ACTIVE_TRUTH',
  SUPERSEDED: 'SUPERSEDED',
  RESTATED: 'RESTATED',
  RESTATED_HISTORICAL: 'RESTATED_HISTORICAL',
  CANDIDATE: 'CANDIDATE',
  REJECTED: 'REJECTED',
  UNAVAILABLE: 'UNAVAILABLE',
  CONFLICT: 'CONFLICT'
});

export const AccountingCheckStatus = Object.freeze({
  PASS: 'PASS',
  WARNING: 'WARNING',
  CONFLICT: 'CONFLICT',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const FilingType = Object.freeze({
  FORM_10K: '10-K',
  FORM_10KA: '10-K/A',
  FORM_10Q: '10-Q',
  FORM_10QA: '10-Q/A',
  FORM_8K: '8-K',
  FORM_20F: '20-F',
  FORM_6K: '6-K',
  NSE_ANNUAL: 'NSE_ANNUAL',
  NSE_QUARTERLY: 'NSE_QUARTERLY',
  OTHER: 'OTHER'
});

export const QualityDimension = Object.freeze({
  SOURCE_QUALITY: 'SOURCE_QUALITY',
  COVERAGE: 'COVERAGE',
  FRESHNESS: 'FRESHNESS',
  PERIOD_INTEGRITY: 'PERIOD_INTEGRITY',
  ACCOUNTING_CONSISTENCY: 'ACCOUNTING_CONSISTENCY',
  CONFLICT_RATE: 'CONFLICT_RATE',
  PROVENANCE_COMPLETENESS: 'PROVENANCE_COMPLETENESS'
});

export function isValidCanonicalMetric(metric) {
  if (!metric || typeof metric !== 'string') return false;
  return Object.values(CanonicalMetric).includes(metric) || Object.keys(CanonicalMetric).includes(metric);
}

export function isValidPeriodType(type) {
  if (!type || typeof type !== 'string') return false;
  return Object.values(PeriodType).includes(type) || Object.keys(PeriodType).includes(type);
}

export function normalizeMetricKey(key) {
  if (!key || typeof key !== 'string') return null;
  const clean = key.trim().toLowerCase().replace(/[\s_-]+/g, '_');
  if (clean === 'revenue' || clean === 'total_revenue' || clean === 'total_net_sales' || clean === 'sales') return CanonicalMetric.REVENUE;
  if (clean === 'net_income' || clean === 'net_earnings' || clean === 'net_profit') return CanonicalMetric.NET_INCOME;
  if (clean === 'operating_income' || clean === 'operating_profit') return CanonicalMetric.OPERATING_INCOME;
  if (clean === 'cfo' || clean === 'operating_cash_flow' || clean === 'cash_from_operations') return CanonicalMetric.OPERATING_CASH_FLOW;
  if (clean === 'capex' || clean === 'capital_expenditures') return CanonicalMetric.CAPEX;
  if (clean === 'fcf' || clean === 'free_cash_flow') return CanonicalMetric.FREE_CASH_FLOW;
  if (clean === 'total_debt' || clean === 'debt') return CanonicalMetric.TOTAL_DEBT;
  if (clean === 'cash' || clean === 'cash_and_equivalents' || clean === 'cash_and_cash_equivalents') return CanonicalMetric.CASH;
  if (clean === 'net_debt') return CanonicalMetric.NET_DEBT;
  if (clean === 'diluted_eps' || clean === 'eps') return CanonicalMetric.DILUTED_EPS;
  if (clean === 'diluted_shares' || clean === 'shares') return CanonicalMetric.DILUTED_SHARES;
  if (clean === 'market_cap' || clean === 'market_capitalization') return CanonicalMetric.MARKET_CAP;
  return Object.keys(CanonicalMetric).includes(key.toUpperCase()) ? CanonicalMetric[key.toUpperCase()] : null;
}

