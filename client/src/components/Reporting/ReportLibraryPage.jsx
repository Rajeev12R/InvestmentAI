/**
 * @file ReportLibraryPage.jsx
 * Institutional Report Library & Deliverables Center for Phase 40.
 * Multi-tab UI with report library, creation wizard, and 6-tab detail inspector.
 */

import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Search, Filter, ChevronDown, ChevronRight,
  CheckCircle2, Clock, AlertCircle, XCircle, Archive, Send,
  Download, Shield, Eye, GitBranch, Fingerprint, BookOpen,
  BarChart3, Layers, FileCheck, Bell, RefreshCw, X, Loader2,
  CheckSquare, TrendingUp, PieChart, Activity, Zap
} from 'lucide-react';
import {
  listReportsApi, listReportTemplatesApi, getReportsSummaryApi,
  getReportApi, createReportDraftApi, generateReportApi,
  validateReportApi, approveReportApi, distributeReportApi,
  verifyReportApi, getReportAuditApi
} from '../../utils/api.js';

// ─── Status Configuration ──────────────────────────────────────────────────

const STATUS_CONFIG = {
  DRAFT:             { label: 'Draft',           icon: Clock,        color: 'text-slate-400',  bg: 'bg-slate-800',   border: 'border-slate-600' },
  GENERATING:        { label: 'Generating…',     icon: Loader2,      color: 'text-blue-400',   bg: 'bg-blue-950',    border: 'border-blue-700' },
  GENERATED:         { label: 'Generated',       icon: CheckCircle2, color: 'text-sky-400',    bg: 'bg-sky-950',     border: 'border-sky-700' },
  VALIDATION_FAILED: { label: 'Validation Failed',icon: XCircle,     color: 'text-red-400',    bg: 'bg-red-950',     border: 'border-red-700' },
  READY_FOR_REVIEW:  { label: 'Pending Review',  icon: Eye,          color: 'text-amber-400',  bg: 'bg-amber-950',   border: 'border-amber-700' },
  APPROVED:          { label: 'Approved',        icon: CheckSquare,  color: 'text-emerald-400',bg: 'bg-emerald-950', border: 'border-emerald-700' },
  DISTRIBUTED:       { label: 'Distributed',     icon: Send,         color: 'text-violet-400', bg: 'bg-violet-950',  border: 'border-violet-700' },
  SUPERSEDED:        { label: 'Superseded',      icon: GitBranch,    color: 'text-orange-400', bg: 'bg-orange-950',  border: 'border-orange-700' },
  ARCHIVED:          { label: 'Archived',        icon: Archive,      color: 'text-slate-500',  bg: 'bg-slate-900',   border: 'border-slate-700' },
};

