import React, { useState, useEffect } from 'react';

export default function KnowledgeGraphDashboard() {
  const [activeTab, setActiveTab] = useState('entity');
  const [entityQuery, setEntityQuery] = useState('NVDA');
  const [entityData, setEntityData] = useState(null);
  const [neighborhoodData, setNeighborhoodData] = useState(null);
  const [commonDrivers, setCommonDrivers] = useState(null);
  const [decisionLineage, setDecisionLineage] = useState(null);
  const [qualityScore, setQualityScore] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchQuality();
  }, []);

  const fetchQuality = async () => {
    try {
      const res = await fetch('/api/knowledge-graph/quality', {
        headers: { 'x-workspace-id': 'WS-DEFAULT', 'x-user-role': 'ANALYST' }
      });
      if (res.ok) {
        const json = await res.json();
        setQualityScore(json.quality);
      }
    } catch (e) {
      console.error('Failed to fetch graph quality', e);
    }
  };

  const handleSearchEntity = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge-graph/entity/${entityQuery}/neighborhood?depth=2`, {
        headers: { 'x-workspace-id': 'WS-DEFAULT', 'x-user-role': 'ANALYST' }
      });
      if (res.ok) {
        const json = await res.json();
        setNeighborhoodData(json.neighborhood);
      }
    } catch (e) {
      console.error('Failed to search entity', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 text-slate-100 min-h-screen">
      <header className="mb-6 flex justify-between items-center border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Institutional Knowledge Graph</h1>
          <p className="text-sm text-slate-400">Deterministic cross-domain relationships, common drivers & decision lineage</p>
        </div>
        {qualityScore && (
          <div className="flex gap-4 text-xs bg-slate-800 p-2 rounded border border-slate-700">
            <div><span className="text-slate-400">Health Score:</span> <span className="font-semibold text-emerald-400">{qualityScore.graphHealthScore}/100</span></div>
            <div><span className="text-slate-400">Provenance:</span> <span className="font-semibold text-indigo-400">{qualityScore.provenanceCoveragePct}%</span></div>
            <div><span className="text-slate-400">Verification:</span> <span className="font-semibold text-sky-400">{qualityScore.verificationCoveragePct}%</span></div>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-800">
        {[
          { id: 'entity', label: 'Entity Intelligence & Neighborhood' },
          { id: 'drivers', label: 'Portfolio Common Drivers' },
          { id: 'lineage', label: 'Decision & Thesis Lineage' },
          { id: 'quality', label: 'Graph Integrity & Quality' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'entity' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={entityQuery}
              onChange={(e) => setEntityQuery(e.target.value)}
              placeholder="Enter ticker (e.g. NVDA, AAPL, META)..."
              className="bg-slate-800 border border-slate-700 px-4 py-2 rounded text-sm text-white focus:outline-none focus:border-indigo-500 w-80"
            />
            <button
              onClick={handleSearchEntity}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              Traverse Neighborhood
            </button>
          </div>

          {neighborhoodData && (
            <div className="bg-slate-800/60 p-4 rounded border border-slate-700">
              <h3 className="font-semibold text-white mb-2">Neighborhood Nodes ({neighborhoodData.nodeCount})</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {neighborhoodData.nodes.map(n => (
                  <div key={n.nodeId} className="p-3 bg-slate-800 rounded border border-slate-700 text-xs">
                    <div className="font-bold text-indigo-300">{n.label || n.nodeId}</div>
                    <div className="text-slate-400">Type: {n.nodeType}</div>
                    <div className="text-slate-500 text-[10px]">Canonical: {n.canonicalId}</div>
                  </div>
                ))}
              </div>

              <h3 className="font-semibold text-white mb-2">Connected Relationships ({neighborhoodData.relationshipCount})</h3>
              <div className="space-y-2 text-xs">
                {neighborhoodData.relationships.map(r => (
                  <div key={r.relationshipId} className="p-2 bg-slate-900/80 rounded border border-slate-700 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-sky-400">{r.fromNodeId}</span>
                      <span className="mx-2 text-slate-500">--[{r.relationshipType}]--&gt;</span>
                      <span className="font-semibold text-sky-400">{r.toNodeId}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${r.status === 'VERIFIED' ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'drivers' && (
        <div className="bg-slate-800/60 p-4 rounded border border-slate-700 text-sm">
          <h3 className="font-semibold text-white mb-2">Common Economic Driver Concentration</h3>
          <p className="text-xs text-slate-400 mb-4">Uncovers hidden portfolio concentration across holdings sharing identical underlying themes (e.g. AI Capex, Cloud Demand).</p>
          <div className="text-xs text-slate-400">Select or load a portfolio to calculate Driver HHI and effective number of drivers ($N_eff$).</div>
        </div>
      )}

      {activeTab === 'lineage' && (
        <div className="bg-slate-800/60 p-4 rounded border border-slate-700 text-sm">
          <h3 className="font-semibold text-white mb-2">Decision & Thesis Audit Lineage</h3>
          <p className="text-xs text-slate-400 mb-4">Full provenance trace from Decision &rarr; Thesis &rarr; Expected Driver &rarr; Evidence &rarr; Financial Fact &rarr; Source.</p>
        </div>
      )}

      {activeTab === 'quality' && qualityScore && (
        <div className="bg-slate-800/60 p-4 rounded border border-slate-700 text-sm space-y-3">
          <h3 className="font-semibold text-white">Graph Data Quality Scorecard</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-800 p-3 rounded border border-slate-700">
              <div className="text-slate-400">Provenance Coverage</div>
              <div className="text-lg font-bold text-indigo-400">{qualityScore.provenanceCoveragePct}%</div>
            </div>
            <div className="bg-slate-800 p-3 rounded border border-slate-700">
              <div className="text-slate-400">Verification Coverage</div>
              <div className="text-lg font-bold text-sky-400">{qualityScore.verificationCoveragePct}%</div>
            </div>
            <div className="bg-slate-800 p-3 rounded border border-slate-700">
              <div className="text-slate-400">Orphan Node Count</div>
              <div className="text-lg font-bold text-amber-400">{qualityScore.orphanNodeCount}</div>
            </div>
            <div className="bg-slate-800 p-3 rounded border border-slate-700">
              <div className="text-slate-400">Conflicted Relationships</div>
              <div className="text-lg font-bold text-rose-400">{qualityScore.conflictedRelationshipCount}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
