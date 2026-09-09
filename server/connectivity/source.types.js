/**
 * @file source.types.js
 * Source Registry & Market Connectivity Type Definitions for Phase 10.
 */

export const SourceCategory = Object.freeze({
  MARKET_DATA: 'MARKET_DATA',
  FUNDAMENTALS: 'FUNDAMENTALS',
  FILINGS: 'FILINGS',
  CORPORATE_ACTIONS: 'CORPORATE_ACTIONS',
  NEWS: 'NEWS',
  MACRO: 'MACRO',
  FX: 'FX',
  BENCHMARK: 'BENCHMARK',
  ALTERNATIVE: 'ALTERNATIVE'
});

export const SourceTier = Object.freeze({
  TIER_1_PRIMARY: 'TIER_1_PRIMARY',       // Primary Regulatory Filings / Direct Exchanges (SEC, NSE, BSE)
  TIER_2_REGULATED: 'TIER_2_REGULATED',   // Regulated Central Banks & Major Institutions (FRED, ECB, Bloomberg)
  TIER_3_SECONDARY: 'TIER_3_SECONDARY',   // Financial Aggregators (Yahoo Finance, AlphaVantage, Reuters)
  TIER_4_UNVERIFIED: 'TIER_4_UNVERIFIED'  // Web feeds, social sentiment, unverified sources
});

export const SourceStatus = Object.freeze({
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  RATE_LIMITED: 'RATE_LIMITED',
  AUTH_FAILURE: 'AUTH_FAILURE',
  SCHEMA_FAILURE: 'SCHEMA_FAILURE',
  OFFLINE: 'OFFLINE'
});

export const FreshnessClassification = Object.freeze({
  REALTIME: 'REALTIME',       // < 15 minutes old
  RECENT: 'RECENT',           // < 24 hours old
  STALE: 'STALE',             // > 24 hours but within historical threshold
  EXPIRED: 'EXPIRED',         // Past maximum permissible threshold
  UNAVAILABLE: 'UNAVAILABLE'  // No verified data available
});

export const CorporateActionType = Object.freeze({
  DIVIDEND: 'DIVIDEND',
  STOCK_SPLIT: 'STOCK_SPLIT',
  REVERSE_SPLIT: 'REVERSE_SPLIT',
  BONUS: 'BONUS',
  RIGHTS: 'RIGHTS',
  SPINOFF: 'SPINOFF',
  MERGER: 'MERGER',
  DELISTING: 'DELISTING',
  SYMBOL_CHANGE: 'SYMBOL_CHANGE'
});

export const CircuitState = Object.freeze({
  CLOSED: 'CLOSED',       // Normal operation
  OPEN: 'OPEN',           // Tripped, rejecting calls immediately
  HALF_OPEN: 'HALF_OPEN'  // Testing provider recovery
});

export const DocumentType = Object.freeze({
  FORM_10K: '10-K',
  FORM_10Q: '10-Q',
  FORM_8K: '8-K',
  FORM_20F: '20-F',
  FORM_6K: '6-K',
  ANNUAL_REPORT: 'ANNUAL_REPORT',
  RESULTS_RELEASE: 'RESULTS_RELEASE',
  EARNINGS_RELEASE: 'EARNINGS_RELEASE',
  NSE_FILING: 'NSE_FILING',
  BSE_FILING: 'BSE_FILING',
  COMPANY_IR: 'COMPANY_IR'
});

export const PeriodType = Object.freeze({
  FY: 'FY',
  Q1: 'Q1',
  Q2: 'Q2',
  Q3: 'Q3',
  Q4: 'Q4',
  TTM: 'TTM',
  YTD: 'YTD',
  MRQ: 'MRQ',
  LTM: 'LTM'
});
