/**
 * Phase 13 - Process Drift Engine
 * 
 * Detects systematic behavioral drift and anti-patterns over time across decisions.
 * Enforces minimum sample thresholds (e.g. >= 3 occurrences) to prevent false positives.
 */

import { deepFreeze, computeDeterministicHash } from './process.types.js';

export class ProcessDriftEngine {
  constructor(minOccurrences = 3) {
    this.minOccurrences = minOccurrences;
  }

  /**
   * Detect process drifts across an array of evaluated decision records
   */
  detectDrifts(evaluatedDecisions = []) {
    const patterns = [];

    // Filter valid evaluated records
    const validRecords = evaluatedDecisions.filter(d => d && d.decisionSnapshot);
    if (validRecords.length === 0) {
      return deepFreeze({
        totalEvaluatedDecisions: 0,
        patternsDetected: [],
        hasDrift: false
      });
    }

    // Pattern 1: Repeatedly buying despite weak evidence
    const weakEvidenceDecisions = validRecords.filter(d => {
      const evCount = (d.decisionSnapshot.evidenceIds || []).length;
      return (d.decisionSnapshot.decision === 'BUY' || d.decisionSnapshot.decision === 'INCREASE') && evCount <= 1;
    });

    if (weakEvidenceDecisions.length >= this.minOccurrences) {
      patterns.push({
        patternId: 'DRIFT_WEAK_EVIDENCE_BUY',
        name: 'Buying Without Sufficient Evidence',
        description: `Repeatedly executing BUY/INCREASE decisions with <= 1 verified evidence item.`,
        frequency: weakEvidenceDecisions.length,
        totalEligible: validRecords.length,
        severity: 'HIGH',
        supportingDecisionIds: weakEvidenceDecisions.map(d => d.decisionSnapshot.decisionId),
        firstObserved: weakEvidenceDecisions[0].decisionSnapshot.decisionTimestamp,
        lastObserved: weakEvidenceDecisions[weakEvidenceDecisions.length - 1].decisionSnapshot.decisionTimestamp,
        evidence: `Detected in ${weakEvidenceDecisions.length} out of ${validRecords.length} historical decisions.`
      });
    }

    // Pattern 2: Repeatedly ignoring thesis-breakers / holding after breach
    const ignoredBreakerDecisions = validRecords.filter(d => {
      const thesisEval = d.thesisEvaluation;
      return thesisEval && thesisEval.isBroken && (!d.actionTaken || d.actionTaken === 'NONE' || d.actionTaken === 'HOLD');
    });

    if (ignoredBreakerDecisions.length >= this.minOccurrences) {
      patterns.push({
        patternId: 'DRIFT_IGNORED_THESIS_BREAKERS',
        name: 'Inaction After Thesis Invalidation',
        description: `Repeatedly maintaining or holding positions after explicit falsification conditions or breakers were triggered.`,
        frequency: ignoredBreakerDecisions.length,
        totalEligible: validRecords.length,
        severity: 'CRITICAL',
        supportingDecisionIds: ignoredBreakerDecisions.map(d => d.decisionSnapshot.decisionId),
        firstObserved: ignoredBreakerDecisions[0].decisionSnapshot.decisionTimestamp,
        lastObserved: ignoredBreakerDecisions[ignoredBreakerDecisions.length - 1].decisionSnapshot.decisionTimestamp,
        evidence: `Detected in ${ignoredBreakerDecisions.length} decisions where falsification occurred without exit or reduction.`
      });
    }

    // Pattern 3: Position Oversizing / Risk Overrides
    const oversizedDecisions = validRecords.filter(d => {
      const posSize = d.decisionSnapshot.positionSize;
      return typeof posSize === 'number' && posSize > 0.25; // >25% in single asset
    });

    if (oversizedDecisions.length >= this.minOccurrences) {
      patterns.push({
        patternId: 'DRIFT_OVERSIZED_POSITIONS',
        name: 'Systematic Position Oversizing',
        description: `Repeatedly allocating position sizes > 25% portfolio weight exceeding standard single-asset risk budget.`,
        frequency: oversizedDecisions.length,
        totalEligible: validRecords.length,
        severity: 'HIGH',
        supportingDecisionIds: oversizedDecisions.map(d => d.decisionSnapshot.decisionId),
        firstObserved: oversizedDecisions[0].decisionSnapshot.decisionTimestamp,
        lastObserved: oversizedDecisions[oversizedDecisions.length - 1].decisionSnapshot.decisionTimestamp,
        evidence: `Detected in ${oversizedDecisions.length} decisions with single-asset weight > 25%.`
      });
    }

    // Pattern 4: Extreme Conviction Inflation (Overconfidence)
    const extremeConvictionDecisions = validRecords.filter(d => {
      const conviction = d.decisionSnapshot.conviction;
      return typeof conviction === 'number' && conviction >= 0.90;
    });

    if (extremeConvictionDecisions.length >= this.minOccurrences) {
      const falsifiedCount = extremeConvictionDecisions.filter(d => d.thesisEvaluation && d.thesisEvaluation.isBroken).length;
      if (falsifiedCount >= 2) {
        patterns.push({
          patternId: 'DRIFT_CONVICTION_INFLATION',
          name: 'Conviction Inflation & Overconfidence',
          description: `Repeatedly assigning >= 90% conviction to ideas that subsequently suffered thesis breakage.`,
          frequency: extremeConvictionDecisions.length,
          totalEligible: validRecords.length,
          severity: 'MEDIUM',
          supportingDecisionIds: extremeConvictionDecisions.map(d => d.decisionSnapshot.decisionId),
          firstObserved: extremeConvictionDecisions[0].decisionSnapshot.decisionTimestamp,
          lastObserved: extremeConvictionDecisions[extremeConvictionDecisions.length - 1].decisionSnapshot.decisionTimestamp,
          evidence: `Assigned >= 90% conviction in ${extremeConvictionDecisions.length} decisions with ${falsifiedCount} thesis falsifications.`
        });
      }
    }

    return deepFreeze({
      totalEvaluatedDecisions: validRecords.length,
      patternsDetected: patterns,
      hasDrift: patterns.length > 0,
      minOccurrencesThreshold: this.minOccurrences,
      evaluatedAt: new Date().toISOString()
    });
  }
}

export const processDriftEngine = new ProcessDriftEngine();
