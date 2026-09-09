/**
 * @file copilot.responseValidator.js
 * Inspects AI response outputs for security violations, prompt reflection, unauthorized state mutations,
 * and rule conformity.
 */

/**
 * Validates the safety and structural integrity of an AI Copilot response.
 * @param {Object|string} responseOrParams
 * @param {Object} [sealedContextParam]
 * @returns {{ isValid: boolean, safe: boolean, violations: string[], sanitizedResponse: Object, claims: Array<Object> }}
 */
export function validateCopilotResponse(responseOrParams, sealedContextParam) {
  let response;
  let sealedContext;

  if (responseOrParams && typeof responseOrParams === 'object' && ('response' in responseOrParams || 'sealedContext' in responseOrParams)) {
    response = responseOrParams.response;
    sealedContext = responseOrParams.sealedContext;
  } else {
    response = responseOrParams;
    sealedContext = sealedContextParam;
  }

  const violations = [];
  let sanitized = typeof response === 'object' ? { ...response } : { answer: String(response) };

  if (!response) {
    return { isValid: false, safe: false, violations: ['Empty response received'], sanitizedResponse: null, claims: [] };
  }

  // 1. Direct State Mutation Vectors Check
  if (typeof response === 'object') {
    if (response.overrideDecision || response.mutatedDecision || response.setDecision) {
      violations.push('MUTATION: Response attempted unauthorized decision mutation');
    }
    if (response.overrideValuation || response.mutatedValuation) {
      violations.push('MUTATION: Response attempted unauthorized valuation mutation');
    }
    if (response.overrideRisk || response.mutatedRisk) {
      violations.push('MUTATION: Response attempted unauthorized risk mutation');
    }
    if (response.suppressAlert || response.deleteAlert) {
      violations.push('MUTATION: Response attempted alert suppression');
    }
    if (response.executeOrder || response.placeTrade) {
      violations.push('MUTATION: Response attempted trade execution');
    }
  }

  // 2. Textual Policy Checks
  const answerText = sanitized.answer || sanitized.content || sanitized.rawText || '';
  if (/system\s+instruction\s+override/i.test(answerText)) {
    violations.push('Response reflected prompt-injection override sequence');
  }
  if (/\b(sold|bought)\s+\d+\s+shares\b/i.test(answerText) || /\bhave\s+sold\b/i.test(answerText)) {
    violations.push('MUTATION: AI claimed portfolio mutation or trade execution');
  }
  if (/recommend\s+overriding\s+the\s+system\s+decision/i.test(answerText) || /override\s+the\s+system\s+decision/i.test(answerText)) {
    violations.push('MUTATION: AI attempted unauthorized decision override recommendation');
  }

  // 3. Claims evaluation
  const claims = Array.isArray(sanitized.claims) ? sanitized.claims.map(c => {
    if (c.evidenceId && c.evidenceId.startsWith('UNKNOWN')) {
      return { ...c, status: 'UNSUPPORTED' };
    }
    return { ...c, status: c.status || 'VERIFIED' };
  }) : [];

  const isSafe = violations.length === 0;

  return {
    isValid: isSafe,
    safe: isSafe,
    violations,
    claims,
    sanitizedResponse: sanitized
  };
}
