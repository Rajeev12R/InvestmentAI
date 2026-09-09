import { ALERT_TYPES, ALERT_SEVERITY } from './alert.types.js';
import { BREAKER_MONITOR_STATUS } from '../change/change.types.js';

/**
 * Deterministic Alert Evaluation Rules.
 */
export function evaluateAlertRules({
  workspaceId,
  changeReport,
  previousSnapshot,
  currentSnapshot
}) {
  if (!changeReport || !currentSnapshot) {
    return [];
  }

  const ticker = currentSnapshot.ticker.toUpperCase();
  const alerts = [];

  const { decisionDrift, thesisDrift, thesisBreakers, riskDrift, valuationDrift, materialChanges } = changeReport;

  // 1. Decision Transitions
  if (decisionDrift?.hasChanged) {
    if (decisionDrift.transitionType === 'DOWNGRADE') {
      const isCritical = decisionDrift.currentDecision === 'AVOID';
      alerts.push({
        workspaceId,
        ticker,
        type: ALERT_TYPES.DECISION_DOWNGRADE,
        severity: isCritical ? ALERT_SEVERITY.CRITICAL : ALERT_SEVERITY.HIGH,
        title: `Investment Decision Downgraded to ${decisionDrift.currentDecision}`,
        trigger: `Decision shifted from ${decisionDrift.previousDecision} to ${decisionDrift.currentDecision}`,
        previousState: decisionDrift.previousDecision,
        currentState: decisionDrift.currentDecision,
        evidenceIds: decisionDrift.evidenceIds,
        createdAt: new Date().toISOString()
      });
    } else if (decisionDrift.transitionType === 'UPGRADE') {
      alerts.push({
        workspaceId,
        ticker,
        type: ALERT_TYPES.DECISION_UPGRADE,
        severity: ALERT_SEVERITY.MEDIUM,
        title: `Investment Decision Upgraded to ${decisionDrift.currentDecision}`,
        trigger: `Decision upgraded from ${decisionDrift.previousDecision} to ${decisionDrift.currentDecision}`,
        previousState: decisionDrift.previousDecision,
        currentState: decisionDrift.currentDecision,
        evidenceIds: decisionDrift.evidenceIds,
        createdAt: new Date().toISOString()
      });
    }
  }

  // 2. Thesis Breaker Alerts
  if (Array.isArray(thesisBreakers)) {
    for (const breaker of thesisBreakers) {
      if (breaker.status === BREAKER_MONITOR_STATUS.TRIGGERED) {
        alerts.push({
          workspaceId,
          ticker,
          type: ALERT_TYPES.THESIS_BREAKER_TRIGGERED,
          severity: ALERT_SEVERITY.CRITICAL,
          title: `Thesis Breaker Triggered: ${breaker.trigger}`,
          trigger: breaker.detail,
          previousState: breaker.threshold,
          currentState: breaker.currentValue,
          evidenceIds: breaker.evidenceIds || [],
          createdAt: new Date().toISOString()
        });
      } else if (breaker.status === BREAKER_MONITOR_STATUS.APPROACHING) {
        alerts.push({
          workspaceId,
          ticker,
          type: ALERT_TYPES.THESIS_BREAKER_APPROACHING,
          severity: ALERT_SEVERITY.HIGH,
          title: `Thesis Breaker Approaching: ${breaker.trigger}`,
          trigger: breaker.detail,
          previousState: breaker.threshold,
          currentState: breaker.currentValue,
          evidenceIds: breaker.evidenceIds || [],
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  // 3. Risk Elevation Alerts
  if (riskDrift?.transitions) {
    for (const trans of riskDrift.transitions) {
      if (trans.direction === 'DETERIORATING') {
        const isCritical = trans.currentLevel === 'CRITICAL';
        alerts.push({
          workspaceId,
          ticker,
          type: isCritical ? ALERT_TYPES.RISK_CRITICAL : ALERT_TYPES.RISK_ELEVATED,
          severity: isCritical ? ALERT_SEVERITY.CRITICAL : ALERT_SEVERITY.HIGH,
          title: `${trans.category} Elevated to ${trans.currentLevel}`,
          trigger: trans.reason,
          previousState: trans.previousLevel,
          currentState: trans.currentLevel,
          evidenceIds: ['risk.overallScore', 'risk.overallCategory'],
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  // 4. Valuation Deterioration Alert
  if (valuationDrift && valuationDrift.hasDrift && valuationDrift.fairValueChangePct <= -10.0) {
    alerts.push({
      workspaceId,
      ticker,
      type: ALERT_TYPES.VALUATION_DETERIORATION,
      severity: ALERT_SEVERITY.MEDIUM,
      title: `Valuation Compressed: Fair Value down ${valuationDrift.fairValueChangePct}%`,
      trigger: valuationDrift.interpretation,
      previousState: `$${valuationDrift.previousFairValue}`,
      currentState: `$${valuationDrift.currentFairValue}`,
      evidenceIds: valuationDrift.evidenceIds,
      createdAt: new Date().toISOString()
    });
  }

  return alerts;
}
