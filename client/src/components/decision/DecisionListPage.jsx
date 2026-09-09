import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listDecisionsApi, createDecisionApi, listPortfoliosApi } from '../../utils/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import StateView from '../ui/StateView';
import { FinancialValue } from '../ui/FinancialValue';

export default function DecisionListPage() {
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, PENDING_REVIEW, APPROVED, IMPLEMENTED

  // Provision Modal
  const [showModal, setShowModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({
    portfolioId: '',
    ticker: '',
    title: '',
    decisionType: 'INCREASE',
    priority: 'HIGH',
    targetWeight: 0.15,
    coreThesis: '',
    enforceSoD: false
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [decRes, portRes] = await Promise.all([
        listDecisionsApi({ query: searchQuery }),
        listPortfoliosApi()
      ]);
      setDecisions(decRes.data?.data || []);
      const portList = portRes.data?.data || [];
      setPortfolios(portList);
      if (portList.length > 0 && !formData.portfolioId) {
        setFormData(prev => ({ ...prev, portfolioId: portList[0].portfolioId }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load decisions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.ticker || !formData.title || !formData.portfolioId) return;

    setCreateLoading(true);
    try {
      const res = await createDecisionApi({
        portfolioId: formData.portfolioId,
        ticker: formData.ticker.toUpperCase(),
        title: formData.title,
        decisionType: formData.decisionType,
        priority: formData.priority,
        enforceSoD: formData.enforceSoD,
        proposedPosition: {
          targetWeight: parseFloat(formData.targetWeight) || 0.05
        },
        thesis: {
          coreThesis: formData.coreThesis
        }
      });
      setShowModal(false);
      const newDecId = res.data?.decision?.decisionId;
      if (newDecId) {
        navigate(`/app/decisions/${newDecId}`);
      } else {
        fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to create decision');
    } finally {
      setCreateLoading(false);
    }
  };

  // Filtered decisions
  const filteredDecisions = decisions.filter(d => {
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && d.priority !== priorityFilter) return false;
    if (activeTab === 'PENDING_REVIEW' && d.status !== 'UNDER_REVIEW' && d.status !== 'CHALLENGED') return false;
    if (activeTab === 'APPROVED' && d.status !== 'APPROVED') return false;
    if (activeTab === 'IMPLEMENTED' && d.status !== 'IMPLEMENTED' && d.status !== 'MONITORED') return false;
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success">APPROVED</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="warning">UNDER REVIEW</Badge>;
      case 'CHALLENGED':
        return <Badge variant="danger">CHALLENGED</Badge>;
      case 'IMPLEMENTED':
        return <Badge variant="info">IMPLEMENTED</Badge>;
      case 'MONITORED':
        return <Badge variant="neutral">MONITORED</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">REJECTED</Badge>;
      case 'DRAFT':
        return <Badge variant="neutral">DRAFT</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-800/60">CRITICAL</span>;
      case 'HIGH':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-800/60">HIGH</span>;
      default:
        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">{priority}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Investment Decision Workbench</h1>
          <p className="text-sm text-slate-400 mt-1">
            Institutional decision intelligence, evidence lineage, peer challenges, and human authorization.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={() => setShowModal(true)}>
            + New Decision Draft
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'ALL'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          All Decisions ({decisions.length})
        </button>
        <button
          onClick={() => setActiveTab('PENDING_REVIEW')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'PENDING_REVIEW'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Pending Review ({decisions.filter(d => d.status === 'UNDER_REVIEW' || d.status === 'CHALLENGED').length})
        </button>
        <button
          onClick={() => setActiveTab('APPROVED')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'APPROVED'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Approved ({decisions.filter(d => d.status === 'APPROVED').length})
        </button>
        <button
          onClick={() => setActiveTab('IMPLEMENTED')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'IMPLEMENTED'
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Implemented ({decisions.filter(d => d.status === 'IMPLEMENTED' || d.status === 'MONITORED').length})
        </button>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
        <Input
          placeholder="Search by ticker, title, decision ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'ALL', label: 'All Statuses' },
            { value: 'DRAFT', label: 'Draft' },
            { value: 'UNDER_REVIEW', label: 'Under Review' },
            { value: 'CHALLENGED', label: 'Challenged' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'IMPLEMENTED', label: 'Implemented' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'CLOSED', label: 'Closed' }
          ]}
        />
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          options={[
            { value: 'ALL', label: 'All Priorities' },
            { value: 'CRITICAL', label: 'Critical Priority' },
            { value: 'HIGH', label: 'High Priority' },
            { value: 'MEDIUM', label: 'Medium Priority' },
            { value: 'LOW', label: 'Low Priority' }
          ]}
        />
      </div>

      {/* Content */}
      <StateView
        loading={loading}
        error={error}
        empty={filteredDecisions.length === 0}
        emptyTitle="No decisions found"
        emptyDescription="No institutional decisions match your search or active filter."
        onRetry={fetchData}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDecisions.map((dec) => {
            const supportingCount = (dec.version?.evidence || []).filter(e => e.polarity === 'SUPPORTING').length;
            const contradictingCount = (dec.version?.evidence || []).filter(e => e.polarity === 'CONTRADICTING').length;

            return (
              <Card
                key={dec.decisionId}
                className="hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between"
                onClick={() => navigate(`/app/decisions/${dec.decisionId}`)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-400">{dec.decisionId}</span>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(dec.priority)}
                      {getStatusBadge(dec.status)}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-emerald-400 font-mono">{dec.ticker}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {dec.decisionType}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white mt-1 line-clamp-2">
                      {dec.title}
                    </h3>
                  </div>

                  {/* Metrics & Target Weight */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-slate-950/60 border border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-400 block">Current Weight</span>
                      <span className="font-mono font-medium text-slate-200">
                        {((dec.currentPosition?.weight || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Target Weight</span>
                      <span className="font-mono font-medium text-emerald-400">
                        {((dec.proposedPosition?.targetWeight || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Evidence Lineage Summary */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400">Evidence Lineage:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-mono">+{supportingCount} Support</span>
                      <span className="text-rose-400 font-mono">-{contradictingCount} Challenge</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-3 mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span>v{dec.currentVersion} • Portfolio: {dec.portfolioId}</span>
                  <span className="text-emerald-400 font-medium hover:underline">Inspect Workbench →</span>
                </div>
              </Card>
            );
          })}
        </div>
      </StateView>

      {/* Provision Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Decision Draft"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Portfolio</label>
            <select
              value={formData.portfolioId}
              onChange={(e) => setFormData(prev => ({ ...prev, portfolioId: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              required
            >
              {portfolios.map(p => (
                <option key={p.portfolioId} value={p.portfolioId}>
                  {p.name} ({p.portfolioId})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Ticker Symbol</label>
              <Input
                placeholder="e.g. AAPL, NVDA"
                value={formData.ticker}
                onChange={(e) => setFormData(prev => ({ ...prev, ticker: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Decision Type</label>
              <select
                value={formData.decisionType}
                onChange={(e) => setFormData(prev => ({ ...prev, decisionType: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="NEW_POSITION">NEW_POSITION</option>
                <option value="INCREASE">INCREASE</option>
                <option value="REDUCE">REDUCE</option>
                <option value="EXIT">EXIT</option>
                <option value="HOLD">HOLD</option>
                <option value="HEDGE">HEDGE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Decision Title</label>
            <Input
              placeholder="e.g. Strategic Expansion in Enterprise AI Acceleration"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Weight (0.01 - 1.0)</label>
              <Input
                type="number"
                step="0.01"
                min="0.0"
                max="1.0"
                value={formData.targetWeight}
                onChange={(e) => setFormData(prev => ({ ...prev, targetWeight: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Core Investment Thesis</label>
            <textarea
              value={formData.coreThesis}
              onChange={(e) => setFormData(prev => ({ ...prev, coreThesis: e.target.value }))}
              rows={3}
              placeholder="State the core driver, valuation divergence, catalyst, and expected alpha..."
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="enforceSoD"
              checked={formData.enforceSoD}
              onChange={(e) => setFormData(prev => ({ ...prev, enforceSoD: e.target.checked }))}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="enforceSoD" className="text-xs text-slate-300 cursor-pointer">
              Enforce Segregation of Duties (SoD) — require independent reviewer approval
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={createLoading}>
              Create Decision Draft
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
