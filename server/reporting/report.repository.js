/**
 * @file report.repository.js
 * Multi-Tenant In-Memory Storage Repository for Phase 40 Institutional Reports.
 * Enforces strict orgId/workspaceId boundary isolation, optimistic concurrency control,
 * immutable audit logging, and report version lineage.
 */

import { auditRepository } from '../governance/audit.repository.js';
import { ReportStatus, computeSnapshotHash } from './report.types.js';

class ReportRepository {
  constructor() {
    this.reports = new Map();         // reportId -> Report
    this.snapshots = new Map();       // snapshotId -> Snapshot
    this.reportsByWorkspace = new Map(); // workspaceId -> Set<reportId>
    this._seedDefaultReports();
  }

  _seedDefaultReports() {
    const orgId = 'ORG-ROOT-001';
    const workspaceId = 'WS-DEFAULT-001';
    const portfolioId = 'PORT-DEFAULT-001';
    const now = '2026-09-08T00:00:00.000Z';

    const seedSnapshot = {
      snapshotId: 'SNAP-SEED-001',
      orgId,
      workspaceId,
      portfolioId,
      reportType: 'PORTFOLIO_OVERVIEW',
      asOf: now,
      snapshotTimestamp: now,
      periodStart: '2026-09-01T00:00:00.000Z',
      periodEnd: '2026-09-07T00:00:00.000Z',
      capturedBy: 'USR-ROOT-001',
      dataVersion: 1,
      portfolio: {
        portfolioId,
        name: 'Global Flagship Multi-Asset Portfolio',
        type: 'MULTI_ASSET',
        strategy: 'CORE_MOMENTUM',
        status: 'ACTIVE',
        baseCurrency: 'USD',
        benchmark: '^GSPC',
        benchmarkName: 'S&P 500 Index',
        aum: 10000000,
        cashBalance: 500000,
        mandate: {
          maxSinglePositionWeight: 0.25,
          maxSectorWeight: 0.40,
          targetReturn: 0.12,
          riskTargetVolatility: 0.14
        },
        holdings: [
          { ticker: 'AAPL', securityName: 'Apple Inc.', quantity: 11363, price: 220.00, marketValue: 2500000, weight: 0.25, costBasis: 195.00, unrealizedPnL: 284075, sector: 'Technology', geography: 'US', freshness: 'FRESH', asOf: now },
          { ticker: 'MSFT', securityName: 'Microsoft Corp.', quantity: 5952, price: 420.00, marketValue: 2500000, weight: 0.25, costBasis: 380.00, unrealizedPnL: 238080, sector: 'Technology', geography: 'US', freshness: 'FRESH', asOf: now },
          { ticker: 'GOOGL', securityName: 'Alphabet Inc.', quantity: 11428, price: 175.00, marketValue: 2000000, weight: 0.20, costBasis: 150.00, unrealizedPnL: 285700, sector: 'Communication Services', geography: 'US', freshness: 'FRESH', asOf: now },
          { ticker: 'JPM', securityName: 'JPMorgan Chase & Co.', quantity: 7142, price: 210.00, marketValue: 1500000, weight: 0.15, costBasis: 185.00, unrealizedPnL: 178550, sector: 'Financials', geography: 'US', freshness: 'FRESH', asOf: now },
          { ticker: 'NVDA', securityName: 'NVIDIA Corp.', quantity: 8000, price: 125.00, marketValue: 1000000, weight: 0.10, costBasis: 105.00, unrealizedPnL: 160000, sector: 'Technology', geography: 'US', freshness: 'FRESH', asOf: now }
        ],
        asOf: now
      },
      riskMetrics: {
        var95: 0.021,
        var99: 0.035,
        expectedShortfall95: 0.029,
        volatility: 0.145,
        sharpeRatio: 1.42,
        trackingError: 0.018,
        hhi: 0.18,
        effectivePositions: 5.5,
        topRiskContributors: [],
        freshness: 'FRESH',
        source: 'riskAttribution.engine & riskForecast.engine'
      },
      exposureMetrics: { sectors: [], geographies: [], freshness: 'FRESH', source: 'exposureRisk.engine' },
      complianceState: { status: 'COMPLIANT', breachCount: 0, breaches: [], evaluations: [], freshness: 'FRESH', source: 'compliance.mandate_engine' },
      decisions: [],
      alerts: [],
      materialChanges: [],
      evidenceReferences: [{ id: 'EVID-SNAP-SEED-001', type: 'SEALED_SNAPSHOT', claim: 'Seeded institutional PIT snapshot' }],
      isSealed: true
    };
    seedSnapshot.snapshotHash = computeSnapshotHash(seedSnapshot);
    this.snapshots.set(seedSnapshot.snapshotId, seedSnapshot);

    const seedReport = {
      reportId: 'RPT-SEED-001',
      orgId,
      workspaceId,
      portfolioId,
      reportType: 'PORTFOLIO_OVERVIEW',
      templateId: 'TMPL-PORTFOLIO-OVERVIEW-V1',
      templateVersion: '1.0.0',
      title: 'Global Flagship Portfolio Overview — September 2026',
      status: ReportStatus.APPROVED,
      version: 1,
      requestedBy: 'USR-ROOT-001',
      requestedAt: now,
      asOf: now,
      periodStart: '2026-09-01T00:00:00.000Z',
      periodEnd: '2026-09-07T00:00:00.000Z',
      snapshotId: 'SNAP-SEED-001',
      sourceSnapshotHash: seedSnapshot.snapshotHash,
      dataVersion: 1,
      validationStatus: 'PASSED',
      validationErrors: [],
      validationWarnings: [],
      approvalStatus: 'APPROVED',
      approvedBy: null,
      approvedAt: now,
      distributionStatus: 'NOT_DISTRIBUTED',
      distributedAt: null,
      sections: {
        METADATA: { available: true },
        EXECUTIVE_SUMMARY: { available: true, content: 'Institutional portfolio remains compliant with mandate constraints. Three technology-sector positions (AAPL, MSFT, GOOGL) constitute 55% of AUM. Risk metrics within mandate tolerance.' },
        PORTFOLIO_OVERVIEW: { available: true },
        HOLDINGS_TABLE: { available: true },
        RISK_SUMMARY: { available: true },
        COMPLIANCE_STATUS: { available: true },
        EVIDENCE_PROVENANCE: { available: true }
      },
      evidenceReferences: [{ id: 'EVID-SNAP-SEED-001', type: 'SEALED_SNAPSHOT', claim: 'Authoritative PIT snapshot for report generation' }],
      reportHash: null,
      artifactHash: null,
      generatedAt: now,
      createdAt: now,
      updatedAt: now
    };
    this.reports.set(seedReport.reportId, seedReport);
    this._addToWorkspaceIndex(workspaceId, seedReport.reportId);
  }

