import React, { useState } from 'react';
import AttentionPriorityBadge from './AttentionPriorityBadge.jsx';
import AttentionDetail from './AttentionDetail.jsx';

export default function AttentionCard({ item, onInvestigate = null }) {
  const [expanded, setExpanded] = useState(false);

  if (!item) return null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all duration-200 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-base font-bold text-white tracking-wide">{item.ticker}</span>
            <AttentionPriorityBadge priority={item.priority} score={item.score} />
            <span className="text-[11px] font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
              {item.category}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-slate-200 leading-snug">{item.title}</h4>
          <p className="text-xs text-slate-400 leading-relaxed">{item.summary}</p>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title={expanded ? 'Collapse' : 'Expand Details'}
        >
          <svg className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Decision / Impact summary pills */}
      <div className="mt-3.5 flex items-center gap-2 flex-wrap text-xs">
        {item.previousDecision && item.currentDecision && (
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800 text-slate-300">
            <span className="text-slate-500">Decision:</span>
            <span className="line-through text-slate-400">{item.previousDecision}</span>
            <span className="text-slate-600">→</span>
            <span className="font-bold text-indigo-400">{item.currentDecision}</span>
          </div>
        )}

        {item.metrics?.valuationDriftPct !== undefined && (
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800 text-slate-300">
            <span className="text-slate-500">DCF Drift:</span>
            <span className={`font-semibold ${item.metrics.valuationDriftPct < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {item.metrics.valuationDriftPct > 0 ? '+' : ''}{item.metrics.valuationDriftPct.toFixed(1)}%
            </span>
          </div>
        )}

        {item.thesisBreakerStatus && item.thesisBreakerStatus !== 'STABLE' && (
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800">
            <span className="text-slate-500">Breaker:</span>
            <span className={`font-semibold ${item.thesisBreakerStatus === 'TRIGGERED' ? 'text-rose-400' : 'text-amber-400'}`}>
              {item.thesisBreakerStatus}
            </span>
          </div>
        )}

        {item.recommendedAction && (
          <div className="ml-auto text-[11px] font-semibold text-indigo-300 bg-indigo-950/40 px-2.5 py-1 rounded-md border border-indigo-900/50">
            {item.recommendedAction}
          </div>
        )}
      </div>

      {/* Secondary Linked Signals */}
      {item.secondarySignals && item.secondarySignals.length > 0 && (
        <div className="mt-3 text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
          <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider block mb-1">Linked Secondary Impacts</span>
          <div className="flex flex-wrap gap-1.5">
            {item.secondarySignals.map((sec, idx) => (
              <span key={idx} className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300 text-[11px]">
                {sec.title || sec.category}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {expanded && <AttentionDetail item={item} onInvestigate={onInvestigate} />}
    </div>
  );
}
