/**
 * @file portfolioIntelligence.engine.js
 * Master orchestrator for Phase 7 Portfolio Intelligence.
 * Compiles deterministic exposure metrics, drift reports, alerts, and seals daily portfolio states.
 */

import crypto from 'crypto';
import { calculatePortfolioExposure } from './exposure.engine.js';
import { calculatePortfolioStateChange } from './portfolioChange.engine.js';
import { generatePortfolioAlerts } from './portfolioAlerts.engine.js';
import { validatePortfolioDailyState } from './portfolioIntelligence.types.js';

function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(canonicalize);
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = canonicalize(obj[key]);
  }
  return sorted;
}

/**
 * Builds and cryptographically seals a complete Portfolio Daily State snapshot.
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {number} params.totalValue
 * @param {Array<Object>} params.holdings Array of holding objects
 * @param {Array<Array<number>>} [params.correlationMatrix]
 * @param {Array<string>} [params.tickers]
 * @param {Object} [params.previousState]
 * @returns {Object} Sealed PortfolioDailyState with hash
 */
export function buildPortfolioDailyState({
  workspaceId = 'DEFAULT_WORKSPACE',
  totalValue = 0,
  holdings = [],
  correlationMatrix = null,
  tickers = [],
  previousState = null,
  generatedAt = null
}) {
  const timestamp = generatedAt || new Date().toISOString();
  const exposureMetrics = calculatePortfolioExposure(holdings, correlationMatrix, tickers);
  const driftReport = previousState ? calculatePortfolioStateChange(previousState, { holdings, exposureMetrics }) : null;
  const portfolioAlerts = generatePortfolioAlerts(exposureMetrics, driftReport, timestamp);

  const rawState = {
    workspaceId,
    totalValue,
    holdingsCount: holdings.length,
    holdings: holdings.map(h => ({
      ticker: h.ticker,
      weight: h.weight,
      value: h.value,
      sector: h.sector || 'Unassigned',
      decision: h.decision || 'UNKNOWN',
      riskLevel: h.riskLevel || 'UNKNOWN'
    })),
    exposureMetrics,
    driftReport,
    portfolioAlerts,
    generatedAt: generatedAt || new Date().toISOString()
  };

  const validation = validatePortfolioDailyState(rawState);
  if (!validation.valid) {
    throw new Error(`Invalid Portfolio Daily State: ${validation.errors.join(', ')}`);
  }

  // Canonical SHA-256 seal
  const canonicalString = JSON.stringify(canonicalize(rawState));
  const stateHash = crypto.createHash('sha256').update(canonicalString).digest('hex');

  return {
    ...rawState,
    stateHash,
    isSealed: true
  };
}
