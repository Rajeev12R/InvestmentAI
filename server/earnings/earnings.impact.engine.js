/**
 * server/earnings/earnings.impact.engine.js
 * 
 * Phase 21: Deterministic Event Impact Model
 * Classifies the overall corporate event outcome into POSITIVE, NEGATIVE, MIXED, NEUTRAL, or UNKNOWN.
 */

import { EventImpactCategory, EventClassification } from './earnings.types.js';

/**
 * Deterministically evaluates event impact
 * 
 * Rules:
 * - EPS Beat + Guidance Raise/Maintained -> POSITIVE
 * - EPS Miss + Guidance Cut/Maintained -> NEGATIVE
 * - EPS Beat + Guidance Cut (or EPS Miss + Guidance Raise) -> MIXED
 * - In-Line EPS + Maintained Guidance -> NEUTRAL
 * - Missing data -> UNKNOWN
 * 
 * @param {Object} surpriseResult - Output from computeEarningsSurprise
 * @param {Object} guidanceRecord - Output from recordGuidance
 * @returns {Object} Impact classification
 */
export function classifyEventImpact(surpriseResult, guidanceRecord) {
  const isBeat = surpriseResult?.isBeat || false;
  const isMiss = surpriseResult?.isMiss || false;
  const isInline = surpriseResult?.isInline || false;

  const guidanceDir = guidanceRecord?.revisionDirection || 'MAINTAINED';

  let impact = EventImpactCategory.UNKNOWN;
  let rationale = 'Insufficient evidence to categorize impact';

  if (isBeat && (guidanceDir === 'RAISE' || guidanceDir === 'MAINTAINED')) {
    impact = EventImpactCategory.POSITIVE;
    rationale = 'Earnings beat accompanied by solid/upgraded forward guidance';
  } else if (isMiss && (guidanceDir === 'CUT' || guidanceDir === 'MAINTAINED')) {
    impact = EventImpactCategory.NEGATIVE;
    rationale = 'Earnings miss accompanied by flat/lowered forward guidance';
  } else if ((isBeat && guidanceDir === 'CUT') || (isMiss && guidanceDir === 'RAISE')) {
    impact = EventImpactCategory.MIXED;
    rationale = 'Divergence between reported quarterly actuals and forward guidance revision';
  } else if (isInline && guidanceDir === 'MAINTAINED') {
    impact = EventImpactCategory.NEUTRAL;
    rationale = 'In-line quarterly results with reaffirmed forward guidance';
  } else if (isBeat) {
    impact = EventImpactCategory.POSITIVE;
    rationale = 'Quarterly earnings beat';
  } else if (isMiss) {
    impact = EventImpactCategory.NEGATIVE;
    rationale = 'Quarterly earnings miss';
  }

  return {
    impactCategory: impact,
    isPositive: impact === EventImpactCategory.POSITIVE,
    isNegative: impact === EventImpactCategory.NEGATIVE,
    isMixed: impact === EventImpactCategory.MIXED,
    rationale,
    classification: EventClassification.DERIVED
  };
}
