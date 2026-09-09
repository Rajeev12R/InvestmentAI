import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ChangeSummaryCard({ changes = [], isBaseline = false, deterministicSummary = '' }) {
  if (isBaseline) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-white">Baseline Snapshot Initialized</h3>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          {deterministicSummary || 'Initial investment state recorded. Future snapshots will track differential financial, valuation, risk, and thesis drift.'}
        </p>
      </div>
    );
  }

  const materialChanges = changes.filter(c => c.isMaterial);
  const otherChanges = changes.filter(c => !c.isMaterial);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-semibold text-white">Grounded Metric Deltas</h3>
          <p className="text-xs text-slate-400 mt-0.5">Deterministic differences between T0 and T1</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {materialChanges.length} Material
          </span>
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-800 text-slate-400">
            {changes.length} Total
          </span>
        </div>
      </div>

      {changes.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">No metric variances detected between selected snapshots.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="pb-2 font-medium">Metric</th>
                <th className="pb-2 font-medium">Previous (T0)</th>
                <th className="pb-2 font-medium">Current (T1)</th>
                <th className="pb-2 font-medium">Change</th>
                <th className="pb-2 font-medium">Direction</th>
                <th className="pb-2 font-medium">Materiality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {changes.map((c, i) => {
                const isPositive = c.percentageChange > 0;
                const isNegative = c.percentageChange < 0;

                return (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 font-medium text-slate-200">{c.name}</td>
                    <td className="py-2.5 text-slate-400 font-mono">
                      {typeof c.previousValue === 'number' ? (c.previousValue > 1000 ? (c.previousValue / 1e9).toFixed(2) + 'B' : c.previousValue) : c.previousValue}
                    </td>
                    <td className="py-2.5 text-slate-200 font-mono font-medium">
                      {typeof c.currentValue === 'number' ? (c.currentValue > 1000 ? (c.currentValue / 1e9).toFixed(2) + 'B' : c.currentValue) : c.currentValue}
                    </td>
                    <td className="py-2.5 font-mono">
                      {c.percentageChange !== null ? (
                        <span className={`inline-flex items-center gap-0.5 font-semibold ${isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-slate-400'}`}>
                          {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : isNegative ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                          {isPositive ? '+' : ''}{c.percentageChange.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">{c.direction}</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                        c.direction === 'IMPROVING' ? 'bg-emerald-500/10 text-emerald-400' :
                        c.direction === 'DETERIORATING' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {c.direction}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        c.materiality === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold' :
                        c.materiality === 'HIGHLY_MATERIAL' || c.materiality === 'MATERIAL' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-slate-800 text-slate-500'
                      }`}>
                        {c.materiality}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