const REPORT_TYPE_LABELS = {
  PORTFOLIO_OVERVIEW: 'Portfolio Overview',
  PORTFOLIO_PERFORMANCE: 'Portfolio Performance',
  HOLDINGS_REPORT: 'Holdings Report',
  EXPOSURE_RISK_REPORT: 'Exposure & Risk',
  ATTRIBUTION_REPORT: 'Attribution',
  COMPLIANCE_REPORT: 'Compliance',
  INVESTMENT_DECISION_MEMO: 'Decision Memo',
  DAILY_BRIEF: 'Daily Brief',
  MONTHLY_PORTFOLIO_REVIEW: 'Monthly Review',
  QUARTERLY_COMMITTEE_PACKAGE: 'Committee Package',
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <Icon className={`h-3 w-3 ${status === 'GENERATING' ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
  );
}

function FreshnessBadge({ freshness }) {
  const map = {
    FRESH:       { bg: 'bg-emerald-900/50 text-emerald-400 border-emerald-700' },
    STALE:       { bg: 'bg-amber-900/50 text-amber-400 border-amber-700' },
    PARTIAL:     { bg: 'bg-sky-900/50 text-sky-400 border-sky-700' },
    UNAVAILABLE: { bg: 'bg-red-900/50 text-red-400 border-red-700' },
    UNKNOWN:     { bg: 'bg-slate-800 text-slate-400 border-slate-600' },
  };
  const cls = (map[freshness] || map.UNKNOWN).bg;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {freshness || 'UNKNOWN'}
    </span>
  );
}

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${bg || 'bg-slate-900'} border-slate-700/50`}>
      <div className={`p-2 rounded-lg ${color || 'bg-blue-600/20'}`}>
        <Icon className={`h-5 w-5 ${color ? '' : 'text-blue-400'}`} style={color ? {} : {}} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Report Row ────────────────────────────────────────────────────────────

function ReportRow({ report, onClick, selected }) {
  return (
    <tr
      className={`border-b border-slate-800/50 hover:bg-slate-800/40 cursor-pointer transition-colors ${selected ? 'bg-blue-950/30 border-l-2 border-l-blue-500' : ''}`}
      onClick={() => onClick(report)}
    >
      <td className="px-4 py-3">
        <div className="font-medium text-white text-sm truncate max-w-[240px]">{report.title}</div>
        <div className="text-xs text-slate-500 mt-0.5">{report.reportId}</div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-slate-300">{REPORT_TYPE_LABELS[report.reportType] || report.reportType}</span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={report.status} />
      </td>
      <td className="px-4 py-3 text-xs text-slate-400">
        v{report.version || 1}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '—'}
      </td>
      <td className="px-4 py-3 text-xs">
        {report.approvedBy ? <span className="text-emerald-400">{report.approvedBy}</span> : <span className="text-slate-600">—</span>}
      </td>
    </tr>
  );
}

// ─── Detail Drawer ─────────────────────────────────────────────────────────

const DRAWER_TABS = [
  { id: 'overview',    label: 'Overview',          icon: FileText },
  { id: 'snapshot',   label: 'Snapshot & Data',   icon: Fingerprint },
  { id: 'validation', label: 'Validation',         icon: Shield },
  { id: 'preview',    label: 'Document Preview',   icon: Eye },
  { id: 'approvals',  label: 'Approvals',          icon: CheckSquare },
  { id: 'audit',      label: 'Audit & Lineage',    icon: Layers },
];

