/**
 * server/earnings/earnings.surprise.engine.js
 * 
 * Phase 21: Earnings & Fundamentals Surprise Engine
 * Computes deterministic surprises for Revenue, EPS, Margin, and FCF.
 * Explicitly defends against division-by-zero, negative denominators, and missing estimates.
 */

import { EventClassification } from './earnings.types.js';

/**
 * Computes surprise metrics between actual reported facts and consensus expectations
 * 
 * Rules:
 * 1. Absolute Surprise = Actual - Consensus (Classification: DERIVED)
 * 2. Percentage Surprise:
 *    - If Consensus > 0 -> (Actual - Consensus) / Consensus
 *    - If Consensus = 0 -> UNAVAILABLE (No division by zero)
 *    - If Consensus < 0 (e.g. Negative Consensus EPS) -> UNAVAILABLE (Percentage is mathematically misleading)
 * 3. Direction: BEAT (surprise > 0), MISS (surprise < 0), IN_LINE (surprise == 0)
 * 
 * @param {Object} actualFact - { metric, value, period, ticker }
 * @param {Object} consensus - { meanEstimate, medianEstimate, highEstimate, lowEstimate }
 * @returns {Object} Deterministic surprise evaluation
 */
export function computeEarningsSurprise(actualFact, consensus) {
  if (!actualFact || typeof actualFact !== 'object') {
    throw new Error('Valid actualFact object is required');
  }

  const actualVal = typeof actualFact.value === 'number' ? actualFact.value : null;
  if (actualVal === null || !Number.isFinite(actualVal)) {
    throw new Error(`Invalid actualFact value: ${actualVal}`);
  }

  if (!consensus || typeof consensus.meanEstimate !== 'number' || !Number.isFinite(consensus.meanEstimate)) {
    return {
      metric: actualFact.metric || 'UNKNOWN',
      ticker: actualFact.ticker || 'UNKNOWN',
      period: actualFact.period || 'UNKNOWN',
      actualValue: actualVal,
      consensusValue: null,
      absoluteSurprise: 'UNAVAILABLE',
      percentageSurprise: 'UNAVAILABLE',
      direction: 'UNKNOWN',
      status: 'UNAVAILABLE_MISSING_CONSENSUS',
      classification: EventClassification.UNAVAILABLE
    };
  }

  const consensusVal = consensus.meanEstimate;
  const absoluteSurprise = actualVal - consensusVal;

  let percentageSurprise = null;
  let pctStatus = 'VALID';

  if (Math.abs(consensusVal) < 1e-6) {
    percentageSurprise = null;
    pctStatus = 'UNAVAILABLE_ZERO_CONSENSUS_DENOMINATOR';
  } else if (consensusVal < 0) {
    percentageSurprise = null;
    pctStatus = 'UNAVAILABLE_NEGATIVE_CONSENSUS_DENOMINATOR';
  } else {
    percentageSurprise = absoluteSurprise / consensusVal;
  }

  const direction = Math.abs(absoluteSurprise) < 1e-6 
    ? 'IN_LINE' 
    : (absoluteSurprise > 0 ? 'BEAT' : 'MISS');

  return {
    metric: actualFact.metric || 'UNKNOWN',
    ticker: actualFact.ticker || 'UNKNOWN',
    period: actualFact.period || 'UNKNOWN',
    actualValue: actualVal,
    consensusValue: consensusVal,
    absoluteSurprise,
    percentageSurprise: percentageSurprise !== null ? percentageSurprise : 'UNAVAILABLE',
    percentageSurpriseStatus: pctStatus,
    direction,
    isBeat: direction === 'BEAT',
    isMiss: direction === 'MISS',
    isInline: direction === 'IN_LINE',
    classification: EventClassification.DERIVED
  };
}

/**
 * Computes multi-metric comprehensive surprise report
 */
export function computeComprehensiveSurpriseReport(actualsMap, consensusMap) {
  const surprises = {};
  const metrics = ['REVENUE', 'DILUTED_EPS', 'EBITDA', 'FREE_CASH_FLOW'];

  for (const m of metrics) {
    const act = actualsMap[m];
    const cons = consensusMap[m];
    if (act) {
      surprises[m] = computeEarningsSurprise(act, cons || null);
    }
  }

  return {
    surprises,
    timestamp: new Date().toISOString(),
    classification: EventClassification.DERIVED
  };
}
