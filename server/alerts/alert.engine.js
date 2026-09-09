/**
 * @file alert.engine.js
 * Master Institutional Alert Qualification & Processing Engine for Phase 39.
 * Operationalizes material attention from Phase 12, 16, 37, and 38 without mathematical duplication.
 */

import { evaluateAlertRules } from './alert.rules.js';
import {
  ALERT_TYPES,
  ALERT_SEVERITY,
  AlertSeverity,
  AlertStatus,
  AlertMateriality,
  computeAlertDedupKey
} from './alert.types.js';
import { alertRepository } from './alert.repository.js';
import { AlertPolicy } from './alert.policy.js';
import { portfolioRepository } from '../portfolio/portfolio.repository.js';
import { PortfolioOperatingEngine } from '../portfolio/portfolioOperating.engine.js';
import { decisionWorkbenchRepository } from '../decision/decisionWorkbench.repository.js';

export class AlertEngine {
  /**
   * Ingests a material attention event from Phase 12/16/37/38.
   */
  static ingestMaterialAttentionEvent({
    orgId,
    workspaceId,
    portfolioId = null,
    securityId = null,
    sourceDomain,
    sourceEventId,
    title,
    description,
    severity = AlertSeverity.ATTENTION,
    materiality = AlertMateriality.MEDIUM,
    provenance = {},
    evidenceReferences = [],
    affectedEntities = {},
    recommendedNextAction = null,
    actionUrl = null
  }) {
    if (!orgId || !workspaceId || !title || !sourceDomain) {
      throw new Error('Mandatory alert attributes missing');
    }

    const dedupKey = computeAlertDedupKey({
      orgId,
      workspaceId,
      sourceDomain,
      sourceEventId,
      portfolioId,
      securityId,
      alertCategory: severity
    });

    const ownerRole = AlertPolicy.getDefaultOwnerRole(sourceDomain, severity);

    const alert = alertRepository.createAlert({
      orgId,
      workspaceId,
      portfolioId,
      securityId,
      sourceDomain,
      sourceEventId,
      title,
      description,
      severity,
      materiality,
      dedupKey,
      provenance,
      evidenceReferences,
      affectedEntities,
      recommendedNextAction,
      actionUrl,
      ownerRole
    });

    return alert;
  }

  /**
   * Evaluates active portfolio operating state and ingests material alerts.
   */
  static evaluateAlertsFromPortfolioState({ orgId, workspaceId, portfolioId }) {
    const portfolio = portfolioRepository.getPortfolioById(portfolioId, workspaceId, orgId);
    if (!portfolio) return [];

    const summary = PortfolioOperatingEngine.getOperatingSummary(portfolioId, workspaceId, orgId);
    const createdAlerts = [];

    // 1. Compliance Breaches
    if (summary.compliance?.breaches?.length > 0) {
      summary.compliance.breaches.forEach((b, idx) => {
        const alt = this.ingestMaterialAttentionEvent({
          orgId,
          workspaceId,
          portfolioId,
          securityId: null,
          sourceDomain: 'compliance.mandate_engine',
          sourceEventId: `BREACH-${portfolioId}-${b.rule}-${idx}`,
          title: `Hard Mandate Breach: ${b.rule}`,
          description: b.message,
          severity: AlertSeverity.CRITICAL,
          materiality: AlertMateriality.CRITICAL,
          provenance: {
            rule: b.rule,
            limit: b.limit,
            actual: b.actual,
            checkedAt: summary.compliance.checkedAt
          },
          affectedEntities: {
            portfolioId,
            portfolioName: portfolio.name
          },
          recommendedNextAction: 'Execute portfolio rebalancing optimization or log formal governance exception',
          actionUrl: `/app/portfolios/${portfolioId}/compliance`
        });
        createdAlerts.push(alt);
      });
    }

    // 2. High Concentration Warning
    if (summary.exposure?.top1Weight >= 0.25) {
      const topHolding = portfolio.holdings?.[0];
      const alt = this.ingestMaterialAttentionEvent({
        orgId,
        workspaceId,
        portfolioId,
        securityId: topHolding?.ticker || null,
        sourceDomain: 'exposure.concentration_engine',
        sourceEventId: `CONC-${portfolioId}-${topHolding?.ticker || 'TOP'}`,
        title: `Single-Position Concentration Alert: ${(summary.exposure.top1Weight * 100).toFixed(1)}%`,
        description: `Top holding reaches 25.0% maximum mandate weight threshold in ${portfolio.name}.`,
        severity: AlertSeverity.ACTION_REQUIRED,
        materiality: AlertMateriality.HIGH,
        provenance: {
          metric: 'top1Weight',
          value: summary.exposure.top1Weight,
          threshold: 0.25
        },
        affectedEntities: {
          portfolioId,
          portfolioName: portfolio.name,
          ticker: topHolding?.ticker,
          securityName: topHolding?.securityName
        },
        recommendedNextAction: 'Propose rebalancing allocation in Investment Decision Workbench',
        actionUrl: `/app/decisions`
      });
      createdAlerts.push(alt);
    }

    // 3. Volatility Budget Warning
    if (summary.risk?.riskBudgetStatus === 'BREACHED') {
      const alt = this.ingestMaterialAttentionEvent({
        orgId,
        workspaceId,
        portfolioId,
        securityId: null,
        sourceDomain: 'risk.budget_engine',
        sourceEventId: `RISK-BUDGET-${portfolioId}`,
        title: `Portfolio Volatility Budget Breached (${(summary.risk.annualizedVolatility * 100).toFixed(1)}%)`,
        description: `Annualized volatility exceeds target risk budget threshold of ${(summary.risk.targetVolatility * 100).toFixed(1)}%.`,
        severity: AlertSeverity.ACTION_REQUIRED,
        materiality: AlertMateriality.HIGH,
        provenance: {
          annualizedVolatility: summary.risk.annualizedVolatility,
          targetVolatility: summary.risk.targetVolatility
        },
        affectedEntities: {
          portfolioId,
          portfolioName: portfolio.name
        },
        recommendedNextAction: 'Run Phase 33 Minimum Variance Optimization proposal',
        actionUrl: `/app/portfolios/optimization`
      });
      createdAlerts.push(alt);
    }

    return createdAlerts;
  }

