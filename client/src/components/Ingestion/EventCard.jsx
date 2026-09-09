import React from 'react';
import { Newspaper, FileText, AlertTriangle, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';

export default function EventCard({ event = {}, onSelect = () => {}, isSelected = false }) {
  const {
    eventId,
    ticker,
    eventType = 'MATERIAL_NEWS',
    source = 'Data Provider',
    sourceTier = 'TIER_2',
    publishedAt,
    title,
    summary,
    extractedFacts = [],
    validationStatus = 'VALIDATED'
  } = event;

  const isTier1 = sourceTier === 'TIER_1';
  const isTier2 = sourceTier === 'TIER_2';

  return (
    <div
      onClick={() => onSelect(event)}
      className={`p-4 rounded-xl border text-xs cursor-pointer transition-all space-y-2.5 ${
        isSelected
          ? 'bg-blue-600/10 border-blue-500/50 shadow-md'
          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {eventType.includes('REPORT') || eventType.includes('RELEASE') ? (
            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
          ) : (
            <Newspaper className="w-4 h-4 text-blue-400 shrink-0" />
          )}
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">{eventType.replace(/_/g, ' ')}</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
          isTier1 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
          isTier2 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
          'bg-slate-800 text-slate-400'
        }`}>
          {sourceTier}
        </span>
      </div>

      <h4 className="font-semibold text-slate-100 text-sm leading-snug line-clamp-2">{title}</h4>
      <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">{summary}</p>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
        <span className="font-medium text-slate-400">{source}</span>
        <span className="font-mono">{new Date(publishedAt).toLocaleDateString()}</span>
      </div>

      {extractedFacts.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[10px] text-slate-500">Facts:</span>
          {extractedFacts.map((f, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-300 border border-slate-800">
              {f.name}: {typeof f.value === 'number' ? (f.value > 1000 ? (f.value / 1e9).toFixed(2) + 'B' : f.value) : f.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
