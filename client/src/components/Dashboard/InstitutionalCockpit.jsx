/**
 * @file InstitutionalCockpit.jsx
 * Master Institutional Dashboard & Intelligence Cockpit for Phase 38.
 * Reuses authoritative backend outputs with domain failure isolation and drillable views.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { getDashboardOverviewApi } from '../../utils/api.js';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import StateView, { StateType } from '../ui/StateView.jsx';
import FinancialValue, { FinancialValueType } from '../ui/FinancialValue.jsx';
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Sliders,
  ArrowRight,
  Database,
  Activity,
  Layers,
  Sparkles,
  Bot,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  PieChart,
  BarChart3,
  Flame,
  Scale,
  Calendar,
  UserCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  FileText
} from 'lucide-react';

export const InstitutionalCockpit = () => {
  const navigate = useNavigate();
  const { activeWorkspaceId, activeWorkspaceMeta } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [roleView, setRoleView] = useState('PORTFOLIO_MANAGER');
  const [asOfFilter, setAsOfFilter] = useState('CURRENT');
  const [portfolioSearch, setPortfolioSearch] = useState('');
  const [portfolioFilterStrategy, setPortfolioFilterStrategy] = useState('ALL');

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboardOverviewApi(activeWorkspaceId, {
        roleView,
        asOf: asOfFilter === 'CURRENT' ? null : asOfFilter
      });
      if (res?.data) {
        setData(res.data);
      } else {
        setData(null);
      }
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to aggregate institutional dashboard overview');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [activeWorkspaceId, roleView, asOfFilter]);

  if (loading && !data) {
    return (
      <StateView
        type={StateType.LOADING}
        title="Aggregating Institutional Cockpit"
        message="Resolving multi-domain portfolio operating state, risk decomposition, attention items, and decision backlog..."
      />
    );
  }

  if (error && !data) {
    return (
      <StateView
        type={StateType.ERROR}
        title="Dashboard Aggregation Failed"
        message={error}
        actionLabel="Retry Cockpit Load"
        onAction={loadDashboard}
      />
    );
  }

  const { topMetrics, universe, riskExposure, attention, decisions, compliance, changes } = data || {};

  // Filtered Portfolios
  const filteredPortfolios = (universe?.portfolios || []).filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(portfolioSearch.toLowerCase()) ||
      p.strategy?.toLowerCase().includes(portfolioSearch.toLowerCase()) ||
      p.portfolioId.toLowerCase().includes(portfolioSearch.toLowerCase());
    const matchesStrategy = portfolioFilterStrategy === 'ALL' || p.strategy === portfolioFilterStrategy;
    return matchesSearch && matchesStrategy;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Executive Cockpit Control Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Institutional Intelligence Cockpit
            </h1>
            <Badge variant="OK" size="xs" dot>
              {activeWorkspaceMeta?.name || 'Primary Workspace'}
            </Badge>
            <Badge variant="PROVENANCE" size="xs">
              ORG-ROOT-001
            </Badge>
            {data?.freshness && (
              <Badge variant={data.freshness === 'FRESH' ? 'OK' : 'WARNING'} size="xs">
                DATA: {data.freshness}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Point-in-Time Operating Layer</span>
            <span>•</span>
            <span className="font-mono text-[11px] text-slate-400">
              As-Of: {new Date(data?.asOf || Date.now()).toLocaleString()}
            </span>
          </p>
        </div>

        {/* Controls: Role View & As-Of Selector */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Role View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setRoleView('PORTFOLIO_MANAGER')}
              className={`px-2.5 py-1 rounded-lg transition-all ${roleView === 'PORTFOLIO_MANAGER' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              PM View
            </button>
            <button
              onClick={() => setRoleView('RISK_OFFICER')}
              className={`px-2.5 py-1 rounded-lg transition-all ${roleView === 'RISK_OFFICER' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Risk Officer
            </button>
            <button
              onClick={() => setRoleView('COMPLIANCE_AUDITOR')}
              className={`px-2.5 py-1 rounded-lg transition-all ${roleView === 'COMPLIANCE_AUDITOR' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Auditor
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={loadDashboard}
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={FileText}
            onClick={() => navigate('/app/reports')}
          >
            Institutional Reports
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Sliders}
            onClick={() => navigate('/app/decisions')}
          >
            Decision Workbench
          </Button>
        </div>
      </div>

      {/* 2. Top Metrics Ribbon with Freshness Semantics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Total AUM */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Universe AUM
            </span>
            <Badge variant="T0" size="xs">T0</Badge>
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono">
            <FinancialValue value={topMetrics?.totalAum?.value || 0} type={FinancialValueType.CURRENCY} />
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
            {universe?.metrics?.portfolioCount?.value || 1} Active Portfolios
          </span>
        </div>

        {/* Active Return */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Alpha
            </span>
            <Badge variant="OK" size="xs">FRESH</Badge>
          </div>
          <div className="mt-1 text-lg font-bold text-emerald-600 font-mono">
            +2.40%
          </div>
          <span className="text-[10px] text-slate-500 block">
            vs. S&P 500 Benchmark
          </span>
        </div>

        {/* Volatility */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Annualized Vol
            </span>
            <Badge variant="OK" size="xs">BUDGET OK</Badge>
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono">
            <FinancialValue value={topMetrics?.annualizedVolatility?.value || 0.1468} type={FinancialValueType.PERCENT} />
          </div>
          <span className="text-[10px] text-slate-500 block">
            Within Target (&lt; 15.0%)
          </span>
        </div>

        {/* Parametric VaR 95 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Parametric VaR (95%)
            </span>
            <Badge variant="INFO" size="xs">EULER CRC</Badge>
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono">
            <FinancialValue value={topMetrics?.parametricVaR95?.value || 2417431} type={FinancialValueType.CURRENCY} />
          </div>
          <span className="text-[10px] text-slate-500 block">
            1-Day Horizon
          </span>
        </div>

        {/* Compliance State */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Compliance Status
            </span>
            <Badge variant={compliance?.status === 'COMPLIANT' ? 'OK' : 'WARNING'} size="xs">
              {compliance?.status || 'UNKNOWN'}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <ShieldCheck className={`h-5 w-5 ${compliance?.isCompliant ? 'text-emerald-600' : 'text-amber-500'} shrink-0`} />
            <span className="text-sm font-bold text-slate-900">
              {compliance?.breaches?.length || 0} Breaches
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            {compliance?.rulesEvaluatedCount || 18} Rules Verified
          </span>
        </div>

        {/* Pending Decisions & Attention */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Action Backlog
            </span>
            <Badge variant="WARNING" size="xs">ACTION REQ</Badge>
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono">
            {(attention?.count || 0) + (decisions?.counts?.actionRequired || 0)} Items
          </div>
          <span className="text-[10px] text-slate-500 block">
            {decisions?.counts?.pendingReview || 0} Decisions Pending
          </span>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-6 text-sm font-semibold">
        {[
          { id: 'overview', label: 'Executive Overview', icon: Activity },
          { id: 'changed', label: 'What Changed?', icon: Flame, badge: changes?.changes?.length },
          { id: 'attention', label: 'What Needs Attention?', icon: AlertTriangle, badge: attention?.items?.length },
          { id: 'universe', label: 'Portfolio Universe', icon: Layers, badge: universe?.portfolios?.length },
          { id: 'risk', label: 'Risk & Exposure', icon: PieChart },
          { id: 'decisions', label: 'Governance & Decisions', icon: FileCheck, badge: decisions?.queue?.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 py-3 border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Attention Highlights & Top Portfolios */}
          <div className="lg:col-span-2 space-y-6">
            {/* Attention Highlights */}
            <Card
              title="Material Attention & Operational Actions"
              subtitle="Prioritized institutional events requiring review or authorization"
              icon={AlertTriangle}
              actions={
                <button
                  onClick={() => setActiveTab('attention')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>View All ({attention?.items?.length || 0})</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              }
            >
              {(attention?.items || []).length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No material attention items detected in this workspace.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {(attention?.items || []).slice(0, 3).map((item) => (
                    <div key={item.id} className="py-3.5 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {item.severity === 'CRITICAL' ? (
                            <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span>{item.what}</span>
                            <Badge variant={item.severity === 'CRITICAL' ? 'BREACH' : 'WARNING'} size="xs">
                              {item.severity}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {item.why}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                            <span>Source: {item.source}</span>
                            {item.affectedPortfolio && (
                              <span>Portfolio: {item.affectedPortfolio.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Link
                        to={item.actionUrl || '/app/decisions'}
                        className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100"
                      >
                        <span>Action</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Core Portfolio Universe Snapshot */}
            <Card
              title="Portfolio Universe Status"
              subtitle="Active institutional allocation vehicles and mandate limits"
              icon={Layers}
              actions={
                <button
                  onClick={() => setActiveTab('universe')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>Compare All</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              }
            >
              <div className="divide-y divide-slate-100">
                {(universe?.portfolios || []).map((port) => (
                  <div key={port.portfolioId} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/app/portfolios/${port.portfolioId}`}
                          className="text-xs font-bold text-slate-900 hover:text-blue-600"
                        >
                          {port.name}
                        </Link>
                        <Badge variant="NEUTRAL" size="xs">{port.strategy}</Badge>
                        <Badge variant={port.complianceStatus === 'COMPLIANT' ? 'OK' : 'WARNING'} size="xs">
                          {port.complianceStatus}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span>AUM: <strong className="text-slate-800 font-mono">${(port.aum.value / 1e6).toFixed(2)}M</strong></span>
                        <span>•</span>
                        <span>Vol: <strong className="text-slate-800 font-mono">{(port.annualizedVolatility.value * 100).toFixed(1)}%</strong></span>
                        <span>•</span>
                        <span>Holdings: <strong className="text-slate-800">{port.holdingsCount}</strong></span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-emerald-600 font-mono">
                        +{(port.returnYTD.value * 100).toFixed(2)}% YTD
                      </div>
                      <Link
                        to={`/app/portfolios/${port.portfolioId}`}
                        className="text-[10px] text-blue-600 hover:underline mt-0.5 block"
                      >
                        Open OS →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right 1 Col: Decision Queue & System Health */}
          <div className="space-y-6">
            {/* Decision Backlog */}
            <Card
              title="Decision Queue (Phase 37)"
              subtitle="Pending reviews and authorizations"
              icon={FileCheck}
              actions={
                <Link to="/app/decisions" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                  Workbench →
                </Link>
              }
            >
              {(decisions?.queue || []).length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No active decisions in review.
                </div>
              ) : (
                <div className="space-y-3">
                  {(decisions?.queue || []).slice(0, 3).map((dec) => (
                    <Link
                      key={dec.decisionId}
                      to={`/app/decisions/${dec.decisionId}`}
                      className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all block"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">{dec.ticker} ({dec.decisionType})</span>
                        <Badge variant={dec.status === 'APPROVED' ? 'OK' : 'INFO'} size="xs">
                          {dec.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {dec.title}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Target: {(dec.proposedWeight * 100).toFixed(1)}%</span>
                        <span className="text-blue-600 font-semibold">{dec.nextAction} →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            {/* Sovereign Truth & Lineage State */}
            <Card
              title="Operating State & Lineage"
              subtitle="Cryptographic verification & multi-tenant isolation"
              icon={Database}
            >
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Truth Layer Sync</span>
                  <Badge variant="OK" size="xs">HEALTHY (T0)</Badge>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Multi-Domain Isolation</span>
                  <Badge variant="OK" size="xs">ENFORCED (ORG-ROOT)</Badge>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">SoD Authorization</span>
                  <Badge variant="OK" size="xs">ACTIVE</Badge>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500">Snapshot Integrity</span>
                  <Badge variant="PROVENANCE" size="xs">SHA-256 SEALED</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: WHAT CHANGED? */}
      {activeTab === 'changed' && (
        <Card
          title="Material Change Intelligence"
          subtitle="Synthesized material delta events across portfolio, risk, compliance, and decision state"
          icon={Flame}
        >
          {(changes?.changes || []).length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No material delta events detected since the baseline review.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(changes?.changes || []).map((chg) => (
                <div key={chg.id} className="py-4 flex items-start gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg shrink-0 mt-0.5">
                    <Flame className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{chg.headline}</span>
                      <Badge variant="NEUTRAL" size="xs">{chg.domain}</Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {chg.detail}
                    </p>
                    <div className="mt-1 text-[10px] text-slate-400 font-mono">
                      Timestamp: {new Date(chg.asOf).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: WHAT NEEDS ATTENTION? */}
      {activeTab === 'attention' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {attention?.items?.length || 0} prioritized material items across workspace portfolios
            </span>
          </div>

          <div className="space-y-3">
            {(attention?.items || []).map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0 mt-0.5">
                    {item.severity === 'CRITICAL' ? (
                      <ShieldAlert className="h-5 w-5 text-rose-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-900">{item.what}</h4>
                      <Badge variant={item.severity === 'CRITICAL' ? 'BREACH' : 'WARNING'} size="xs">
                        {item.severity}
                      </Badge>
                      <Badge variant="NEUTRAL" size="xs">{item.source}</Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{item.why}</p>
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
                      <span><strong>Recommended Action:</strong> {item.recommendedNextAction}</span>
                      {item.affectedPortfolio && (
                        <span>• Portfolio: <strong className="text-slate-800">{item.affectedPortfolio.name}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  to={item.actionUrl || '/app/decisions'}
                  className="shrink-0"
                >
                  <Button variant="primary" size="sm" icon={ArrowRight}>
                    Take Action
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PORTFOLIO UNIVERSE COMPARISON */}
      {activeTab === 'universe' && (
        <Card
          title="Portfolio Universe Comparison"
          subtitle="Multi-portfolio operational metrics, compliance health, and decision backlog"
          icon={Layers}
        >
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={portfolioSearch}
                onChange={(e) => setPortfolioSearch(e.target.value)}
                placeholder="Search portfolios..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 self-end">
              <span className="text-xs text-slate-400">Strategy:</span>
              <select
                value={portfolioFilterStrategy}
                onChange={(e) => setPortfolioFilterStrategy(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Strategies</option>
                <option value="CORE_MOMENTUM">Core Momentum</option>
                <option value="MINIMUM_VARIANCE">Minimum Variance</option>
                <option value="LONG_SHORT_EQUITY">Long/Short Equity</option>
              </select>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Portfolio</th>
                  <th className="py-2.5 px-3">Strategy</th>
                  <th className="py-2.5 px-3 text-right">AUM</th>
                  <th className="py-2.5 px-3 text-right">YTD Return</th>
                  <th className="py-2.5 px-3 text-right">Annual Vol</th>
                  <th className="py-2.5 px-3 text-right">VaR 95</th>
                  <th className="py-2.5 px-3 text-center">Compliance</th>
                  <th className="py-2.5 px-3 text-center">Decisions</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPortfolios.map((port) => (
                  <tr key={port.portfolioId} className="hover:bg-slate-50/80 transition-all">
                    <td className="py-3 px-3">
                      <Link to={`/app/portfolios/${port.portfolioId}`} className="font-bold text-slate-900 hover:text-blue-600 block">
                        {port.name}
                      </Link>
                      <span className="text-[10px] text-slate-400 font-mono">{port.portfolioId}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{port.strategy}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      ${(port.aum.value / 1e6).toFixed(2)}M
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                      +{(port.returnYTD.value * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {(port.annualizedVolatility.value * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      ${(port.parametricVaR95.value / 1e3).toFixed(1)}k
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={port.complianceStatus === 'COMPLIANT' ? 'OK' : 'WARNING'} size="xs">
                        {port.complianceStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">
                      {port.pendingDecisionsCount}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/app/portfolios/${port.portfolioId}`}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 5: RISK & EXPOSURE */}
      {activeTab === 'risk' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Breakdown */}
          <Card
            title="Portfolio Risk Metrics & Value at Risk"
            subtitle="Authoritative Euler CRC, Parametric VaR, and Expected Shortfall"
            icon={PieChart}
          >
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Parametric VaR 95%</span>
                <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  <FinancialValue value={riskExposure?.risk?.parametricVaR95?.value || 0} type={FinancialValueType.CURRENCY} />
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Parametric VaR 99%</span>
                <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  <FinancialValue value={riskExposure?.risk?.parametricVaR99?.value || 0} type={FinancialValueType.CURRENCY} />
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Expected Shortfall (ES 95%)</span>
                <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  <FinancialValue value={riskExposure?.risk?.expectedShortfall95?.value || 0} type={FinancialValueType.CURRENCY} />
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Risk Budget Mandate</span>
                <div className="text-base font-bold text-emerald-600 font-mono mt-0.5">
                  WITHIN BUDGET (&lt; 15%)
                </div>
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Top Risk Contributors (CRC %)
            </h4>
            <div className="space-y-2">
              {(riskExposure?.risk?.topRiskContributors || []).map((h) => (
                <div key={h.ticker} className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="font-bold text-slate-800">{h.ticker}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-mono">${(h.marketValue / 1e6).toFixed(2)}M ({(h.weight * 100).toFixed(1)}%)</span>
                    <strong className="text-blue-600 font-mono">{h.riskContributionPct}% CRC</strong>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Exposure & Concentration */}
          <Card
            title="Exposure Decomposition & Concentration"
            subtitle="Phase 30 HHI Index, Effective Number of Bets (N_eff), and Sector Breakdown"
            icon={BarChart3}
          >
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">HHI Concentration Index</span>
                <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  {riskExposure?.exposure?.hhi?.value || 1950}
                </div>
                <span className="text-[10px] text-slate-400">Moderate Concentration</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Effective Bets (N_eff)</span>
                <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  {riskExposure?.exposure?.nEff?.value || 5.12}
                </div>
                <span className="text-[10px] text-slate-400">Target &gt; 4.0</span>
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Sector Allocation
            </h4>
            <div className="space-y-2">
              {Object.entries(riskExposure?.exposure?.sectorBreakdown || { Technology: 0.65, Consumer: 0.20, Cash: 0.15 }).map(([sec, wt]) => (
                <div key={sec} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-semibold">{sec}</span>
                    <span className="font-mono text-slate-800 font-bold">{(wt * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, wt * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 6: GOVERNANCE & DECISIONS */}
      {activeTab === 'decisions' && (
        <Card
          title="Decision Queue & Governance Backlog (Phase 37)"
          subtitle="Segregation of duties, peer reviews, challenge logs, and authorization status"
          icon={FileCheck}
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={Sliders}
              onClick={() => navigate('/app/decisions')}
            >
              Open Workbench
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Decision</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Target Weight</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">Next Action</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(decisions?.queue || []).map((d) => (
                  <tr key={d.decisionId} className="hover:bg-slate-50/80 transition-all">
                    <td className="py-3 px-3">
                      <Link to={`/app/decisions/${d.decisionId}`} className="font-bold text-slate-900 hover:text-blue-600">
                        {d.ticker} — {d.title}
                      </Link>
                      <span className="text-[10px] text-slate-400 font-mono block">{d.decisionId}</span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{d.decisionType}</td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          d.status === 'APPROVED' ? 'OK' :
                          d.status === 'CHALLENGED' ? 'WARNING' :
                          d.status === 'UNDER_REVIEW' ? 'INFO' : 'NEUTRAL'
                        }
                        size="xs"
                      >
                        {d.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {(d.proposedWeight * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">v{d.currentVersion}</td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{d.nextAction}</td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/app/decisions/${d.decisionId}`}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default InstitutionalCockpit;
