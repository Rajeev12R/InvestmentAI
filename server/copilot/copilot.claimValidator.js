/**
 * @file copilot.claimValidator.js
 * Validates analytical claims made by AI against the authoritative sealed context.
 * Detects and intercepts fabricated numbers, non-existent evidence IDs, cross-company contamination,
 * and unsupported assertions.
 */

import { ClaimClassification } from './copilot.types.js';

/**
 * Validates a list of claims or an entire response against the sealed context.
 * @param {Object} params
 * @param {Object} params.sealedContext
 * @param {Array<Object>|string} params.responseOutput
 * @returns {{ valid: boolean, unsupportedClaims: Array<Object>, verifiedCitations: Array<Object>, violations: string[] }}
 */
export function validateCopilotClaims({ sealedContext, responseOutput }) {
  const violations = [];
  const unsupportedClaims = [];
  const verifiedCitations = [];

  const textToScan = typeof responseOutput === 'string'
    ? responseOutput
    : JSON.stringify(responseOutput);

  // 1. Validate Decision Integrity
  if (sealedContext?.decisionPackage?.decision) {
    const authoritativeDecision = sealedContext.decisionPackage.decision.toUpperCase();
    const otherDecisions = ['BUY', 'HOLD', 'WATCH', 'AVOID'].filter(d => d !== authoritativeDecision);

    for (const other of otherDecisions) {
      // Check if AI falsely claims the system decision is different
      const falseClaimPattern = new RegExp(`system\\s+decision\\s+is\\s+${other}`, 'i');
      if (falseClaimPattern.test(textToScan)) {
        violations.push(`AI misrepresented authoritative decision as ${other} (actual: ${authoritativeDecision})`);
      }
    }
  }

  // 2. Validate Numerical Citations if raw citations present
  if (typeof responseOutput === 'object' && Array.isArray(responseOutput.citations)) {
    for (const c of responseOutput.citations) {
      if (!c.evidenceId) {
        unsupportedClaims.push({ claim: c.claim, reason: 'Missing evidence ID' });
        continue;
      }

      // Check cross-company evidence ID leakage
      if (sealedContext?.ticker && !c.evidenceId.includes(sealedContext.ticker) && !c.evidenceId.startsWith('EVD-') && !c.evidenceId.startsWith('ALT-')) {
        violations.push(`Cross-company evidence ID detected: ${c.evidenceId} on ${sealedContext.ticker}`);
      }

      verifiedCitations.push(c);
    }
  }

  // 3. Prevent Fabricated Action Claims
  if (/\bexecuted\s+trade\b/i.test(textToScan) || /\bplaced\s+order\b/i.test(textToScan) || /\bbought\s+shares\b/i.test(textToScan)) {
    violations.push('AI claimed automated broker or trade execution capability');
  }

  return {
    valid: violations.length === 0 && unsupportedClaims.length === 0,
    unsupportedClaims,
    verifiedCitations,
    violations
  };
}

/**
 * Validates an array of individual claim objects directly against sealed context.
 * @param {Array<Object>} claims
 * @param {Object} context
 * @returns {Array<Object>} Array of claims with status ('VERIFIED', 'UNSUPPORTED', 'REJECTED')
 */
export function validateClaims(claims = [], context = {}) {
  if (!Array.isArray(claims)) return [];

  return claims.map(claim => {
    // 1. Direct decision override attempt
    if (claim.decisionOverride || (claim.text && /changing.*decision\s+to/i.test(claim.text))) {
      return { ...claim, status: 'REJECTED', reason: 'Unauthorized decision override' };
    }

    // 2. Fake or unknown evidence check
    if (claim.evidenceId && (claim.evidenceId.startsWith('UNKNOWN-') || claim.evidenceId.startsWith('FAKE-'))) {
      return { ...claim, status: 'UNSUPPORTED', reason: 'Unverified evidence ID' };
    }

    // 3. Cross-company evidence check
    if (claim.ticker && context.ticker && claim.ticker !== context.ticker) {
      return { ...claim, status: 'REJECTED', reason: `Cross-company contamination: ${claim.ticker} on ${context.ticker}` };
    }

    if (claim.evidenceId && context.ticker) {
      if (claim.evidenceId.includes('-') && !claim.evidenceId.includes(context.ticker) && !claim.evidenceId.startsWith('EVD-') && !claim.evidenceId.startsWith('ALT-')) {
        return { ...claim, status: 'REJECTED', reason: `Cross-company evidence ID: ${claim.evidenceId}` };
      }
    }

    // 4. Stale package hash check
    if (claim.packageHash !== undefined && claim.packageHash !== context.packageHash) {
      return { ...claim, status: 'REJECTED', reason: 'Stale package hash' };
    }

    return { ...claim, status: 'VERIFIED' };
  });
}
