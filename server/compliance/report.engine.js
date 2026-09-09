/**
 * Phase 16 — Institutional Compliance Reporting Engine
 * Formats deterministic compliance reports, historical breach audits,
 * decision governance reports, and CSV-compatible export representations.
 */

import { ComplianceStatus, canonicalHash, deepFreeze } from './compliance.types.js';

export class ComplianceReportEngine {
  /**
   * Generates a Portfolio Compliance Summary Report.
   */
  static generatePortfolioReport(evaluation, { includeEvidence = true } = {}) {
    if (!evaluation || !evaluation.complianceId) {
      throw new Error('Valid compliance evaluation is required to generate report');
    }

    const report = {
      reportId: `RPT-PORTFOLIO-${evaluation.complianceId}`,
      reportType: 'PORTFOLIO_COMPLIANCE_SUMMARY',
      workspaceId: evaluation.workspaceId,
      portfolioId: evaluation.portfolioId,
      asOf: evaluation.asOf,
      complianceStatus: evaluation.status,
      overallSeverity: evaluation.overallSeverity,
      isCompliant: evaluation.isCompliant,
      policy: {
        policyId: evaluation.policyId,
        policyVersion: evaluation.policyVersion,
        policyHash: evaluation.policyHash
      },
      summaryMetrics: {
        totalRules: evaluation.ruleCount,
        passedRules: evaluation.passCount,
        warningRules: evaluation.warningCount,
        breachedRules: evaluation.breachCount,
        waivedRules: evaluation.waivedCount,
        insufficientDataRules: evaluation.insufficientDataCount
      },
      ruleDetails: evaluation.ruleResults.map(r => ({
        ruleId: r.ruleId,
        ruleType: r.ruleType,
        target: r.targetKey || 'PORTFOLIO',
        threshold: r.threshold,
        actualValue: r.actualValue,
        variance: r.variance,
        status: r.status,
        severity: r.severity,
        explanation: r.explanation
      })),
      activeBreaches: evaluation.breaches || [],
      activeWaivers: evaluation.waivedBreaches || [],
      remediationPlan: evaluation.remediation || null,
      generatedAt: new Date().toISOString()
    };

    const reportHash = canonicalHash({
      reportId: report.reportId,
      workspaceId: report.workspaceId,
      portfolioId: report.portfolioId,
      complianceStatus: report.complianceStatus,
      summaryMetrics: report.summaryMetrics
    });

    return deepFreeze({
      ...report,
      reportHash
    });
  }

  /**
   * Generates a Historical Breach Log Report.
   */
  static generateHistoricalBreachReport(portfolioId, workspaceId, breaches = []) {
    const historicalBreaches = breaches.map(b => ({
      breachId: b.breachId,
      ruleId: b.ruleId,
      ruleType: b.ruleType,
      severity: b.severity,
      policyVersion: b.policyVersion,
      firstDetectedAt: b.firstDetectedAt,
      lastDetectedAt: b.lastDetectedAt,
      resolvedAt: b.resolvedAt,
      status: b.status,
      explanation: b.explanation,
      historyLength: b.history?.length || 1
    }));

    const report = {
      reportId: `RPT-BREACH-HIST-${portfolioId}-${Date.now()}`,
      reportType: 'HISTORICAL_BREACH_LOG',
      workspaceId,
      portfolioId,
      totalBreachesRecorded: historicalBreaches.length,
      activeBreachesCount: historicalBreaches.filter(b => b.status !== 'RESOLVED' && b.status !== 'CLOSED').length,
      resolvedBreachesCount: historicalBreaches.filter(b => b.status === 'RESOLVED' || b.status === 'CLOSED').length,
      breaches: historicalBreaches,
      generatedAt: new Date().toISOString()
    };

    return deepFreeze({
      ...report,
      reportHash: canonicalHash(report)
    });
  }

  /**
   * Generates a Decision Governance Report.
   */
  static generateDecisionGovernanceReport(decision, evaluation) {
    const report = {
      reportId: `RPT-DECISION-GOV-${decision?.decisionId || Date.now()}`,
      reportType: 'DECISION_GOVERNANCE_REPORT',
      decisionId: decision?.decisionId || 'UNKNOWN',
      ticker: decision?.ticker || 'UNKNOWN',
      approverRole: decision?.approverRole || decision?.userRole || 'UNKNOWN',
      governanceStatus: evaluation ? evaluation.status : 'NOT_EVALUATED',
      isCompliant: evaluation ? evaluation.isCompliant : false,
      evaluatedRules: evaluation?.ruleResults || [],
      generatedAt: new Date().toISOString()
    };

    return deepFreeze({
      ...report,
      reportHash: canonicalHash(report)
    });
  }

  /**
   * Exports evaluation rule results to deterministic CSV-compatible string.
   */
  static exportRuleResultsToCSV(evaluation) {
    if (!evaluation || !Array.isArray(evaluation.ruleResults)) {
      return '';
    }

    const headers = ['RuleId', 'RuleType', 'TargetKey', 'Operator', 'Threshold', 'ActualValue', 'Variance', 'Status', 'Severity', 'Explanation'];
    const rows = [headers.join(',')];

    for (const r of evaluation.ruleResults) {
      const row = [
        `"${r.ruleId || ''}"`,
        `"${r.ruleType || ''}"`,
        `"${r.targetKey || ''}"`,
        `"${r.operator || ''}"`,
        r.threshold !== null && r.threshold !== undefined ? r.threshold : '',
        `"${r.actualValue !== null && r.actualValue !== undefined ? r.actualValue : ''}"`,
        r.variance !== null && r.variance !== undefined ? r.variance : '',
        `"${r.status || ''}"`,
        `"${r.severity || ''}"`,
        `"${(r.explanation || '').replace(/"/g, '""')}"`
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }
}
