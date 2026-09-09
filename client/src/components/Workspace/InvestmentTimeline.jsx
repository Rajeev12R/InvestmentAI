import React from 'react';
import { Calendar, GitCommit, AlertTriangle, ArrowRight, CheckCircle, ShieldAlert } from 'lucide-react';

export default function InvestmentTimeline({ events = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-center">
        <p className="text-xs text-slate-400">No chronological timeline events logged for this ticker.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-semibold text-white">Investment Timeline</h3>
        </div>
        <span className="text-xs text-slate-400">{events.length} Historical Event(s)</span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {events.map((evt, idx) => {
          const isCritical = evt.severity === 'CRITICAL';
          const isHigh = evt.severity === 'HIGH';
          const isMedium = evt.severity === 'MEDIUM';

          return (
            <div key={evt.eventId || idx} className="relative group">
              {/* Dot */}
              <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                isCritical ? 'bg-rose-500 ring-2 ring-rose-500/30' :
                isHigh ? 'bg-amber-500 ring-2 ring-amber-500/30' :
                isMedium ? 'bg-blue-500' : 'bg-slate-600'
              }`} />

              <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80 space-y-2 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white">{evt.title}</span>
                  <span className="text-[10px] font-mono text-slate-500">{new Date(evt.timestamp).toLocaleDateString()}</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{evt.summary}</p>

                {evt.impact && (
                  <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-800/60 flex items-start gap-1.5">
                    <strong className="text-slate-200 shrink-0">Impact:</strong>
                    <span>{evt.impact}</span>
                  </div>
                )}

                {evt.evidenceIds && evt.evidenceIds.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-500">Evidence:</span>
                    {evt.evidenceIds.map((id, i) => (
                      <span key={i} className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {id}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
