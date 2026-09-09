/**
 * @file report.controller.js
 * REST Controller for Phase 40 Institutional Reporting & Deliverables.
 */

import { ReportEngine } from './report.engine.js';
import { reportRepository } from './report.repository.js';
import { listTemplates } from './report.templates.js';
import { ReportRenderer } from './report.renderer.js';
import { Permission } from '../auth/auth.types.js';
import { hasPermission } from '../auth/rbac.engine.js';
import { auditRepository } from '../governance/audit.repository.js';

function getActorContext(req) {
  const user = req.user || req.auth?.user;
  return {
    actorId: user?.userId || user?.id || 'USR-ROOT-001',
    role: user?.role || 'OWNER',
    orgId: req.headers['x-org-id'] || user?.orgId || req.auth?.orgId || 'ORG-ROOT-001',
    workspaceId: req.headers['x-workspace-id'] || req.query.workspaceId || user?.workspaceId || req.auth?.workspaceId || 'WS-DEFAULT-001'
  };
}

function guardPermission(role, permission, res) {
  if (!hasPermission(role, permission)) {
    res.status(403).json({ success: false, error: `Forbidden: requires ${permission}` });
    return false;
  }
  return true;
}

// GET /api/reports/templates
export async function listReportTemplates(req, res) {
  try {
    const { role } = getActorContext(req);
    if (!guardPermission(role, Permission.REPORTS_READ, res)) return;
    const templates = listTemplates();
    res.json({ success: true, templates, total: templates.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/reports
export async function listReports(req, res) {
  try {
    const { actorId, role, orgId, workspaceId } = getActorContext(req);
    if (!guardPermission(role, Permission.REPORTS_READ, res)) return;

    const { reportType, status, portfolioId, search, limit = '50', offset = '0' } = req.query;
    const result = reportRepository.listReports({
      orgId, workspaceId,
      reportType: reportType || null,
      status: status || null,
      portfolioId: portfolioId || null,
      search: search || null,
      limit: Math.min(parseInt(limit, 10) || 50, 200),
      offset: parseInt(offset, 10) || 0
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/reports/summary
export async function getReportsSummary(req, res) {
  try {
    const { role, orgId, workspaceId } = getActorContext(req);
    if (!guardPermission(role, Permission.REPORTS_READ, res)) return;

    const all = reportRepository.listReports({ orgId, workspaceId, limit: 500 }).reports;
    const summary = {
      total: all.length,
      byStatus: {},
      inReview: all.filter(r => r.status === 'READY_FOR_REVIEW').length,
      approved: all.filter(r => r.status === 'APPROVED').length,
      distributed: all.filter(r => r.status === 'DISTRIBUTED').length,
      draft: all.filter(r => r.status === 'DRAFT').length
    };
    for (const r of all) summary.byStatus[r.status] = (summary.byStatus[r.status] || 0) + 1;

    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/reports/:reportId
export async function getReport(req, res) {
  try {
    const { role, orgId, workspaceId } = getActorContext(req);
    if (!guardPermission(role, Permission.REPORTS_READ, res)) return;
    const { reportId } = req.params;
    const report = reportRepository.getReportById(reportId, workspaceId, orgId);
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
    const snapshot = report.snapshotId ? reportRepository.getSnapshotById(report.snapshotId, workspaceId, orgId) : null;
    res.json({ success: true, report, snapshot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/reports
export async function createReportDraft(req, res) {
  try {
    const { actorId, role, orgId, workspaceId } = getActorContext(req);
    if (!guardPermission(role, Permission.REPORTS_CREATE, res)) return;
    const { reportType, templateId, portfolioId, title, asOf, periodStart, periodEnd } = req.body;
    if (!reportType) return res.status(400).json({ success: false, error: 'reportType is required' });
    const report = ReportEngine.createDraft({ orgId, workspaceId, portfolioId, reportType, templateId, title, asOf, periodStart, periodEnd, requestedBy: actorId });
    res.status(201).json({ success: true, report });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

// POST /api/reports/:reportId/generate
export async function generateReport(req, res) {
  try {
    const { actorId, role, orgId, workspaceId } = getActorContext(req);
    if (!guardPermission(role, Permission.REPORTS_GENERATE, res)) return;
    const { reportId } = req.params;
    const result = await ReportEngine.generateReport({ reportId, orgId, workspaceId, actorId });
    res.json({ success: true, report: result.report, snapshotId: result.snapshot?.snapshotId });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

// POST /api/reports/:reportId/validate
export async function validateReport(req, res) {
  try {
    const { actorId, role, orgId, workspaceId } = getActorContext(req);
    if (!guardPermission(role, Permission.REPORTS_VALIDATE, res)) return;
    const { reportId } = req.params;
    const result = ReportEngine.validateReport({ reportId, orgId, workspaceId, actorId });
    res.json({ success: true, report: result.report, validation: result.validation });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

// POST /api/reports/:reportId/submit-review
export async function submitForReview(req, res) {
  try {
    const { actorId, role, orgId, workspaceId } = getActorContext(req);
    if (!guardPermission(role, Permission.REPORTS_REVIEW, res)) return;
    const { reportId } = req.params;
    const report = ReportEngine.submitForReview({ reportId, orgId, workspaceId, actorId });
    res.json({ success: true, report });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

// POST /api/reports/:reportId/approve
export async function approveReport(req, res) {
  try {
    const { actorId, role, orgId, workspaceId } = getActorContext(req);
    if (!guardPermission(role, Permission.REPORTS_APPROVE, res)) return;
    const { reportId } = req.params;
    const { enforceSoD = true } = req.body;
    const report = ReportEngine.approveReport({ reportId, orgId, workspaceId, actorId, enforceSoD: Boolean(enforceSoD) });
    res.json({ success: true, report });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

// POST /api/reports/:reportId/reject
export async function rejectReport(req, res) {
  try {
    const { actorId, role, orgId, workspaceId } = getActorContext(req);
    if (!guardPermission(role, Permission.REPORTS_APPROVE, res)) return;
    const { reportId } = req.params;
    const { reason } = req.body;
    const report = ReportEngine.rejectReport({ reportId, orgId, workspaceId, actorId, reason });
    res.json({ success: true, report });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

// POST /api/reports/:reportId/distribute
export async function distributeReport(req, res) {
  try {
    const { actorId, role, orgId, workspaceId } = getActorContext(req);
    if (!guardPermission(role, Permission.REPORTS_DISTRIBUTE, res)) return;
    const { reportId } = req.params;
    const { channels } = req.body;
    const result = await ReportEngine.distributeReport({ reportId, orgId, workspaceId, actorId, channels });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

// POST /api/reports/:reportId/supersede
export async function supersedeReport(req, res) {
  try {
    const { actorId, role, orgId, workspaceId } = getActorContext(req);
    if (!guardPermission(role, Permission.REPORTS_SUPERSEDE, res)) return;
    const { reportId } = req.params;
    const { reason } = req.body;
    const result = ReportEngine.supersedeReport({ reportId, orgId, workspaceId, actorId, reason });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

// GET /api/reports/:reportId/verification
export async function verifyReport(req, res) {
  try {
    const { role, orgId, workspaceId } = getActorContext(req);
    if (!guardPermission(role, Permission.REPORTS_READ, res)) return;
    const { reportId } = req.params;
    const verification = ReportEngine.verifyReport({ reportId, orgId, workspaceId });
    res.json({ success: true, verification });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

// GET /api/reports/:reportId/artifact
export async function downloadReportArtifact(req, res) {
  try {
    const { role, orgId, workspaceId, actorId } = getActorContext(req);
    if (!guardPermission(role, Permission.REPORTS_READ, res)) return;
    const { reportId } = req.params;
    const { format = 'HTML' } = req.query;
    const report = reportRepository.getReportById(reportId, workspaceId, orgId);
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
    const snapshot = report.snapshotId ? reportRepository.getSnapshotById(report.snapshotId, workspaceId, orgId) : null;

    auditRepository.appendEvent({ action: 'report.downloaded', actorId, workspaceId, resourceType: 'REPORT', resourceId: reportId, result: 'SUCCESS', metadata: { format } });

    if (format === 'PDF') {
      const pdfResult = ReportRenderer.renderPdf(report, snapshot);
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `attachment; filename="${reportId}.pdf"`);
      return res.send(pdfResult.buffer);
    }
    if (format === 'CSV') {
      const csvResult = ReportRenderer.renderCsv(report, snapshot);
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', `attachment; filename="${reportId}.csv"`);
      return res.send(csvResult.content);
    }

    // Default HTML
    const html = ReportRenderer.renderHtml(report, snapshot, { includeWatermark: report.status !== 'APPROVED' && report.status !== 'DISTRIBUTED' });
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

// GET /api/reports/:reportId/audit
export async function getReportAudit(req, res) {
  try {
    const { role, orgId, workspaceId } = getActorContext(req);
    if (!guardPermission(role, Permission.REPORTS_READ, res)) return;
    const { reportId } = req.params;
    const report = reportRepository.getReportById(reportId, workspaceId, orgId);
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
    const wsEvents = auditRepository.listEvents ? auditRepository.listEvents({ workspaceId, limit: 200 }) : [];
    const events = wsEvents.filter(e => e.resourceId === reportId || (e.metadata && e.metadata.reportId === reportId));
    res.json({ success: true, reportId, auditEvents: events || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
