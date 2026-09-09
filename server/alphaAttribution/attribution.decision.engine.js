import { SignalEngagementLevel, AttributionStatus } from './attribution.types.js';
import { defaultAttributionStore } from './attribution.store.js';

export class DecisionAttributionEngine {
  constructor(store = defaultAttributionStore) {
    this.store = store;
  }

  /**
   * Attribute an investment decision against the available signal landscape at decision time.
   */
  evaluateDecisionLineage(tenantId = 'tenant_default', {
    contributionId,
    decisionId,
    entityId,
    signalsAvailable = [], // [ { signalId, direction: 1|-1, score: number, confidence: number } ]
    referencedSignalIds = [],
    actionTaken = 'BUY', // 'BUY', 'SELL', 'HOLD', 'REJECT', 'NO_ACTION'
    targetPositionWeight = 0.05,
    actualPositionWeight = 0.05,
    realizedReturn = 0.0,
    benchmarkReturn = 0.0,
    informationCutoff = new Date().toISOString()
  }) {
    if (!decisionId) throw new Error('decisionId is required');
    if (!entityId) throw new Error('entityId is required');

    const activeReturn = parseFloat((realizedReturn - benchmarkReturn).toFixed(6));
    const decisionAlpha = parseFloat((actualPositionWeight * activeReturn).toFixed(6));

    // Map each available signal to its engagement level
    const evaluatedSignals = signalsAvailable.map(sig => {
      const isReferenced = referencedSignalIds.includes(sig.signalId);
      let engagementLevel = SignalEngagementLevel.SIGNAL_AVAILABLE;

      if (isReferenced) {
        engagementLevel = SignalEngagementLevel.SIGNAL_REFERENCED;
      }

      const sigDir = sig.direction !== undefined ? Math.sign(sig.direction) : 0;
      const actionDir = (actionTaken === 'BUY') ? 1 : (actionTaken === 'SELL' ? -1 : 0);
      const isAligned = sigDir !== 0 && sigDir === actionDir;

      if (isReferenced && isAligned && actualPositionWeight > 0) {
        engagementLevel = SignalEngagementLevel.SIGNAL_ACTIONED;
      } else if (isReferenced && isAligned) {
        engagementLevel = SignalEngagementLevel.SIGNAL_INFLUENTIAL;
      } else if (isReferenced) {
        engagementLevel = SignalEngagementLevel.SIGNAL_CONSIDERED;
      }

      // Signal-specific contributions
      let expectedSignalContribution = 0;
      if (engagementLevel === SignalEngagementLevel.SIGNAL_ACTIONED) {
        expectedSignalContribution = parseFloat((actualPositionWeight * (sig.score || 0) * 0.1).toFixed(6));
      }

      return {
        signalId: sig.signalId,
        signalType: sig.signalType || 'GENERIC',
        score: sig.score,
        direction: sig.direction,
        confidence: sig.confidence,
        engagementLevel,
        isAligned,
        expectedSignalContribution
      };
    });

    const actionedSignals = evaluatedSignals.filter(s => s.engagementLevel === SignalEngagementLevel.SIGNAL_ACTIONED);
    const hasSupportingSignals = actionedSignals.length > 0;

    // Classify Decision Outcome Archetype
    let signalSupportedAlpha = 0;
    let unsupportedAlpha = 0;
    let isMissedOpportunity = false;
    let isFalseConviction = false;
    let isCorrectRejection = false;

    if (hasSupportingSignals) {
      if (decisionAlpha > 0) {
        signalSupportedAlpha = decisionAlpha;
      } else {
        isFalseConviction = true;
        signalSupportedAlpha = decisionAlpha; // Negative
      }
    } else {
      unsupportedAlpha = decisionAlpha;
    }

    // Missed Opportunity: Positive signals available, but action was REJECT or NO_ACTION
    const stronglyPositiveSignals = signalsAvailable.filter(s => (s.direction > 0 || s.score > 0.3));
    if ((actionTaken === 'REJECT' || actionTaken === 'NO_ACTION' || actualPositionWeight === 0) && stronglyPositiveSignals.length > 0 && activeReturn > 0.05) {
      isMissedOpportunity = true;
    }

    // Correct Rejection: Negative signals available, action was REJECT/NO_ACTION, and asset dropped
    const stronglyNegativeSignals = signalsAvailable.filter(s => (s.direction < 0 || s.score < -0.3));
    if ((actionTaken === 'REJECT' || actionTaken === 'NO_ACTION' || actualPositionWeight === 0) && stronglyNegativeSignals.length > 0 && activeReturn < -0.05) {
      isCorrectRejection = true;
    }

    // Sizing vs Timing contribution breakdown
    const sizingContribution = parseFloat(((actualPositionWeight - targetPositionWeight) * activeReturn).toFixed(6));
    const baseAllocationAlpha = parseFloat((targetPositionWeight * activeReturn).toFixed(6));

    const id = contributionId || `dec_contrib_${decisionId}_${entityId}`;
    const record = {
      contributionId: id,
      decisionId,
      entityId,
      actionTaken,
      targetPositionWeight,
      actualPositionWeight,
      realizedReturn,
      benchmarkReturn,
      activeReturn,
      decisionAlpha,
      signalSupportedAlpha,
      unsupportedAlpha,
      sizingContribution,
      baseAllocationAlpha,
      isMissedOpportunity,
      isFalseConviction,
      isCorrectRejection,
      engagementLevel: hasSupportingSignals ? SignalEngagementLevel.SIGNAL_ACTIONED : SignalEngagementLevel.SIGNAL_AVAILABLE,
      signalsCount: signalsAvailable.length,
      actionedSignalsCount: actionedSignals.length,
      signals: evaluatedSignals,
      status: AttributionStatus.ATTRIBUTED,
      informationCutoff,
      evaluatedAt: informationCutoff
    };

    return this.store.saveDecisionContribution(tenantId, record);
  }
}

export const defaultDecisionAttributionEngine = new DecisionAttributionEngine();
