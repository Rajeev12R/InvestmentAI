import React from 'react';

export default function CorrelationPanel({ exposure = null }) {
  if (!exposure) return null;

  const clusters = exposure.correlationClusters || [];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500" />
          Pairwise Correlation Clusters
        </h3>
        <span className="text-xs text-slate-400 font-mono">
          Level: <span className="font-semibold text-white">{exposure.correlationLevel}</span>
        </span>
      </div>

      {clusters.length === 0 ? (
        <div className="text-slate-500 text-xs py-4 text-center">
          No elevated pairwise correlation clusters (&ge;0.80) detected. Diversification intact.
        </div>
      ) : (
        <div className="space-y-3">
          {clusters.map((c, idx) => (
            <div key={idx} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300 font-semibold">
                <span>{c.clusterName}</span>
                <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-[10px] border border-amber-500/20">
                  {c.severity}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {c.pairs.map((p, pIdx) => (
                  <div key={pIdx} className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between font-mono text-[11px]">
                    <span className="text-slate-300">{p.tickerA} ↔ {p.tickerB}</span>
                    <span className="text-cyan-400 font-bold">r = {p.correlation.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
