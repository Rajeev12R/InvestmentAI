import { DECISION_HIERARCHY, MATERIALITY_LEVELS } from './change.types.js';

/**
 * Analyzes Decision Drift between previous and current snapshots.
 */
export function analyzeDecisionDrift(previousSnapshot, currentSnapshot) {
  if (!previousSnapshot || !currentSnapshot) {
    return {
      hasChanged: false,
      previousDecision: currentSnapshot?.decisionState?.decision || 'WATCH',
      currentDecision: currentSnapshot?.decisionState?.decision || 'WATCH',
      previousConviction: currentSnapshot?.decisionState?.convictionScore || null,
      currentConviction: currentSnapshot?.decisionState?.convictionScore || null,
      materiality: MATERIALITY_LEVELS.NEGLIGIBLE,
      transitionType: 'NONE',
      primaryDrivers: [],
      reason: 'Baseline decision initialized.'
    };
  }

  const prevDec = previousSnapshot.decisionState?.decision || 'WATCH';
  const currDec = currentSnapshot.decisionState?.decision || 'WATCH';
  const prevConv = previousSnapshot.decisionState?.convictionScore ?? null;
  const currConv = currentSnapshot.decisionState?.convictionScore ?? null;

  const prevRank = DECISION_HIERARCHY[prevDec] || 0;
  const currRank = DECISION_HIERARCHY[currDec] || 0;

  const hasChanged = prevDec !== currDec;
  let transitionType = 'UNCHANGED';
  let materiality = MATERIALITY_LEVELS.NEGLIGIBLE;

  if (hasChanged) {
    if (currRank > prevRank) {
      transitionType = 'UPGRADE';
      materiality = MATERIALITY_LEVELS.HIGHLY_MATERIAL;
    } else {
      transitionType = 'DOWNGRADE';
      materiality = currDec === 'AVOID' ? MATERIALITY_LEVELS.CRITICAL : MATERIALITY_LEVELS.HIGHLY_MATERIAL;
    }
  }

  const primaryDrivers = currentSnapshot.decisionState?.primaryDrivers || [];

  let reason = `Decision maintained as ${currDec}.`;
  if (hasChanged) {
    reason = `Decision transitioned from ${prevDec} to ${currDec} (${transitionType}).`;
  }

  return {
    hasChanged,
    previousDecision: prevDec,
    currentDecision: currDec,
    previousConviction: prevConv,
    currentConviction: currConv,
    convictionDelta: (prevConv !== null && currConv !== null) ? currConv - prevConv : 0,
    materiality,
    transitionType,
    primaryDrivers,
    reason,
    evidenceIds: ['decision.outcome', 'decision.conviction']
  };
}
