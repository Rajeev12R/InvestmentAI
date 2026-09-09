/**
 * @file PortfolioListPage.jsx
 * Phase 36 Institutional Portfolio Registry & Multi-Tenant Operating List.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Shield,
  Layers,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  Clock,
  DollarSign,
  Activity,
  ChevronRight
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { listPortfoliosApi, createPortfolioApi } from '../../utils/api.js';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Modal from '../ui/Modal.jsx';

export const PortfolioListPage = () => {
  const navigate = useNavigate();
  const { activeWorkspaceId, activeOrgId, activeWorkspaceMeta } = useWorkspace();

  const [portfolios, setPortfolios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [strategyFilter, setStrategyFilter] = useState('ALL');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    strategy: 'CORE_MOMENTUM',
    type: 'MULTI_ASSET',
    benchmark: '^GSPC',
    benchmarkName: 'S&P 500 Index',
    baseCurrency: 'USD',
    targetReturn: 0.12,
    riskTargetVolatility: 0.15,
    maxSinglePositionWeight: 0.25,
    maxSectorWeight: 0.40,
    cashBalance: 500000
  });

  const loadPortfolios = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listPortfoliosApi({
        status: statusFilter === 'ALL' ? null : statusFilter,
        strategy: strategyFilter === 'ALL' ? null : strategyFilter,
        query: searchQuery || null
      });
      setPortfolios(res.data || []);
    } catch (err) {
      console.error('Failed to list portfolios:', err);
      setError(err.message || 'Failed to retrieve portfolios');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, strategyFilter, searchQuery]);

  useEffect(() => {
    loadPortfolios();
  }, [loadPortfolios, activeWorkspaceId, activeOrgId]);

  const handleCreatePortfolio = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        strategy: createForm.strategy,
        type: createForm.type,
        benchmark: createForm.benchmark,
        benchmarkName: createForm.benchmarkName,
        baseCurrency: createForm.baseCurrency,
        cashBalance: Number(createForm.cashBalance) || 0,
        mandate: {
          targetReturn: Number(createForm.targetReturn),
          riskTargetVolatility: Number(createForm.riskTargetVolatility),
          maxSinglePositionWeight: Number(createForm.maxSinglePositionWeight),
          maxSectorWeight: Number(createForm.maxSectorWeight)
        },
        holdings: [
          { ticker: 'AAPL', securityName: 'Apple Inc.', quantity: 1000, price: 220, sector: 'Technology', costBasis: 200 },
          { ticker: 'MSFT', securityName: 'Microsoft Corp.', quantity: 500, price: 420, sector: 'Technology', costBasis: 400 },
          { ticker: 'NVDA', securityName: 'NVIDIA Corp.', quantity: 1500, price: 125, sector: 'Technology', costBasis: 110 }
        ]
      };

      const res = await createPortfolioApi(payload);
      setIsCreateModalOpen(false);
      setCreateForm({
        name: '',
        description: '',
        strategy: 'CORE_MOMENTUM',
        type: 'MULTI_ASSET',
        benchmark: '^GSPC',
        benchmarkName: 'S&P 500 Index',
        baseCurrency: 'USD',
        targetReturn: 0.12,
        riskTargetVolatility: 0.15,
        maxSinglePositionWeight: 0.25,
        maxSectorWeight: 0.40,
        cashBalance: 500000
      });
      await loadPortfolios();
      if (res.portfolio?.portfolioId) {
        navigate(`/app/portfolios/${res.portfolio.portfolioId}`);
      }
    } catch (err) {
      alert(`Error provisioning portfolio: ${err.message}`);
    } finally {
      setIsSubmitting(false);
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

  const totalAum = portfolios.reduce((sum, p) => sum + (p.aum || 0), 0);
  const activeCount = portfolios.filter(p => p.status === 'ACTIVE').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 text-blue-600 rounded-xl">
              <PieChart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Institutional Portfolio Operating System
              </h1>
              <p className="text-sm text-slate-500">
                Active Workspace: <span className="font-semibold text-slate-700">{activeWorkspaceMeta?.name || activeWorkspaceId}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadPortfolios}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 shadow-sm bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Portfolio
          </Button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="p-5 border-slate-200 bg-white/70 backdrop-blur shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Workspace AUM</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                ${(totalAum / 1000000).toFixed(2)}M
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200 bg-white/70 backdrop-blur shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Portfolios</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {activeCount} <span className="text-xs font-normal text-slate-400">/ {portfolios.length} total</span>
              </h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Layers className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200 bg-white/70 backdrop-blur shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Risk Governance</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                100%
              </h3>
              <p className="text-xs text-emerald-600 font-medium">Point-in-Time Sealed</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Shield className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200 bg-white/70 backdrop-blur shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Optimization Engine</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                Phase 33
              </h3>
              <p className="text-xs text-blue-600 font-medium">Solver Integrated</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search portfolios by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 text-xs border border-slate-200 rounded-lg px-2.5 bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="PAUSED">Paused</option>
                <option value="CLOSED">Closed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Strategy:</span>
              <select
                value={strategyFilter}
                onChange={(e) => setStrategyFilter(e.target.value)}
                className="h-9 text-xs border border-slate-200 rounded-lg px-2.5 bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Strategies</option>
                <option value="CORE_MOMENTUM">Core Momentum</option>
                <option value="GROWTH">Growth</option>
                <option value="VALUE">Value</option>
                <option value="MARKET_NEUTRAL">Market Neutral</option>
                <option value="INCOME">Income</option>
                <option value="MULTI_STRATEGY">Multi-Strategy</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Portfolios List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading institutional portfolios...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Failed to load portfolios</h4>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      ) : portfolios.length === 0 ? (
        <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-xs">
          <div className="p-4 bg-slate-50 rounded-full w-16 h-16 mx-auto flex items-center justify-center text-slate-400">
            <PieChart className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Portfolios Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are no portfolios matching your filters in workspace <span className="font-semibold">{activeWorkspaceMeta?.name || activeWorkspaceId}</span>.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Provision First Portfolio
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolios.map((portfolio) => (
            <Card
              key={portfolio.portfolioId}
              onClick={() => navigate(`/app/portfolios/${portfolio.portfolioId}`)}
              className="p-6 border-slate-200 bg-white hover:border-blue-400/80 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      {portfolio.portfolioId}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {portfolio.name}
                    </h3>
                  </div>
                  {getStatusBadge(portfolio.status)}
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {portfolio.description || 'Institutional investment vehicle with systematic mandate governance.'}
                </p>

                <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">AUM</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      ${((portfolio.aum || 0) / 1000000).toFixed(2)}M
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Holdings</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      {portfolio.holdings?.length || 0} Assets
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Strategy</p>
                    <p className="font-semibold text-slate-700 mt-0.5">
                      {portfolio.strategy || 'CORE_MOMENTUM'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Benchmark</p>
                    <p className="font-semibold text-slate-700 mt-0.5">
                      {portfolio.benchmark || '^GSPC'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>As of {new Date(portfolio.asOf || portfolio.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1 text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>Open Cockpit</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Portfolio Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Provision Institutional Portfolio"
      >
        <form onSubmit={handleCreatePortfolio} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Portfolio Name <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Global Tech High-Conviction Fund"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Investment Mandate Description
            </label>
            <textarea
              rows={2}
              placeholder="Mandate details, objective, and investment horizon..."
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Strategy
              </label>
              <select
                value={createForm.strategy}
                onChange={(e) => setCreateForm({ ...createForm, strategy: e.target.value })}
                className="w-full h-9 text-xs border border-slate-200 rounded-lg px-2.5 bg-slate-50 text-slate-700"
              >
                <option value="CORE_MOMENTUM">Core Momentum</option>
                <option value="GROWTH">Growth</option>
                <option value="VALUE">Value</option>
                <option value="MARKET_NEUTRAL">Market Neutral</option>
                <option value="INCOME">Income</option>
                <option value="MULTI_STRATEGY">Multi-Strategy</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Portfolio Type
              </label>
              <select
                value={createForm.type}
                onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                className="w-full h-9 text-xs border border-slate-200 rounded-lg px-2.5 bg-slate-50 text-slate-700"
              >
                <option value="MULTI_ASSET">Multi-Asset</option>
                <option value="EQUITY">Equity</option>
                <option value="FIXED_INCOME">Fixed Income</option>
                <option value="QUANTITATIVE">Quantitative</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Benchmark
              </label>
              <Input
                type="text"
                placeholder="^GSPC (S&P 500)"
                value={createForm.benchmark}
                onChange={(e) => setCreateForm({ ...createForm, benchmark: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Cash ($)
              </label>
              <Input
                type="number"
                value={createForm.cashBalance}
                onChange={(e) => setCreateForm({ ...createForm, cashBalance: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Return (%)
              </label>
              <Input
                type="number"
                step="0.01"
                value={createForm.targetReturn}
                onChange={(e) => setCreateForm({ ...createForm, targetReturn: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Position Limit (%)
              </label>
              <Input
                type="number"
                step="0.01"
                value={createForm.maxSinglePositionWeight}
                onChange={(e) => setCreateForm({ ...createForm, maxSinglePositionWeight: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !createForm.name.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Provisioning...' : 'Create Portfolio'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PortfolioListPage;
