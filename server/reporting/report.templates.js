/**
 * @file report.templates.js
 * Versioned Immutable Report Templates for Phase 40 Institutional Reporting.
 */

import { ReportType } from './report.types.js';

export const InstitutionalTemplates = Object.freeze([
  {
    templateId: 'TMPL-PORTFOLIO-OVERVIEW-V1',
    templateName: 'Institutional Portfolio Overview Template',
    templateVersion: '1.0.0',
    reportType: ReportType.PORTFOLIO_OVERVIEW,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Executive overview of portfolio mandate, asset allocation, AUM, cash, holdings, and risk summary.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'PORTFOLIO_OVERVIEW', 'HOLDINGS_TABLE', 'RISK_SUMMARY', 'COMPLIANCE_STATUS', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-EXPOSURE-RISK-V1',
    templateName: 'Institutional Exposure & Risk Assessment Template',
    templateVersion: '1.0.0',
    reportType: ReportType.EXPOSURE_RISK_REPORT,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Comprehensive risk factor decomposition, Euler CRC top risk contributors, VaR, Expected Shortfall, and HHI concentration analysis.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'RISK_METRICS', 'FACTOR_DECOMPOSITION', 'SECTOR_EXPOSURE', 'GEOGRAPHIC_EXPOSURE', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-ATTRIBUTION-V1',
    templateName: 'Institutional Performance & Attribution Template',
    templateVersion: '1.0.0',
    reportType: ReportType.ATTRIBUTION_REPORT,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Brinson allocation/selection analysis, factor active return decomposition, and alpha thesis attribution.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'PERFORMANCE_SUMMARY', 'BRINSON_ATTRIBUTION', 'ALPHA_CONTRIBUTORS', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'LANDSCAPE'
  },
  {
    templateId: 'TMPL-DECISION-MEMO-V1',
    templateName: 'Institutional Investment Decision Memo Template',
    templateVersion: '1.0.0',
    reportType: ReportType.INVESTMENT_DECISION_MEMO,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Detailed investment committee decision memo with thesis claims, supporting evidence graph, challenger arguments, and compliance authorization.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'DECISION_THESIS', 'SUPPORTING_EVIDENCE', 'CHALLENGE_LOG', 'PORTFOLIO_IMPACT', 'AUTHORIZATION_RECORD'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-COMPLIANCE-REPORT-V1',
    templateName: 'Institutional Mandate & Compliance Monitoring Template',
    templateVersion: '1.0.0',
    reportType: ReportType.COMPLIANCE_REPORT,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Rigorous investment guidelines compliance report detailing hard limits, active breaches, warnings, and exception lifecycle.',
    requiredSections: ['METADATA', 'MANDATE_STATUS', 'BREACH_LOG', 'WARNINGS', 'EXCEPTION_AUDIT', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-DAILY-BRIEF-V1',
    templateName: 'Institutional Daily Operating Brief Template',
    templateVersion: '1.0.0',
    reportType: ReportType.DAILY_BRIEF,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Daily operational digest summarizing overnight market changes, material drift, active alerts, and pending investment decisions.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'MATERIAL_CHANGES', 'ACTIVE_ALERTS', 'PENDING_DECISIONS', 'PORTFOLIO_PULSE'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-MONTHLY-REVIEW-V1',
    templateName: 'Institutional Monthly Portfolio Review Template',
    templateVersion: '1.0.0',
    reportType: ReportType.MONTHLY_PORTFOLIO_REVIEW,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Complete institutional monthly deliverable unifying performance, holdings, risk, decisions, and governance.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'PORTFOLIO_OVERVIEW', 'HOLDINGS_TABLE', 'RISK_SUMMARY', 'DECISION_LOG', 'COMPLIANCE_STATUS', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'LANDSCAPE'
  },
  {
    templateId: 'TMPL-COMMITTEE-PACKAGE-V1',
    templateName: 'Quarterly Investment Committee Package Template',
    templateVersion: '1.0.0',
    reportType: ReportType.QUARTERLY_COMMITTEE_PACKAGE,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Master institutional committee package with macro backdrop, cross-portfolio risk, strategic decisions, and full audit lineage.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'UNIVERSE_PERFORMANCE', 'RISK_AND_ATTRIBUTION', 'STRATEGIC_DECISIONS', 'COMPLIANCE_AND_AUDIT', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'LANDSCAPE'
  },
  {
    templateId: 'TMPL-HOLDINGS-REPORT-V1',
    templateName: 'Institutional Holdings & Position Valuation Template',
    templateVersion: '1.0.0',
    reportType: ReportType.HOLDINGS_REPORT,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Granular position-level schedule of assets, valuations, unrealized PnL, cost basis, and sector breakdowns.',
    requiredSections: ['METADATA', 'PORTFOLIO_OVERVIEW', 'HOLDINGS_TABLE', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-PORTFOLIO-PERFORMANCE-V1',
    templateName: 'Institutional Portfolio Performance & Benchmark Review',
    templateVersion: '1.0.0',
    reportType: ReportType.PORTFOLIO_PERFORMANCE,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'TWR, benchmark comparison, excess return, annualized Sharpe, and drawdown metrics.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'PORTFOLIO_OVERVIEW', 'RISK_SUMMARY', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-LIQUIDITY-REPORT-V1',
    templateName: 'Institutional Liquidity & Redemption Capacity Template',
    templateVersion: '1.0.0',
    reportType: ReportType.LIQUIDITY_REPORT,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Portfolio cash balances, market depth, days-to-liquidate distributions, and redemption buffer analysis.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'PORTFOLIO_OVERVIEW', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-TAX-IMPLEMENTATION-V1',
    templateName: 'Institutional Tax & Implementation Delivery Template',
    templateVersion: '1.0.0',
    reportType: ReportType.TAX_IMPLEMENTATION_REPORT,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Realized/unrealized capital gains, tax lot efficiency, turnover costs, and implementation slippage.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'PORTFOLIO_OVERVIEW', 'HOLDINGS_TABLE', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-DECISION-REVIEW-V1',
    templateName: 'Institutional Decision Review Package Template',
    templateVersion: '1.0.0',
    reportType: ReportType.DECISION_REVIEW_PACKAGE,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Comprehensive retrospective review of past investment decisions, thesis drift, and outcome attribution.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'DECISION_LOG', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-THESIS-EVIDENCE-V1',
    templateName: 'Investment Thesis & Evidence Lineage Package',
    templateVersion: '1.0.0',
    reportType: ReportType.THESIS_EVIDENCE_PACKAGE,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Deep factual graph of claims, research sources, catalyst tracking, and counter-arguments.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-SCENARIO-STRESS-V1',
    templateName: 'Institutional Scenario Analysis & Stress Package',
    templateVersion: '1.0.0',
    reportType: ReportType.SCENARIO_STRESS_PACKAGE,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Multi-factor macro shock simulations, historical crisis replays, and tail-loss estimates.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'RISK_SUMMARY', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-OPTIMIZATION-PROPOSAL-V1',
    templateName: 'Portfolio Optimization & Rebalance Proposal Package',
    templateVersion: '1.0.0',
    reportType: ReportType.OPTIMIZATION_PROPOSAL_PACKAGE,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Target frontier allocations, turnover constraints, transaction cost optimization, and trade proposals.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'PORTFOLIO_OVERVIEW', 'HOLDINGS_TABLE', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-MANDATE-MONITORING-V1',
    templateName: 'Institutional Mandate Monitoring Review Template',
    templateVersion: '1.0.0',
    reportType: ReportType.MANDATE_MONITORING_REPORT,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Periodic audit of investment mandate guidelines, hard restrictions, and soft guideline compliance.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'COMPLIANCE_STATUS', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-DECISION-AUTH-V1',
    templateName: 'Decision Authorization & Governance Sign-Off Record',
    templateVersion: '1.0.0',
    reportType: ReportType.DECISION_AUTHORIZATION_REPORT,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Formal sign-off log for consequential capital allocations, SoD adherence, and approver identity verification.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'DECISION_LOG', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-AUDIT-LINEAGE-V1',
    templateName: 'Institutional Audit Trail & Lineage Provenance Report',
    templateVersion: '1.0.0',
    reportType: ReportType.AUDIT_LINEAGE_REPORT,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Complete append-only governance log of all operational events, actors, and cryptographic seals.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-EXCEPTION-REPORT-V1',
    templateName: 'Institutional Policy & Risk Exception Report Template',
    templateVersion: '1.0.0',
    reportType: ReportType.EXCEPTION_REPORT,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Log of temporary mandate waivers, risk breaches, remedial action plans, and resolution timelines.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'COMPLIANCE_STATUS', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'PORTRAIT'
  },
  {
    templateId: 'TMPL-WEEKLY-REVIEW-V1',
    templateName: 'Institutional Weekly Portfolio Review Template',
    templateVersion: '1.0.0',
    reportType: ReportType.WEEKLY_INVESTMENT_REVIEW,
    schemaVersion: '1.0.0',
    createdAt: '2026-09-08T00:00:00.000Z',
    description: 'Weekly operational deliverable summarizing weekly drift, attention items, risk shifts, and trades.',
    requiredSections: ['METADATA', 'EXECUTIVE_SUMMARY', 'PORTFOLIO_OVERVIEW', 'HOLDINGS_TABLE', 'RISK_SUMMARY', 'COMPLIANCE_STATUS', 'EVIDENCE_PROVENANCE'],
    defaultOrientation: 'PORTRAIT'
  }
]);

export function listTemplates() {
  return JSON.parse(JSON.stringify(InstitutionalTemplates));
}

export function getTemplate(templateId) {
  const found = InstitutionalTemplates.find(t => t.templateId === templateId);
  return found ? JSON.parse(JSON.stringify(found)) : null;
}

export function getDefaultTemplateForType(reportType) {
  const found = InstitutionalTemplates.find(t => t.reportType === reportType);
  if (found) return JSON.parse(JSON.stringify(found));
  // Fallback to Portfolio Overview v1
  return JSON.parse(JSON.stringify(InstitutionalTemplates[0]));
}
