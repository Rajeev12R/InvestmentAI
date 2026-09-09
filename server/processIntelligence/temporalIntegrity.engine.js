/**
 * Phase 13 - Temporal Integrity & Restatement Engine
 * 
 * Enforces historical boundaries at decision time T0.
 * Prohibits future evidence, future prices, or later restatements from polluting T0 evaluation.
 * Preserves V1 truth at T0 while tracking V2 restatement impact separately.
 */

import { deepFreeze, computeDeterministicHash } from './process.types.js';

export class TemporalIntegrityEngine {
  /**
   * Filter evidence items strictly available at or before cutoff timestamp T0
   */
  informationAvailableAt(timestamp, evidenceList = []) {
    const cutoffTime = new Date(timestamp).getTime();
    if (isNaN(cutoffTime)) {
      throw new Error(`Invalid timestamp passed to informationAvailableAt: ${timestamp}`);
    }

    const filtered = [];
    const rejectedFutureEvidence = [];

    for (const item of evidenceList) {
      const itemTime = new Date(item.timestamp || item.createdTimestamp || item.observedAt || item.filingDate).getTime();
      if (!isNaN(itemTime) && itemTime <= cutoffTime) {
        filtered.push(item);
      } else {
        rejectedFutureEvidence.push({
          itemId: item.id || item.evidenceId || item.factId,
          timestamp: item.timestamp || item.createdTimestamp,
          reason: 'FUTURE_EVIDENCE_REJECTED'
        });
      }
    }

    return {
      availableEvidence: filtered,
      rejectedFutureEvidence,
      cutoffTimestamp: new Date(timestamp).toISOString(),
      isStrictlyTemporal: rejectedFutureEvidence.length === 0
    };
  }

  /**
   * Evaluate restatement impact between V1 truth (decision time) and V2 truth (restated)
   */
  evaluateRestatementImpact(params) {
    const {
      metric,
      decisionTimeValue, // V1
      restatedValue,     // V2
      decisionTimestamp,
      restatementTimestamp,
      decisionId,
      workspaceId
    } = params;

    if (decisionTimeValue === undefined || restatedValue === undefined) {
      throw new Error('Both decisionTimeValue (V1) and restatedValue (V2) are required');
    }

    const numericV1 = Number(decisionTimeValue);
    const numericV2 = Number(restatedValue);

    const isRestated = numericV1 !== numericV2;
    const delta = numericV2 - numericV1;
    const percentageChange = numericV1 !== 0 ? (delta / Math.abs(numericV1)) * 100 : (numericV2 !== 0 ? 100 : 0);

    const impact = {
      decisionId,
      workspaceId,
      metric,
      decisionTimeTruth: {
        value: numericV1,
        knownAt: new Date(decisionTimestamp).toISOString(),
        version: 'V1'
      },
      currentRestatedTruth: {
        value: numericV2,
        restatedAt: new Date(restatementTimestamp).toISOString(),
        version: 'V2'
      },
      isRestated,
      absoluteDelta: Math.round(delta * 1000) / 1000,
      percentageChange: Math.round(percentageChange * 100) / 100,
      restatementImpact: isRestated ? (Math.abs(percentageChange) > 10 ? 'MATERIAL' : 'IMMATERIAL') : 'NONE',
      historicalDecisionIntegrityPreserved: true,
      evaluatedAt: new Date().toISOString()
    };

    return deepFreeze(impact);
  }
}

export const temporalIntegrityEngine = new TemporalIntegrityEngine();
