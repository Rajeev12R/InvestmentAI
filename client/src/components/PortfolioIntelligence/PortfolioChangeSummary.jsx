import React from 'react';

export default function PortfolioChangeSummary({ driftReport = null }) {
  if (!driftReport) return null;

  const allocationDrift = driftReport.allocationDrift || [];
  const sectorDrift = Object.entries(driftReport.sectorDrift || {});

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-purple-500" />
        Multi-Period Portfolio State Drift (T0 → T1)
      </h3>

      {!driftReport.hasDrift ? (
        <div className="text-slate-500 text-xs py-4 text-center">
          No material portfolio allocation or sector drift detected between snapshots.
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          {/* Allocation Drift */}
          {allocationDrift.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] mb-2">Holding Allocation Drift</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allocationDrift.map(d => (
                  <div key={d.ticker} className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                    <span className="font-bold text-white font-mono">{d.ticker}</span>
                    <span className={`font-mono font-semibold ${d.percentagePointDiff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {d.percentagePointDiff > 0 ? '+' : ''}{d.percentagePointDiff} pp
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sector Drift */}
          {sectorDrift.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] mb-2">Sector Exposure Drift</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sectorDrift.map(([sector, d]) => (
                  <div key={sector} className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-300">{sector}</span>
                    <span className={`font-mono font-semibold ${d.percentagePointDiff > 0 ? 'text-indigo-400' : 'text-amber-400'}`}>
                      {d.percentagePointDiff > 0 ? '+' : ''}{d.percentagePointDiff} pp
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
