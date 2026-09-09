import { SOURCE_TIERS, EVENT_TYPES } from './ingestion.types.js';

/**
 * Deterministic Source Registry & Authority Hierarchy.
 */
export const SOURCE_REGISTRY = {
  SEC_EDGAR: {
    name: 'SEC EDGAR Database',
    tier: SOURCE_TIERS.TIER_1,
    authorityLevel: 1.0,
    reliability: 0.99,
    reliabilityScore: 0.99,
    requiresValidation: false,
    allowedForTruthUpdate: true,
    canUpdateTruth: true,
    supportedEventTypes: [
      EVENT_TYPES.ANNUAL_REPORT,
      EVENT_TYPES.QUARTERLY_REPORT,
      EVENT_TYPES.EARNINGS_RELEASE,
      EVENT_TYPES.ACQUISITION,
      EVENT_TYPES.BUYBACK,
      EVENT_TYPES.DEBT_ISSUANCE,
      EVENT_TYPES.SHARE_ISSUANCE,
      EVENT_TYPES.ACCOUNTING_RESTATEMENT
    ]
  },
  COMPANY_IR: {
    name: 'Official Company Investor Relations',
    tier: SOURCE_TIERS.TIER_1,
    authorityLevel: 0.95,
    reliability: 0.95,
    reliabilityScore: 0.95,
    requiresValidation: false,
    allowedForTruthUpdate: true,
    canUpdateTruth: true,
    supportedEventTypes: [
      EVENT_TYPES.EARNINGS_RELEASE,
      EVENT_TYPES.GUIDANCE_CHANGE,
      EVENT_TYPES.DIVIDEND_CHANGE,
      EVENT_TYPES.BUYBACK,
      EVENT_TYPES.CEO_CHANGE,
      EVENT_TYPES.CFO_CHANGE,
      EVENT_TYPES.ACQUISITION
    ]
  },
  EXCHANGE_OFFICIAL: {
    name: 'Official Stock Exchange (NSE / BSE / NYSE / NASDAQ)',
    tier: SOURCE_TIERS.TIER_1,
    authorityLevel: 0.98,
    reliability: 0.98,
    reliabilityScore: 0.98,
    requiresValidation: false,
    allowedForTruthUpdate: true,
    canUpdateTruth: true,
    supportedEventTypes: [
      EVENT_TYPES.STOCK_SPLIT,
      EVENT_TYPES.DIVIDEND_CHANGE,
      EVENT_TYPES.SHARE_ISSUANCE,
      EVENT_TYPES.REGULATORY_ACTION,
      EVENT_TYPES.BOARD_CHANGE
    ]
  },
  YAHOO_FINANCE: {
    name: 'Yahoo Finance Live Market & Financials Feed',
    tier: SOURCE_TIERS.TIER_2,
    authorityLevel: 0.85,
    reliability: 0.90,
    reliabilityScore: 0.90,
    requiresValidation: true,
    allowedForTruthUpdate: true,
    canUpdateTruth: true,
    supportedEventTypes: [
      EVENT_TYPES.PRICE_MOVE,
      EVENT_TYPES.VOLUME_SPIKE,
      EVENT_TYPES.VOLATILITY_SPIKE,
      EVENT_TYPES.FIFTY_TWO_WEEK_HIGH,
      EVENT_TYPES.FIFTY_TWO_WEEK_LOW,
      EVENT_TYPES.REVENUE_CHANGE,
      EVENT_TYPES.EARNINGS_CHANGE
    ]
  },
  BLOOMBERG_REUTERS: {
    name: 'Bloomberg / Reuters / Dow Jones Financial Wire',
    tier: SOURCE_TIERS.TIER_2,
    authorityLevel: 0.88,
    reliability: 0.92,
    reliabilityScore: 0.92,
    requiresValidation: true,
    allowedForTruthUpdate: true,
    canUpdateTruth: true,
    supportedEventTypes: [
      EVENT_TYPES.MATERIAL_NEWS,
      EVENT_TYPES.GUIDANCE_CHANGE,
      EVENT_TYPES.CEO_CHANGE,
      EVENT_TYPES.ACQUISITION,
      EVENT_TYPES.REGULATORY_ACTION
    ]
  },
  GNEWS_FINANCIAL: {
    name: 'GNews Aggregated Financial News',
    tier: SOURCE_TIERS.TIER_3,
    authorityLevel: 0.65,
    reliability: 0.70,
    reliabilityScore: 0.70,
    requiresValidation: true,
    allowedForTruthUpdate: false,
    canUpdateTruth: false,
    supportedEventTypes: [
      EVENT_TYPES.MATERIAL_NEWS,
      EVENT_TYPES.SECTOR_EVENT,
      EVENT_TYPES.COMPETITOR_EVENT
    ]
  },
  UNVERIFIED_WEB: {
    name: 'Unverified Web / Social Forums',
    tier: SOURCE_TIERS.TIER_4,
    authorityLevel: 0.20,
    reliability: 0.30,
    reliabilityScore: 0.30,
    requiresValidation: true,
    allowedForTruthUpdate: false,
    canUpdateTruth: false,
    supportedEventTypes: [
      EVENT_TYPES.MATERIAL_NEWS
    ]
  }
};


/**
 * Resolves source metadata and authority tier.
 */
export function resolveSourceMetadata(sourceName = '') {
  if (!sourceName || typeof sourceName !== 'string') {
    return SOURCE_REGISTRY.UNVERIFIED_WEB;
  }

  // Exact registry lookup first
  if (SOURCE_REGISTRY[sourceName]) {
    return SOURCE_REGISTRY[sourceName];
  }

  const norm = sourceName.toUpperCase().replace(/[\s\-_]/g, '');

  // Spoofing detection: if string mentions blog, forum, reddit, twitter, rumor, unofficial, claiming
  if (/BLOG|FORUM|REDDIT|TWITTER|X|RUMOR|UNOFFICIAL|CLAIMING|LEAK|OPINION|STOCKTWITS/i.test(norm)) {
    return SOURCE_REGISTRY.UNVERIFIED_WEB;
  }

  if (norm === 'SEC' || norm === 'SECEDGAR' || norm === 'EDGAR' || norm === 'SEC10K' || norm === 'SEC10Q' || norm === 'SEC8K') {
    return SOURCE_REGISTRY.SEC_EDGAR;
  }
  if (norm === 'COMPANYIR' || norm === 'INVESTORRELATIONS' || norm === 'COMPANYPRESSRELEASE') {
    return SOURCE_REGISTRY.COMPANY_IR;
  }
  if (norm === 'EXCHANGE' || norm === 'NSE' || norm === 'BSE' || norm === 'NYSE' || norm === 'NASDAQ') {
    return SOURCE_REGISTRY.EXCHANGE_OFFICIAL;
  }
  if (norm === 'YAHOO' || norm === 'YAHOOFINANCE' || norm === 'YFINANCE') {
    return SOURCE_REGISTRY.YAHOO_FINANCE;
  }
  if (norm === 'BLOOMBERG' || norm === 'REUTERS' || norm === 'DOWJONES' || norm === 'BLOOMBERGREUTERS') {
    return SOURCE_REGISTRY.BLOOMBERG_REUTERS;
  }
  if (norm === 'GNEWS' || norm === 'NEWSWIRE' || norm === 'PRNEWSWIRE') {
    return SOURCE_REGISTRY.GNEWS_FINANCIAL;
  }

  return SOURCE_REGISTRY.UNVERIFIED_WEB;
}

export const getSourceAuthority = resolveSourceMetadata;

