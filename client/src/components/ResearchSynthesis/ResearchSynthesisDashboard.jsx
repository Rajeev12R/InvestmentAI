import React, { useState, useEffect } from 'react';

export default function ResearchSynthesisDashboard() {
  const [activeTab, setActiveTab] = useState('brief');
  const [ticker, setTicker] = useState('NVDA');
  const [loading, setLoading] = useState(false);
  const [briefData, setBriefData] = useState({
    subjectId: 'NVDA',
    productType: 'SECURITY_BRIEF',
    knowledgeCutoff: '2026-03-01T00:00:00.000Z',
    reviewerStatus: 'HUMAN_APPROVED',
    sections: {
      executiveConclusion: 'Comprehensive evaluation of NVDA indicates strong fundamental momentum with $100.0M revenue (+12.5% YoY) and $150.0 DCF fair value vs current market spot of $140.0.',
      whatChanged: 'Latest earnings surprise (+8.7%) confirmed datacenter compute acceleration, leading to forward EPS revision (+7.8%).',
      investmentCase: 'Market leader in enterprise AI compute architectures with sustainable gross margin moat above 65%.',
      whatCouldGoRight: 'Next-gen architecture volume ramp (2026-H1); Enterprise software margin expansion',
      whatCouldGoWrong: 'Supply chain concentration in Taiwan strait; Multiple duration compression under hawkish rates',
      valuationAnalysis: 'DCF Fair Value: $150.0 (Base WACC 8.5%), Relative Fair Value: $165.0, Reverse DCF Implied Growth: 14.2%.',
      macroContext: 'Operating under LATE_CYCLE_DISINFLATION regime. Negative interest rate sensitivity (-0.85).',
      portfolioContext: 'Portfolio Allocation: 4.5%. Key Drivers: AI_CAPEX, CLOUD_ADOPTION. Shared Risks: TAIWAN_STRAIT_GEOPOLITICAL.'
    },
    claims: [
      { id: 'C1', text: 'Reported FY revenue of $100.0M with 12.5% YoY growth', type: 'FACT', evidence: 'EV_SEC_10K_2024', status: 'VERIFIED_HIGH' },
      { id: 'C2', text: 'DCF model fair value estimate is $150.0 (WACC: 8.5%, Growth: 2.5%)', type: 'MODEL_ESTIMATE', evidence: 'EV_VAL_DCF_01', status: 'MODEL_MODERATE' },
      { id: 'C3', text: 'Forward FY EPS forecast is $4.85 (Revision: +7.78%)', type: 'FORECAST', evidence: 'EV_FCST_V2', status: 'MODEL_MODERATE' },
      { id: 'C4', text: 'Operating under LATE_CYCLE_DISINFLATION macro regime', type: 'DERIVED', evidence: 'EV_FED_MACRO_01', status: 'CALCULATED_HIGH' },
      { id: 'C5', text: 'Hypothesis: Proprietary interconnect creates 3-year switching cost barrier', type: 'AI_HYPOTHESIS', evidence: 'UNVERIFIED_PROSE', status: 'HYPOTHETICAL_UNVERIFIED' }
    ],
    modelAgreement: {
      dispersionSpreadPct: 10.0,
      agreementClass: 'CONVERGENT',
      models: [
        { modelName: 'DCF_MODEL', value: 150.0 },
        { modelName: 'RELATIVE_VALUATION', value: 165.0 },
        { modelName: 'REVERSE_DCF', value: 140.0 }
      ]
    },
    thesisHealth: {
      healthStatus: 'SUPPORTED',
      confirmedDriversCount: 2,
      failingDriversCount: 0,
      triggeredBreakersCount: 0,
      summary: 'Thesis evaluated as SUPPORTED based on 2/2 positive drivers and 0 triggered breakers'
    }
  });

  const getClaimBadgeClass = (type) => {
    switch (type) {
      case 'FACT': return 'bg-emerald-900/60 text-emerald-300 border-emerald-700';
      case 'DERIVED': return 'bg-cyan-900/60 text-cyan-300 border-cyan-700';
      case 'MODEL_ESTIMATE': return 'bg-blue-900/60 text-blue-300 border-blue-700';
      case 'FORECAST': return 'bg-purple-900/60 text-purple-300 border-purple-700';
      case 'SCENARIO': return 'bg-amber-900/60 text-amber-300 border-amber-700';
      case 'AI_HYPOTHESIS': return 'bg-pink-900/60 text-pink-300 border-pink-700 font-bold';
      default: return 'bg-gray-800 text-gray-300 border-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">📜</span>
              Institutional Research Synthesis
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Phase 24 Deterministic
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Evidence-First Institutional Research Products, Multi-Model Agreement & Human Approval Gating
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-sm text-white font-mono w-24 text-center focus:outline-none focus:border-indigo-500"
            placeholder="TICKER"
          />
          <button
            onClick={() => {}}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium transition"
          >
            Generate Brief
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 mt-6 space-x-6">
        {[
          { id: 'brief', label: 'Executive Brief' },
          { id: 'claims', label: 'Evidence & Claims Explorer' },
          { id: 'models', label: 'Model Agreement & Dispersion' },
          { id: 'thesis', label: 'Thesis Health & Decision Review' },
          { id: 'approval', label: 'Human Review Queue' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 text-sm font-medium transition border-b-2 ${
              activeTab === t.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="mt-6 space-y-6">
        {activeTab === 'brief' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Main Brief Sections */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-white">Executive Conclusion</h2>
                  <span className="px-2 py-0.5 text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-700 rounded">
                    Cutoff: {new Date(briefData.knowledgeCutoff).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed text-sm">{briefData.sections.executiveConclusion}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-emerald-400 mb-2">What Changed</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{briefData.sections.whatChanged}</p>
                </div>
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-cyan-400 mb-2">Investment Thesis</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{briefData.sections.investmentCase}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-green-400 mb-2">What Could Go Right (Catalysts)</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{briefData.sections.whatCouldGoRight}</p>
                </div>
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-rose-400 mb-2">What Could Go Wrong (Risks & Breakers)</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{briefData.sections.whatCouldGoWrong}</p>
                </div>
              </div>
            </div>

            {/* Right Col: Metadata & Model Status */}
            <div className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur space-y-4">
                <h3 className="text-sm font-semibold text-slate-200">Synthesis Metadata</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Subject Ticker:</span>
                    <span className="font-mono text-indigo-400">{briefData.subjectId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Review Status:</span>
                    <span className="text-emerald-400 font-semibold">{briefData.reviewerStatus}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Thesis State:</span>
                    <span className="text-cyan-400 font-semibold">{briefData.thesisHealth.healthStatus}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Model Agreement:</span>
                    <span className="text-blue-400">{briefData.modelAgreement.agreementClass} ({briefData.modelAgreement.dispersionSpreadPct}% spread)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Verified Claims:</span>
                    <span className="text-slate-200 font-mono">{briefData.claims.length} claims</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'claims' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Evidence-First Claim Explorer</h2>
            <div className="space-y-3">
              {briefData.claims.map((claim) => (
                <div key={claim.id} className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-lg flex flex-col md:flex-row justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded border ${getClaimBadgeClass(claim.type)}`}>
                        {claim.type}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">{claim.id}</span>
                    </div>
                    <p className="text-sm text-slate-200 pt-1">{claim.text}</p>
                  </div>
                  <div className="text-xs text-slate-400 md:text-right flex md:flex-col justify-between md:justify-center shrink-0">
                    <span className="text-indigo-400 font-mono">{claim.evidence}</span>
                    <span className="text-slate-500">{claim.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'models' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Valuation Model Disagreement & Dispersion</h2>
              <span className="px-3 py-1 bg-blue-900/30 text-blue-400 border border-blue-700 rounded-lg text-xs font-semibold">
                Class: {briefData.modelAgreement.agreementClass}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {briefData.modelAgreement.models.map((m) => (
                <div key={m.modelName} className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-center">
                  <div className="text-xs text-slate-400 mb-1">{m.modelName}</div>
                  <div className="text-2xl font-bold text-white font-mono">${m.value.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'thesis' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white">Thesis Health & Decision Review</h2>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-cyan-400">Thesis Health Evaluation</span>
                <span className="px-2.5 py-0.5 bg-emerald-900/40 text-emerald-400 border border-emerald-700 rounded text-xs">
                  {briefData.thesisHealth.healthStatus}
                </span>
              </div>
              <p className="text-xs text-slate-300">{briefData.thesisHealth.summary}</p>
            </div>
          </div>
        )}

        {activeTab === 'approval' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Human Approval & Governance Queue</h2>
            <p className="text-xs text-slate-400">
              AI cannot self-approve research products. All research products must be reviewed and signed off by authorized analysts or portfolio managers prior to external distribution.
            </p>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex justify-between items-center">
              <div>
                <div className="text-sm font-medium text-white">Research Brief: NVDA-2026-Q1</div>
                <div className="text-xs text-slate-500">Status: HUMAN_APPROVED | Approver: USR-ANALYST-1</div>
              </div>
              <button className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition">
                Publish Product
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