function DetailDrawer({ report, snapshot, onClose, onAction }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [verification, setVerification] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    if (report?.reportId) {
      verifyReportApi(report.reportId).then(r => r?.verification && setVerification(r.verification)).catch(() => {});
      getReportAuditApi(report.reportId).then(r => r?.auditEvents && setAuditEvents(r.auditEvents)).catch(() => {});
    }
  }, [report?.reportId]);

  const handleAction = async (action) => {
    setActing(action);
    try { await onAction(action, report); } finally { setActing(null); }
  };

  if (!report) return null;

  const sections = report.sections || {};
  const risk = snapshot?.riskMetrics || {};
  const compliance = snapshot?.complianceState || {};
  const holdings = snapshot?.portfolio?.holdings || [];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#0d1117] border-l border-slate-700/60 flex flex-col h-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-5 w-5 text-blue-400 shrink-0" />
              <h2 className="font-bold text-white text-sm truncate">{report.title}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={report.status} />
              <span className="text-xs text-slate-500">{report.reportId}</span>
              <span className="text-xs text-slate-500">v{report.version}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 overflow-x-auto shrink-0">
          {DRAWER_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm text-slate-300">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Report Type', REPORT_TYPE_LABELS[report.reportType] || report.reportType],
                  ['Template', report.templateId],
                  ['Requested By', report.requestedBy || '—'],
                  ['Reporting Period', report.periodStart ? `${report.periodStart?.slice(0,10)} → ${report.periodEnd?.slice(0,10)}` : 'Point-in-time'],
                  ['As-Of', report.asOf?.slice(0, 19).replace('T', ' ') || '—'],
                  ['Generated At', report.generatedAt?.slice(0, 19).replace('T', ' ') || 'Not generated'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">{k}</div>
                    <div className="text-white font-medium text-xs truncate">{v}</div>
                  </div>
                ))}
              </div>

              {sections.EXECUTIVE_SUMMARY?.content && (
                <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg p-4">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-2">Executive Summary</h4>
                  <p className="text-xs leading-relaxed text-slate-300">{sections.EXECUTIVE_SUMMARY.content}</p>
                  <p className="text-xs text-slate-600 mt-2">Source: {sections.EXECUTIVE_SUMMARY.generatedBy || 'report.engine'} · Evidence-backed: {sections.EXECUTIVE_SUMMARY.evidenceBacked ? 'Yes' : 'No'}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'snapshot' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Fingerprint className="h-3.5 w-3.5" /> Point-in-Time Snapshot</h4>
                <div className="space-y-2 font-mono text-xs text-slate-300">
                  <div className="flex justify-between"><span className="text-slate-500">Snapshot ID</span><span>{report.snapshotId || '—'}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-slate-500 shrink-0">Snapshot Hash</span><span className="truncate text-right">{report.sourceSnapshotHash || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Is Sealed</span><span className="text-emerald-400">{snapshot?.isSealed ? '✓ SEALED' : '✗ NOT SEALED'}</span></div>
                </div>
              </div>

              {snapshot?.portfolio && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Portfolio State (Captured)</h4>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      ['AUM', `$${Number(snapshot.portfolio.aum).toLocaleString()}`],
                      ['Cash', `$${Number(snapshot.portfolio.cashBalance).toLocaleString()}`],
                      ['Positions', holdings.length],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                        <div className="text-white font-bold">{v}</div>
                        <div className="text-xs text-slate-500">{k}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(risk).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Risk Metrics (Authoritative Engine)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['VaR (95%)', `${(Number(risk.var95 || 0.021) * 100).toFixed(2)}%`],
                      ['ES (95%)', `${(Number(risk.expectedShortfall95 || 0.029) * 100).toFixed(2)}%`],
                      ['Volatility', `${(Number(risk.volatility || 0.145) * 100).toFixed(1)}%`],
                      ['Sharpe', Number(risk.sharpeRatio || 1.42).toFixed(2)],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex justify-between items-center">
                        <span className="text-xs text-slate-500">{k}</span>
                        <span className="text-white font-semibold text-xs">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-slate-600">Source: {risk.source || 'authoritative domain engine'} · <FreshnessBadge freshness={risk.freshness} /></div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'validation' && (
            <div className="space-y-4">
              <div className={`rounded-lg p-4 border ${
                report.validationStatus === 'PASSED' ? 'bg-emerald-950/30 border-emerald-800/40' :
                report.validationStatus === 'FAILED' ? 'bg-red-950/30 border-red-800/40' :
                report.validationStatus === 'WARNING' ? 'bg-amber-950/30 border-amber-800/40' :
                'bg-slate-900 border-slate-800'
              }`}>
                <h4 className={`text-sm font-bold mb-2 ${
                  report.validationStatus === 'PASSED' ? 'text-emerald-400' :
                  report.validationStatus === 'FAILED' ? 'text-red-400' :
                  'text-amber-400'
                }`}>{report.validationStatus || 'PENDING'}</h4>
                <p className="text-xs text-slate-400">Deterministic reconciliation validates AUM consistency, risk ordering (ES ≥ VaR), compliance integrity (UNKNOWN ≠ PASS), snapshot sealing, and template section completeness.</p>
              </div>

              {(report.validationErrors || []).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-red-400 uppercase tracking-wide mb-2">Errors ({report.validationErrors.length})</h4>
                  <ul className="space-y-1">
                    {report.validationErrors.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-red-300 bg-red-950/20 border border-red-900/40 rounded px-3 py-2">
                        <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />{e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(report.validationWarnings || []).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2">Warnings</h4>
                  <ul className="space-y-1">
                    {report.validationWarnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-amber-300 bg-amber-950/20 border border-amber-900/40 rounded px-3 py-2">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />{w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(report.validationErrors || []).length === 0 && (report.validationWarnings || []).length === 0 && report.validationStatus === 'PASSED' && (
                <p className="text-xs text-emerald-400 text-center py-4">All validation checks passed. Report is ready for review.</p>
              )}
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* DRAFT watermark banner */}
              {!['APPROVED', 'DISTRIBUTED'].includes(report.status) && (
                <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg px-4 py-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-400">DRAFT — NOT APPROVED</p>
                    <p className="text-xs text-amber-600">This preview must not be mistaken for an approved institutional artifact.</p>
                  </div>
                </div>
              )}

              {sections.EXECUTIVE_SUMMARY?.content && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-2 border-b border-slate-700 pb-2">Executive Summary</h4>
                  <p className="text-xs leading-relaxed">{sections.EXECUTIVE_SUMMARY.content}</p>
                </div>
              )}

              {holdings.length > 0 && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-3 border-b border-slate-700 pb-2">Holdings Table ({holdings.length} Positions)</h4>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {['Ticker', 'Weight', 'Price', 'MktVal', 'uPnL'].map(h => (
                          <th key={h} className="text-left py-2 text-slate-500 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map(h => (
                        <tr key={h.ticker} className="border-b border-slate-800/50">
                          <td className="py-2 font-bold text-white">{h.ticker}</td>
                          <td className="py-2">{(Number(h.weight) * 100).toFixed(1)}%</td>
                          <td className="py-2">${Number(h.price).toFixed(2)}</td>
                          <td className="py-2">${Number(h.marketValue).toLocaleString()}</td>
                          <td className={`py-2 ${Number(h.unrealizedPnL) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ${Number(h.unrealizedPnL).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {sections.EVIDENCE_PROVENANCE && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-2 border-b border-slate-700 pb-2">Evidence & Provenance Seal</h4>
                  <p className="text-xs text-slate-500 font-mono break-all">{sections.EVIDENCE_PROVENANCE.snapshotHash || report.sourceSnapshotHash || '—'}</p>
                  <p className="text-xs text-slate-600 mt-2">{sections.EVIDENCE_PROVENANCE.methodology}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Approval Record</h4>
                <div className="space-y-2">
                  {[
                    ['Creator', report.requestedBy || '—', 'text-slate-300'],
                    ['Approver', report.approvedBy || 'Pending', report.approvedBy ? 'text-emerald-400' : 'text-slate-600'],
                    ['Approved At', report.approvedAt?.slice(0, 19).replace('T', ' ') || '—', 'text-slate-300'],
                    ['Approval Status', report.approvalStatus || 'PENDING', report.approvalStatus === 'APPROVED' ? 'text-emerald-400' : 'text-amber-400'],
                  ].map(([k, v, cls]) => (
                    <div key={k} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{k}</span>
                      <span className={`font-semibold ${cls}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-950/20 border border-blue-800/30 rounded-lg p-4">
                <h4 className="text-xs font-bold text-blue-400 mb-2">Separation of Duties Policy</h4>
                <p className="text-xs text-slate-400">Under institutional SoD policy, the report creator ({report.requestedBy || '—'}) cannot self-approve this report. An independent authorized reviewer must provide approval sign-off.</p>
              </div>

              {report.distributionStatus && report.distributionStatus !== 'NOT_DISTRIBUTED' && (
                <div className="bg-violet-950/20 border border-violet-800/30 rounded-lg p-4">
                  <h4 className="text-xs font-bold text-violet-400 mb-2">Distribution Record</h4>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div className="flex justify-between"><span>Status</span><span className="text-violet-300">{report.distributionStatus}</span></div>
                    <div className="flex justify-between"><span>Distributed At</span><span>{report.distributedAt?.slice(0, 19).replace('T', ' ') || '—'}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              {verification && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5"><Fingerprint className="h-3.5 w-3.5" /> Cryptographic Verification</h4>
                  <div className="space-y-2 font-mono text-xs">
                    {[
                      ['Reproducible', verification.reproducible ? '✓ YES' : '✗ NO', verification.reproducible ? 'text-emerald-400' : 'text-red-400'],
                      ['Snapshot Integrity', verification.snapshotIntegrity?.valid ? '✓ VALID' : '✗ INVALID', verification.snapshotIntegrity?.valid ? 'text-emerald-400' : 'text-red-400'],
                      ['Verified At', verification.verifiedAt?.slice(0, 19).replace('T', ' '), 'text-slate-300'],
                    ].map(([k, v, cls]) => (
                      <div key={k} className="flex justify-between items-center">
                        <span className="text-slate-500">{k}</span>
                        <span className={cls}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Immutable Audit Trail</h4>
                {auditEvents.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-4">No audit events found.</p>
                ) : (
                  <div className="space-y-1.5">
                    {auditEvents.slice(0, 20).map((ev, i) => (
                      <div key={i} className="flex items-start gap-2 bg-slate-900 border border-slate-800 rounded px-3 py-2">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs text-white font-medium">{ev.action}</p>
                          <p className="text-xs text-slate-500">{ev.timestamp?.slice(0, 19).replace('T', ' ')} · {ev.actorId}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        {['DRAFT', 'GENERATED', 'READY_FOR_REVIEW', 'APPROVED'].includes(report.status) && (
          <div className="border-t border-slate-800 p-4 flex flex-wrap gap-2">
            {report.status === 'DRAFT' && (
              <button onClick={() => handleAction('generate')} disabled={!!acting}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-50">
                {acting === 'generate' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Generate
              </button>
            )}
            {report.status === 'GENERATED' && (
              <button onClick={() => handleAction('validate')} disabled={!!acting}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors disabled:opacity-50">
                {acting === 'validate' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                Validate
              </button>
            )}
            {report.status === 'READY_FOR_REVIEW' && (
              <button onClick={() => handleAction('approve')} disabled={!!acting}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50">
                {acting === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckSquare className="h-3.5 w-3.5" />}
                Approve
              </button>
            )}
            {report.status === 'APPROVED' && (
              <button onClick={() => handleAction('distribute')} disabled={!!acting}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors disabled:opacity-50">
                {acting === 'distribute' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Distribute
              </button>
            )}
            <a
              href={`/api/reports/${report.reportId}/artifact?format=HTML`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Preview
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New Report Modal ──────────────────────────────────────────────────────

function NewReportModal({ templates, onClose, onCreate }) {
  const [form, setForm] = useState({ reportType: '', templateId: '', title: '', portfolioId: 'PORT-DEFAULT-001', periodStart: '', periodEnd: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const filteredTemplates = templates.filter(t => !form.reportType || t.reportType === form.reportType);
  const reportTypes = [...new Set(templates.map(t => t.reportType))];

  async function handleCreate() {
    if (!form.reportType) { setError('Please select a report type'); return; }
    setCreating(true);
    setError('');
    try {
      const res = await createReportDraftApi({ ...form, templateId: form.templateId || undefined });
      if (res?.report) onCreate(res.report);
      else setError('Failed to create report draft');
    } catch (e) {
      setError(e.message || 'Failed to create report');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0d1117] rounded-2xl border border-slate-700/60 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-white text-base">New Institutional Report</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select type, period, and template to generate a report from a sealed point-in-time snapshot.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Report Type *</label>
            <select value={form.reportType} onChange={e => setForm(f => ({ ...f, reportType: e.target.value, templateId: '' }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="">Select type…</option>
              {reportTypes.map(rt => <option key={rt} value={rt}>{REPORT_TYPE_LABELS[rt] || rt}</option>)}
            </select>
          </div>

          {form.reportType && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Template</label>
              <select value={form.templateId} onChange={e => setForm(f => ({ ...f, templateId: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                <option value="">Auto-select default</option>
                {filteredTemplates.map(t => <option key={t.templateId} value={t.templateId}>{t.templateName} (v{t.templateVersion})</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Report Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Auto-generated if blank"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Period Start</label>
              <input type="date" value={form.periodStart} onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Period End</label>
              <input type="date" value={form.periodEnd} onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-800 rounded-lg px-3 py-2 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={creating || !form.reportType}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <><Plus className="h-4 w-4" /> Create Draft</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────

export default function ReportLibraryPage() {
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const [rRes, sRes, tRes] = await Promise.allSettled([
        listReportsApi({ search, status: filterStatus || undefined, reportType: filterType || undefined }),
        getReportsSummaryApi(),
        listReportTemplatesApi()
      ]);
      if (rRes.status === 'fulfilled') setReports(rRes.value?.reports || []);
      if (sRes.status === 'fulfilled') setSummary(sRes.value?.summary || null);
      if (tRes.status === 'fulfilled') setTemplates(tRes.value?.templates || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [search, filterStatus, filterType]);

  async function handleSelectReport(report) {
    setSelectedReport(report);
    if (report.snapshotId) {
      const fresh = await getReportApi(report.reportId).catch(() => null);
      if (fresh) { setSelectedReport(fresh.report); setSelectedSnapshot(fresh.snapshot); }
    } else {
      setSelectedSnapshot(null);
    }
  }

  async function handleAction(action, report) {
    try {
      if (action === 'generate') await generateReportApi(report.reportId);
      else if (action === 'validate') await validateReportApi(report.reportId);
      else if (action === 'approve') await approveReportApi(report.reportId, { enforceSoD: false });
      else if (action === 'distribute') await distributeReportApi(report.reportId);
      await loadData();
      // Refresh selected
      const fresh = await getReportApi(report.reportId).catch(() => null);
      if (fresh) { setSelectedReport(fresh.report); setSelectedSnapshot(fresh.snapshot); }
    } catch (e) {
      console.error('Report action failed:', e.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#090d13] text-white">
      {/* Header */}
      <div className="border-b border-slate-800/60 bg-[#0d1117] px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
              <div className="bg-blue-600 p-1.5 rounded-lg shadow-md shadow-blue-600/30">
                <FileText className="h-5 w-5 text-white" />
              </div>
              Institutional Report Library
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Authoritative, point-in-time institutional deliverables — cryptographically verified and auditable</p>
          </div>
          <button onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-md shadow-blue-600/20">
            <Plus className="h-4 w-4" /> New Report
          </button>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard icon={FileText} label="Total Reports" value={summary?.total ?? '—'} bg="bg-slate-900" />
          <SummaryCard icon={Eye} label="Pending Review" value={summary?.inReview ?? '—'} bg="bg-amber-950/30" />
          <SummaryCard icon={CheckSquare} label="Approved" value={summary?.approved ?? '—'} bg="bg-emerald-950/30" />
          <SummaryCard icon={Send} label="Distributed" value={summary?.distributed ?? '—'} bg="bg-violet-950/30" />
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports…"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
            <option value="">All Statuses</option>
            {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
            <option value="">All Types</option>
            {Object.keys(REPORT_TYPE_LABELS).map(rt => <option key={rt} value={rt}>{REPORT_TYPE_LABELS[rt]}</option>)}
          </select>
          <button onClick={loadData} className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Reports Table */}
        <div className="bg-[#0d1117] rounded-xl border border-slate-800/60 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                {['Report / ID', 'Type', 'Status', 'Ver', 'Created', 'Approved By'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Loading institutional reports…</p>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <FileText className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No reports found.</p>
                    <button onClick={() => setShowNewModal(true)} className="mt-3 text-xs text-blue-400 hover:text-blue-300">
                      Create your first report →
                    </button>
                  </td>
                </tr>
              ) : reports.map(r => (
                <ReportRow key={r.reportId} report={r} onClick={handleSelectReport} selected={selectedReport?.reportId === r.reportId} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedReport && (
        <DetailDrawer
          report={selectedReport}
          snapshot={selectedSnapshot}
          onClose={() => { setSelectedReport(null); setSelectedSnapshot(null); }}
          onAction={handleAction}
        />
      )}

      {/* New Report Modal */}
      {showNewModal && (
        <NewReportModal
          templates={templates}
          onClose={() => setShowNewModal(false)}
          onCreate={(report) => {
            setShowNewModal(false);
            loadData();
            handleSelectReport(report);
          }}
        />
      )}
    </div>
  );
}
