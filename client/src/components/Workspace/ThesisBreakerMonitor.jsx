import React from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export default function ThesisBreakerMonitor({ breakers = [] }) {
  if (!breakers || breakers.length === 0) {
    return null;
  }

  const triggered = breakers.filter(b => b.status === 'TRIGGERED');
  const approaching = breakers.filter(b => b.status === 'APPROACHING');
  const safe = breakers.filter(b => b.status === 'NOT_TRIGGERED' || b.status === 'RESOLVED');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <h3 className="text-base font-semibold text-white">Thesis Breaker Monitor</h3>
        </div>
        <div className="flex items-center gap-2">
          {triggered.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
              {triggered.length} Triggered
            </span>
          )}
          {approaching.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {approaching.length} Approaching
            </span>
          )}
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-800 text-slate-400">
            {breakers.length} Monitored
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {breakers.map((b, i) => {
          const isTriggered = b.status === 'TRIGGERED';
          const isApproaching = b.status === 'APPROACHING';
          const isResolved = b.status === 'RESOLVED';

          return (
            <div
              key={i}
              className={`p-3.5 rounded-lg border text-xs space-y-2 transition-all ${
                isTriggered ? 'bg-rose-950/30 border-rose-500/40 text-rose-200' :
                isApproaching ? 'bg-amber-950/20 border-amber-500/30 text-amber-200' :
                isResolved ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200' :
                'bg-slate-950/50 border-slate-800/80 text-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isTriggered ? <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" /> :
                   isApproaching ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" /> :
                   <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                  <span className="font-semibold text-white">{b.trigger}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  isTriggered ? 'bg-rose-500/20 text-rose-400' :
                  isApproaching ? 'bg-amber-500/20 text-amber-400' :
                  isResolved ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {b.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400 block">Current State:</span>
                  <span className="font-mono font-medium text-white">{b.currentValue}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Breach Threshold:</span>
                  <span className="font-mono font-medium text-white">{b.threshold}</span>
                </div>
              </div>

              {b.detail && (
                <p className="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800/40">
                  {b.detail}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
