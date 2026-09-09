/**
 * Phase 15 — Rebalance Trigger Engine
 * 
 * Evaluates multi-factor rebalance triggers: Threshold Drift, Constraint Breach,
 * Risk Budget Breach, Calendar Schedules, Decision/Thesis Drift, and Data Quality Degradation.
 */

import { RebalanceTrigger, RebalanceStatus, DriftStatus, ConstraintStatus, ImplementationStatus, canonicalHash, deepFreeze } from './implementation.types.js';

export class RebalanceTriggerEngine {
  /**
   * Evaluate whether a portfolio requires or recommends rebalancing.
   */
  static evaluateTriggers(params) {
    const {
      workspaceId,
      portfolioId,
      asOf = new Date().toISOString(),
      driftReport,
      constraintReport,
      isCalendarDue = false,
      decisionChanged = false,
      thesisChanged = false,
      dataQualityDegraded = false,
      riskBudgetBreached = false
    } = params;

    if (!workspaceId || !portfolioId) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_WORKSPACE_OR_PORTFOLIO_ID', triggerReport: null };
    }
    if (!driftReport || !constraintReport) {
      return { status: ImplementationStatus.INSUFFICIENT_DATA, reasonCode: 'MISSING_DRIFT_OR_CONSTRAINT_REPORT', triggerReport: null };
    }

    const activeTriggers = [];
    let isRequired = false;
    let isRecommended = false;

    // 1. Constraint Breach Trigger (Highest Priority -> REQUIRED)
    if (constraintReport.overallStatus === ConstraintStatus.BREACH) {
      activeTriggers.push({
        trigger: RebalanceTrigger.CONSTRAINT_BREACH,
        severity: 'HIGH',
        reason: `${constraintReport.breachCount} portfolio constraints are in BREACH state.`
      });
      isRequired = true;
    }

    // 2. Threshold Drift Trigger
    if (driftReport.overallStatus === DriftStatus.BREACH) {
      activeTriggers.push({
        trigger: RebalanceTrigger.THRESHOLD_DRIFT,
        severity: 'HIGH',
        reason: `Portfolio drift exceeds configured breach thresholds (Max drift: ${(driftReport.maxAbsolutePositionDrift * 100).toFixed(1)}%).`
      });
      isRequired = true;
    } else if (driftReport.overallStatus === DriftStatus.WARNING) {
      activeTriggers.push({
        trigger: RebalanceTrigger.THRESHOLD_DRIFT,
        severity: 'MEDIUM',
        reason: 'Portfolio drift exceeds warning thresholds.'
      });
      isRecommended = true;
    }

    // 3. Risk Budget Breach Trigger
    if (riskBudgetBreached) {
      activeTriggers.push({
        trigger: RebalanceTrigger.RISK_BUDGET_BREACH,
        severity: 'HIGH',
        reason: 'Portfolio risk volatility or component risk budget exceeded policy bounds.'
      });
      isRequired = true;
    }

    // 4. Decision Change Trigger
    if (decisionChanged) {
      activeTriggers.push({
        trigger: RebalanceTrigger.DECISION_CHANGE,
        severity: 'MEDIUM',
        reason: 'Phase 7 deterministic investment decision updated for constituent assets.'
      });
      isRecommended = true;
    }

    // 5. Thesis Change Trigger
    if (thesisChanged) {
      activeTriggers.push({
        trigger: RebalanceTrigger.THESIS_CHANGE,
        severity: 'MEDIUM',
        reason: 'Phase 4/13 investment thesis or milestone invalidation detected.'
      });
      isRecommended = true;
    }

    // 6. Calendar Scheduled Trigger
    if (isCalendarDue) {
      activeTriggers.push({
        trigger: RebalanceTrigger.CALENDAR_SCHEDULED,
        severity: 'LOW',
        reason: 'Scheduled periodic portfolio rebalance review date reached.'
      });
      isRecommended = true;
    }

    // 7. Data Quality Degradation
    if (dataQualityDegraded) {
      activeTriggers.push({
        trigger: RebalanceTrigger.DATA_QUALITY_DEGRADATION,
        severity: 'LOW',
        reason: 'Upstream financial fact or price restatement requires portfolio review.'
      });
      isRecommended = true;
    }

    let rebalanceStatus = RebalanceStatus.NO_REBALANCE;
    if (isRequired) {
      rebalanceStatus = RebalanceStatus.REBALANCE_REQUIRED;
    } else if (isRecommended) {
      rebalanceStatus = RebalanceStatus.REBALANCE_RECOMMENDED;
    }

    const payload = {
      triggerId: `TRIG-${portfolioId}-${asOf.replace(/[:.]/g, '-')}`,
      workspaceId,
      portfolioId,
      asOf,
      rebalanceStatus,
      activeTriggers,
      activeTriggerCount: activeTriggers.length,
      primaryTrigger: activeTriggers.length > 0 ? activeTriggers[0].trigger : RebalanceTrigger.NONE,
      createdAt: asOf
    };

    const hash = canonicalHash(payload);
    const sealedTriggerReport = deepFreeze({
      ...payload,
      triggerHash: hash
    });

    return {
      status: ImplementationStatus.RECONCILED,
      triggerReport: sealedTriggerReport
    };
  }
}
