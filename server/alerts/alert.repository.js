/**
 * @file alert.repository.js
 * Multi-Tenant In-Memory Storage & Lifecycle Repository for Phase 39 Institutional Alerts & Attention Center.
 */

import crypto from 'crypto';
import {
  AlertSeverity,
  AlertStatus,
  AlertMateriality,
  VALID_ALERT_TRANSITIONS,
  computeAlertDedupKey,
  computeAlertHash
} from './alert.types.js';
import { auditRepository } from '../governance/audit.repository.js';

class AlertRepository {
  constructor() {
    this.alerts = new Map(); // alertId -> Alert
    this.alertsByDedup = new Map(); // dedupKey -> alertId
    this.history = new Map(); // alertId -> Array<AuditRecord>
    this.preferences = new Map(); // `${workspaceId}:${userId}` -> Preferences
    this._seedDefaultAlerts();
  }

  _seedDefaultAlerts() {
    const now = '2026-09-08T00:00:00.000Z';
    const orgId = 'ORG-ROOT-001';
    const workspaceId = 'WS-DEFAULT-001';
    const portfolioId = 'PORT-DEFAULT-001';

    // 1. Critical/Action-Required Concentration Alert
    this.createAlert({
      alertId: 'ALT-CONC-001',
      orgId,
      workspaceId,
      portfolioId,
      securityId: 'AAPL',
      sourceDomain: 'compliance.mandate_engine',
      sourceEventId: 'EVT-CONC-AAPL-01',
      title: 'Mandate Limit Approaching: AAPL Concentration at 25.0%',
      description: 'Apple Inc. allocation reached the maximum 25.0% single-holding mandate bound in Global Flagship Multi-Asset Portfolio.',
      severity: AlertSeverity.ACTION_REQUIRED,
      materiality: AlertMateriality.HIGH,
      status: AlertStatus.OPEN,
      asOf: now,
      freshness: 'FRESH',
      provenance: {
        engine: 'portfolioOperating.engine',
        checkedRule: 'MAX_SINGLE_POSITION_WEIGHT',
        threshold: 0.25,
        actual: 0.25
      },
      evidenceReferences: [
        { id: 'EVID-PORT-AAPL-001', type: 'PORTFOLIO_HOLDING', claim: 'AAPL position weight equals 25.0% of total portfolio AUM' }
      ],
      affectedEntities: {
        portfolioId,
        portfolioName: 'Global Flagship Multi-Asset Portfolio',
        ticker: 'AAPL',
        securityName: 'Apple Inc.'
      },
      recommendedNextAction: 'Propose rebalancing allocation in Investment Decision Workbench',
      actionUrl: '/app/decisions',
      ownerRole: 'PORTFOLIO_MANAGER',
      assignedTo: 'USR-ROOT-001',
      createdAt: now
    });

    // 2. Risk Budget Alert
    this.createAlert({
      alertId: 'ALT-RISK-002',
      orgId,
      workspaceId,
      portfolioId,
      securityId: null,
      sourceDomain: 'risk.budget_engine',
      sourceEventId: 'EVT-RISK-BUDGET-02',
      title: 'Elevated Portfolio Volatility: 14.68% (Mandate Target 15.0%)',
      description: 'Annualized portfolio volatility is within target mandate (<15.0%) but elevated following macroeconomic rate shifts.',
      severity: AlertSeverity.ATTENTION,
      materiality: AlertMateriality.MEDIUM,
      status: AlertStatus.OPEN,
      asOf: now,
      freshness: 'FRESH',
      provenance: {
        engine: 'riskForecast.engine',
        metric: 'annualizedVolatility',
        value: 0.1468,
        budget: 0.1500
      },
      evidenceReferences: [
        { id: 'EVID-RISK-EULER-001', type: 'COVARIANCE_ANALYSIS', claim: 'Top 3 tech positions account for 68.4% of total Euler component risk' }
      ],
      affectedEntities: {
        portfolioId,
        portfolioName: 'Global Flagship Multi-Asset Portfolio'
      },
      recommendedNextAction: 'Inspect Factor Exposure and Euler CRC decomposition in Risk Dashboard',
      actionUrl: '/app/portfolios/risk',
      ownerRole: 'RISK_OFFICER',
      assignedTo: 'USR-ROOT-001',
      createdAt: now
    });

    // 3. Decision Queue Backlog Alert
    this.createAlert({
      alertId: 'ALT-DEC-003',
      orgId,
      workspaceId,
      portfolioId,
      securityId: 'NVDA',
      sourceDomain: 'decision.workbench',
      sourceEventId: 'DEC-NVDA-001',
      title: 'Human Authorization Required: Overweight NVIDIA (DEC-NVDA-001)',
      description: 'Strategic thesis for increasing NVIDIA weight to 18.0% is awaiting formal authorization under Segregation of Duties.',
      severity: AlertSeverity.ATTENTION,
      materiality: AlertMateriality.MEDIUM,
      status: AlertStatus.OPEN,
      asOf: now,
      freshness: 'FRESH',
      provenance: {
        decisionId: 'DEC-NVDA-001',
        decisionType: 'INCREASE',
        version: 1
      },
      evidenceReferences: [
        { id: 'EVID-THESIS-NVDA-001', type: 'RESEARCH_SYNTHESIS', claim: 'Data Center compute dominance confirmed in Q2 earnings report' }
      ],
      affectedEntities: {
        portfolioId,
        ticker: 'NVDA',
        securityName: 'NVIDIA Corporation'
      },
      recommendedNextAction: 'Review peer challenges and grant authorization in Decision Workbench',
      actionUrl: '/app/decisions/DEC-NVDA-001',
      ownerRole: 'PORTFOLIO_MANAGER',
      assignedTo: 'USR-ROOT-001',
      createdAt: now
    });
  }

