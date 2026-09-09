import React, { useState, useEffect } from 'react';

export default function MacroDashboard() {
  const [snapshot, setSnapshot] = useState(null);
  const [regime, setRegime] = useState(null);
  const [crossAssetRules, setCrossAssetRules] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMacroData() {
      try {
        setLoading(true);
        const [snapRes, regRes, xAssetRes] = await Promise.all([
          fetch('/api/macro/snapshot').then(r => r.json()),
          fetch('/api/macro/regime').then(r => r.json()),
          fetch('/api/macro/cross-asset').then(r => r.json())
        ]);

        if (snapRes.success) setSnapshot(snapRes.data);
        if (regRes.success) setRegime(regRes.data);
        if (xAssetRes.success) setCrossAssetRules(xAssetRes.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMacroData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        Loading Institutional Macro Intelligence...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400">🌐</span> Institutional Macro & Cross-Asset Intelligence
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Deterministic point-in-time macro state, regime classification, and cross-asset transmission channels
          </p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-blue-900/40 border border-blue-500/40 text-blue-300 text-xs font-semibold rounded-full">
            Phase 22 Active
          </span>
          <span className="px-3 py-1 bg-gray-800 text-gray-300 text-xs rounded-full">
            Cutoff: {snapshot?.asOfTimestamp ? new Date(snapshot.asOfTimestamp).toLocaleDateString() : 'Realtime'}
          </span>
        </div>
      </div>

      {/* Regime Overview Banner */}
      {regime && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Active Macro Regime</div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-extrabold text-white tracking-wide bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  {regime.primaryRegime}
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Confidence: {Math.round(regime.confidence * 100)}%
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {regime.subRegimes?.map((sub, idx) => (
                <span key={idx} className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg">
                  {sub}
                </span>
              ))}
            </div>
          </div>

          {/* Supporting Fact Lineage */}
          <div className="mt-4 pt-4 border-t border-gray-800/80">
            <div className="text-xs font-semibold text-gray-400 mb-2">Supporting Macro Evidence:</div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-300">
              {regime.supportingFacts?.map((fact, i) => (
                <li key={i} className="flex items-center gap-2 bg-gray-950/60 p-2 rounded border border-gray-800/50">
                  <span className="text-emerald-400">✓</span> {fact}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-gray-800 text-sm font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-1 border-b-2 transition-colors ${
            activeTab === 'overview' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Macro Series Snapshot ({snapshot?.seriesCount || 0})
        </button>
        <button
          onClick={() => setActiveTab('crossAsset')}
          className={`pb-3 px-1 border-b-2 transition-colors ${
            activeTab === 'crossAsset' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Cross-Asset Transmission Matrix
        </button>
      </div>

      {/* Tab 1: Macro Series Snapshot */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {snapshot?.series?.map((item, idx) => (
            <div key={idx} className="bg-gray-900 border border-gray-800 p-4 rounded-xl shadow">
              <div className="flex justify-between items-start text-xs text-gray-400 mb-2">
                <span className="font-semibold text-blue-400">{item.category}</span>
                <span>{item.observationPeriod}</span>
              </div>
              <div className="text-sm font-medium text-gray-200 mb-1 truncate">{item.seriesName || item.seriesId}</div>
              <div className="text-2xl font-bold text-white mb-2">
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                <span className="text-xs text-gray-400 font-normal ml-1">{item.unit}</span>
              </div>
              <div className="text-[11px] text-gray-500 border-t border-gray-800/80 pt-2 flex justify-between">
                <span>{item.source}</span>
                <span className="text-emerald-500 font-mono">{item.classification}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Cross-Asset Transmission Matrix */}
      {activeTab === 'crossAsset' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-950 text-xs uppercase text-gray-400 border-b border-gray-800">
              <tr>
                <th className="p-4">Channel</th>
                <th className="p-4">Description</th>
                <th className="p-4">Elasticity</th>
                <th className="p-4">Formula</th>
                <th className="p-4">Economic Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 font-mono text-xs">
              {crossAssetRules?.map((rule, idx) => (
                <tr key={idx} className="hover:bg-gray-800/40 transition">
                  <td className="p-4 font-semibold text-blue-400">{rule.channel}</td>
                  <td className="p-4 font-sans text-gray-200">{rule.description}</td>
                  <td className="p-4 text-emerald-400">{rule.elasticity > 0 ? `+${rule.elasticity}` : rule.elasticity}</td>
                  <td className="p-4 text-amber-300">{rule.formula}</td>
                  <td className="p-4 font-sans text-gray-400">{rule.sourceRationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
