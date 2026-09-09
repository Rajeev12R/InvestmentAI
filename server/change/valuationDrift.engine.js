import { CHANGE_DIRECTIONS } from './change.types.js';

/**
 * Evaluates Valuation Drift between two snapshots.
 */
export function analyzeValuationDrift(previousSnapshot, currentSnapshot) {
  if (!previousSnapshot || !currentSnapshot) {
    return {
      hasDrift: false,
      fairValueChangePct: 0,
      direction: CHANGE_DIRECTIONS.NEUTRAL,
      dcfDrift: null,
      impliedGrowthDrift: null,
      compositeFairValueDrift: null,
      interpretation: 'Insufficient snapshots for valuation drift analysis.'
    };
  }

  const prevVal = previousSnapshot.valuationState || {};
  const currVal = currentSnapshot.valuationState || {};

  const prevFair = prevVal.compositeFairValue !== 'UNAVAILABLE' ? prevVal.compositeFairValue : prevVal.dcfFairValue;
  const currFair = currVal.compositeFairValue !== 'UNAVAILABLE' ? currVal.compositeFairValue : currVal.dcfFairValue;

  let fairValueChangePct = 0;
  let direction = CHANGE_DIRECTIONS.NEUTRAL;

  if (typeof prevFair === 'number' && typeof currFair === 'number' && prevFair > 0) {
    fairValueChangePct = Math.round(((currFair - prevFair) / prevFair) * 10000) / 100;
    if (fairValueChangePct > 1.0) direction = CHANGE_DIRECTIONS.IMPROVING;
    else if (fairValueChangePct < -1.0) direction = CHANGE_DIRECTIONS.DETERIORATING;
  }

  // Reverse DCF Implied Growth comparison
  const prevGrowth = prevVal.reverseDcfGrowth;
  const currGrowth = currVal.reverseDcfGrowth;
  let growthDelta = null;
  if (typeof prevGrowth === 'number' && typeof currGrowth === 'number') {
    growthDelta = Math.round((currGrowth - prevGrowth) * 100) / 100;
  }

  // Generate deterministic interpretation
  let interpretation = 'Valuation remains broadly stable across assessment periods.';
  if (fairValueChangePct > 5.0) {
    interpretation = `Intrinsic fair value expanded by +${fairValueChangePct.toFixed(1)}%, driven by higher cash flow projections or lower discount rates.`;
  } else if (fairValueChangePct < -5.0) {
    interpretation = `Intrinsic fair value compressed by ${fairValueChangePct.toFixed(1)}%, reflecting lower free cash flow trajectory or elevated capital costs.`;
  }

  return {
    hasDrift: Math.abs(fairValueChangePct) >= 3.0,
    fairValueChangePct,
    direction,
    previousFairValue: prevFair,
    currentFairValue: currFair,
    previousReverseDcfGrowth: prevGrowth,
    currentReverseDcfGrowth: currGrowth,
    growthDelta,
    interpretation,
    evidenceIds: ['valuation.compositeFairValue', 'valuation.dcfFairValue', 'valuation.reverseDcfGrowth']
  };
}
