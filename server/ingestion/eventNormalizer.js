import crypto from 'crypto';
import { EVENT_TYPES, SOURCE_TIERS, VALIDATION_STATUS } from './ingestion.types.js';
import { classifyEvent } from './eventClassifier.engine.js';
import { validateSourceRecord } from './sourceValidator.js';
import { canonicalStringify } from '../utils/canonicalJson.js';

/**
 * Strips prompt injections and adversarial script payloads.
 */
export function sanitizeExternalText(text = '') {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '[INJECTION_FILTERED]')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '[INJECTION_FILTERED]')
    .replace(/<[^>]*>?/gm, '') // Strip HTML/XML tags
    .replace(/system\s*(message|prompt)?\s*:\s*/gi, '[INJECTION_FILTERED] ')
    .replace(/###\s*instruction\s*:\s*/gi, '[INJECTION_FILTERED] ')
    .replace(/disregard\s+prior[a-z0-9\s]*/gi, '[INJECTION_FILTERED]')
    .replace(/ignore\s+all\s+(previous\s+)?instructions/gi, '[INJECTION_FILTERED]')
    .replace(/override\s+(dcf|valuation|model)/gi, '[INJECTION_FILTERED]')
    .replace(/assign\s+fairvalue[a-z0-9\s=]*/gi, '[INJECTION_FILTERED]')
    .replace(/set\s+conviction[a-z0-9\s=]*/gi, '[INJECTION_FILTERED]')
    .replace(/DROP\s+TABLE/gi, '[SQL_FILTERED]')
    .trim();
}



/**
 * Extracts structured financial facts from raw payloads.
 */
function extractFactsFromPayload(rawPayload = {}, sourceTier = SOURCE_TIERS.TIER_2, sourceName = 'UNKNOWN') {
  // Tier 4 sources cannot assert quantitative financial facts
  if (sourceTier === SOURCE_TIERS.TIER_4) {
    return [];
  }

  const facts = [];

  const isValidNumber = (val) => typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val);

  if (isValidNumber(rawPayload.revenue)) {
    facts.push({ id: 'financial.revenue', name: 'Revenue', value: rawPayload.revenue, unit: 'CURRENCY', source: sourceName });
  }
  if (isValidNumber(rawPayload.netIncome)) {
    facts.push({ id: 'financial.netIncome', name: 'Net Income', value: rawPayload.netIncome, unit: 'CURRENCY', source: sourceName });
  }
  if (isValidNumber(rawPayload.operatingMargin)) {
    facts.push({ id: 'financial.operatingMargin', name: 'Operating Margin', value: rawPayload.operatingMargin, unit: 'PERCENT', source: sourceName });
  }
  if (isValidNumber(rawPayload.freeCashFlow)) {
    facts.push({ id: 'financial.freeCashFlow', name: 'Free Cash Flow', value: rawPayload.freeCashFlow, unit: 'CURRENCY', source: sourceName });
  }
  if (isValidNumber(rawPayload.totalDebt)) {
    facts.push({ id: 'financial.totalDebt', name: 'Total Debt', value: rawPayload.totalDebt, unit: 'CURRENCY', source: sourceName });
  }
  if (isValidNumber(rawPayload.guidanceRevenueGrowth)) {
    facts.push({ id: 'guidance.revenueGrowth', name: 'Revenue Growth Guidance', value: rawPayload.guidanceRevenueGrowth, unit: 'PERCENT', source: sourceName });
  }
  if (isValidNumber(rawPayload.buybackAmount)) {
    facts.push({ id: 'corporate.buybackAmount', name: 'Share Repurchase Authorization', value: rawPayload.buybackAmount, unit: 'CURRENCY', source: sourceName });
  }
  if (isValidNumber(rawPayload.dividendPerShare)) {
    facts.push({ id: 'corporate.dividendPerShare', name: 'Dividend Per Share', value: rawPayload.dividendPerShare, unit: 'CURRENCY', source: sourceName });
  }
  if (isValidNumber(rawPayload.currentPrice)) {
    facts.push({ id: 'market.currentPrice', name: 'Market Price', value: rawPayload.currentPrice, unit: 'CURRENCY', source: sourceName });
  }

  return facts;
}

