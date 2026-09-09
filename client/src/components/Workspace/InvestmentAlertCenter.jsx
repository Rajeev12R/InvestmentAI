import React from 'react';
import { Bell, AlertOctagon, AlertTriangle, Info, Check, CheckCheck } from 'lucide-react';

export default function InvestmentAlertCenter({ alerts = [], onAcknowledge = () => {} }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-5 h-5 text-slate-400" />
          <h3 className="text-base font-semibold text-white">Investment Alert Center</h3>
        </div>
        <p className="text-xs text-slate-400">All portfolio assets operating within standard risk and thesis thresholds.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-semibold text-white">Investment Alert Center</h3>
        </div>
        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
          {alerts.filter(a => !a.acknowledged).length} Active Alerts
        </span>
      </div>

      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {alerts.map((a, i) => {
          const isCritical = a.severity === 'CRITICAL';
          const isHigh = a.severity === 'HIGH';

          return (
            <div
              key={a.alertId || i}
              className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 transition-colors ${
                a.acknowledged ? 'bg-slate-950/30 border-slate-800/40 opacity-60' :
                isCritical ? 'bg-rose-950/30 border-rose-500/40 text-rose-200' :
                isHigh ? 'bg-amber-950/20 border-amber-500/30 text-amber-200' :
                'bg-slate-950/60 border-slate-800/80 text-slate-300'
              }`}
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  {isCritical ? <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" /> :
                   isHigh ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" /> :
                   <Info className="w-4 h-4 text-blue-400 shrink-0" />}
                  <span className="font-semibold text-white">[{a.ticker}] {a.title}</span>
                </div>
                <p className="text-[11px] text-slate-300 pl-6">{a.trigger}</p>
                <div className="text-[10px] text-slate-500 pl-6 flex items-center gap-3">
                  <span>{new Date(a.createdAt).toLocaleString()}</span>
                  <span>Severity: <strong className="uppercase">{a.severity}</strong></span>
                </div>
              </div>

              {!a.acknowledged && (
                <button
                  onClick={() => onAcknowledge(a.alertId)}
                  className="px-2.5 py-1 text-[11px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1 shrink-0"
                >
                  <Check className="w-3 h-3" /> Ack
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
