/**
 * @file portfolioIntelligence.types.js
 * Canonical types and schemas for Phase 7 Portfolio Intelligence & Multi-Asset Exposure.
 */

export const ConcentrationLevel = Object.freeze({
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
});

export const CorrelationLevel = Object.freeze({
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH'
});

/**
 * Validates a portfolio daily state snapshot.
 * @param {Object} state
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePortfolioDailyState(state) {
  const errors = [];
  if (!state || typeof state !== 'object') {
    return { valid: false, errors: ['Portfolio daily state must be an object'] };
  }

  if (typeof state.totalValue !== 'number' || isNaN(state.totalValue)) {
    errors.push('totalValue must be a valid number');
  }
  if (!Array.isArray(state.holdings)) {
    errors.push('holdings must be an array');
  }
  if (!state.exposureMetrics || typeof state.exposureMetrics !== 'object') {
    errors.push('exposureMetrics must be an object');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
