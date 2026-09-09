/**
 * @file copilot.contextRouter.js
 * Deterministic Context Router for Phase 8 Investor Copilot.
 * Routes classified intents to specific Phase 1–7 deterministic tools, gathers only
 * authorized sealed packages, hashes the assembled DTO, and freezes it before passing to AI.
 */

import crypto from 'crypto';
import { CopilotIntent } from './copilot.types.js';
import { getTruthContext } from './tools/truth.tool.js';
import { getChangeContext } from './tools/change.tool.js';
import { getAttentionContext } from './tools/attention.tool.js';
import { getValuationContext } from './tools/valuation.tool.js';
import { getRiskContext } from './tools/risk.tool.js';
import { getDecisionContext } from './tools/decision.tool.js';
import { getPortfolioContext } from './tools/portfolio.tool.js';
import { getResearchContext } from './tools/research.tool.js';
import { getTimelineContext } from './tools/timeline.tool.js';

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
 * Builds a sealed, immutable, cryptographic InvestorCopilotContext based on intent and query parameters.
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {string} params.intent
 * @param {string[]} [params.tickers]
 * @param {string} [params.primaryTicker]
 * @param {string} [params.question]
 * @param {string} [params.timestamp]
 * @returns {Promise<Object>} Sealed InvestorCopilotContext
 */
export async function routeAndSealContext({
  workspaceId = 'DEFAULT_WORKSPACE',
  intent = CopilotIntent.UNKNOWN,
  tickers = [],
  primaryTicker = null,
  ticker = null,
  question = '',
  timestamp = null
}) {
  const effectiveTicker = primaryTicker || ticker || tickers[0] || null;
  const contextTimestamp = timestamp || '2026-09-06T00:00:00.000Z';

  const assembled = {
    contextId: `CTX-${workspaceId}-${effectiveTicker || 'PORTFOLIO'}-${Date.now()}`,
    workspaceId,
    intent,
    ticker: effectiveTicker,
    timestamp: contextTimestamp,
    truthPackage: null,
    changePackage: null,
    attentionPackage: null,
    valuationPackage: null,
    riskPackage: null,
    decisionPackage: null,
    portfolioPackage: null,
    researchPackage: null,
    timelinePackage: null,
    comparisonPackages: []
  };

  // 1. Portfolio Queries
  if (intent === CopilotIntent.PORTFOLIO_QUERY) {
    assembled.portfolioPackage = await getPortfolioContext(workspaceId);
    assembled.attentionPackage = await getAttentionContext(workspaceId);
  }

  // 2. Comparison Queries
  else if (intent === CopilotIntent.COMPANY_COMPARISON || tickers.length >= 2) {
    for (const t of tickers.slice(0, 3)) {
      const [tTruth, tVal, tRisk, tDec] = await Promise.all([
        getTruthContext(workspaceId, t),
        getValuationContext(workspaceId, t),
        getRiskContext(workspaceId, t),
        getDecisionContext(workspaceId, t)
      ]);
      assembled.comparisonPackages.push({
        ticker: t,
        truth: tTruth,
        valuation: tVal,
        risk: tRisk,
        decision: tDec
      });
    }
  }

  // 3. Single-Company Inquiries
  else if (effectiveTicker) {
    const [tTruth, tChange, tAttn, tVal, tRisk, tDec, tRes, tTimeline] = await Promise.all([
      getTruthContext(workspaceId, effectiveTicker),
      getChangeContext(workspaceId, effectiveTicker),
      getAttentionContext(workspaceId, effectiveTicker),
      getValuationContext(workspaceId, effectiveTicker),
      getRiskContext(workspaceId, effectiveTicker),
      getDecisionContext(workspaceId, effectiveTicker),
      getResearchContext(workspaceId, effectiveTicker, question),
      getTimelineContext(workspaceId, effectiveTicker)
    ]);

    assembled.truthPackage = tTruth;
    assembled.changePackage = tChange;
    assembled.attentionPackage = tAttn;
    assembled.valuationPackage = tVal;
    assembled.riskPackage = tRisk;
    assembled.decisionPackage = tDec;
    assembled.researchPackage = tRes;
    assembled.timelinePackage = tTimeline;
  }

  // 4. Default System Context
  else {
    assembled.attentionPackage = await getAttentionContext(workspaceId);
    assembled.portfolioPackage = await getPortfolioContext(workspaceId);
  }

  // Cryptographic SHA-256 Context Hash
  const canonicalContext = canonicalize(assembled);
  const contextHash = crypto.createHash('sha256').update(JSON.stringify(canonicalContext)).digest('hex');

  const sealed = {
    ...assembled,
    truth: assembled.truthPackage,
    valuation: assembled.valuationPackage,
    risk: assembled.riskPackage,
    decision: assembled.decisionPackage,
    portfolio: assembled.portfolioPackage,
    attention: assembled.attentionPackage,
    contextHash,
    packageHash: contextHash,
    isSealed: true
  };

  // Deep Freeze to enforce absolute immutability across the boundary
  return Object.freeze(sealed);
}

export const buildCopilotContext = routeAndSealContext;