/**
 * Normalizes raw source record into canonical InvestmentEvent.
 */
export function normalizeSourceEvent(rawRecord = {}) {
  const sourceValidation = validateSourceRecord(rawRecord);

  const ticker = (rawRecord.ticker || 'UNKNOWN').toUpperCase();
  const company = rawRecord.company || `${ticker} Corp`;
  const rawPayload = rawRecord.rawPayload || {};
  const source = rawRecord.source || rawRecord.sourceType || 'UNKNOWN_SOURCE';

  const title = sanitizeExternalText(rawRecord.title || rawPayload.title || `Event for ${ticker}`);
  const summary = sanitizeExternalText(rawRecord.summary || rawPayload.description || rawPayload.summary || title);

  const eventType = rawRecord.eventType || classifyEvent({
    title,
    summary,
    rawPayload,
    filingType: rawRecord.filingType
  });

  const extractedFacts = extractFactsFromPayload(rawPayload, sourceValidation.sourceTier, source);
  const publishedAt = rawRecord.publishedAt || new Date().toISOString();
  const effectiveDate = rawRecord.effectiveDate || publishedAt.split('T')[0];
  const reportingPeriod = rawRecord.reportingPeriod || rawPayload.reportingPeriod || 'TTM';

  // Fingerprint for deduplication
  const isCorporateEvent = [
    EVENT_TYPES.ANNUAL_REPORT,
    EVENT_TYPES.QUARTERLY_REPORT,
    EVENT_TYPES.EARNINGS_RELEASE,
    EVENT_TYPES.GUIDANCE_CHANGE,
    EVENT_TYPES.BUYBACK,
    EVENT_TYPES.DIVIDEND_CHANGE,
    EVENT_TYPES.STOCK_SPLIT,
    EVENT_TYPES.CEO_CHANGE,
    EVENT_TYPES.CFO_CHANGE,
    EVENT_TYPES.ACCOUNTING_RESTATEMENT
  ].includes(eventType);

  const isQuarterlyEvent = eventType === EVENT_TYPES.QUARTERLY_REPORT || eventType === EVENT_TYPES.EARNINGS_RELEASE;

  const fpPayload = {
    ticker,
    eventType: isQuarterlyEvent ? 'QUARTERLY_FINANCIALS' : eventType,
    effectiveDate: isCorporateEvent ? effectiveDate.substring(0, 7) : effectiveDate,
    reportingPeriod,
    title: isCorporateEvent ? undefined : title.toLowerCase().replace(/[^a-z0-9]/g, '')
  };
  const eventFingerprint = crypto.createHash('sha256').update(canonicalStringify(fpPayload)).digest('hex');


  const eventId = `EVT_${ticker}_${eventType}_${eventFingerprint.substring(0, 10)}`;


  const canonicalEvent = {
    eventId,
    eventFingerprint,
    company,
    ticker,
    eventType,
    source,
    sourceId: rawRecord.sourceId || '',
    sourceUrl: rawRecord.sourceUrl || '',
    sourceTier: sourceValidation.sourceTier,
    authorityLevel: sourceValidation.authorityLevel,
    publishedAt,
    discoveredAt: rawRecord.retrievedAt || new Date().toISOString(),
    effectiveDate,
    reportingPeriod,
    title,
    summary,
    rawEvidence: rawPayload,
    extractedFacts,
    confidence: sourceValidation.isValid ? (sourceValidation.authorityLevel * 100) : 0,
    validationStatus: sourceValidation.status,
    validationReasons: sourceValidation.reasons,
    evidenceIds: extractedFacts.map(f => f.id),
    schemaVersion: '1.0.0'
  };

  return canonicalEvent;
}

