import React from 'react';
import { Target, ShieldAlert, Compass, Layers, CheckCircle2 } from 'lucide-react';

export default function EventImpactPanel({ selectedEvent = null, eventImpact = null }) {
  if (!selectedEvent) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-center">
        <p className="text-xs text-slate-400">Select an event from the feed to inspect its deterministic impact pipeline.</p>
      </div>
    );
  }

  const impact = eventImpact || {};
  const reasons = impact.deterministicReasons || [];
  const affectedFacts = impact.affectedFacts || [];
  const affectedModels = impact.affectedValuationModels || [];
  const affectedRisks = impact.affectedRiskCategories || [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-semibold text-white">Event → Impact Mapping</h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedEvent.eventId || selectedEvent.rawRecordId}</p>
        </div>
        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${
          impact.materiality === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
          impact.materiality === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
          impact.materiality === 'MEDIUM' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
          'bg-slate-800 text-slate-400'
        }`}>
          {impact.materiality || 'LOW'} Materiality
        </span>
      </div>

      <div className="space-y-3 text-xs">
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Deterministic Rationale</span>
          {reasons.map((r, i) => (
            <p key={i} className="text-slate-200 leading-relaxed">{r}</p>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-blue-400" /> Valuation Models Affected
            </span>
            <div className="flex flex-wrap gap-1 pt-1">
              {affectedModels.length > 0 ? (
                affectedModels.map((m, i) => (
                  <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {m}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 text-[11px]">None</span>
              )}
            </div>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Risk Categories Affected
            </span>
            <div className="flex flex-wrap gap-1 pt-1">
              {affectedRisks.length > 0 ? (
                affectedRisks.map((r, i) => (
                  <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {r}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 text-[11px]">None</span>
              )}
            </div>
          </div>
        </div>

        {affectedFacts.length > 0 && (
          <div className="space-y-1 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Grounded Fact Candidates</span>
            <div className="flex flex-wrap gap-1.5">
              {affectedFacts.map((fid, i) => (
                <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {fid}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
