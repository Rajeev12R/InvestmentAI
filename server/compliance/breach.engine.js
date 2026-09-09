/**
 * Phase 16 — Institutional Breach Lifecycle Engine
 * Manages the deterministic lifecycle of compliance breaches:
 * DETECTED -> ACKNOWLEDGED -> REMEDIATION_REQUIRED -> REMEDIATION_IN_PROGRESS -> RESOLVED -> CLOSED
 */

import { BreachStatus, ComplianceStatus, SeverityLevel, canonicalHash, deepFreeze } from './compliance.types.js';

export const ValidBreachTransitions = Object.freeze({
  [BreachStatus.DETECTED]: [BreachStatus.ACKNOWLEDGED, BreachStatus.REMEDIATION_REQUIRED, BreachStatus.RESOLVED],
  [BreachStatus.ACKNOWLEDGED]: [BreachStatus.REMEDIATION_REQUIRED, BreachStatus.REMEDIATION_IN_PROGRESS, BreachStatus.RESOLVED],
  [BreachStatus.REMEDIATION_REQUIRED]: [BreachStatus.REMEDIATION_IN_PROGRESS, BreachStatus.RESOLVED],
  [BreachStatus.REMEDIATION_IN_PROGRESS]: [BreachStatus.RESOLVED, BreachStatus.REMEDIATION_REQUIRED],
  [BreachStatus.RESOLVED]: [BreachStatus.CLOSED, BreachStatus.DETECTED], // Can be re-opened if detected again
  [BreachStatus.CLOSED]: []
});

export class BreachEngine {
  /**
   * Creates a newly detected breach record.
   */
  static createBreach({
    breachId,
    workspaceId,
    portfolioId,
    ruleId,
    policyId,
    policyVersion,
    ruleType,
    severity = SeverityLevel.HIGH,
    actualValue,
    threshold,
    variance,
    explanation,
    detectedAt = new Date().toISOString()
  }) {
    if (!workspaceId || !portfolioId || !ruleId) {
      throw new Error('workspaceId, portfolioId, and ruleId are required to create a breach');
    }

    const id = breachId || `BRCH-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const breachPayload = {
      breachId: id,
      workspaceId,
      portfolioId,
      ruleId,
      policyId: policyId || 'UNKNOWN_POLICY',
      policyVersion: policyVersion || '1.0.0',
      ruleType,
      severity,
      actualValue,
      threshold,
      variance,
      explanation,
      status: BreachStatus.DETECTED,
      firstDetectedAt: detectedAt,
      lastDetectedAt: detectedAt,
      resolvedAt: null,
      history: [
        {
          transition: BreachStatus.DETECTED,
          timestamp: detectedAt,
          actorId: 'SYSTEM',
          notes: 'Breach initially detected during rule evaluation'
        }
      ]
    };

    const breachHash = canonicalHash({
      breachId: breachPayload.breachId,
      workspaceId: breachPayload.workspaceId,
      portfolioId: breachPayload.portfolioId,
      ruleId: breachPayload.ruleId,
      policyId: breachPayload.policyId,
      firstDetectedAt: breachPayload.firstDetectedAt
    });

    return deepFreeze({
      ...breachPayload,
      breachHash
    });
  }

  /**
   * Transitions a breach through its lifecycle.
   */
  static transitionBreach(currentBreach, targetStatus, { actorId = 'SYSTEM', notes = '', timestamp = new Date().toISOString() } = {}) {
    if (!currentBreach || !currentBreach.status) {
      throw new Error('Valid currentBreach is required for transition');
    }

    const allowed = ValidBreachTransitions[currentBreach.status] || [];
    if (!allowed.includes(targetStatus)) {
      throw new Error(`Invalid breach transition from ${currentBreach.status} to ${targetStatus}`);
    }

    const updatedHistory = [
      ...currentBreach.history,
      {
        from: currentBreach.status,
        transition: targetStatus,
        timestamp,
        actorId,
        notes
      }
    ];

    let resolvedAt = currentBreach.resolvedAt;
    if (targetStatus === BreachStatus.RESOLVED && !resolvedAt) {
      resolvedAt = timestamp;
    }

    const updated = {
      ...currentBreach,
      status: targetStatus,
      lastDetectedAt: timestamp,
      resolvedAt,
      history: updatedHistory
    };

    const breachHash = canonicalHash({
      breachId: updated.breachId,
      workspaceId: updated.workspaceId,
      portfolioId: updated.portfolioId,
      ruleId: updated.ruleId,
      status: updated.status,
      historyLength: updatedHistory.length
    });

    return deepFreeze({
      ...updated,
      breachHash
    });
  }
}
