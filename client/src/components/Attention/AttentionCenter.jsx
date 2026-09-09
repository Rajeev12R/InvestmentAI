import React, { useState, useEffect } from 'react';
import AttentionCard from './AttentionCard.jsx';

export default function AttentionCenter({ onSelectTicker = null, onAskQuestion = null }) {
  const [loading, setLoading] = useState(false);
  const [attentionData, setAttentionData] = useState(null);
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAttention = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attention');
      if (res.ok) {
        const data = await res.json();
        setAttentionData(data);
      }
    } catch (e) {
      console.error('Failed to fetch attention items:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttention();
  }, []);

  const items = attentionData?.attentionItems || [];
  const prioritySummary = attentionData?.prioritySummary || {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFORMATIONAL: 0
  };

  const filteredItems = items.filter(item => {
    const matchesPriority = filterPriority === 'ALL' || item.priority === filterPriority;
    const matchesSearch = !searchTerm || 
      item.ticker?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Attention Center</h2>
            <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-indigo-500/20">
              Phase 7 Deterministic Operations
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time ranked signals across snapshots, drift, thesis-breakers, and multi-asset concentration.
          </p>
        </div>

        <button
          onClick={fetchAttention}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Refreshing...' : 'Refresh Attention'}
        </button>
      </div>

      {/* Priority Summary Counter Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: 'CRITICAL', label: 'Critical', count: prioritySummary.CRITICAL, color: 'text-red-400 border-red-500/30 bg-red-500/10' },
          { key: 'HIGH', label: 'High', count: prioritySummary.HIGH, color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
          { key: 'MEDIUM', label: 'Medium', count: prioritySummary.MEDIUM, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
          { key: 'LOW', label: 'Low', count: prioritySummary.LOW, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
          { key: 'ALL', label: 'All Items', count: items.length, color: 'text-slate-300 border-slate-700 bg-slate-800/40' }
        ].map(p => (
          <button
            key={p.key}
            onClick={() => setFilterPriority(p.key)}
            className={`p-3.5 rounded-xl border text-left transition-all ${p.color} ${filterPriority === p.key ? 'ring-2 ring-indigo-500 shadow-lg' : 'opacity-80 hover:opacity-100'}`}
          >
            <div className="text-2xl font-black font-mono">{p.count}</div>
            <div className="text-xs font-semibold uppercase tracking-wider mt-0.5">{p.label}</div>
          </button>
        ))}
      </div>

      {/* Search & Filter Controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search attention by ticker, title, or category..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Card Feed */}
      {loading && items.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm animate-pulse">
          Loading attention signals...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-800 text-slate-500 text-sm">
          No attention items matching current filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map(item => (
            <AttentionCard
              key={item.attentionId}
              item={item}
              onInvestigate={(q) => onAskQuestion && onAskQuestion(item.ticker, q)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
