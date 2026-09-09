import React from 'react';

const CONCENTRATION_BADGES = {
  LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  MODERATE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20'
};

export default function ConcentrationPanel({ exposure = null }) {
  if (!exposure) return null;

  const concBadge = CONCENTRATION_BADGES[exposure.concentrationLevel] || CONCENTRATION_BADGES.LOW;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Concentration & HHI Analytics
        </h3>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${concBadge}`}>
          {exposure.concentrationLevel}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
          <div className="text-xs text-slate-500 font-semibold uppercase">Top 1 Holding</div>
          <div className="text-lg font-black font-mono text-white mt-0.5">
            {((exposure.top1Weight || 0) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
          <div className="text-xs text-slate-500 font-semibold uppercase">Top 3 Holdings</div>
          <div className="text-lg font-black font-mono text-white mt-0.5">
            {((exposure.top3Weight || 0) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
          <div className="text-xs text-slate-500 font-semibold uppercase">HHI Index</div>
          <div className="text-lg font-black font-mono text-indigo-400 mt-0.5">
            {exposure.hhi || 0}
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
          <div className="text-xs text-slate-500 font-semibold uppercase">Effective Bets (N_eff)</div>
          <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
            {exposure.nEff || 0}
          </div>
        </div>
      </div>
    </div>
  );
}
