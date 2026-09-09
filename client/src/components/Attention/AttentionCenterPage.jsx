/**
 * @file AttentionCenterPage.jsx
 * Institutional Attention Center & Alert Operations for Phase 39.
 * Provides prioritized alert queues, lifecycle actions (Acknowledge, Snooze, Resolve, Escalate), and deep drill-downs.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import {
  listAlertsApi,
  getAlertCountsApi,
  getAlertByIdApi,
  acknowledgeAlertApi,
  snoozeAlertApi,
  resolveAlertApi,
  reopenAlertApi,
  escalateAlertApi
} from '../../utils/api.js';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import Modal from '../ui/Modal.jsx';
import Drawer from '../ui/Drawer.jsx';
import StateView, { StateType } from '../ui/StateView.jsx';
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  Flame,
  ArrowRight,
  Sliders,
  Database,
  Layers,
  FileCheck,
  UserCheck,
  History,
  Info
} from 'lucide-react';

export const AttentionCenterPage = () => {
  const navigate = useNavigate();
  const { activeWorkspaceId, activeWorkspaceMeta } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState(null);

  // Filters & Tabs
  const [activeScope, setActiveScope] = useState('ALL'); // ALL | MY | SNOOZED | RESOLVED | ESCALATED
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // Active Alert for Actions / Detail Drawer
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionModal, setActionModal] = useState(null); // 'ACKNOWLEDGE' | 'SNOOZE' | 'RESOLVE' | 'ESCALATE'
  const [actionComment, setActionComment] = useState('');
  const [snoozeDurationHours, setSnoozeDurationHours] = useState(4);
  const [resolutionReason, setResolutionReason] = useState('PORTFOLIO_REBALANCED');
  const [escalationRole, setEscalationRole] = useState('PORTFOLIO_MANAGER');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [alertsRes, countsRes] = await Promise.all([
        listAlertsApi({
          workspaceId: activeWorkspaceId,
          scope: activeScope,
          severity: selectedSeverity !== 'ALL' ? selectedSeverity : null,
          query: searchTerm || null,
          page,
          limit: 50
        }),
        getAlertCountsApi({ workspaceId: activeWorkspaceId })
      ]);

      if (alertsRes?.data?.alerts) {
        setAlerts(alertsRes.data.alerts);
      }
      if (countsRes?.data) {
        setCounts(countsRes.data);
      }
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to load attention center alerts');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeWorkspaceId, activeScope, selectedSeverity, searchTerm, page]);

  const handleOpenDetail = async (alert) => {
    setDetailLoading(true);
    try {
      const res = await getAlertByIdApi(alert.alertId);
      if (res?.data) {
        setSelectedAlert(res.data);
      } else {
        setSelectedAlert(alert);
      }
    } catch {
      setSelectedAlert(alert);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedAlert) return;
    setActionSubmitting(true);
    try {
      await acknowledgeAlertApi(selectedAlert.alertId, {
        comment: actionComment,
        expectedVersion: selectedAlert.version
      });
      setActionModal(null);
      setActionComment('');
      await loadData();
      if (selectedAlert) {
        handleOpenDetail(selectedAlert);
      }
    } catch (err) {
      alert(`Acknowledgement failed: ${err.message}`);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleSnooze = async () => {
    if (!selectedAlert) return;
    setActionSubmitting(true);
    try {
      const snoozeUntil = new Date(Date.now() + snoozeDurationHours * 3600 * 1000).toISOString();
      await snoozeAlertApi(selectedAlert.alertId, {
        snoozeUntil,
        reason: actionComment || `Snoozed for ${snoozeDurationHours} hours`,
        expectedVersion: selectedAlert.version
      });
      setActionModal(null);
      setActionComment('');
      await loadData();
      if (selectedAlert) {
        handleOpenDetail(selectedAlert);
      }
    } catch (err) {
      alert(`Snooze failed: ${err.message}`);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedAlert) return;
    setActionSubmitting(true);
    try {
      await resolveAlertApi(selectedAlert.alertId, {
        resolutionReason,
        resolutionComment: actionComment,
        expectedVersion: selectedAlert.version
      });
      setActionModal(null);
      setActionComment('');
      await loadData();
      if (selectedAlert) {
        handleOpenDetail(selectedAlert);
      }
    } catch (err) {
      alert(`Resolution failed: ${err.message}`);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleEscalate = async () => {
    if (!selectedAlert) return;
    setActionSubmitting(true);
    try {
      await escalateAlertApi(selectedAlert.alertId, {
        escalationReason: actionComment || 'Manual operator escalation',
        escalatedToRole: escalationRole,
        expectedVersion: selectedAlert.version
      });
      setActionModal(null);
      setActionComment('');
      await loadData();
      if (selectedAlert) {
        handleOpenDetail(selectedAlert);
      }
    } catch (err) {
      alert(`Escalation failed: ${err.message}`);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReopen = async (alert) => {
    try {
      await reopenAlertApi(alert.alertId, {
        reason: 'Operator manual reopen',
        expectedVersion: alert.version
      });
      await loadData();
      if (selectedAlert?.alertId === alert.alertId) {
        handleOpenDetail(alert);
      }
    } catch (err) {
      alert(`Reopen failed: ${err.message}`);
    }
  };

  const getSeverityBadgeVariant = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'BREACH';
      case 'ACTION_REQUIRED': return 'WARNING';
      case 'ATTENTION': return 'INFO';
      default: return 'NEUTRAL';
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'OPEN': return 'WARNING';
      case 'ACKNOWLEDGED': return 'INFO';
      case 'SNOOZED': return 'STALE';
      case 'RESOLVED': return 'OK';
      default: return 'NEUTRAL';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Executive Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Institutional Attention Center
            </h1>
            <Badge variant="OK" size="xs" dot>
              {activeWorkspaceMeta?.name || 'Primary Workspace'}
            </Badge>
            <Badge variant="PROVENANCE" size="xs">
              PHASE 39 OPERATIONAL
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centralized institutional alert routing, deduplication, human acknowledgement, and resolution workflows
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={loadData}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Sliders}
            onClick={() => navigate('/app/overview')}
          >
            Cockpit Overview
          </Button>
        </div>
      </div>

      {/* 2. Priority Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3.5">
        <button
          onClick={() => { setActiveScope('ALL'); setSelectedSeverity('ALL'); }}
          className={`p-3.5 rounded-xl border text-left transition-all bg-white hover:border-blue-300 ${activeScope === 'ALL' && selectedSeverity === 'ALL' ? 'ring-2 ring-blue-500 border-blue-500 shadow-xs' : 'border-slate-200 shadow-2xs'}`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Active Backlog
          </span>
          <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
            {counts?.activeCount || 0}
          </div>
          <span className="text-[10px] text-slate-500 block">Open + Ack</span>
        </button>

        <button
          onClick={() => { setActiveScope('ALL'); setSelectedSeverity('CRITICAL'); }}
          className={`p-3.5 rounded-xl border text-left transition-all bg-white hover:border-rose-300 ${selectedSeverity === 'CRITICAL' ? 'ring-2 ring-rose-500 border-rose-500 shadow-xs' : 'border-slate-200 shadow-2xs'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
              Critical
            </span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <div className="text-lg font-bold text-rose-700 font-mono mt-0.5">
            {counts?.bySeverity?.CRITICAL || 0}
          </div>
          <span className="text-[10px] text-slate-500 block">Mandate Breaches</span>
        </button>

        <button
          onClick={() => { setActiveScope('ALL'); setSelectedSeverity('ACTION_REQUIRED'); }}
          className={`p-3.5 rounded-xl border text-left transition-all bg-white hover:border-amber-300 ${selectedSeverity === 'ACTION_REQUIRED' ? 'ring-2 ring-amber-500 border-amber-500 shadow-xs' : 'border-slate-200 shadow-2xs'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
              Action Req
            </span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="text-lg font-bold text-amber-700 font-mono mt-0.5">
            {counts?.bySeverity?.ACTION_REQUIRED || 0}
          </div>
          <span className="text-[10px] text-slate-500 block">High Materiality</span>
        </button>

        <button
          onClick={() => { setActiveScope('ALL'); setSelectedSeverity('ATTENTION'); }}
          className={`p-3.5 rounded-xl border text-left transition-all bg-white hover:border-blue-300 ${selectedSeverity === 'ATTENTION' ? 'ring-2 ring-blue-500 border-blue-500 shadow-xs' : 'border-slate-200 shadow-2xs'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
              Attention
            </span>
            <Bell className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="text-lg font-bold text-blue-700 font-mono mt-0.5">
            {counts?.bySeverity?.ATTENTION || 0}
          </div>
          <span className="text-[10px] text-slate-500 block">Under Review</span>
        </button>

        <button
          onClick={() => { setActiveScope('SNOOZED'); setSelectedSeverity('ALL'); }}
          className={`p-3.5 rounded-xl border text-left transition-all bg-white hover:border-slate-300 ${activeScope === 'SNOOZED' ? 'ring-2 ring-purple-500 border-purple-500 shadow-xs' : 'border-slate-200 shadow-2xs'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
              Snoozed
            </span>
            <Clock className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <div className="text-lg font-bold text-purple-700 font-mono mt-0.5">
            {counts?.byStatus?.SNOOZED || 0}
          </div>
          <span className="text-[10px] text-slate-500 block">Temporary Cooldown</span>
        </button>

        <button
          onClick={() => { setActiveScope('RESOLVED'); setSelectedSeverity('ALL'); }}
          className={`p-3.5 rounded-xl border text-left transition-all bg-white hover:border-emerald-300 ${activeScope === 'RESOLVED' ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-xs' : 'border-slate-200 shadow-2xs'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
              Resolved
            </span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
            {counts?.byStatus?.RESOLVED || 0}
          </div>
          <span className="text-[10px] text-slate-500 block">Historical Audit</span>
        </button>
      </div>

      {/* 3. Scope Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Workspace Attention' },
            { id: 'MY', label: 'My Attention Queue' },
            { id: 'SNOOZED', label: 'Snoozed' },
            { id: 'RESOLVED', label: 'Resolved Archive' },
            { id: 'ESCALATED', label: 'Escalated Items' }
          ].map(scope => (
            <button
              key={scope.id}
              onClick={() => setActiveScope(scope.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeScope === scope.id ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {scope.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by title, ticker, ID..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none shrink-0"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="ACTION_REQUIRED">Action Required</option>
            <option value="ATTENTION">Attention</option>
            <option value="INFORMATION">Information</option>
          </select>
        </div>
      </div>

      {/* 4. Alert Cards List */}
      {loading ? (
        <StateView
          type={StateType.LOADING}
          title="Aggregating Attention Center"
          message="Loading persistent alerts, deduplication state, and operational lineage..."
        />
      ) : alerts.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Attention Items in this View</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All material mandate rules, concentration bounds, and decision workflows are in a normal operational state.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.alertId}
              className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-slate-50 text-slate-600 shrink-0 mt-0.5">
                  {alert.severity === 'CRITICAL' ? (
                    <ShieldAlert className="h-5 w-5 text-rose-600" />
                  ) : alert.severity === 'ACTION_REQUIRED' ? (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Bell className="h-5 w-5 text-blue-500" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-bold text-slate-900">{alert.title}</h3>
                    <Badge variant={getSeverityBadgeVariant(alert.severity)} size="xs">
                      {alert.severity}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(alert.status)} size="xs">
                      {alert.status}
                    </Badge>
                    <Badge variant="NEUTRAL" size="xs">
                      v{alert.version}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {alert.description}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                    <span>Source: <strong className="text-slate-600">{alert.sourceDomain}</strong></span>
                    <span>•</span>
                    <span>As-Of: <strong className="text-slate-600">{new Date(alert.asOf).toLocaleTimeString()}</strong></span>
                    {alert.affectedEntities?.portfolioName && (
                      <>
                        <span>•</span>
                        <span>Portfolio: <strong className="text-slate-600">{alert.affectedEntities.portfolioName}</strong></span>
                      </>
                    )}
                    {alert.affectedEntities?.ticker && (
                      <>
                        <span>•</span>
                        <span>Ticker: <strong className="text-slate-600">{alert.affectedEntities.ticker}</strong></span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Trigger Buttons */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {alert.status === 'OPEN' && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => { setSelectedAlert(alert); setActionModal('ACKNOWLEDGE'); }}
                  >
                    Acknowledge
                  </Button>
                )}

                {alert.status !== 'RESOLVED' && alert.status !== 'EXPIRED' && (
                  <>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => { setSelectedAlert(alert); setActionModal('SNOOZE'); }}
                    >
                      Snooze
                    </Button>
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => { setSelectedAlert(alert); setActionModal('RESOLVE'); }}
                    >
                      Resolve
                    </Button>
                  </>
                )}

                {alert.status === 'RESOLVED' && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleReopen(alert)}
                  >
                    Reopen
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleOpenDetail(alert)}
                >
                  Details →
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Detail Drawer */}
      {selectedAlert && !actionModal && (
        <Drawer
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          title={`Alert: ${selectedAlert.alertId}`}
          subtitle={selectedAlert.title}
          size="lg"
        >
          <div className="space-y-6 text-xs">
            {/* Top Status Banner */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Status</span>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(selectedAlert.status)} size="sm">
                    {selectedAlert.status}
                  </Badge>
                  <Badge variant={getSeverityBadgeVariant(selectedAlert.severity)} size="sm">
                    {selectedAlert.severity}
                  </Badge>
                  <Badge variant="NEUTRAL" size="sm">
                    VERSION {selectedAlert.version}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Deduplication Key</span>
                <span className="font-mono text-[10px] text-slate-600 block mt-1">{selectedAlert.dedupKey}</span>
              </div>
            </div>

            {/* Description & What/Why */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Condition & Impact</h4>
              <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                {selectedAlert.description}
              </p>
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 text-blue-900">
                <strong>Recommended Action:</strong> {selectedAlert.recommendedNextAction}
              </div>
            </div>

            {/* Affected Entities & Deep Links */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Affected Operating Entities</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Portfolio</span>
                  <span className="font-bold text-slate-800 block mt-0.5">
                    {selectedAlert.affectedEntities?.portfolioName || 'General Mandate'}
                  </span>
                  {selectedAlert.portfolioId && (
                    <Link
                      to={`/app/portfolios/${selectedAlert.portfolioId}`}
                      className="text-[10px] text-blue-600 hover:underline mt-1 block"
                    >
                      Open Portfolio OS →
                    </Link>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Security</span>
                  <span className="font-bold text-slate-800 block mt-0.5">
                    {selectedAlert.affectedEntities?.securityName || selectedAlert.securityId || 'Multi-Asset'}
                  </span>
                  {selectedAlert.securityId && (
                    <Link
                      to={`/app/research/company/${selectedAlert.securityId}`}
                      className="text-[10px] text-blue-600 hover:underline mt-1 block"
                    >
                      Open Research Dossier →
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Evidence & Provenance */}
            {selectedAlert.evidenceReferences?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Evidence References</h4>
                <div className="space-y-2">
                  {selectedAlert.evidenceReferences.map((ev, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                        <span>{ev.id}</span>
                        <Badge variant="NEUTRAL" size="xs">{ev.type}</Badge>
                      </div>
                      <p className="text-slate-800">{ev.claim}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Operational History / Audit Timeline */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Operational Lifecycle History</h4>
              <div className="divide-y divide-slate-100 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {(selectedAlert.history || []).map((h, idx) => (
                  <div key={idx} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{h.action}</span>
                      <span className="text-slate-400 text-[10px] block">Actor: {h.actorId}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(h.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Footer inside Drawer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionModal('ESCALATE')}
              >
                Escalate SLA
              </Button>

              <div className="flex items-center gap-2">
                {selectedAlert.status === 'OPEN' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActionModal('ACKNOWLEDGE')}
                  >
                    Acknowledge
                  </Button>
                )}
                {selectedAlert.status !== 'RESOLVED' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActionModal('RESOLVE')}
                  >
                    Resolve Alert
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {/* 6. Action Modals (Acknowledge, Snooze, Resolve, Escalate) */}
      {actionModal && selectedAlert && (
        <Modal
          isOpen={!!actionModal}
          onClose={() => setActionModal(null)}
          title={
            actionModal === 'ACKNOWLEDGE' ? 'Acknowledge Institutional Alert' :
            actionModal === 'SNOOZE' ? 'Snooze Alert & Configure Cooldown' :
            actionModal === 'RESOLVE' ? 'Resolve Material Attention Condition' :
            'Escalate Alert to Leadership'
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Target: <strong className="text-slate-800">{selectedAlert.title}</strong>
            </p>

            {actionModal === 'SNOOZE' && (
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Snooze Duration</label>
                <select
                  value={snoozeDurationHours}
                  onChange={(e) => setSnoozeDurationHours(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value={1}>1 Hour</option>
                  <option value={4}>4 Hours</option>
                  <option value={24}>24 Hours (Next Day)</option>
                  <option value={72}>72 Hours (Weekend Cooldown)</option>
                </select>
              </div>
            )}

            {actionModal === 'RESOLVE' && (
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Resolution Category</label>
                <select
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="PORTFOLIO_REBALANCED">Portfolio Allocation Rebalanced</option>
                  <option value="MANDATE_EXCEPTION_APPROVED">Mandate Limit Exception Authorized</option>
                  <option value="DECISION_AUTHORIZED">Decision Authorization Granted</option>
                  <option value="MARKET_NORMALIZED">Market Volatility Normalized</option>
                  <option value="FALSE_POSITIVE">Non-Material / Model Re-calibrated</option>
                  <option value="OTHER">Other Operational Action</option>
                </select>
              </div>
            )}

            {actionModal === 'ESCALATE' && (
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Target Role</label>
                <select
                  value={escalationRole}
                  onChange={(e) => setEscalationRole(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="PORTFOLIO_MANAGER">Portfolio Manager</option>
                  <option value="RISK_OFFICER">Risk Officer</option>
                  <option value="COMPLIANCE_AUDITOR">Compliance Auditor</option>
                  <option value="ORG_ADMIN">Organization Admin</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Operational Comment</label>
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder="Document rationale, audit trail notes, or exception IDs..."
                rows={3}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionModal(null)}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="sm"
                disabled={actionSubmitting}
                onClick={
                  actionModal === 'ACKNOWLEDGE' ? handleAcknowledge :
                  actionModal === 'SNOOZE' ? handleSnooze :
                  actionModal === 'RESOLVE' ? handleResolve :
                  handleEscalate
                }
              >
                {actionSubmitting ? 'Saving...' : 'Confirm Action'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AttentionCenterPage;
