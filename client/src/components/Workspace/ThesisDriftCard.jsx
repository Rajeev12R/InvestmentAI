import React from 'react';
import { Compass, CheckCircle2, AlertOctagon, RefreshCw, BarChart2 } from 'lucide-react';

export default function ThesisDriftCard({ thesisDrift = {} }) {
  const {
    status = 'THESIS_UNCHANGED',
    summary = '',
    pillars = {},
    keyDrivers = [],
    positivePillars = 0,
    negativePillars = 0
  } = thesisDrift;

  const isStrengthened = status === 'THESIS_STRENGTHENED';
  const isWeakened = status === 'THESIS_WEAKENED';
  const isInvalidated = status === 'THESIS_INVALIDATED';
  const isMixed = status === 'THESIS_MIXED';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-white">Investment Thesis Drift</h3>
        </div>
        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wide ${
          isInvalidated ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
          isWeakened ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
          isStrengthened ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
          'bg-slate-800 text-slate-400'
        }`}>
          {status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
        <p className="text-sm font-medium text-slate-200 leading-relaxed">
          {summary || 'Investment thesis remains fully aligned with baseline fundamentals.'}
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
        {Object.entries(pillars).map(([pillar, state]) => (
          <div key={pillar} className="bg-slate-800/50 p-2 rounded border border-slate-800/60">
            <span className="text-slate-400 capitalize block mb-0.5">{pillar}</span>
            <span className={`font-semibold uppercase ${
              state === 'ACCELERATING' || state === 'EXPANDING' || state === 'DELEVERAGING' || state === 'IMPROVING' ? 'text-emerald-400' :
              state === 'DECELERATING' || state === 'CONTRACTING' || state === 'LEVERAGING' || state === 'ELEVATED' || state === 'CRITICAL_BREACH' ? 'text-rose-400' :
              'text-slate-300'
            }`}>
              {state}
            </span>
          </div>
        ))}
      </div>

      {keyDrivers.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Primary Drivers</span>
          <ul className="space-y-1">
            {keyDrivers.map((d, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                <span className="text-indigo-400 mt-1">•</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
