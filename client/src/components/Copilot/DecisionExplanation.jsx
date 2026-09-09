import React from 'react';

export default function DecisionExplanation({ decision, whyMatters = [], whatChanged = [] }) {
  if (!decision && whyMatters.length === 0) return null;

  const getDecisionBadge = (dec) => {
    switch (dec?.toUpperCase()) {
      case 'BUY':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">BUY</span>;
      case 'WATCH':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-950 text-amber-300 border border-amber-500/40">WATCH</span>;
      case 'AVOID':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-950 text-rose-300 border border-rose-500/40">AVOID</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-300 border border-slate-600">HOLD</span>;
    }
  };

  return (
    <div className="my-2 p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">Deterministic System Decision</span>
        {getDecisionBadge(decision)}
      </div>

      {whatChanged.length > 0 && (
        <div className="text-xs text-slate-300">
          <span className="text-slate-500 font-semibold block text-[11px] uppercase tracking-wider mb-0.5">Snapshot Delta:</span>
          <ul className="list-disc list-inside space-y-0.5 text-slate-300">
            {whatChanged.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {whyMatters.length > 0 && (
        <div className="text-xs text-slate-300">
          <span className="text-slate-500 font-semibold block text-[11px] uppercase tracking-wider mb-0.5">Why It Matters:</span>
          <ul className="list-disc list-inside space-y-0.5 text-slate-300">
            {whyMatters.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
