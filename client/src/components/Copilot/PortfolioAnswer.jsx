import React from 'react';

export default function PortfolioAnswer({ portfolioSummary }) {
  if (!portfolioSummary) return null;

  return (
    <div className="my-2 p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-300">
      <div className="font-semibold text-slate-300 mb-2 flex items-center justify-between">
        <span>Portfolio Analytics & Concentration</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${portfolioSummary.concentrationLevel === 'HIGH' ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'}`}>
          {portfolioSummary.concentrationLevel || 'OPTIMAL'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-slate-300">
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
          <span className="text-slate-500 block text-[10px] uppercase">Top 1 Holding:</span>
          <span className="font-bold text-slate-200">{portfolioSummary.top1Weight ? `${(portfolioSummary.top1Weight * 100).toFixed(1)}%` : 'N/A'}</span>
        </div>
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
          <span className="text-slate-500 block text-[10px] uppercase">Herfindahl (HHI):</span>
          <span className="font-bold text-slate-200">{portfolioSummary.hhi ?? 'N/A'}</span>
        </div>
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
          <span className="text-slate-500 block text-[10px] uppercase">Effective Bets (N_eff):</span>
          <span className="font-bold text-slate-200">{portfolioSummary.nEff ?? 'N/A'}</span>
        </div>
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
          <span className="text-slate-500 block text-[10px] uppercase">Correlation Level:</span>
          <span className="font-bold text-slate-200">{portfolioSummary.correlationLevel || 'LOW'}</span>
        </div>
      </div>
    </div>
  );
}
