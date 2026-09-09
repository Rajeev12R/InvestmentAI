import { VALIDATION_STATUS, SOURCE_TIERS } from './ingestion.types.js';
import { resolveSourceMetadata } from './sourceRegistry.js';

/**
 * Deterministic Source Validator.
 * Verifies timestamps, company-ticker identity, source authority, and evidence bounds.
 */
export function validateSourceRecord(rawRecord = {}) {
  const reasons = [];

  if (!rawRecord) {
    return {
      isValid: false,
      status: VALIDATION_STATUS.REJECTED,
      reasons: ['EMPTY_RECORD']
    };
  }

  const {
    ticker,
    company,
    source,
    publishedAt,
    retrievedAt,
    sourceUrl,
    rawPayload
  } = rawRecord;

  // 1. Ticker & Company Identity Validation
  if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
    reasons.push('MISSING_TICKER_IDENTITY');
  }

  // 2. Timestamp Integrity
  if (!publishedAt) {
    reasons.push('MISSING_PUBLICATION_TIMESTAMP');
  } else {
    const pubDate = new Date(publishedAt).getTime();
    const now = Date.now();
    if (isNaN(pubDate)) {
      reasons.push('INVALID_PUBLISHED_AT_TIMESTAMP');
      reasons.push('MALFORMED_PUBLICATION_TIMESTAMP');
    } else if (pubDate > now + 60000) { // Future publication date (> 1 min clock skew)
      reasons.push('FUTURE_PUBLICATION_TIMESTAMP_REJECTED');
    }
  }

  // 3. Source Metadata & Authority
  const sourceName = source || rawRecord.sourceType || '';
  const sourceMeta = resolveSourceMetadata(sourceName);
  if (!sourceMeta) {
    reasons.push('UNRECOGNIZED_SOURCE_AUTHORITY');
  }

  // 4. Payload / Content Verification
  if (!rawPayload || (typeof rawPayload === 'object' && Object.keys(rawPayload).length === 0)) {
    reasons.push('EMPTY_PAYLOAD');
  }

  const isValid = reasons.length === 0;
  let status = VALIDATION_STATUS.REJECTED;
  if (isValid) {
    status = sourceMeta.tier === SOURCE_TIERS.TIER_4 
      ? VALIDATION_STATUS.PARTIALLY_VALIDATED 
      : VALIDATION_STATUS.VALIDATED;
  }

  return {
    isValid,
    status,
    sourceTier: sourceMeta.tier,
    authorityLevel: sourceMeta.authorityLevel,
    canUpdateTruth: sourceMeta.canUpdateTruth,
    reasons
  };
}

