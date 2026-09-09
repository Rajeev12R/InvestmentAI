import React from 'react';
import { ShieldAlert, ShieldCheck, AlertCircle } from 'lucide-react';

export default function RiskDriftCard({ riskDrift = {} }) {
  const {
    hasDrift = false,
    overallDirection = 'NEUTRAL',
    transitions = [],
    previousScore = null,
    currentScore = null,
    scoreDelta = 0,
    interpretation = ''
  } = riskDrift;

  const isDeteriorating = overallDirection === 'DETERIORATING';
  const isImproving = overallDirection === 'IMPROVING';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-semibold text-white">Risk Drift</h3>
        </div>
        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase ${
          isDeteriorating ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
          isImproving ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
          'bg-slate-800 text-slate-400'
        }`}>
          {overallDirection}
        </span>
      </div>

      <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
        <span className="text-xs text-slate-400 font-medium">Risk Score Trend</span>
        <div className="flex items-baseline gap-2 font-mono">
          <span className="text-base font-bold text-white">{currentScore ?? 'N/A'}/100</span>
          {previousScore !== null && (
            <span className="text-xs text-slate-500">
              (Prev: {previousScore}, {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta})
            </span>
          )}
        </div>
      </div>

      {transitions.length > 0 ? (
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Category Transitions</span>
          {transitions.map((t, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs bg-slate-800/40 p-2.5 rounded border border-slate-800/60">
              <span className="font-medium text-slate-200">{t.category}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 line-through text-[11px]">{t.previousLevel}</span>
                <span className="text-slate-500">→</span>
                <span className={`font-semibold uppercase text-[11px] ${
                  t.direction === 'DETERIORATING' ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {t.currentLevel}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 text-center py-2">No category level transitions detected.</p>
      )}

      <p className="text-xs text-slate-300 bg-slate-800/40 p-3 rounded-lg border border-slate-800/60 leading-relaxed">
        {interpretation || 'Risk exposure parameters remain stable across monitored categories.'}
      </p>
    </div>
  );
}
