import React from 'react';
import { Activity, Clock, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function IngestionStatus({ statusLogs = [], isRunning = false }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-white">Ingestion Pipeline Status</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-emerald-400">STANDBY / SCHEDULED</span>
        </div>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {statusLogs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-3">No ingestion logs recorded in this session.</p>
        ) : (
          statusLogs.map((log, idx) => (
            <div key={idx} className="flex items-start justify-between gap-2 p-2 rounded bg-slate-950/60 border border-slate-800/60 text-xs">
              <span className="text-slate-200 font-medium">{log.message}</span>
              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
