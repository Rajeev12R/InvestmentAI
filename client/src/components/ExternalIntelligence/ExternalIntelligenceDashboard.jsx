import React, { useState, useEffect } from 'react';

export default function ExternalIntelligenceDashboard() {
  const [activeTab, setActiveTab] = useState('sources');
  const [ticker, setTicker] = useState('NVDA');

  const [sources, setSources] = useState([
    { sourceId: 'src_sec_edgar', publisher: 'SEC EDGAR', sourceType: 'REGULATORY', verificationStatus: 'VERIFIED_REGULATORY', tier: 'TIER_1' },
    { sourceId: 'src_nvda_ir', publisher: 'NVIDIA Investor Relations', sourceType: 'COMPANY_PRIMARY', verificationStatus: 'VERIFIED_PRIMARY', tier: 'TIER_1' },
    { sourceId: 'src_similarweb', publisher: 'SimilarWeb Digital Insights', sourceType: 'ALTERNATIVE_DATA_VENDOR', verificationStatus: 'VERIFIED_VENDOR', tier: 'TIER_2' },
    { sourceId: 'src_tech_blog_01', publisher: 'Semiconductor Deep Dive', sourceType: 'WEB', verificationStatus: 'UNVERIFIED', tier: 'TIER_3' }
  ]);

  const [observations, setObservations] = useState([
    {
      id: 'obs_101',
      type: 'MANAGEMENT_COMMENTARY',
      subject: 'NVDA',
      speaker: 'Jensen Huang (CEO)',
      statement: 'Blackwell architecture demand is exceeding supply through 2026-H2.',
      classification: 'VALIDATED_EXTERNAL',
      attribution: 'MANAGEMENT_STATED',
      source: 'NVIDIA Investor Relations'
    },
    {
      id: 'obs_102',
      type: 'SUPPLY_CHAIN_SIGNAL',
      subject: 'NVDA',
      relationship: 'TSMC (CoWoS packaging capacity allocation +22%)',
      classification: 'VALIDATED_EXTERNAL',
      source: 'SimilarWeb Digital Insights'
    },
    {
      id: 'obs_103',
      type: 'REGULATORY_SIGNAL',
      subject: 'NVDA',
      agency: 'BIS / US Dept of Commerce',
      title: 'Advanced AI Accelerator Export License Rule',
      status: 'PROPOSED',
      isLegallyEffective: false,
      classification: 'VERIFIED_REGULATORY'
    },
    {
      id: 'obs_104',
      type: 'COMPETITIVE_SIGNAL',
      subject: 'NVDA',
      competitor: 'AMD',
      signal: 'MI350X ramp scheduled for Q4',
      classification: 'AI_EXTRACTED_CANDIDATE',
      isAi: true
    }
  ]);

  const [conflicts, setConflicts] = useState([
    {
      subject: 'NVDA',
      field: 'H200 Pricing Trend',
      sourceA: { name: 'Channel Check A', claim: 'ASP holding firm at $38,000' },
      sourceB: { name: 'Hardware Report B', claim: 'Spot discounting observed down to $34,500' },
      status: 'CONFLICTED',
      note: 'Preserved as CONFLICTED. No artificial blending.'
    }
  ]);

  const [candidates, setCandidates] = useState([
    {
      id: 'cand_001',
      targetFact: 'NVDA_FY25_CAPEX_EXPANSION',
      proposedValue: '$4.2B',
      verificationStatus: 'VERIFIED_PRIMARY',
      reviewStatus: 'PENDING_HUMAN_REVIEW'
    }
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Institutional External Intelligence & Alternative Data
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Governed Source Verification, Document Intelligence, Point-in-Time Anti-Lookahead & Truth Boundary
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-teal-950/80 border border-teal-700 text-teal-300 text-xs rounded-full font-mono">
            POINT_IN_TIME_SEALED
          </span>
          <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs rounded-full font-mono">
            AI_FACT_PROMOTION_BARRIER
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 my-6 overflow-x-auto pb-2 text-sm font-medium">
        {[
          { id: 'sources', label: 'Source Registry' },
          { id: 'inbox', label: 'External Research Inbox' },
          { id: 'datasets', label: 'Alternative Datasets' },
          { id: 'competitive', label: 'Competitive Signals' },
          { id: 'supplyChain', label: 'Supply Chain' },
          { id: 'management', label: 'Management Commentary' },
          { id: 'regulatory', label: 'Regulatory Intelligence' },
          { id: 'conflicts', label: 'Source Conflicts' },
          { id: 'performance', label: 'Signal Performance' },
          { id: 'promotion', label: 'Promotion Candidates' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Source Registry */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Governed External Source Registry</h2>
          <div className="grid gap-3">
            {sources.map(s => (
              <div key={s.sourceId} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100">{s.publisher}</span>
                    <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">{s.sourceType}</span>
                    <span className="text-xs px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-mono">{s.tier}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">ID: {s.sourceId}</div>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full font-mono border ${
                  s.verificationStatus.startsWith('VERIFIED')
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-amber-950 text-amber-300 border-amber-700'
                }`}>
                  {s.verificationStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: External Research Inbox */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Point-in-Time Observations Inbox</h2>
          <div className="grid gap-3">
            {observations.map(obs => (
              <div key={obs.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded font-mono font-bold">
                      {obs.type}
                    </span>
                    <span className="font-semibold text-slate-200">{obs.subject}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono border ${
                    obs.classification === 'AI_EXTRACTED_CANDIDATE'
                      ? 'bg-pink-950 text-pink-300 border-pink-700'
                      : 'bg-teal-950 text-teal-300 border-teal-700'
                  }`}>
                    {obs.classification}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{obs.statement || obs.relationship || obs.title || obs.signal}</p>
                {obs.speaker && (
                  <div className="text-xs text-slate-400 font-mono">
                    Attributed: {obs.speaker} ({obs.attribution})
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Management Commentary */}
      {activeTab === 'management' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Attributed Management Commentary</h2>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <div className="text-xs text-amber-400 bg-amber-950/40 p-2 rounded border border-amber-800">
              Non-Negotiable Rule: Management commentary is preserved as MANAGEMENT_STATED, never converted automatically to FACT without audited confirmation.
            </div>
            {observations.filter(o => o.type === 'MANAGEMENT_COMMENTARY').map(m => (
              <div key={m.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1">
                <div className="font-mono text-teal-300 font-bold">{m.speaker}</div>
                <div className="text-slate-200 italic">"{m.statement}"</div>
                <div className="text-slate-400">Source: {m.source}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Regulatory Intelligence */}
      {activeTab === 'regulatory' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Regulatory & Government Intelligence</h2>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <div className="text-xs text-cyan-400 bg-cyan-950/40 p-2 rounded border border-cyan-800">
              Regulatory Staging Rule: Proposed regulations remain explicitly PROPOSED and are not treated as legally EFFECTIVE until formal enactment.
            </div>
            {observations.filter(o => o.type === 'REGULATORY_SIGNAL').map(r => (
              <div key={r.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-100">{r.agency}: {r.title}</div>
                  <div className="text-slate-400 mt-1">Status: {r.status} (Legally Effective: {r.isLegallyEffective ? 'YES' : 'NO'})</div>
                </div>
                <span className="px-2 py-1 bg-amber-950 text-amber-300 border border-amber-700 rounded font-mono">
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Source Conflicts */}
      {activeTab === 'conflicts' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Preserved Source Disagreements & Conflicts</h2>
          <div className="grid gap-3">
            {conflicts.map((c, idx) => (
              <div key={idx} className="p-4 bg-slate-900 border border-red-900/60 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-red-300">{c.subject}: {c.field}</span>
                  <span className="px-2 py-0.5 bg-red-950 text-red-300 border border-red-700 text-xs rounded font-mono">
                    {c.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded">
                    <div className="text-slate-400 font-mono">{c.sourceA.name}</div>
                    <div className="text-slate-200 mt-1">{c.sourceA.claim}</div>
                  </div>
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded">
                    <div className="text-slate-400 font-mono">{c.sourceB.name}</div>
                    <div className="text-slate-200 mt-1">{c.sourceB.claim}</div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 italic pt-1">{c.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Promotion Candidates */}
      {activeTab === 'promotion' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Truth Promotion Review Gate</h2>
          <div className="grid gap-3">
            {candidates.map(cand => (
              <div key={cand.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-100">{cand.targetFact}: Proposed {cand.proposedValue}</div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">Verification: {cand.verificationStatus}</div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-xs font-semibold rounded-lg text-white">
                    Promote to Truth
                  </button>
                  <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