  // ============================================================
  // Snapshot Storage
  // ============================================================

  saveSnapshot(snapshot) {
    if (!snapshot?.snapshotId) throw new Error('Snapshot missing snapshotId');
    this.snapshots.set(snapshot.snapshotId, JSON.parse(JSON.stringify(snapshot)));
    return JSON.parse(JSON.stringify(snapshot));
  }

  getSnapshotById(snapshotId, workspaceId = null, orgId = null) {
    const s = this.snapshots.get(snapshotId);
    if (!s) return null;
    if (orgId && s.orgId !== orgId) return null;
    if (workspaceId && s.workspaceId !== workspaceId) return null;
    return JSON.parse(JSON.stringify(s));
  }

  // ============================================================
  // Report CRUD
  // ============================================================

  createReport(data) {
    const { orgId, workspaceId } = data;
    if (!orgId || !workspaceId) throw new Error('orgId and workspaceId are required');

    const reportId = data.reportId || `RPT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const now = new Date().toISOString();
    const report = {
      reportId,
      orgId,
      workspaceId,
      portfolioId: data.portfolioId || null,
      reportType: data.reportType,
      templateId: data.templateId,
      templateVersion: data.templateVersion || '1.0.0',
      title: data.title,
      status: ReportStatus.DRAFT,
      version: 1,
      requestedBy: data.requestedBy || 'SYSTEM',
      requestedAt: now,
      asOf: data.asOf || now,
      periodStart: data.periodStart || null,
      periodEnd: data.periodEnd || null,
      snapshotId: data.snapshotId || null,
      sourceSnapshotHash: data.sourceSnapshotHash || null,
      dataVersion: 1,
      validationStatus: 'PENDING',
      validationErrors: [],
      validationWarnings: [],
      approvalStatus: 'PENDING',
      approvedBy: null,
      approvedAt: null,
      distributionStatus: 'NOT_DISTRIBUTED',
      distributedAt: null,
      sections: data.sections || {},
      evidenceReferences: data.evidenceReferences || [],
      reportHash: null,
      artifactHash: null,
      generatedAt: null,
      createdAt: now,
      updatedAt: now
    };

    this.reports.set(reportId, report);
    this._addToWorkspaceIndex(workspaceId, reportId);

    auditRepository.appendEvent({
      action: 'report.created',
      actorId: data.requestedBy || 'SYSTEM',
      actorType: 'USER',
      workspaceId,
      resourceType: 'REPORT',
      resourceId: reportId,
      result: 'SUCCESS',
      metadata: { reportType: data.reportType, templateId: data.templateId }
    });

    return JSON.parse(JSON.stringify(report));
  }

  getReportById(reportId, workspaceId = null, orgId = null) {
    const report = this.reports.get(reportId);
    if (!report) return null;
    if (orgId && report.orgId !== orgId) return null;
    if (workspaceId && report.workspaceId !== workspaceId) return null;
    return JSON.parse(JSON.stringify(report));
  }

  listReports({ orgId, workspaceId, reportType = null, status = null, portfolioId = null, search = null, limit = 50, offset = 0 }) {
    if (!orgId || !workspaceId) return { reports: [], total: 0 };

    const wsIds = this.reportsByWorkspace.get(workspaceId) || new Set();
    let all = [];
    for (const id of wsIds) {
      const r = this.reports.get(id);
      if (r && r.orgId === orgId) all.push(r);
    }

    if (reportType) all = all.filter(r => r.reportType === reportType);
    if (status) all = all.filter(r => r.status === status);
    if (portfolioId) all = all.filter(r => r.portfolioId === portfolioId);
    if (search) {
      const q = search.toLowerCase();
      all = all.filter(r =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.reportId || '').toLowerCase().includes(q) ||
        (r.reportType || '').toLowerCase().includes(q)
      );
    }

    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = all.length;
    return { reports: all.slice(offset, offset + limit).map(r => JSON.parse(JSON.stringify(r))), total };
  }

  /**
   * Applies a state mutation to an existing report with optimistic concurrency control.
   */
  updateReport(reportId, updates, expectedVersion = null, actorId = 'SYSTEM') {
    const report = this.reports.get(reportId);
    if (!report) throw new Error(`Report ${reportId} not found`);

    if (expectedVersion !== null && report.version !== expectedVersion) {
      const err = new Error(`Version conflict: expected ${expectedVersion}, found ${report.version}`);
      err.status = 409;
      throw err;
    }

    const now = new Date().toISOString();
    const prevStatus = report.status;

    Object.assign(report, updates, {
      version: report.version + 1,
      updatedAt: now
    });

    auditRepository.appendEvent({
      action: 'report.updated',
      actorId,
      actorType: 'USER',
      workspaceId: report.workspaceId,
      resourceType: 'REPORT',
      resourceId: reportId,
      result: 'SUCCESS',
      metadata: { fromStatus: prevStatus, toStatus: report.status || prevStatus, version: report.version }
    });

    return JSON.parse(JSON.stringify(report));
  }

  _addToWorkspaceIndex(workspaceId, reportId) {
    if (!this.reportsByWorkspace.has(workspaceId)) {
      this.reportsByWorkspace.set(workspaceId, new Set());
    }
    this.reportsByWorkspace.get(workspaceId).add(reportId);
  }
}

export const reportRepository = new ReportRepository();
export default reportRepository;
