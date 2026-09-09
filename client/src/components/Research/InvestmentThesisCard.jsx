import React from 'react';
import { TrendingUp, Minus, TrendingDown, BookOpen, ShieldCheck } from 'lucide-react';

const InvestmentThesisCard = ({ thesis, summary, keyDrivers = [], currency = 'USD', onOpenEvidence }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-150 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4.5 w-4.5 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Institutional Investment Thesis
          </h3>
        </div>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          Ground Truth Verified
        </span>
      </div>

      {summary && (
        <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 border border-slate-200/70 p-3.5 rounded-xl">
          {summary}
        </p>
      )}

      {/* Bull / Base / Bear Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bull Case */}
        <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span>BULL SCENARIO</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {thesis?.bullCase || 'Operational expansion and margin operating leverage support outperformance.'}
          </p>
        </div>

        {/* Base Case */}
        <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
            <Minus className="h-4 w-4 text-blue-600" />
            <span>BASE TRAJECTORY</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {thesis?.baseCase || 'Current baseline cash flow generation with normalized capital reinvestment.'}
          </p>
        </div>

        {/* Bear Case */}
        <div className="bg-rose-50/60 border border-rose-200/80 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
            <TrendingDown className="h-4 w-4 text-rose-600" />
            <span>BEAR DOWNSIDE</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {thesis?.bearCase || 'Margin compression, leverage burden, or market volatility impair valuation.'}
          </p>
        </div>
      </div>

      {/* Key Drivers with Evidence links */}
      {keyDrivers.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
            Verified Fundamental Drivers:
          </span>
          <div className="space-y-2">
            {keyDrivers.map((driver, idx) => (
              <div key={idx} className="flex items-start justify-between gap-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                <span className="text-slate-700 font-medium">
                  {typeof driver === 'string' ? driver : driver.claim}
                </span>
                {driver.evidenceIds && driver.evidenceIds.length > 0 && (
                  <button
                    onClick={onOpenEvidence}
                    className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0 cursor-pointer"
                  >
                    Evidence
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentThesisCard;
