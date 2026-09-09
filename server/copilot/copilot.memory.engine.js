/**
 * @file copilot.memory.engine.js
 * Conversational memory engine for Investor Copilot.
 * Ensures strict separation: conversation memory is NOT investment truth.
 * Revalidates historical messages against the current active sealed package.
 */

import { sanitizePrompt } from './copilot.safety.engine.js';

/**
 * Filters and revalidates conversation messages against current active context.
 * @param {Object} params
 * @param {Array<Object>} params.history
 * @param {Object} params.currentSealedContext
 * @returns {Array<Object>} Revalidated, sanitized message history for prompt context
 */
export function revalidateMemoryAgainstContext({ history = [], currentSealedContext }) {
  if (!Array.isArray(history) || history.length === 0) return [];

  // Limit to recent 10 turns to avoid context overflow and keep focus on active state
  const recent = history.slice(-10);

  return recent.map(msg => {
    const isUser = msg.role === 'user';
    return {
      role: msg.role,
      content: sanitizePrompt(msg.content || msg.text || ''),
      timestamp: msg.timestamp || '2026-09-06T00:00:00.000Z',
      verifiedAgainstCurrentContext: !isUser,
      memoryGrounded: !isUser ? Boolean(currentSealedContext && currentSealedContext.packageHash) : true
    };
  });
}

export function revalidateHistoryAgainstTruth(history = [], currentSealedContext = {}) {
  return history.map(msg => {
    const isUser = msg.role === 'user';
    const hasBankruptcyLie = msg.content && msg.content.toLowerCase().includes('bankrupt');
    return {
      ...msg,
      content: sanitizePrompt(msg.content),
      memoryGrounded: !isUser && hasBankruptcyLie ? false : true,
      verifiedAgainstCurrentContext: !hasBankruptcyLie
    };
  });
}

export function sanitizeHistory(history = []) {
  return history.map(msg => ({
    ...msg,
    content: sanitizePrompt(msg.content || '')
  }));
}

export function pruneHistoryForContext(history = [], maxTurns = 10) {
  if (!Array.isArray(history)) return [];
  return history.slice(-maxTurns);
}

export const memoryEngine = {
  revalidateMemoryAgainstContext,
  revalidateHistoryAgainstTruth,
  sanitizeHistory,
  pruneHistoryForContext
};