  /**
   * Evaluates active decision backlog and ingests material authorization alerts.
   */
  static evaluateAlertsFromDecisionState({ orgId, workspaceId }) {
    const decisions = decisionWorkbenchRepository.listDecisions({ orgId, workspaceId });
    const createdAlerts = [];

    decisions.forEach(d => {
      // Stale Approvals
      const approvals = decisionWorkbenchRepository.listApprovals(d.decisionId);
      const isStale = approvals.some(a => a.status === 'STALE');

      if (isStale) {
        const alt = this.ingestMaterialAttentionEvent({
          orgId,
          workspaceId,
          portfolioId: d.portfolioId,
          securityId: d.ticker,
          sourceDomain: 'decision.workbench',
          sourceEventId: `DEC-STALE-${d.decisionId}`,
          title: `Stale Approval Invalidation: ${d.ticker} (${d.decisionId})`,
          description: `Decision authorization became STALE due to material baseline portfolio drift or thesis revision.`,
          severity: AlertSeverity.ACTION_REQUIRED,
          materiality: AlertMateriality.HIGH,
          provenance: { decisionId: d.decisionId, version: d.currentVersion },
          affectedEntities: { portfolioId: d.portfolioId, ticker: d.ticker },
          recommendedNextAction: 'Re-run multi-domain impact simulation and re-authorize decision',
          actionUrl: `/app/decisions/${d.decisionId}`
        });
        createdAlerts.push(alt);
      } else if (d.status === 'UNDER_REVIEW' || d.status === 'CHALLENGED') {
        const alt = this.ingestMaterialAttentionEvent({
          orgId,
          workspaceId,
          portfolioId: d.portfolioId,
          securityId: d.ticker,
          sourceDomain: 'decision.workbench',
          sourceEventId: `DEC-PENDING-${d.decisionId}`,
          title: `Decision In Review: ${d.ticker} (${d.decisionType})`,
          description: `Investment decision "${d.title}" is in ${d.status} status awaiting review or challenge resolution.`,
          severity: AlertSeverity.ATTENTION,
          materiality: AlertMateriality.MEDIUM,
          provenance: { decisionId: d.decisionId, version: d.currentVersion },
          affectedEntities: { portfolioId: d.portfolioId, ticker: d.ticker },
          recommendedNextAction: 'Review thesis and peer challenges in Decision Workbench',
          actionUrl: `/app/decisions/${d.decisionId}`
        });
        createdAlerts.push(alt);
      }
    });

    return createdAlerts;
  }

  /**
   * Executes notification delivery for an alert based on user preferences.
   */
  static dispatchAlertNotifications(alertId, userId) {
    const alert = alertRepository.getAlertById(alertId);
    if (!alert) throw new Error(`Alert ${alertId} not found`);

    const prefs = alertRepository.getPreferences(alert.workspaceId, userId);
    return AlertPolicy.dispatchNotification({ alert, preferences: prefs });
  }

  /**
   * Executes escalation check across workspace alerts.
   */
  static runEscalationSweep({ orgId, workspaceId }) {
    const activeAlerts = alertRepository.listAlerts({
      orgId,
      workspaceId,
      status: AlertStatus.OPEN,
      limit: 500
    }).alerts;

    const escalated = [];
    const now = new Date().getTime();

    activeAlerts.forEach(a => {
      const ageHours = (now - new Date(a.createdAt).getTime()) / (1000 * 60 * 60);

      // SLA Policy: CRITICAL unacknowledged after 24h, ACTION_REQUIRED after 48h
      if (a.severity === AlertSeverity.CRITICAL && ageHours > 24 && !a.escalation) {
        const updated = alertRepository.escalateAlert(a.alertId, {
          actorId: 'SYSTEM_SLA_MONITOR',
          escalationReason: `Critical alert exceeded 24-hour unacknowledged SLA (${ageHours.toFixed(1)}h elapsed)`,
          escalatedToRole: 'PORTFOLIO_MANAGER',
          workspaceId,
          orgId
        });
        escalated.push(updated);
      } else if (a.severity === AlertSeverity.ACTION_REQUIRED && ageHours > 48 && !a.escalation) {
        const updated = alertRepository.escalateAlert(a.alertId, {
          actorId: 'SYSTEM_SLA_MONITOR',
          escalationReason: `Action-required alert exceeded 48-hour SLA (${ageHours.toFixed(1)}h elapsed)`,
          escalatedToRole: 'PORTFOLIO_MANAGER',
          workspaceId,
          orgId
        });
        escalated.push(updated);
      }
    });

    return escalated;
  }
}

// Backward compatibility exports
export {
  evaluateAlertRules,
  ALERT_TYPES,
  ALERT_SEVERITY
};

export default AlertEngine;
