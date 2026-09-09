/**
 * server/earnings/earnings.portfolio.engine.js
 * 
 * Phase 21: Portfolio Corporate Event Aggregation Engine
 * Aggregates earnings surprises, guidance revisions, and upcoming earnings calendar across a portfolio.
 */

import { EventClassification } from './earnings.types.js';

export function aggregatePortfolioEvents(portfolio, securityEventMap = {}) {
  if (!portfolio || !Array.isArray(portfolio.positions) || portfolio.positions.length === 0) {
    throw new Error('Valid portfolio with positions array required');
  }

  const cash = typeof portfolio.cash === 'number' ? portfolio.cash : 0;
  let netNav = cash;
  let grossExposure = cash;

  for (const p of portfolio.positions) {
    const mv = typeof p.marketValue === 'number' ? p.marketValue : (p.sharesHeld || p.quantity || 0) * (p.currentPrice || 0);
    netNav += mv;
    grossExposure += Math.abs(mv);
  }

  let beatCount = 0;
  let missCount = 0;
  let guidanceRaiseCount = 0;
  let guidanceCutCount = 0;
  let netHighAttentionMarketValue = 0.0;
  let grossHighAttentionMarketValue = 0.0;

  const positionSummaries = [];

  for (const pos of portfolio.positions) {
    const ticker = pos.ticker.toUpperCase();
    const mv = typeof pos.marketValue === 'number' ? pos.marketValue : (pos.sharesHeld || pos.quantity || 0) * (pos.currentPrice || 0);
    const isShort = mv < 0;

    const netWeight = netNav !== 0 ? (mv / netNav) : 0;
    const grossWeight = grossExposure > 0 ? (Math.abs(mv) / grossExposure) : 0;

    const eventInfo = securityEventMap[ticker] || {};

    if (eventInfo.surprise?.isBeat) beatCount++;
    if (eventInfo.surprise?.isMiss) missCount++;
    if (eventInfo.guidance?.revisionDirection === 'RAISE') guidanceRaiseCount++;
    if (eventInfo.guidance?.revisionDirection === 'CUT') guidanceCutCount++;

    const isHighAttn = eventInfo.attention?.attentionLevel === 'HIGH' || eventInfo.attention?.attentionLevel === 'CRITICAL';
    if (isHighAttn) {
      netHighAttentionMarketValue += mv;
      grossHighAttentionMarketValue += Math.abs(mv);
    }

    positionSummaries.push({
      ticker,
      marketValue: mv,
      isShort,
      netWeight,
      grossWeight,
      latestSurprise: eventInfo.surprise?.direction || 'NO_EVENT',
      guidanceStatus: eventInfo.guidance?.revisionDirection || 'NO_GUIDANCE',
      attentionLevel: eventInfo.attention?.attentionLevel || 'LOW'
    });
  }

  const netHighAttentionWeight = (typeof netNav === 'number' && Number.isFinite(netNav) && netNav !== 0) ? (netHighAttentionMarketValue / netNav) : 'UNAVAILABLE';
  const grossHighAttentionWeight = (typeof grossExposure === 'number' && Number.isFinite(grossExposure) && grossExposure > 0) ? (grossHighAttentionMarketValue / grossExposure) : (grossExposure === 0 ? 0.0 : 'UNAVAILABLE');

  return Object.freeze({
    portfolioId: portfolio.id || 'PORTFOLIO_DEFAULT',
    totalNav: netNav,
    netNav,
    grossExposure,
    positionsCount: portfolio.positions.length,
    eventsSummary: {
      beatCount,
      missCount,
      guidanceRaiseCount,
      guidanceCutCount,
      highAttentionWeight: netHighAttentionWeight, // Backward compatibility
      netHighAttentionWeight,
      grossHighAttentionWeight,
      netHighAttentionMarketValue,
      grossHighAttentionMarketValue
    },
    positions: Object.freeze(positionSummaries),
    classification: EventClassification.MODEL_ESTIMATE
  });
}
