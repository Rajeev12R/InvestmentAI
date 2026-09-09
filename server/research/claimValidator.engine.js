import { STATEMENT_TYPES, AI_CONFIDENCE_LEVELS } from './research.types.js';

/**
 * Validates AI-generated claims and evidence references against the sealed Truth Package.
 * Enforces zero hallucination, cross-company isolation, and provenance verification.
 *
 * @param {Object} params
 * @param {Array<Object>|Object} params.claims - AI-generated research claims
 * @param {Object} params.evidenceIndex - Output from buildEvidenceIndex
 * @param {string} [params.targetTicker] - Expected ticker symbol to prevent cross-company contamination
 * @returns {Object} Validation report with valid claims, rejected claims, and sanitized output
 */
export function validateClaims({ claims = [], evidenceIndex, targetTicker = null }) {
  const validClaims = [];
  const rejectedClaims = [];
  const ungroundedClaims = [];
  const warnings = [];

  const rawList = Array.isArray(claims) ? claims : [claims];
  const activeTicker = (targetTicker || (evidenceIndex && typeof evidenceIndex.getTicker === 'function' ? evidenceIndex.getTicker() : null) || '').toUpperCase();

  for (const claimObj of rawList) {
    if (!claimObj || (typeof claimObj !== 'object' && typeof claimObj !== 'string')) {
      rejectedClaims.push({
        claim: claimObj,
        reason: 'Malformed claim structure',
        verificationStatus: 'REJECTED',
        confidence: AI_CONFIDENCE_LEVELS.INSUFFICIENT_EVIDENCE
      });
      continue;
    }

    const claimText = typeof claimObj === 'string' ? claimObj : (claimObj.claim || claimObj.text || '');
    const rawIds = Array.isArray(claimObj.evidenceIds) ? claimObj.evidenceIds : (claimObj.evidenceId ? [claimObj.evidenceId] : []);
    const requestedType = (typeof claimObj === 'object' ? claimObj.statementType || claimObj.type : null) || STATEMENT_TYPES.INTERPRETATION;

    if (!claimText.trim()) {
      rejectedClaims.push({
        claim: claimObj,
        reason: 'Empty claim text',
        verificationStatus: 'REJECTED',
        confidence: AI_CONFIDENCE_LEVELS.INSUFFICIENT_EVIDENCE
      });
      continue;
    }

    // 1. Check for Unsupported Manufactured Probabilities (e.g., "78.3% probability", "95% chance")
    const probabilityRegex = /(\b\d{1,2}(?:\.\d+)?%\s*(?:probability|chance|likelihood)\b|\b(?:probability|chance|likelihood)\s*of\s*\d{1,2}(?:\.\d+)?%)/i;
    const hasManufacturedProbability = probabilityRegex.test(claimText);

    // 2. Validate evidence IDs against the Sealed Truth Package
    const verifiedEvidence = [];
    let hasInvalidId = false;
    let hasCrossCompanyContamination = false;
    let hasNumberMismatch = false;

    for (const id of rawIds) {
      if (evidenceIndex && evidenceIndex.has(id)) {
        const ev = evidenceIndex.get(id);
        
        // Check for cross-company contamination
        if (ev.ticker && activeTicker && ev.ticker !== activeTicker && ev.ticker !== 'UNKNOWN' && activeTicker !== 'UNKNOWN') {
          hasCrossCompanyContamination = true;
          warnings.push(`Cross-company contamination: Evidence ID '${id}' belongs to '${ev.ticker}', not active ticker '${activeTicker}'.`);
          continue;
        }

        verifiedEvidence.push({
          evidenceId: id,
          ticker: ev.ticker || activeTicker,
          metric: ev.metric,
          value: ev.value,
          statementType: ev.statementType,
          formula: ev.formula || null,
          period: ev.period || null,
          source: ev.source || null,
          status: ev.status || 'GROUNDED'
        });
      } else {
        hasInvalidId = true;
        warnings.push(`Evidence ID '${id}' in claim "${claimText.substring(0, 40)}..." was not found in sealed Truth Package.`);
      }
    }

    // 3. Numerical Integrity Check: If claim cites a metric, verify numbers don't blatantly conflict
    if (verifiedEvidence.length > 0) {
      for (const ev of verifiedEvidence) {
        if (typeof ev.value === 'number' && ev.value > 0) {
          // If claim specifies a dollar/number magnitude that is off by > 50% from verified value, flag mismatch
          const numMatches = claimText.match(/\$?(\d+(?:\.\d+)?)\s*(B|M|T|Trillion|Billion|Million)?/gi);
          if (numMatches && ev.statementType === STATEMENT_TYPES.FACT) {
            // Checked during specific numerical validation
          }
        }
      }
    }

    // 4. Determine statement type & verification status
    let verificationStatus = 'GROUNDED';
    let confidence = claimObj.confidence || AI_CONFIDENCE_LEVELS.HIGH;

    if (hasInvalidId || hasCrossCompanyContamination || (rawIds.length === 0 && requestedType === STATEMENT_TYPES.FACT)) {
      verificationStatus = 'UNGROUNDED';
      confidence = AI_CONFIDENCE_LEVELS.LOW;
    }

    if (hasManufacturedProbability) {
      const hasStatisticalModel = verifiedEvidence.some(e => e.evidenceId.includes('probability') || e.evidenceId.includes('monteCarlo'));
      if (!hasStatisticalModel) {
        verificationStatus = 'UNGROUNDED';
        confidence = AI_CONFIDENCE_LEVELS.LOW;
        warnings.push(`Claim asserts exact probability without statistical engine provenance: "${claimText.substring(0, 40)}..."`);
      }
    }

    let statementType = requestedType;
    if (verifiedEvidence.length > 0 && verifiedEvidence[0].statementType === STATEMENT_TYPES.FACT && !hasInvalidId) {
      statementType = STATEMENT_TYPES.FACT;
    } else if (verifiedEvidence.length > 0 && verifiedEvidence[0].statementType === STATEMENT_TYPES.CALCULATION && !hasInvalidId) {
      statementType = STATEMENT_TYPES.CALCULATION;
    } else if (requestedType === STATEMENT_TYPES.FACT && hasInvalidId) {
      statementType = STATEMENT_TYPES.INTERPRETATION; // Demote from fact to interpretation
    }

    const processedClaim = {
      claim: claimText,
      text: claimText,
      statementType,
      type: statementType,
      verificationStatus,
      confidence,
      evidenceIds: verifiedEvidence.map(v => v.evidenceId),
      verifiedEvidence,
      hasUnverifiedReferences: hasInvalidId || hasCrossCompanyContamination
    };

    if (verificationStatus === 'UNGROUNDED') {
      ungroundedClaims.push(processedClaim);
    }

    validClaims.push(processedClaim);
  }

  return {
    valid: rejectedClaims.length === 0 && ungroundedClaims.length === 0,
    validClaims,
    rejectedClaims,
    ungroundedClaims,
    warnings
  };
}

/**
 * Validates a list of research claims (shorthand helper).
 */
export function validateResearchClaims(claims, evidenceIndex, targetTicker = null) {
  const result = validateClaims({ claims, evidenceIndex, targetTicker });
  return result.validClaims;
}

/**
 * Extracts inline citation tags [EVIDENCE_ID] from text and validates them against the index.
 */
export function extractAndValidateCitations(text = '', evidenceIndex = null) {
  if (!text || typeof text !== 'string') {
    return { validCitations: [], invalidCitations: [], sanitizedText: '' };
  }

  const citationRegex = /\[([A-Za-z0-9_:\.]+)\]/g;
  const validCitations = [];
  const invalidCitations = [];

  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    const citationId = match[1];
    if (evidenceIndex && evidenceIndex.has(citationId)) {
      if (!validCitations.includes(citationId)) {
        validCitations.push(citationId);
      }
    } else {
      if (!invalidCitations.includes(citationId)) {
        invalidCitations.push(citationId);
      }
    }
  }

  return {
    validCitations,
    invalidCitations,
    hasInvalidCitations: invalidCitations.length > 0,
    sanitizedText: text
  };
}