  /**
   * Creates or deduplicates an institutional alert.
   */
  createAlert(data) {
    if (!data.orgId || !data.workspaceId) {
      throw new Error('Tenant scoping (orgId and workspaceId) is required to create alert');
    }
    if (!data.title || !data.sourceDomain) {
      throw new Error('Alert title and sourceDomain are required');
    }

    const dedupKey = data.dedupKey || computeAlertDedupKey({
      orgId: data.orgId,
      workspaceId: data.workspaceId,
      sourceDomain: data.sourceDomain,
      sourceEventId: data.sourceEventId,
      portfolioId: data.portfolioId,
      securityId: data.securityId,
      alertCategory: data.alertCategory
    });

    const now = new Date().toISOString();

    // Deduplication check
    const existingAlertId = this.alertsByDedup.get(dedupKey);
    if (existingAlertId) {
      const existing = this.alerts.get(existingAlertId);
      if (existing && [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED, AlertStatus.SNOOZED].includes(existing.status)) {
        // Suppression/Cooldown logic: 15-minute window for identical severity
        const lastObserved = new Date(existing.lastObservedAt || existing.createdAt).getTime();
        const diffMs = new Date(now).getTime() - lastObserved;
        const cooldownMs = 15 * 60 * 1000;

        if (diffMs < cooldownMs && existing.severity === (data.severity || existing.severity)) {
          existing.occurrenceCount = (existing.occurrenceCount || 1) + 1;
          existing.lastObservedAt = now;
          
          auditRepository.appendEvent({
            action: 'alert.suppressed',
            actorId: 'SYSTEM',
            actorType: 'SYSTEM',
            workspaceId: data.workspaceId,
            resourceType: 'ALERT',
            resourceId: existing.alertId,
            result: 'SUCCESS',
            metadata: { dedupKey, reason: 'COOLDOWN_SUPPRESSION', diffMs }
          });

          return JSON.parse(JSON.stringify(existing));
        }

        // Material change or outside cooldown: update existing alert
        existing.version = (existing.version || 1) + 1;
        existing.lastObservedAt = now;
        existing.occurrenceCount = (existing.occurrenceCount || 1) + 1;
        if (data.severity) existing.severity = data.severity;
        if (data.description) existing.description = data.description;
        existing.canonicalHash = computeAlertHash(existing);

        return JSON.parse(JSON.stringify(existing));
      }
    }

    const alertId = data.alertId || `ALT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const newAlert = {
      alertId,
      orgId: data.orgId,
      workspaceId: data.workspaceId,
      portfolioId: data.portfolioId || null,
      securityId: data.securityId || null,
      sourceDomain: data.sourceDomain,
      sourceEventId: data.sourceEventId || null,
      sourceFactIds: data.sourceFactIds || [],
      title: data.title,
      description: data.description || '',
      severity: data.severity || AlertSeverity.ATTENTION,
      materiality: data.materiality || AlertMateriality.MEDIUM,
      status: data.status || AlertStatus.OPEN,
      asOf: data.asOf || now,
      observedAt: data.observedAt || now,
      createdAt: data.createdAt || now,
      lastObservedAt: now,
      freshness: data.freshness || 'FRESH',
      provenance: data.provenance || {},
      evidenceReferences: data.evidenceReferences || [],
      affectedEntities: data.affectedEntities || {},
      recommendedNextAction: data.recommendedNextAction || 'Review condition',
      actionUrl: data.actionUrl || null,
      ownerRole: data.ownerRole || 'ANALYST',
      assignedTo: data.assignedTo || null,
      dedupKey,
      occurrenceCount: 1,
      version: 1,
      acknowledgement: null,
      snooze: null,
      resolution: null,
      escalation: null
    };

    newAlert.canonicalHash = computeAlertHash(newAlert);

    this.alerts.set(alertId, newAlert);
    this.alertsByDedup.set(dedupKey, alertId);
    this.history.set(alertId, [{
      action: 'alert.created',
      timestamp: now,
      actorId: 'SYSTEM',
      state: 'OPEN',
      version: 1
    }]);

    auditRepository.appendEvent({
      action: 'alert.created',
      actorId: 'SYSTEM',
      actorType: 'SYSTEM',
      workspaceId: data.workspaceId,
      resourceType: 'ALERT',
      resourceId: alertId,
      result: 'SUCCESS',
      metadata: { severity: newAlert.severity, title: newAlert.title, dedupKey }
    });

    return JSON.parse(JSON.stringify(newAlert));
  }

  /**
   * Retrieves an alert by ID with strict tenant boundary enforcement.
   */
  getAlertById(alertId, workspaceId = null, orgId = null) {
    if (!alertId) return null;
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    if (orgId && alert.orgId !== orgId) return null;
    if (workspaceId && alert.workspaceId !== workspaceId) return null;

    return JSON.parse(JSON.stringify(alert));
  }

  /**
   * Lists alerts matching filters within authorized workspace.
   */
  listAlerts({
    orgId,
    workspaceId,
    severity = null,
    status = null,
    portfolioId = null,
    securityId = null,
    assignedTo = null,
    query = null,
    scope = 'ALL', // ALL | MY | SNOOZED | RESOLVED | ESCALATED
    page = 1,
    limit = 50,
    sort = 'severity'
  }) {
    if (!orgId || !workspaceId) return { alerts: [], total: 0, page: 1, limit };

    // Auto-check expired snoozes before listing
    this.checkSnoozeExpirations();

    let list = Array.from(this.alerts.values()).filter(a =>
      a.orgId === orgId && a.workspaceId === workspaceId
    );

    // Filter by Scope
    if (scope === 'MY' && assignedTo) {
      list = list.filter(a => a.assignedTo === assignedTo);
    } else if (scope === 'SNOOZED') {
      list = list.filter(a => a.status === AlertStatus.SNOOZED);
    } else if (scope === 'RESOLVED') {
      list = list.filter(a => a.status === AlertStatus.RESOLVED);
    } else if (scope === 'ESCALATED') {
      list = list.filter(a => !!a.escalation);
    }

    if (severity && severity !== 'ALL') {
      list = list.filter(a => a.severity === severity);
    }
    if (status && status !== 'ALL') {
      list = list.filter(a => a.status === status);
    }
    if (portfolioId) {
      list = list.filter(a => a.portfolioId === portfolioId);
    }
    if (securityId) {
      list = list.filter(a => a.securityId?.toUpperCase() === securityId.toUpperCase());
    }
    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.alertId.toLowerCase().includes(q) ||
        (a.securityId && a.securityId.toLowerCase().includes(q))
      );
    }

    // Sort order
    const severityRank = {
      [AlertSeverity.CRITICAL]: 4,
      [AlertSeverity.ACTION_REQUIRED]: 3,
      [AlertSeverity.ATTENTION]: 2,
      [AlertSeverity.INFORMATION]: 1
    };

    if (sort === 'severity') {
      list.sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0));
    } else if (sort === 'date_desc') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === 'date_asc') {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      alerts: JSON.parse(JSON.stringify(paginated)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Returns aggregated alert counts by severity and status.
   */
  countAlerts({ orgId, workspaceId, userId = null }) {
    if (!orgId || !workspaceId) {
      return {
        total: 0,
        bySeverity: { CRITICAL: 0, ACTION_REQUIRED: 0, ATTENTION: 0, INFORMATION: 0 },
        byStatus: { OPEN: 0, ACKNOWLEDGED: 0, SNOOZED: 0, RESOLVED: 0, EXPIRED: 0 },
        myAlertsCount: 0
      };
    }

    this.checkSnoozeExpirations();

    const list = Array.from(this.alerts.values()).filter(a =>
      a.orgId === orgId && a.workspaceId === workspaceId
    );

    const bySeverity = {
      [AlertSeverity.CRITICAL]: 0,
      [AlertSeverity.ACTION_REQUIRED]: 0,
      [AlertSeverity.ATTENTION]: 0,
      [AlertSeverity.INFORMATION]: 0
    };

    const byStatus = {
      [AlertStatus.OPEN]: 0,
      [AlertStatus.ACKNOWLEDGED]: 0,
      [AlertStatus.SNOOZED]: 0,
      [AlertStatus.RESOLVED]: 0,
      [AlertStatus.EXPIRED]: 0
    };

    let myAlertsCount = 0;

    list.forEach(a => {
      if (bySeverity[a.severity] !== undefined) bySeverity[a.severity]++;
      if (byStatus[a.status] !== undefined) byStatus[a.status]++;
      if (userId && a.assignedTo === userId && [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED].includes(a.status)) {
        myAlertsCount++;
      }
    });

    return {
      total: list.length,
      activeCount: byStatus[AlertStatus.OPEN] + byStatus[AlertStatus.ACKNOWLEDGED],
      bySeverity,
      byStatus,
      myAlertsCount
    };
  }

  /**
   * Acknowledges an alert with optimistic locking and audit event.
   */
  acknowledgeAlert(alertId, { actorId, comment = '', expectedVersion = null, workspaceId = null, orgId = null }) {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error(`Alert ${alertId} not found`);

    if (orgId && alert.orgId !== orgId) throw new Error(`IDOR Violation: foreign organization`);
    if (workspaceId && alert.workspaceId !== workspaceId) throw new Error(`IDOR Violation: foreign workspace`);

    if (expectedVersion !== null && expectedVersion !== undefined && alert.version !== expectedVersion) {
      throw new Error(`Concurrency Conflict: Alert version is ${alert.version}, expected ${expectedVersion}`);
    }

    const validNext = VALID_ALERT_TRANSITIONS[alert.status] || [];
    if (!validNext.includes(AlertStatus.ACKNOWLEDGED)) {
      throw new Error(`Illegal Transition: Cannot transition alert from ${alert.status} to ACKNOWLEDGED`);
    }

    const now = new Date().toISOString();
    const prevStatus = alert.status;

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.version += 1;
    alert.acknowledgement = {
      acknowledgedAt: now,
      acknowledgedBy: actorId,
      comment: comment || ''
    };
    alert.canonicalHash = computeAlertHash(alert);

    // Append history
    const hist = this.history.get(alertId) || [];
    hist.push({
      action: 'alert.acknowledged',
      timestamp: now,
      actorId,
      state: 'ACKNOWLEDGED',
      prevStatus,
      version: alert.version,
      comment
    });
    this.history.set(alertId, hist);

    auditRepository.appendEvent({
      action: 'alert.acknowledged',
      actorId,
      actorType: 'USER',
      workspaceId: alert.workspaceId,
      resourceType: 'ALERT',
      resourceId: alertId,
      result: 'SUCCESS',
      metadata: { comment, version: alert.version }
    });

    return JSON.parse(JSON.stringify(alert));
  }

  /**
   * Snoozes an alert until a specified duration or timestamp.
   */
  snoozeAlert(alertId, { actorId, snoozeUntil, reason = '', expectedVersion = null, workspaceId = null, orgId = null }) {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error(`Alert ${alertId} not found`);

    if (orgId && alert.orgId !== orgId) throw new Error(`IDOR Violation: foreign organization`);
    if (workspaceId && alert.workspaceId !== workspaceId) throw new Error(`IDOR Violation: foreign workspace`);

    if (expectedVersion !== null && expectedVersion !== undefined && alert.version !== expectedVersion) {
      throw new Error(`Concurrency Conflict: Alert version is ${alert.version}, expected ${expectedVersion}`);
    }

    const validNext = VALID_ALERT_TRANSITIONS[alert.status] || [];
    if (!validNext.includes(AlertStatus.SNOOZED)) {
      throw new Error(`Illegal Transition: Cannot transition alert from ${alert.status} to SNOOZED`);
    }

    if (!snoozeUntil) throw new Error('snoozeUntil timestamp is required');

    const now = new Date().toISOString();
    const prevStatus = alert.status;

    alert.status = AlertStatus.SNOOZED;
    alert.version += 1;
    alert.snooze = {
      snoozedAt: now,
      snoozedBy: actorId,
      snoozeUntil,
      reason: reason || ''
    };
    alert.canonicalHash = computeAlertHash(alert);

    const hist = this.history.get(alertId) || [];
    hist.push({
      action: 'alert.snoozed',
      timestamp: now,
      actorId,
      state: 'SNOOZED',
      prevStatus,
      version: alert.version,
      snoozeUntil,
      reason
    });
    this.history.set(alertId, hist);

    auditRepository.appendEvent({
      action: 'alert.snoozed',
      actorId,
      actorType: 'USER',
      workspaceId: alert.workspaceId,
      resourceType: 'ALERT',
      resourceId: alertId,
      result: 'SUCCESS',
      metadata: { snoozeUntil, reason, version: alert.version }
    });

    return JSON.parse(JSON.stringify(alert));
  }

  /**
   * Resolves an alert with a mandatory resolution reason and audit record.
   */
  resolveAlert(alertId, { actorId, resolutionReason, resolutionComment = '', relatedDecisionId = null, expectedVersion = null, workspaceId = null, orgId = null }) {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error(`Alert ${alertId} not found`);

    if (orgId && alert.orgId !== orgId) throw new Error(`IDOR Violation: foreign organization`);
    if (workspaceId && alert.workspaceId !== workspaceId) throw new Error(`IDOR Violation: foreign workspace`);

    if (expectedVersion !== null && expectedVersion !== undefined && alert.version !== expectedVersion) {
      throw new Error(`Concurrency Conflict: Alert version is ${alert.version}, expected ${expectedVersion}`);
    }

    const validNext = VALID_ALERT_TRANSITIONS[alert.status] || [];
    if (!validNext.includes(AlertStatus.RESOLVED)) {
      throw new Error(`Illegal Transition: Cannot transition alert from ${alert.status} to RESOLVED`);
    }

    if (!resolutionReason) throw new Error('resolutionReason is required to resolve alert');

    const now = new Date().toISOString();
    const prevStatus = alert.status;

    alert.status = AlertStatus.RESOLVED;
    alert.version += 1;
    alert.resolution = {
      resolvedAt: now,
      resolvedBy: actorId,
      resolutionReason,
      resolutionComment: resolutionComment || '',
      relatedDecisionId: relatedDecisionId || null
    };
    alert.canonicalHash = computeAlertHash(alert);

    const hist = this.history.get(alertId) || [];
    hist.push({
      action: 'alert.resolved',
      timestamp: now,
      actorId,
      state: 'RESOLVED',
      prevStatus,
      version: alert.version,
      resolutionReason,
      resolutionComment,
      relatedDecisionId
    });
    this.history.set(alertId, hist);

    auditRepository.appendEvent({
      action: 'alert.resolved',
      actorId,
      actorType: 'USER',
      workspaceId: alert.workspaceId,
      resourceType: 'ALERT',
      resourceId: alertId,
      result: 'SUCCESS',
      metadata: { resolutionReason, resolutionComment, relatedDecisionId, version: alert.version }
    });

    return JSON.parse(JSON.stringify(alert));
  }

  /**
   * Reopens a resolved alert under documented policy.
   */
  reopenAlert(alertId, { actorId, reason = '', expectedVersion = null, workspaceId = null, orgId = null }) {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error(`Alert ${alertId} not found`);

    if (orgId && alert.orgId !== orgId) throw new Error(`IDOR Violation: foreign organization`);
    if (workspaceId && alert.workspaceId !== workspaceId) throw new Error(`IDOR Violation: foreign workspace`);

    if (expectedVersion !== null && expectedVersion !== undefined && alert.version !== expectedVersion) {
      throw new Error(`Concurrency Conflict: Alert version is ${alert.version}, expected ${expectedVersion}`);
    }

    const validNext = VALID_ALERT_TRANSITIONS[alert.status] || [];
    if (!validNext.includes(AlertStatus.OPEN)) {
      throw new Error(`Illegal Transition: Cannot reopen alert from ${alert.status}`);
    }

    const now = new Date().toISOString();
    const prevStatus = alert.status;

    alert.status = AlertStatus.OPEN;
    alert.version += 1;
    alert.canonicalHash = computeAlertHash(alert);

    const hist = this.history.get(alertId) || [];
    hist.push({
      action: 'alert.reopened',
      timestamp: now,
      actorId,
      state: 'OPEN',
      prevStatus,
      version: alert.version,
      reason
    });
    this.history.set(alertId, hist);

    auditRepository.appendEvent({
      action: 'alert.reopened',
      actorId,
      actorType: 'USER',
      workspaceId: alert.workspaceId,
      resourceType: 'ALERT',
      resourceId: alertId,
      result: 'SUCCESS',
      metadata: { reason, version: alert.version }
    });

    return JSON.parse(JSON.stringify(alert));
  }

  /**
   * Assigns an alert to a user or operational role.
   */
  assignAlert(alertId, { actorId, assignedTo, ownerRole = null, expectedVersion = null, workspaceId = null, orgId = null }) {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error(`Alert ${alertId} not found`);

    if (orgId && alert.orgId !== orgId) throw new Error(`IDOR Violation: foreign organization`);
    if (workspaceId && alert.workspaceId !== workspaceId) throw new Error(`IDOR Violation: foreign workspace`);

    if (expectedVersion !== null && expectedVersion !== undefined && alert.version !== expectedVersion) {
      throw new Error(`Concurrency Conflict: Alert version is ${alert.version}, expected ${expectedVersion}`);
    }

    const now = new Date().toISOString();
    alert.assignedTo = assignedTo;
    if (ownerRole) alert.ownerRole = ownerRole;
    alert.version += 1;
    alert.canonicalHash = computeAlertHash(alert);

    const hist = this.history.get(alertId) || [];
    hist.push({
      action: 'alert.assigned',
      timestamp: now,
      actorId,
      assignedTo,
      ownerRole,
      version: alert.version
    });
    this.history.set(alertId, hist);

    auditRepository.appendEvent({
      action: 'alert.assigned',
      actorId,
      actorType: 'USER',
      workspaceId: alert.workspaceId,
      resourceType: 'ALERT',
      resourceId: alertId,
      result: 'SUCCESS',
      metadata: { assignedTo, ownerRole, version: alert.version }
    });

    return JSON.parse(JSON.stringify(alert));
  }

  /**
   * Escalates an alert exceeding SLA or requiring management visibility.
   */
  escalateAlert(alertId, { actorId, escalationReason, escalatedToRole = 'PORTFOLIO_MANAGER', expectedVersion = null, workspaceId = null, orgId = null }) {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error(`Alert ${alertId} not found`);

    if (orgId && alert.orgId !== orgId) throw new Error(`IDOR Violation: foreign organization`);
    if (workspaceId && alert.workspaceId !== workspaceId) throw new Error(`IDOR Violation: foreign workspace`);

    if (expectedVersion !== null && expectedVersion !== undefined && alert.version !== expectedVersion) {
      throw new Error(`Concurrency Conflict: Alert version is ${alert.version}, expected ${expectedVersion}`);
    }

    const now = new Date().toISOString();
    alert.escalation = {
      escalatedAt: now,
      escalatedBy: actorId,
      escalationReason,
      escalatedToRole
    };

    // Promote severity if lower than ACTION_REQUIRED
    if (alert.severity === AlertSeverity.ATTENTION || alert.severity === AlertSeverity.INFORMATION) {
      alert.severity = AlertSeverity.ACTION_REQUIRED;
    }

    alert.version += 1;
    alert.canonicalHash = computeAlertHash(alert);

    const hist = this.history.get(alertId) || [];
    hist.push({
      action: 'alert.escalated',
      timestamp: now,
      actorId,
      escalationReason,
      escalatedToRole,
      version: alert.version
    });
    this.history.set(alertId, hist);

    auditRepository.appendEvent({
      action: 'alert.escalated',
      actorId,
      actorType: 'USER',
      workspaceId: alert.workspaceId,
      resourceType: 'ALERT',
      resourceId: alertId,
      result: 'SUCCESS',
      metadata: { escalationReason, escalatedToRole, version: alert.version }
    });

    return JSON.parse(JSON.stringify(alert));
  }

  /**
   * Checks for expired snoozes and transitions them back to OPEN.
   */
  checkSnoozeExpirations() {
    const now = new Date();
    for (const alert of this.alerts.values()) {
      if (alert.status === AlertStatus.SNOOZED && alert.snooze?.snoozeUntil) {
        if (new Date(alert.snooze.snoozeUntil) <= now) {
          alert.status = AlertStatus.OPEN;
          alert.version += 1;
          alert.canonicalHash = computeAlertHash(alert);

          const hist = this.history.get(alert.alertId) || [];
          hist.push({
            action: 'alert.snooze_expired',
            timestamp: now.toISOString(),
            actorId: 'SYSTEM',
            state: 'OPEN',
            version: alert.version
          });
          this.history.set(alert.alertId, hist);

          auditRepository.appendEvent({
            action: 'alert.snooze_expired',
            actorId: 'SYSTEM',
            actorType: 'SYSTEM',
            workspaceId: alert.workspaceId,
            resourceType: 'ALERT',
            resourceId: alert.alertId,
            result: 'SUCCESS',
            metadata: { version: alert.version }
          });
        }
      }
    }
  }

  /**
   * Retrieves operational history for an alert.
   */
  getAlertHistory(alertId) {
    return this.history.get(alertId) || [];
  }

  /**
   * Retrieves notification preferences for a user in a workspace.
   */
  getPreferences(workspaceId, userId) {
    const key = `${workspaceId}:${userId}`;
    return this.preferences.get(key) || {
      workspaceId,
      userId,
      channels: {
        IN_APP: true,
        EMAIL: false,
        PUSH: false
      },
      severityThreshold: AlertSeverity.INFORMATION,
      cooldownMinutes: 15,
      digestFrequency: 'REALTIME'
    };
  }

  /**
   * Updates notification preferences.
   */
  updatePreferences(workspaceId, userId, updates = {}) {
    const key = `${workspaceId}:${userId}`;
    const current = this.getPreferences(workspaceId, userId);
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.preferences.set(key, updated);

    auditRepository.appendEvent({
      action: 'alert.policy.changed',
      actorId: userId,
      actorType: 'USER',
      workspaceId,
      resourceType: 'ALERT_PREFERENCES',
      resourceId: key,
      result: 'SUCCESS',
      metadata: { updates }
    });

    return updated;
  }
}

export const alertRepository = new AlertRepository();
export default alertRepository;
