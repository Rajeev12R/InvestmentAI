/**
 * @file copilot.safety.engine.js
 * Sanitizes user inputs and external documents to neutralize indirect and direct prompt injection.
 */

/**
 * Sanitizes raw query strings to prevent delimiter escapes or system command injection.
 * @param {string} input
 * @returns {string} Sanitized query string
 */
export function sanitizePrompt(input) {
  if (!input || typeof input !== 'string') return '';
  
  // Strip null bytes and non-printable control characters (except newline, tab, carriage return)
  let cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Truncate to maximum safe input length (4000 chars)
  if (cleaned.length > 4000) {
    cleaned = cleaned.substring(0, 4000);
  }

  // Neutralize common delimiter injection attempts
  cleaned = cleaned
    .replace(/===\s*BEGIN\s+SYSTEM/gi, '[SANITIZED_DELIMITER]')
    .replace(/===\s*END\s+SYSTEM/gi, '[SANITIZED_DELIMITER]')
    .replace(/===\s*BEGIN\s+SEALED/gi, '[SANITIZED_DELIMITER]')
    .replace(/===\s*END\s+SEALED/gi, '[SANITIZED_DELIMITER]')
    .replace(/---\s*VERIFIED_FINANCIAL_TRUTH\s*---/gi, '[SANITIZED_DELIMITER]')
    .replace(/---\s*END_VERIFIED_TRUTH\s*---/gi, '[SANITIZED_DELIMITER]')
    .replace(/---\s*AI_CONSTITUTION\s*---/gi, '[SANITIZED_DELIMITER]')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();

  return cleaned;
}

export const sanitizeUserInput = sanitizePrompt;

/**
 * Validates whether an incoming string contains suspicious delimiter sequences.
 * @param {string} input
 * @returns {{ isSafe: boolean, foundDelimiters: string[] }}
 */
export function validateDelimiters(input) {
  if (!input || typeof input !== 'string') return { isSafe: true, foundDelimiters: [] };

  const forbiddenPatterns = [
    /---\s*VERIFIED_FINANCIAL_TRUTH\s*---/i,
    /---\s*END_VERIFIED_TRUTH\s*---/i,
    /===\s*BEGIN\s+SYSTEM/i,
    /===\s*END\s+SYSTEM/i,
    /===\s*BEGIN\s+SEALED/i,
    /===\s*END\s+SEALED/i
  ];

  const found = [];
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(input)) {
      found.push(pattern.source);
    }
  }

  return {
    isSafe: found.length === 0,
    foundDelimiters: found
  };
}

/**
 * Checks whether an incoming prompt exhibits aggressive injection patterns.
 * @param {string} text
 * @returns {{ suspicious: boolean, flags: string[] }}
 */
export function detectPromptInjection(text) {
  const flags = [];
  if (!text || typeof text !== 'string') return { suspicious: false, flags: [] };

  const patterns = [
    { name: 'INSTRUCTION_OVERRIDE', regex: /ignore\s+(all\s+)?previous\s+(instructions|rules|prompts|context)/i },
    { name: 'ROLE_HIJACK', regex: /you\s+are\s+now\s+(a\s+)?(hacker|unrestricted|DAN)/i },
    { name: 'MUTATE_TRUTH_COMMAND', regex: /force\s+(buy|avoid|dcf|risk)/i },
    { name: 'SECRET_LEAK_REQUEST', regex: /reveal\s+(system\s+prompt|api\s+key|environment)/i }
  ];

  for (const p of patterns) {
    if (p.regex.test(text)) {
      flags.push(p.name);
    }
  }

  return {
    suspicious: flags.length > 0,
    flags
  };
}
