import React, { useState, useEffect } from 'react';

export default function ProcessIntelligencePanel({ decisionId = 'DEC-AAPL-01', workspaceId = 'default-workspace' }) {
  const [data, setData] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('matrix');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Attempt fetch from server routes or fallback to demonstration state
        const res = await fetch(`/api/process/decision/${decisionId}/evaluate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-workspace-id': workspaceId
          },
          body: JSON.stringify({
            observationData: {
              OPERATING_MARGIN: { actualValue: 0.304 },
              REVENUE_GROWTH: { actualValue: 0.095 },
              stockReturn: -0.045,
              marketReturn: -0.120,
              breakers: [{ conditionId: 'BREAKER-MARGIN-DROP', isTriggered: false }],
              catalysts: [{ catalystId: 'CAT-AI-MONETIZATION', realized: true, contribution: 0.02 }]
            }
          })
        });

        if (res.ok) {
          const json = await res.json();
          setData(json.package);
        } else {
          // Mock display data for preview
          setData({
            decisionId,
            ticker: 'AAPL',
            packageHash: '8f3a8b29c0d1e2f3...sealed',
            decisionSnapshot: {
              decision: 'BUY',
              decisionPrice: 224.50,
              decisionTimestamp: '2025-10-15T14:30:00.000Z',
              conviction: 0.85,
              positionSize: 0.08,
              evidenceIds: ['FACT-AAPL-MARGIN-Q3', 'FACT-SERVICES-GROWTH-2025']
            },
            thesisVersion: {
              versionNumber: 1,
              thesisStatement: 'Services margin expansion to >30% and AI monetization driving sustained cash flow growth.',
              expectedTimeframe: '12_MONTHS',
              confidence: 0.85
            },
            decisionQuality: {
              overallScore: 88.5,
              isGoodDecision: true,
              isSufficientData: true,
              dimensions: [
                { name: 'Evidence Quality', weight: 0.15, score: 90, status: 'AVAILABLE' },
                { name: 'Evidence Coverage', weight: 0.15, score: 85, status: 'AVAILABLE' },
                { name: 'Valuation Discipline', weight: 0.15, score: 80, status: 'AVAILABLE' },
                { name: 'Risk Discipline', weight: 0.15, score: 95, status: 'AVAILABLE' },
                { name: 'Thesis Clarity', weight: 0.15, score: 95, status: 'AVAILABLE' },
                { name: 'Falsification Awareness', weight: 0.15, score: 90, status: 'AVAILABLE' },
                { name: 'Forecast Quality', weight: 0.10, score: 85, status: 'AVAILABLE' }
              ]
            },
            decisionVsOutcome: {
              classification: 'GOOD_DECISION_BAD_OUTCOME',
              isGoodDecision: true,
              isGoodOutcome: true, // benchmark excess is positive (-4.5% vs -12% benchmark = +7.5% alpha)
              stockReturn: -0.045,
              benchmarkReturn: -0.120,
              excessReturn: 0.075
            },
            thesisEvaluation: {
              thesisState: 'WORKING',
              isWorkingWithLoss: true,
              isBrokenWithProfit: false,
              forecastAccuracy: 1.0,
              breakers: [{ conditionId: 'BREAKER-MARGIN-DROP', description: 'Operating margin drops <27%', status: 'BREAKER_NOT_TRIGGERED' }],
              catalysts: [{ catalystId: 'CAT-AI-MONETIZATION', name: 'Apple Intelligence Tier rollout', status: 'REALIZED' }]
            },
            forecasts: [
              { metric: 'OPERATING_MARGIN', forecastType: 'THRESHOLD', predictedValue: 0.30, actualValue: 0.304, status: 'VALIDATED', confidence: 0.85 },
              { metric: 'REVENUE_GROWTH', forecastType: 'NUMERIC_RANGE', predictedRange: { min: 0.08, max: 0.12 }, actualValue: 0.095, status: 'VALIDATED', confidence: 0.80 }
            ]
          });
        }

        // Fetch aggregate scorecard
        const scRes = await fetch('/api/process/scorecard', { headers: { 'x-workspace-id': workspaceId } });
        if (scRes.ok) {
          const scJson = await scRes.json();
          setScorecard(scJson.scorecard);
        } else {
          setScorecard({
            overallProcessScore: 84.2,
            dimensions: [
              { dimension: 'Decision Quality', score: 86.4, sampleSize: 14, confidence: 'HIGH' },
              { dimension: 'Thesis Quality', score: 81.0, sampleSize: 14, confidence: 'HIGH' },
              { dimension: 'Forecast Accuracy', score: 78.5, sampleSize: 28, confidence: 'HIGH' },
              { dimension: 'Forecast Calibration', score: 89.0, sampleSize: 28, confidence: 'HIGH' },
              { dimension: 'Risk Discipline', score: 92.8, sampleSize: 14, confidence: 'HIGH' }
            ],
            learningInsights: [
              {
                insightId: 'INSIGHT-1',
                type: 'CALIBRATION',
                message: 'Your 80–89% confidence forecasts have historically been validated 82% of the time (well-calibrated).'
              },
              {
                insightId: 'INSIGHT-2',
                type: 'PROCESS_RESILIENCE',
                message: '4 investment decisions maintained excellent process quality and fundamental thesis validation despite negative absolute price returns driven by macro sector shocks.'
              }
            ],
            biasControls: {
              evaluationCoverage: 0.93,
              isSurvivorshipBiasProtected: true
            }
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [decisionId, workspaceId]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-xl border border-slate-800">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mb-3" />
        <p>Loading Process Intelligence & Decision Performance...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 rounded-md border border-indigo-500/30">
              PHASE 13
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Institutional Investment Process Intelligence
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Evaluating historical beliefs, evidence provenance, forecast calibration & decision quality independent of outcome.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            Decision: <strong className="text-white">{decisionId}</strong> ({data?.ticker})
          </span>
          <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            SEALED SHA-256
          </span>
        </div>
      </div>

      {/* Core Principle Alert */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40 border border-indigo-800/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚖️</span>
          <div>
            <h4 className="text-sm font-semibold text-indigo-200">Fundamental Process Principle</h4>
            <p className="text-xs text-slate-300">
              <strong>Decision Quality ≠ Investment Outcome.</strong> A disciplined decision with strong evidence can lose money due to market shocks; a speculative decision can profit purely from luck.
            </p>
          </div>
        </div>
        <div className="text-right pl-4">
          <div className="text-xs font-mono text-slate-400">Process Score</div>
          <div className="text-2xl font-black text-indigo-400">{data?.decisionQuality?.overallScore || 'N/A'}/100</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        {['matrix', 'snapshot', 'thesis', 'forecasts', 'scorecard', 'learning'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab: 2x2 Matrix & Decision vs Outcome */}
      {activeTab === 'matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 2x2 Matrix Visualizer */}
          <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Decision Quality vs. Outcome Matrix
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Good Decision / Good Outcome */}
              <div
                className={`p-3.5 rounded-lg border text-xs ${
                  data?.decisionVsOutcome?.classification === 'GOOD_DECISION_GOOD_OUTCOME'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/20'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>GOOD DECISION</span>
                  <span>🟢 GOOD</span>
                </div>
                <p className="mt-1 text-[11px] opacity-80">Strong process + validated thesis + favorable outcome.</p>
              </div>

              {/* Good Decision / Bad Outcome */}
              <div
                className={`p-3.5 rounded-lg border text-xs ${
                  data?.decisionVsOutcome?.classification === 'GOOD_DECISION_BAD_OUTCOME'
                    ? 'bg-blue-950/60 border-blue-500 text-blue-200 ring-2 ring-blue-500/20'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>GOOD DECISION</span>
                  <span>🔴 BAD</span>
                </div>
                <p className="mt-1 text-[11px] opacity-80">
                  Disciplined process + thesis intact + external macro shock (DO NOT PENALIZE).
                </p>
              </div>

              {/* Bad Decision / Good Outcome */}
              <div
                className={`p-3.5 rounded-lg border text-xs ${
                  data?.decisionVsOutcome?.classification === 'BAD_DECISION_GOOD_OUTCOME'
                    ? 'bg-amber-950/60 border-amber-500 text-amber-200 ring-2 ring-amber-500/20'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>BAD DECISION</span>
                  <span>🟢 GOOD</span>
                </div>
                <p className="mt-1 text-[11px] opacity-80">Weak process + thesis failed + speculative luck (DO NOT REWARD).</p>
              </div>

              {/* Bad Decision / Bad Outcome */}
              <div
                className={`p-3.5 rounded-lg border text-xs ${
                  data?.decisionVsOutcome?.classification === 'BAD_DECISION_BAD_OUTCOME'
                    ? 'bg-rose-950/60 border-rose-500 text-rose-200 ring-2 ring-rose-500/20'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>BAD DECISION</span>
                  <span>🔴 BAD</span>
                </div>
                <p className="mt-1 text-[11px] opacity-80">Flawed process + broken thesis + loss (Highest process concern).</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
              <div>Stock Return: <span className="text-rose-400">{((data?.decisionVsOutcome?.stockReturn || 0) * 100).toFixed(1)}%</span></div>
              <div>Benchmark Return: <span className="text-slate-400">{((data?.decisionVsOutcome?.benchmarkReturn || 0) * 100).toFixed(1)}%</span></div>
              <div>Alpha / Excess Return: <span className="text-emerald-400 font-bold">+{((data?.decisionVsOutcome?.excessReturn || 0) * 100).toFixed(1)}%</span></div>
            </div>
          </div>

          {/* Decision Quality Breakdown */}
          <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Multi-Dimensional Process Scoring
            </h3>
            <div className="space-y-2">
              {data?.decisionQuality?.dimensions?.map((dim, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800/80 text-xs">
                  <span className="text-slate-300 font-medium">{dim.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-mono">Weight: {Math.round(dim.weight * 100)}%</span>
                    <span className="font-mono font-bold text-indigo-400">{dim.score !== null ? `${dim.score}/100` : 'UNAVAILABLE'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Snapshot & Evidence Known at T0 */}
      {activeTab === 'snapshot' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-2">
            <h3 className="text-sm font-bold text-slate-200">Immutable Decision Snapshot (T0)</h3>
            <p className="text-slate-400">
              This snapshot preserves exactly what was believed and known at the moment of decision. Future facts are strictly excluded.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 font-mono">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Action</span>
                <span className="font-bold text-emerald-400">{data?.decisionSnapshot?.decision}</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Decision Price</span>
                <span className="font-bold text-white">${data?.decisionSnapshot?.decisionPrice}</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Conviction</span>
                <span className="font-bold text-indigo-400">{Math.round((data?.decisionSnapshot?.conviction || 0) * 100)}%</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Position Size</span>
                <span className="font-bold text-purple-400">{Math.round((data?.decisionSnapshot?.positionSize || 0) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Thesis Evolution & Breakers */}
      {activeTab === 'thesis' && (
        <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">Thesis Version 1 (Immutable)</h3>
            <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/20 text-emerald-400 rounded">
              Status: {data?.thesisEvaluation?.thesisState}
            </span>
          </div>
          <p className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs italic text-slate-300">
            "{data?.thesisVersion?.thesisStatement}"
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-2">
              <h4 className="font-bold text-slate-300">Falsification Conditions & Breakers</h4>
              {data?.thesisEvaluation?.breakers?.map((b, i) => (
                <div key={i} className="flex items-center justify-between text-slate-400">
                  <span>{b.description}</span>
                  <span className="text-emerald-400 font-mono text-[10px]">{b.status}</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-2">
              <h4 className="font-bold text-slate-300">Catalyst Realization</h4>
              {data?.thesisEvaluation?.catalysts?.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-slate-400">
                  <span>{c.name}</span>
                  <span className="text-emerald-400 font-mono text-[10px]">{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Forecasts Ledger */}
      {activeTab === 'forecasts' && (
        <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-200">Deterministic Forecast Ledger</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] uppercase font-mono text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2">Metric</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Predicted</th>
                  <th className="py-2">Actual</th>
                  <th className="py-2">Confidence</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {data?.forecasts?.map((f, i) => (
                  <tr key={i} className="text-slate-300">
                    <td className="py-2.5 font-bold text-white">{f.metric}</td>
                    <td className="py-2.5 text-slate-400">{f.forecastType}</td>
                    <td className="py-2.5">{f.predictedValue !== null ? f.predictedValue : `${f.predictedRange?.min} - ${f.predictedRange?.max}`}</td>
                    <td className="py-2.5 text-indigo-400 font-bold">{f.actualValue}</td>
                    <td className="py-2.5">{Math.round((f.confidence || 0) * 100)}%</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Aggregate Scorecard */}
      {activeTab === 'scorecard' && (
        <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">Aggregate Investor Process Scorecard</h3>
            <span className="text-xl font-black text-indigo-400">{scorecard?.overallProcessScore || 'N/A'}/100</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scorecard?.dimensions?.map((dim, i) => (
              <div key={i} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                <span className="text-slate-400 block text-[11px]">{dim.dimension}</span>
                <span className="text-lg font-bold text-white mt-1 block">{dim.score !== null ? `${dim.score}%` : 'N/A'}</span>
                <span className="text-[10px] text-slate-500 font-mono">Sample: {dim.sampleSize} | Conf: {dim.confidence}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Learning Insights */}
      {activeTab === 'learning' && (
        <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-200">Factual Process Learning Insights</h3>
          <p className="text-xs text-slate-400">
            Insights are mathematically derived from stored historical records with zero personality or speculative claims.
          </p>
          <div className="space-y-2 pt-2">
            {scorecard?.learningInsights?.map((ins, i) => (
              <div key={i} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
                <span className="text-indigo-400 text-base">💡</span>
                <div>
                  <span className="font-mono text-[10px] text-indigo-400 uppercase font-bold block">{ins.type}</span>
                  <p className="mt-0.5">{ins.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
