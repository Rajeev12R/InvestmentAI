import React, { useState, useEffect } from 'react';

export default function PortfolioBenchmarkComparison({ portfolioId = 'PORTFOLIO_ALPHA' }) {
  const [activeTab, setActiveTab] = useState('performance');
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPackage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio-analytics/${portfolioId}/package`);
      if (res.ok) {
        const data = await res.json();
        setPackageData(data);
      } else {
        setError(`Failed to load portfolio package (HTTP ${res.status})`);
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackage();
  }, [portfolioId]);

  const p = packageData?.performance;
  const attr = packageData?.attribution;
  const b = packageData?.benchmark;
  const risk = packageData?.factorExposures;
  const dd = packageData?.drawdownIntelligence;
  const theses = packageData?.thesisAttribution || [];
  const drift = packageData?.driftAndRebalancing;
  const seal = packageData?.seal;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white tracking-tight">Institutional Performance & Attribution</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Deterministic Analytics
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Time-Weighted Return (TWR), Brinson attribution, factor risk exposures, thesis validation against Truth Facts, and sealed SHA-256 packages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {seal && (
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider">Sealed SHA-256</span>
              <span className="text-xs font-mono text-indigo-400">{seal.packageHash.substring(0, 12)}...</span>
            </div>
          )}
          <button
            onClick={fetchPackage}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
          >
            {loading ? 'Refreshing...' : 'Refresh Package'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-xs font-mono">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-px">
        {[
          { id: 'performance', label: 'Performance & Benchmarks' },
          { id: 'attribution', label: 'Attribution & Brinson' },
          { id: 'risk', label: 'Risk & Factor Exposures' },
          { id: 'thesis', label: 'Thesis Performance Tracking' },
          { id: 'drift', label: 'Drift & Rebalancing' },
          { id: 'seal', label: 'Sealed Package Audit' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {packageData && (
        <div className="space-y-6">
          {/* TAB 1: Performance */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block">Time-Weighted Return (TWR)</span>
                  <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">
                    {p?.timeWeightedReturn?.twrPercentage !== undefined
                      ? `${p.timeWeightedReturn.twrPercentage > 0 ? '+' : ''}${p.timeWeightedReturn.twrPercentage.toFixed(2)}%`
                      : 'N/A'}
                  </span>
                  <span className="text-[10px] text-slate-500">Sub-period geometric compounding</span>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block">Annualized Volatility</span>
                  <span className="text-2xl font-bold text-amber-400 font-mono mt-1 block">
                    {p?.riskAdjustedMetrics?.metrics?.annualizedVolatility !== undefined
                      ? `${(p.riskAdjustedMetrics.metrics.annualizedVolatility * 100).toFixed(2)}%`
                      : 'N/A'}
                  </span>
                  <span className="text-[10px] text-slate-500">252-day annualized standard dev</span>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block">Sharpe Ratio</span>
                  <span className="text-2xl font-bold text-indigo-400 font-mono mt-1 block">
                    {p?.riskAdjustedMetrics?.metrics?.sharpeRatio !== undefined
                      ? p.riskAdjustedMetrics.metrics.sharpeRatio.toFixed(2)
                      : 'N/A'}
                  </span>
                  <span className="text-[10px] text-slate-500">Risk-free rate: {(p?.riskAdjustedMetrics?.metrics?.riskFreeRate * 100 || 4).toFixed(1)}%</span>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block">Maximum Drawdown</span>
                  <span className="text-2xl font-bold text-red-400 font-mono mt-1 block">
                    {dd?.maxDrawdownPercentage !== undefined
                      ? `-${dd.maxDrawdownPercentage.toFixed(2)}%`
                      : 'N/A'}
                  </span>
                  <span className="text-[10px] text-slate-500">Peak to trough decline</span>
                </div>
              </div>

              {/* Benchmark Relative Comparison */}
              {b?.metrics && (
                <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">
                      Benchmark Comparison ({b.benchmarkMetadata?.name || '^GSPC'})
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                      b.metrics.activeAnnualizedReturn >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {b.interpretation?.relativeAssessment}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block">Portfolio Annualized</span>
                      <span className="text-white font-bold">{(b.metrics.portfolioAnnualizedReturn * 100).toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Benchmark Annualized</span>
                      <span className="text-white font-bold">{(b.metrics.benchmarkAnnualizedReturn * 100).toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Active Return (Alpha)</span>
                      <span className={`font-bold ${b.metrics.activeAnnualizedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {b.metrics.activeAnnualizedReturn >= 0 ? '+' : ''}{(b.metrics.activeAnnualizedReturn * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Tracking Error</span>
                      <span className="text-white font-bold">{(b.metrics.trackingError * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Attribution */}
          {activeTab === 'attribution' && (
            <div className="space-y-6">
              {/* Position Level Contributions */}
              <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Position-Level Contribution Analysis</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                    attr?.positionLevel?.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    Reconciliation: {attr?.positionLevel?.status || 'UNKNOWN'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="py-2">Security</th>
                        <th className="py-2">Sector</th>
                        <th className="py-2">Beg Weight</th>
                        <th className="py-2">End Weight</th>
                        <th className="py-2">Asset Return</th>
                        <th className="py-2 text-right">Contribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {attr?.positionLevel?.positions?.map((pos, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2.5 font-bold text-white">{pos.ticker}</td>
                          <td className="py-2.5 text-slate-400">{pos.sector}</td>
                          <td className="py-2.5 text-slate-300">{(pos.beginningWeight * 100).toFixed(1)}%</td>
                          <td className="py-2.5 text-slate-300">{(pos.endingWeight * 100).toFixed(1)}%</td>
                          <td className={`py-2.5 ${pos.totalAssetReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pos.totalAssetReturn >= 0 ? '+' : ''}{(pos.totalAssetReturn * 100).toFixed(2)}%
                          </td>
                          <td className={`py-2.5 text-right font-bold ${pos.totalContribution >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pos.totalContribution >= 0 ? '+' : ''}{(pos.totalContribution * 100).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Brinson Attribution */}
              {attr?.brinsonFachler?.sectorEffects && (
                <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="text-sm font-semibold text-white">Brinson-Fachler Sector Attribution</h3>
                  <div className="grid grid-cols-3 gap-4 text-xs font-mono p-3 bg-slate-950/40 rounded-lg">
                    <div>
                      <span className="text-slate-400 block">Allocation Effect</span>
                      <span className="text-emerald-400 font-bold">
                        {(attr.brinsonFachler.totalAllocationEffect * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Selection Effect</span>
                      <span className="text-indigo-400 font-bold">
                        {(attr.brinsonFachler.totalSelectionEffect * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Interaction Effect</span>
                      <span className="text-amber-400 font-bold">
                        {(attr.brinsonFachler.totalInteractionEffect * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Risk */}
          {activeTab === 'risk' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-semibold text-white">Factor & Concentration Profile</h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Portfolio Beta</span>
                    <span className="text-white font-bold">{risk?.portfolioExposures?.portfolioBeta?.toFixed(2) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Concentration (HHI)</span>
                    <span className="text-white font-bold">{risk?.portfolioExposures?.concentrationHHI?.toFixed(4) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Effective Positions (N_eff)</span>
                    <span className="text-white font-bold">{risk?.portfolioExposures?.effectivePositionsCount?.toFixed(1) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Max Sector Concentration</span>
                    <span className="text-white font-bold">
                      {risk?.portfolioExposures?.maxSectorConcentration ? `${(risk.portfolioExposures.maxSectorConcentration * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-semibold text-white">Risk Classification</h3>
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-950/40 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase">Concentration Level</span>
                    <span className="text-emerald-400 font-bold font-mono">{risk?.riskLabels?.concentration || 'WELL_DIVERSIFIED'}</span>
                  </div>
                  <div className="p-3 bg-slate-950/40 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase">Market Sensitivity</span>
                    <span className="text-indigo-400 font-bold font-mono">{risk?.riskLabels?.marketSensitivity || 'MARKET_ALIGNED'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Thesis */}
          {activeTab === 'thesis' && (
            <div className="space-y-4">
              {theses.map((th, idx) => (
                <div key={idx} className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">{th.ticker} — {th.thesisTitle}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">Decision Ref: {th.decisionId}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
                      th.thesisStatus === 'WORKING' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      th.thesisStatus === 'WEAKENING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                      th.thesisStatus === 'BROKEN' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {th.thesisStatus}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">{th.statusRationale}</p>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Driver Validations:</span>
                    {th.driverEvaluations?.map((d, dIdx) => (
                      <div key={dIdx} className="flex items-center justify-between text-xs font-mono bg-slate-950/40 p-2 rounded">
                        <span className="text-slate-300">{d.driverMetric} (Exp: {d.expectedDirection})</span>
                        <span className={`font-bold ${d.assessment === 'SUPPORTED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {d.assessment} ({d.deltaBps > 0 ? '+' : ''}{d.deltaBps} bps)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: Drift */}
          {activeTab === 'drift' && (
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Target Allocation Drift Analysis</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400">
                  Human Approval Boundary Preserved
                </span>
              </div>

              {drift?.rebalanceRecommendations?.length > 0 ? (
                <div className="space-y-2">
                  {drift.rebalanceRecommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/40 rounded-lg flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="font-bold text-white block">{rec.ticker} — {rec.action}</span>
                        <span className="text-slate-400">{rec.narrative}</span>
                      </div>
                      <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-[10px] font-bold">
                        RECOMMENDATION ONLY
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No material portfolio drift detected across positions or sectors.</p>
              )}
            </div>
          )}

          {/* TAB 6: Sealed Package Audit */}
          {activeTab === 'seal' && (
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-white">Sealed Package Cryptographic Audit</h3>
              <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 rounded-lg space-y-2">
                <div><span className="text-slate-500">Package ID:</span> {packageData.packageId}</div>
                <div><span className="text-slate-500">Timestamp:</span> {packageData.timestamp}</div>
                <div><span className="text-slate-500">Base Currency:</span> {packageData.baseCurrency}</div>
                <div><span className="text-slate-500">SHA-256 Digest:</span> <span className="text-indigo-400 break-all">{seal?.packageHash}</span></div>
                <div><span className="text-slate-500">Governance:</span> {packageData.governance?.calculationEngine}</div>
                <div><span className="text-slate-500">Automated Execution:</span> <span className="text-emerald-400 font-bold">BLOCKED (Human confirmation mandatory)</span></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
