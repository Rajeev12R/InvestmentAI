/**
 * @file PortfolioDashboard.jsx
 * Phase 36 Institutional Portfolio Operating Cockpit.
 * Connects Holdings, Risk, Exposure, Performance, Mandate, Optimization (P33), and Sealed Snapshots.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PieChart,
  TrendingUp,
  Shield,
  Sliders,
  Layers,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Clock,
  DollarSign,
  Activity,
  FileCheck,
  ChevronRight,
  ExternalLink,
  PlusCircle,
  Eye,
  Camera,
  Hash
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import {
  getPortfolioSummaryApi,
  getPortfolioHoldingsApi,
  updatePortfolioHoldingsApi,
  updatePortfolioStatusApi,
  updatePortfolioApi,
  createPortfolioSnapshotApi,
  getPortfolioSnapshotsApi,
  proposePortfolioOptimizationApi
} from '../../utils/api.js';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Modal from '../ui/Modal.jsx';

export const PortfolioDashboard = () => {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspaceId, activeOrgId, activeWorkspaceMeta } = useWorkspace();

  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals & Action States
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isHoldingsModalOpen, setIsHoldingsModalOpen] = useState(false);
  const [isMandateModalOpen, setIsMandateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Optimization Proposal State
  const [optObjective, setOptObjective] = useState('MAX_SHARPE');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optProposal, setOptProposal] = useState(null);
  const [optError, setOptError] = useState(null);

  // Snapshot Inspection State
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  const loadPortfolioData = useCallback(async () => {
    if (!portfolioId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [sumRes, holdRes, snapRes] = await Promise.all([
        getPortfolioSummaryApi(portfolioId),
        getPortfolioHoldingsApi(portfolioId),
        getPortfolioSnapshotsApi(portfolioId)
      ]);

      setSummary(sumRes.data || sumRes);
      setHoldings(holdRes.holdings || sumRes.data?.holdings || []);
      setSnapshots(snapRes.snapshots || []);
    } catch (err) {
      console.error('Failed to load portfolio cockpit:', err);
      setError(err.message || 'Failed to retrieve portfolio state');
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    loadPortfolioData();
  }, [loadPortfolioData, activeWorkspaceId, activeOrgId]);

  // Status Change Handler
  const handleStatusChange = async (targetStatus) => {
    setIsSubmitting(true);
    try {
      await updatePortfolioStatusApi(portfolioId, targetStatus);
      setIsStatusModalOpen(false);
      await loadPortfolioData();
    } catch (err) {
      alert(`Status Transition Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Sealed Snapshot Handler
  const handleCreateSnapshot = async () => {
    setIsSubmitting(true);
    try {
      const res = await createPortfolioSnapshotApi(portfolioId, {
        asOf: new Date().toISOString(),
        analytics: {
          exposure: summary?.exposure,
          risk: summary?.risk,
          performance: summary?.performance
        }
      });
      setIsSnapshotModalOpen(false);
      alert(`Point-in-Time Snapshot Sealed! Hash: ${res.snapshot.integrityHash.substring(0, 16)}...`);
      await loadPortfolioData();
    } catch (err) {
      alert(`Snapshot Creation Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Optimization Proposal Handler (Phase 33)
  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    setOptError(null);
    try {
      const res = await proposePortfolioOptimizationApi(portfolioId, {
        objective: optObjective,
        constraints: {
          maxWeight: summary?.mandate?.maxSinglePositionWeight || 0.25
        }
      });
      setOptProposal(res.proposal);
    } catch (err) {
      setOptError(err.message || 'Optimization solver failed');
    } finally {
      setIsOptimizing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success" className="font-semibold">ACTIVE</Badge>;
      case 'DRAFT':
        return <Badge variant="warning">DRAFT</Badge>;
      case 'PAUSED':
        return <Badge variant="neutral">PAUSED</Badge>;
      case 'CLOSED':
        return <Badge variant="danger">CLOSED</Badge>;
      case 'ARCHIVED':
        return <Badge variant="neutral" className="bg-slate-200 text-slate-600">ARCHIVED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Assembling Institutional Operating Cockpit...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <Button variant="outline" size="sm" onClick={() => navigate('/app/portfolios')} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Portfolios
        </Button>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <div>
            <h3 className="font-bold text-base">Portfolio Unavailable</h3>
            <p className="text-sm mt-0.5">{error || 'Portfolio not found or access denied.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              onClick={() => navigate('/app/portfolios')}
              className="hover:text-blue-600 font-medium transition-colors"
            >
              Portfolios
            </button>
            <span>/</span>
            <span className="font-mono text-slate-400">{summary.portfolioId}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {summary.name}
            </h1>
            {getStatusBadge(summary.status)}
          </div>
          <p className="text-xs text-slate-500">
            Strategy: <span className="font-semibold text-slate-700">{summary.strategy}</span> | Benchmark: <span className="font-semibold text-slate-700">{summary.benchmark} ({summary.benchmarkName})</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSnapshotModalOpen(true)}
            className="flex items-center gap-1.5 text-xs shadow-xs"
          >
            <Camera className="h-3.5 w-3.5 text-indigo-600" />
            Seal PIT Snapshot
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStatusModalOpen(true)}
            className="flex items-center gap-1.5 text-xs shadow-xs"
          >
            <Lock className="h-3.5 w-3.5 text-amber-600" />
            Status: {summary.status}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setActiveTab('optimization');
            }}
            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Sliders className="h-3.5 w-3.5" />
            Phase 33 Optimizer
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        {[
          { id: 'overview', label: 'Overview', icon: PieChart },
          { id: 'holdings', label: `Holdings (${holdings.length})`, icon: Layers },
          { id: 'risk', label: 'Risk & Exposure', icon: Shield },
          { id: 'performance', label: 'Performance', icon: TrendingUp },
          { id: 'optimization', label: 'Optimization (P33)', icon: Sliders },
          { id: 'snapshots', label: `Snapshots (${snapshots.length})`, icon: Clock }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="p-4 border-slate-200 bg-white">
              <p className="text-[10px] uppercase font-bold text-slate-400">Total AUM</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                ${((summary.aum || 0) / 1000000).toFixed(2)}M
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Cash: ${(summary.cashBalance / 1000).toFixed(0)}k</p>
            </Card>

            <Card className="p-4 border-slate-200 bg-white">
              <p className="text-[10px] uppercase font-bold text-slate-400">Active Return</p>
              <h3 className="text-xl font-extrabold text-emerald-600 mt-1">
                +{(summary.performance?.activeReturnYTD * 100).toFixed(1)}%
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">vs {summary.benchmark}</p>
            </Card>

            <Card className="p-4 border-slate-200 bg-white">
              <p className="text-[10px] uppercase font-bold text-slate-400">Ann. Volatility</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                {(summary.risk?.annualizedVolatility * 100).toFixed(1)}%
              </h3>
              <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{summary.risk?.riskBudgetStatus}</p>
            </Card>

            <Card className="p-4 border-slate-200 bg-white">
              <p className="text-[10px] uppercase font-bold text-slate-400">95% Parametric VaR</p>
              <h3 className="text-xl font-extrabold text-indigo-600 mt-1">
                {(summary.risk?.parametricVaR95 * 100).toFixed(1)}%
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">1-Day Horizon</p>
            </Card>

            <Card className="p-4 border-slate-200 bg-white">
              <p className="text-[10px] uppercase font-bold text-slate-400">Concentration (HHI)</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                {summary.exposure?.hhi}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Top Holding: {(summary.exposure?.top1Weight * 100).toFixed(0)}%</p>
            </Card>

            <Card className="p-4 border-slate-200 bg-white">
              <p className="text-[10px] uppercase font-bold text-slate-400">Effective Assets (N_eff)</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                {summary.exposure?.nEff}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">{holdings.length} Securities</p>
            </Card>
          </div>

          {/* Compliance & Alerts Banner */}
          {summary.compliance?.breaches?.length > 0 ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <AlertTriangle className="h-4 w-4" />
                <span>Mandate Limit Breaches Detected ({summary.compliance.breaches.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-rose-700">
                {summary.compliance.breaches.map((b, idx) => (
                  <div key={idx} className="p-2 bg-white/80 rounded border border-rose-100">
                    <span className="font-semibold">{b.rule}:</span> {b.message}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>All Mandate Constraints, Single-Position Limits, and Risk Budgets are Compliant</span>
            </div>
          )}

          {/* Sector Breakdown & Top Holdings Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-6 border-slate-200 bg-white space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="h-4 w-4 text-blue-600" />
                Sector Allocation
              </h3>
              <div className="space-y-3">
                {Object.entries(summary.exposure?.sectorBreakdown || {}).map(([sector, weight]) => (
                  <div key={sector} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700">{sector}</span>
                      <span className="font-mono font-bold text-slate-900">{(weight * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, weight * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 border-slate-200 bg-white lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  Core Portfolio Positions
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('holdings')}
                  className="text-xs"
                >
                  View All Holdings
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Ticker</th>
                      <th className="py-2.5 px-3">Weight</th>
                      <th className="py-2.5 px-3">Market Value</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Unrealized P&L</th>
                      <th className="py-2.5 px-3">Freshness</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {holdings.slice(0, 5).map((h) => (
                      <tr key={h.ticker} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-bold font-mono text-blue-600">{h.ticker}</td>
                        <td className="py-2.5 px-3 font-bold font-mono text-slate-900">
                          {((h.weight || 0) * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-900">
                          ${(h.marketValue || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">${h.price?.toFixed(2)}</td>
                        <td className={`py-2.5 px-3 font-mono font-semibold ${h.unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {h.unrealizedPnL >= 0 ? '+' : ''}${h.unrealizedPnL?.toLocaleString()} ({(h.unrealizedPnLPct * 100).toFixed(1)}%)
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant={h.freshness === 'FRESH' ? 'success' : 'warning'} className="text-[10px]">
                            {h.freshness}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: HOLDINGS & POSITIONS */}
      {activeTab === 'holdings' && (
        <Card className="p-6 border-slate-200 bg-white space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Authoritative Holdings & Position Ledger</h3>
              <p className="text-xs text-slate-500">
                Point-in-time holdings with verifiable cost basis, valuation timestamps, and data freshness.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="neutral" className="font-mono text-xs">
                Cash Reserve: ${(summary.cashBalance || 0).toLocaleString()} USD
              </Badge>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsHoldingsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-xs"
              >
                Reconcile Holdings
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Asset</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Market Value</th>
                  <th className="py-3 px-4">Weight</th>
                  <th className="py-3 px-4">Cost Basis</th>
                  <th className="py-3 px-4">Unrealized P&L</th>
                  <th className="py-3 px-4">Sector</th>
                  <th className="py-3 px-4">Freshness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {holdings.map((h) => (
                  <tr key={h.ticker} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="font-bold font-mono text-blue-600">{h.ticker}</div>
                      <div className="text-[10px] text-slate-400">{h.securityName}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">{h.quantity?.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">${h.price?.toFixed(2)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">${(h.marketValue || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono font-extrabold text-blue-600">
                      {((h.weight || 0) * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">${h.costBasis?.toFixed(2)}</td>
                    <td className={`py-3 px-4 font-mono font-bold ${h.unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {h.unrealizedPnL >= 0 ? '+' : ''}${h.unrealizedPnL?.toLocaleString()}
                      <span className="block text-[10px] font-normal">
                        ({(h.unrealizedPnLPct * 100).toFixed(1)}%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{h.sector}</td>
                    <td className="py-3 px-4">
                      <Badge variant={h.freshness === 'FRESH' ? 'success' : 'warning'} className="text-[10px]">
                        {h.freshness}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: RISK & EXPOSURES */}
      {activeTab === 'risk' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border-slate-200 bg-white space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" />
                Parametric Risk Forecast
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Annualized Volatility:</span>
                  <span className="font-mono font-bold text-slate-900">{(summary.risk?.annualizedVolatility * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Target Budget Volatility:</span>
                  <span className="font-mono font-bold text-slate-900">{(summary.risk?.targetVolatility * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">95% Daily VaR:</span>
                  <span className="font-mono font-bold text-indigo-600">{(summary.risk?.parametricVaR95 * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">99% Daily VaR:</span>
                  <span className="font-mono font-bold text-indigo-700">{(summary.risk?.parametricVaR99 * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">95% Expected Shortfall (ES):</span>
                  <span className="font-mono font-bold text-rose-600">{(summary.risk?.expectedShortfall95 * 100).toFixed(2)}%</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-slate-200 bg-white md:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-600" />
                Marginal & Component Risk Contributions (Phase 32)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Ticker</th>
                      <th className="py-2.5 px-3">Weight</th>
                      <th className="py-2.5 px-3">MRC (Marginal)</th>
                      <th className="py-2.5 px-3">CRC (Component)</th>
                      <th className="py-2.5 px-3">% Risk Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.risk?.riskContributions?.map((rc) => (
                      <tr key={rc.ticker} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-bold font-mono text-blue-600">{rc.ticker}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold">{(rc.weight * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{rc.mrc?.toFixed(4)}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-800">{rc.crc?.toFixed(4)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{rc.prc}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: PERFORMANCE */}
      {activeTab === 'performance' && (
        <Card className="p-6 border-slate-200 bg-white space-y-6 animate-in fade-in duration-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">Institutional Performance & Benchmark Attribution</h3>
            <p className="text-xs text-slate-500">
              Verified Time-Weighted Returns (TWR) vs Benchmark {summary.benchmark} ({summary.benchmarkName}).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Portfolio TWR YTD</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                +{(summary.performance?.twrYTD * 100).toFixed(2)}%
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Benchmark YTD</span>
              <p className="text-xl font-extrabold text-slate-700 mt-1">
                +{(summary.performance?.benchmarkReturnYTD * 100).toFixed(2)}%
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] text-emerald-600 uppercase font-bold">Active Alpha</span>
              <p className="text-xl font-extrabold text-emerald-700 mt-1">
                +{(summary.performance?.activeReturnYTD * 100).toFixed(2)}%
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <span className="text-[10px] text-blue-600 uppercase font-bold">Sharpe Ratio</span>
              <p className="text-xl font-extrabold text-blue-700 mt-1">
                {summary.performance?.sharpeRatio}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 5: OPTIMIZATION (PHASE 33) */}
      {activeTab === 'optimization' && (
        <Card className="p-6 border-slate-200 bg-white space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-blue-600" />
                Phase 33 Institutional Portfolio Optimizer
              </h3>
              <p className="text-xs text-slate-500">
                Solves KKT-optimal target allocations under strict institutional constraints. Proposals require human authorization.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={optObjective}
                onChange={(e) => setOptObjective(e.target.value)}
                className="h-9 text-xs border border-slate-200 rounded-lg px-3 bg-slate-50 text-slate-800 font-medium"
              >
                <option value="MAX_SHARPE">Maximize Sharpe Ratio</option>
                <option value="MIN_VARIANCE">Minimum Variance</option>
                <option value="MAX_RETURN">Maximize Expected Return</option>
              </select>

              <Button
                variant="primary"
                size="sm"
                disabled={isOptimizing}
                onClick={handleRunOptimization}
                className="bg-blue-600 hover:bg-blue-700 text-xs"
              >
                {isOptimizing ? 'Solving KKT Optimality...' : 'Run Optimization'}
              </Button>
            </div>
          </div>

          {optError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              <strong>Optimization Error:</strong> {optError}
            </div>
          )}

          {optProposal ? (
            <div className="space-y-6 border border-blue-100 bg-blue-50/30 p-6 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 font-bold">
                    PROPOSAL ID: {optProposal.proposalId}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-0.5">
                    Optimization Results ({optProposal.objective})
                  </h4>
                </div>
                <Badge variant="warning" className="font-semibold text-xs">
                  PENDING HUMAN AUTHORIZATION
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Expected Return</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    {(optProposal.expectedReturn * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Expected Volatility</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    {(optProposal.expectedVolatility * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Expected Sharpe</span>
                  <p className="text-lg font-bold text-blue-600 mt-0.5">
                    {optProposal.expectedSharpe?.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Proposed Allocation Comparison */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                <h5 className="text-xs font-bold text-slate-900 uppercase">Target Rebalancing Weights</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Asset</th>
                        <th className="py-2 px-3">Current Weight</th>
                        <th className="py-2 px-3">Proposed Target</th>
                        <th className="py-2 px-3">Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.keys(optProposal.currentWeights || {}).map((ticker) => {
                        const curr = optProposal.currentWeights[ticker] || 0;
                        const prop = optProposal.proposedWeights[ticker] || 0;
                        const delta = prop - curr;
                        return (
                          <tr key={ticker}>
                            <td className="py-2.5 px-3 font-bold font-mono text-blue-600">{ticker}</td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">{(curr * 100).toFixed(1)}%</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{(prop * 100).toFixed(1)}%</td>
                            <td className={`py-2.5 px-3 font-mono font-bold ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {delta >= 0 ? '+' : ''}{(delta * 100).toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-200/60 pt-4">
                <span className="font-mono">Sealed Hash: {optProposal.integrityHash}</span>
                <span className="text-slate-500 italic">Optimization proposals do not mutate holdings automatically.</span>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 space-y-2">
              <Sliders className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-xs font-medium text-slate-600">Select an objective above and run the Phase 33 quantitative solver.</p>
            </div>
          )}
        </Card>
      )}

      {/* TAB 6: SNAPSHOTS & AUDIT LEDGER */}
      {activeTab === 'snapshots' && (
        <Card className="p-6 border-slate-200 bg-white space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                Point-in-Time Sealed Snapshots Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Cryptographically sealed historical records of portfolio state, holdings, and risk parameters.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsSnapshotModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs"
            >
              <Camera className="h-4 w-4 mr-1.5" />
              Seal Current State
            </Button>
          </div>

          {snapshots.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-xl border border-slate-200">
              <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">No historical snapshots sealed yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Snapshot ID</th>
                    <th className="py-3 px-4">As-Of Date</th>
                    <th className="py-3 px-4">Holdings</th>
                    <th className="py-3 px-4">AUM ($)</th>
                    <th className="py-3 px-4">SHA-256 Integrity Hash</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {snapshots.map((s) => (
                    <tr key={s.snapshotId} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{s.snapshotId}</td>
                      <td className="py-3 px-4 text-slate-700">{new Date(s.asOf).toLocaleString()}</td>
                      <td className="py-3 px-4 font-semibold">{s.holdings?.length || 0} Assets</td>
                      <td className="py-3 px-4 font-mono font-bold">${(s.aum || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                        {s.integrityHash?.substring(0, 16)}...
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setSelectedSnapshot(s)}
                          className="text-xs"
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Status Transition Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Manage Portfolio Lifecycle Status"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Current Status: <span className="font-bold text-slate-800">{summary.status}</span>.
            Select a legal state transition:
          </p>

          <div className="grid grid-cols-2 gap-3">
            {summary.status === 'DRAFT' && (
              <Button
                variant="primary"
                onClick={() => handleStatusChange('ACTIVE')}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs"
              >
                Activate Portfolio
              </Button>
            )}

            {summary.status === 'ACTIVE' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('PAUSED')}
                  disabled={isSubmitting}
                  className="text-xs text-amber-700"
                >
                  Pause Operations
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('CLOSED')}
                  disabled={isSubmitting}
                  className="text-xs text-rose-700"
                >
                  Close Portfolio
                </Button>
              </>
            )}

            {summary.status === 'PAUSED' && (
              <>
                <Button
                  variant="primary"
                  onClick={() => handleStatusChange('ACTIVE')}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                >
                  Resume Active
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('CLOSED')}
                  disabled={isSubmitting}
                  className="text-xs text-rose-700"
                >
                  Close Portfolio
                </Button>
              </>
            )}

            {summary.status !== 'ARCHIVED' && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange('ARCHIVED')}
                disabled={isSubmitting}
                className="text-xs text-slate-700"
              >
                Archive
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Snapshot Confirmation Modal */}
      <Modal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        title="Seal Point-in-Time Portfolio Snapshot"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Sealing creates an immutable, SHA-256 verified snapshot of current holdings (${(summary.aum || 0).toLocaleString()} AUM, {holdings.length} assets) and risk parameters.
          </p>
          <div className="pt-2 flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setIsSnapshotModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleCreateSnapshot}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? 'Sealing...' : 'Confirm Seal'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Snapshot Inspection Modal */}
      <Modal
        isOpen={!!selectedSnapshot}
        onClose={() => setSelectedSnapshot(null)}
        title={`Sealed Snapshot: ${selectedSnapshot?.snapshotId}`}
      >
        {selectedSnapshot && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono space-y-1">
              <div><span className="text-slate-400">As-Of:</span> {new Date(selectedSnapshot.asOf).toLocaleString()}</div>
              <div><span className="text-slate-400">Integrity Hash:</span> {selectedSnapshot.integrityHash}</div>
              <div><span className="text-slate-400">AUM:</span> ${(selectedSnapshot.aum || 0).toLocaleString()}</div>
            </div>

            <h5 className="font-bold text-slate-800 uppercase">Sealed Positions</h5>
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase">
                  <tr>
                    <th className="p-2">Ticker</th>
                    <th className="p-2">Weight</th>
                    <th className="p-2">Price</th>
                    <th className="p-2">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSnapshot.holdings?.map((h) => (
                    <tr key={h.ticker}>
                      <td className="p-2 font-bold font-mono text-blue-600">{h.ticker}</td>
                      <td className="p-2 font-mono">{((h.weight || 0) * 100).toFixed(1)}%</td>
                      <td className="p-2 font-mono">${h.price?.toFixed(2)}</td>
                      <td className="p-2 font-mono">${h.marketValue?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PortfolioDashboard;
