import { CHANGE_DIRECTIONS, RISK_LEVEL_HIERARCHY, MATERIALITY_LEVELS } from './change.types.js';

/**
 * Analyzes Risk Drift across all risk categories.
 */
export function analyzeRiskDrift(previousSnapshot, currentSnapshot) {
  if (!previousSnapshot || !currentSnapshot) {
    return {
      hasDrift: false,
      overallDirection: CHANGE_DIRECTIONS.NEUTRAL,
      transitions: [],
      interpretation: 'Insufficient snapshot data for risk drift evaluation.'
    };
  }

  const prevRisk = previousSnapshot.riskState || {};
  const currRisk = currentSnapshot.riskState || {};

  const categories = [
    { key: 'overallCategory', name: 'Overall Risk' },
    { key: 'financialRisk', name: 'Financial Risk' },
    { key: 'marketRisk', name: 'Market Risk' },
    { key: 'liquidityRisk', name: 'Liquidity Risk' },
    { key: 'earningsQuality', name: 'Earnings Quality' }
  ];

  const transitions = [];
  let scoreDelta = 0;

  if (typeof prevRisk.overallScore === 'number' && typeof currRisk.overallScore === 'number') {
    scoreDelta = currRisk.overallScore - prevRisk.overallScore;
  }

  for (const cat of categories) {
    const prevLevel = prevRisk[cat.key] || 'UNKNOWN';
    const currLevel = currRisk[cat.key] || 'UNKNOWN';

    if (prevLevel !== 'UNKNOWN' && currLevel !== 'UNKNOWN' && prevLevel !== currLevel) {
      const prevRank = RISK_LEVEL_HIERARCHY[prevLevel] || 0;
      const currRank = RISK_LEVEL_HIERARCHY[currLevel] || 0;

      const direction = currRank > prevRank ? CHANGE_DIRECTIONS.DETERIORATING : CHANGE_DIRECTIONS.IMPROVING;
      const isCritical = currLevel === 'CRITICAL' || (prevLevel === 'LOW' && currLevel === 'HIGH');
      const materiality = isCritical ? MATERIALITY_LEVELS.CRITICAL : MATERIALITY_LEVELS.HIGHLY_MATERIAL;

      transitions.push({
        category: cat.name,
        field: cat.key,
        previousLevel: prevLevel,
        currentLevel: currLevel,
        direction,
        materiality,
        reason: `${cat.name} transitioned from ${prevLevel} to ${currLevel}.`
      });
    }
  }

  let overallDirection = CHANGE_DIRECTIONS.NEUTRAL;
  if (transitions.some(t => t.direction === CHANGE_DIRECTIONS.DETERIORATING)) {
    overallDirection = CHANGE_DIRECTIONS.DETERIORATING;
  } else if (transitions.some(t => t.direction === CHANGE_DIRECTIONS.IMPROVING)) {
    overallDirection = CHANGE_DIRECTIONS.IMPROVING;
  }

  let interpretation = 'Risk parameters remain stable across assessment periods.';
  if (transitions.length > 0) {
    const deteriorating = transitions.filter(t => t.direction === CHANGE_DIRECTIONS.DETERIORATING);
    if (deteriorating.length > 0) {
      interpretation = `Risk posture deteriorated in ${deteriorating.map(d => d.category).join(', ')}.`;
    } else {
      interpretation = `Risk profile improved across monitored dimensions.`;
    }
  }

  return {
    hasDrift: transitions.length > 0 || Math.abs(scoreDelta) >= 5,
    overallDirection,
    transitions,
    previousScore: prevRisk.overallScore,
    currentScore: currRisk.overallScore,
    scoreDelta,
    interpretation,
    evidenceIds: ['risk.overallScore', 'risk.overallCategory', 'risk.financialRisk']
  };
}
