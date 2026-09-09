import React from 'react';
import { TrendingUp, TrendingDown, Target, Activity } from 'lucide-react';

export default function ValuationDriftCard({ valuationDrift = {} }) {
  const {
    hasDrift = false,
    fairValueChangePct = 0,
    direction = 'NEUTRAL',
    previousFairValue = 'N/A',
    currentFairValue = 'N/A',
    previousReverseDcfGrowth = null,
    currentReverseDcfGrowth = null,
    growthDelta = null,
    interpretation = ''
  } = valuationDrift;

  const isUp = fairValueChangePct > 0;
  const isDown = fairValueChangePct < 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-semibold text-white">Valuation Drift</h3>
        </div>
        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
          isUp ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
          isDown ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
          'bg-slate-800 text-slate-400'
        }`}>
          {fairValueChangePct > 0 ? `+${fairValueChangePct}%` : `${fairValueChangePct}%`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">Composite Fair Value</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-white font-mono">${currentFairValue}</span>
            <span className="text-xs text-slate-500 line-through font-mono">${previousFairValue}</span>
          </div>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">Implied Reverse DCF Growth</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-white font-mono">
              {currentReverseDcfGrowth !== null && currentReverseDcfGrowth !== 'UNAVAILABLE' ? `${currentReverseDcfGrowth}%` : 'N/A'}
            </span>
            {previousReverseDcfGrowth !== null && previousReverseDcfGrowth !== 'UNAVAILABLE' && (
              <span className="text-xs text-slate-500 font-mono">
                ({growthDelta > 0 ? '+' : ''}{growthDelta}%)
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-300 bg-slate-800/40 p-3 rounded-lg border border-slate-800/60 leading-relaxed">
        {interpretation || 'Valuation assumptions remain stable across snapshot cycles.'}
      </p>
    </div>
  );
}
