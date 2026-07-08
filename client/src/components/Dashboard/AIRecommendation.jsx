import React from 'react';
import { Lightbulb, CheckCircle2, XCircle, FileText, ChevronRight, Bookmark } from 'lucide-react';

const AIRecommendation = ({ recommendation, score, pros = [], cons = [], keyFactors = [], reasoning }) => {
  
  const getRecommendationTheme = (rec) => {
    const formatted = (rec || '').toUpperCase();
    if (formatted === 'INVEST' || formatted === 'BUY') {
      return {
        bg: 'bg-emerald-50/50 border-emerald-100 text-slate-800',
        badge: 'bg-emerald-600 text-white',
        text: 'text-emerald-700',
        bullet: 'text-emerald-600',
        label: 'INVEST / BUY'
      };
    } else if (formatted === 'PASS' || formatted === 'SELL') {
      return {
        bg: 'bg-rose-50/50 border-rose-100 text-slate-800',
        badge: 'bg-rose-600 text-white',
        text: 'text-rose-700',
        bullet: 'text-rose-600',
        label: 'PASS / AVOID'
      };
    } else {
      return {
        bg: 'bg-amber-50/50 border-amber-100 text-slate-800',
        badge: 'bg-amber-600 text-white',
        text: 'text-amber-700',
        bullet: 'text-amber-600',
        label: 'HOLD / WAIT'
      };
    }
  };

  const theme = getRecommendationTheme(recommendation);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4.5 w-4.5 text-blue-600 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Equity Suitability Analysis & Catalyst Grid
            </h3>
          </div>
          <p className="text-xs text-slate-450 font-semibold">
            Consolidated AI qualitative and quantitative rating matrix.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-450 uppercase block">suitability score</span>
            <span className="text-lg font-bold text-slate-800">
              {score ?? 'N/A'}<span className="text-xs font-semibold text-slate-400">/100</span>
            </span>
          </div>
          <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${theme.badge}`}>
            {theme.label}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-850 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>INVESTMENT PROS</span>
          </div>
          
          {pros.length > 0 ? (
            <ul className="space-y-2.5">
              {pros.map((pro, index) => (
                <li key={index} className="flex gap-2 text-xs text-slate-650 leading-relaxed font-medium">
                  <ChevronRight className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-450 italic">No positive catalysts identified.</p>
          )}
        </div>

        <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-850 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100">
            <XCircle className="h-4 w-4 text-rose-600" />
            <span>INVESTMENT CONS</span>
          </div>
          
          {cons.length > 0 ? (
            <ul className="space-y-2.5">
              {cons.map((con, index) => (
                <li key={index} className="flex gap-2 text-xs text-slate-650 leading-relaxed font-medium">
                  <ChevronRight className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-450 italic">No negative risks identified.</p>
          )}
        </div>

        <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-850 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <span>PRIMARY PEER CATALYSTS</span>
          </div>
          
          {keyFactors.length > 0 ? (
            <ul className="space-y-2.5">
              {keyFactors.map((factor, index) => (
                <li key={index} className="flex gap-2 text-xs text-slate-650 leading-relaxed font-medium">
                  <span className="font-bold text-[10px] text-amber-650 shrink-0 mt-0.5 bg-amber-100/50 px-1.5 py-0.2 rounded">
                    {index + 1}
                  </span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-450 italic">No significant catalysts highlighted.</p>
          )}
        </div>
      </div>

      {reasoning && (
        <div className={`p-4.5 rounded-xl border text-xs leading-relaxed space-y-2.5 shadow-inner ${theme.bg}`}>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>AI Analytical Rationale Statement</span>
          </div>
          <p className="text-slate-700 leading-relaxed font-sans font-medium text-xs">
            {reasoning}
          </p>
        </div>
      )}
    </div>
  );
};

export default AIRecommendation;
