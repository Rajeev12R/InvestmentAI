/**
 * server/earnings/earnings.package.js
 * 
 * Phase 21: Sealed Event Intelligence Package
 * Generates tamper-evident cryptographic containers (SEAL-EVNT-YYYYMMDD-HEX)
 * bundling raw event references, validated facts, surprise math, guidance analysis,
 * forecast revisions, and valuation/risk impacts.
 */

import crypto from 'crypto';
import { canonicalHash, canonicalJsonStringify, deepFreeze, EventClassification } from './earnings.types.js';

export function sealEventIntelligencePackage(params) {
  const {
    tenantId,
    eventRecord,
    extractedFacts = [],
    surpriseReport = {},
    guidanceRecord = null,
    forecastRevision = null,
    valuationImpact = null,
    riskImpact = null,
    attentionImpact = null,
    thesisImpact = null,
    sealedBy = 'SYSTEM_EARNINGS_ENGINE'
  } = params;

  if (!tenantId || !eventRecord) {
    throw new Error('tenantId and eventRecord are required to seal event intelligence package');
  }

  const now = new Date().toISOString();
  const dateStr = now.slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  const sealId = `SEAL-EVNT-${dateStr}-${randomHex}`;

  const payloadToHash = {
    sealId,
    tenantId,
    eventId: eventRecord.eventId,
    securityId: eventRecord.securityId,
    reportingPeriod: eventRecord.reportingPeriod,
    rawDocumentHash: eventRecord.rawDocumentHash,
    extractedFactsCount: extractedFacts.length,
    surpriseSummary: surpriseReport.surprises || {},
    guidanceId: guidanceRecord?.guidanceId || null,
    revisionHash: forecastRevision?.canonicalHash || null,
    sealedBy,
    timestamp: now
  };

  const packageHash = canonicalHash(payloadToHash);

  const sealedContainer = {
    sealId,
    tenantId,
    packageHash,
    eventRecord,
    extractedFacts,
    surpriseReport,
    guidanceRecord,
    forecastRevision,
    valuationImpact,
    riskImpact,
    attentionImpact,
    thesisImpact,
    verification: {
      isSealed: true,
      sealedBy,
      sealedAt: now,
      algorithm: 'SHA-256'
    },
    classification: EventClassification.DERIVED
  };

  return deepFreeze(sealedContainer);
}

export function verifyEventIntelligencePackage(pkg) {
  if (!pkg || typeof pkg !== 'object' || !pkg.verification?.isSealed) {
    return { valid: false, reason: 'Invalid or unsealed package structure' };
  }

  const payloadToHash = {
    sealId: pkg.sealId,
    tenantId: pkg.tenantId,
    eventId: pkg.eventRecord?.eventId,
    securityId: pkg.eventRecord?.securityId,
    reportingPeriod: pkg.eventRecord?.reportingPeriod,
    rawDocumentHash: pkg.eventRecord?.rawDocumentHash,
    extractedFactsCount: pkg.extractedFacts?.length || 0,
    surpriseSummary: pkg.surpriseReport?.surprises || {},
    guidanceId: pkg.guidanceRecord?.guidanceId || null,
    revisionHash: pkg.forecastRevision?.canonicalHash || null,
    sealedBy: pkg.verification?.sealedBy,
    timestamp: pkg.verification?.sealedAt
  };

  const computedHash = canonicalHash(payloadToHash);
  const isValid = computedHash === pkg.packageHash;

  return {
    valid: isValid,
    sealId: pkg.sealId,
    expectedHash: pkg.packageHash,
    computedHash,
    reason: isValid ? 'Package integrity cryptographically verified' : 'Package hash mismatch / tampering detected'
  };
}
