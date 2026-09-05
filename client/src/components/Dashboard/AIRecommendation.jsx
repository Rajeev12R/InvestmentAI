import React from 'react';
import { Lightbulb, CheckCircle2, XCircle, FileText, ChevronRight, Bookmark, Sparkles } from 'lucide-react';
import { useInvestorMode } from '../../context/InvestorModeContext';

const AIRecommendation = ({ recommendation, score, pros = [], cons = [], keyFactors = [], reasoning }) => {
  const { isSimpleMode } = useInvestorMode();

  const getRecommendationTheme = (rec) => {
    const formatted = (rec || '').toUpperCase();
    if (formatted === 'INVEST' || formatted === 'BUY') {
      return {
        bg: 'bg-emerald-50/70 border-emerald-150 text-slate-800',
        badge: 'bg-emerald-600 text-white',
        text: 'text-emerald-700',
        bullet: 'text-emerald-600',
        label: isSimpleMode ? 'INVEST / BUY' : 'INVEST'
      };
    } else if (formatted === 'PASS' || formatted === 'SELL') {
      return {
        bg: 'bg-rose-50/70 border-rose-150 text-slate-800',
        badge: 'bg-rose-600 text-white',
        text: 'text-rose-700',
        bullet: 'text-rose-600',
        label: isSimpleMode ? 'AVOID / SELL' : 'PASS'
      };
    } else {
      return {
        bg: 'bg-amber-50/70 border-amber-150 text-slate-800',
        badge: 'bg-amber-600 text-white',
        text: 'text-amber-700',
        bullet: 'text-amber-600',
        label: isSimpleMode ? 'WAIT / HOLD' : 'HOLD'
      };
    }
  };

  const theme = getRecommendationTheme(recommendation);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4.5 w-4.5 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {isSimpleMode ? 'Key Reasons & Investment Catalysts' : 'Equity Suitability Analysis & Catalyst Grid'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {isSimpleMode 
              ? 'Plain-English summary of why you should or shouldn\'t invest.' 
              : 'Consolidated AI qualitative and quantitative rating matrix.'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              {isSimpleMode ? 'AI Quality Score' : 'Suitability Score'}
            </span>
            <span className="text-lg font-black text-slate-900">
              {score ?? 'N/A'}<span className="text-xs font-normal text-slate-400">/100</span>
            </span>
          </div>
          <div className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${theme.badge}`}>
            {theme.label}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pros */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{isSimpleMode ? '🟢 WHY TO BUY (STRENGTHS)' : 'INVESTMENT PROS'}</span>
          </div>
          
          {pros.length > 0 ? (
            <ul className="space-y-2.5">
              {pros.map((pro, index) => (
                <li key={index} className="flex gap-2 text-xs text-slate-700 leading-relaxed font-medium">
                  <ChevronRight className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">No positive catalysts identified.</p>
          )}
        </div>

        {/* Cons */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-900 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100">
            <XCircle className="h-4 w-4 text-rose-600" />
            <span>{isSimpleMode ? '🔴 RISKS & RED FLAGS' : 'INVESTMENT CONS'}</span>
          </div>
          
          {cons.length > 0 ? (
            <ul className="space-y-2.5">
              {cons.map((con, index) => (
                <li key={index} className="flex gap-2 text-xs text-slate-700 leading-relaxed font-medium">
                  <ChevronRight className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">No negative risks identified.</p>
          )}
        </div>

        {/* Factors */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <span>{isSimpleMode ? '⚡ FUTURE TRIGGERS TO WATCH' : 'PRIMARY PEER CATALYSTS'}</span>
          </div>
          
          {keyFactors.length > 0 ? (
            <ul className="space-y-2.5">
              {keyFactors.map((factor, index) => (
                <li key={index} className="flex gap-2 text-xs text-slate-700 leading-relaxed font-medium">
                  <span className="font-bold text-[10px] text-amber-700 shrink-0 mt-0.5 bg-amber-100 px-1.5 py-0.2 rounded">
                    {index + 1}
                  </span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">No significant catalysts highlighted.</p>
          )}
        </div>
      </div>

      {reasoning && (
        <div className={`p-4.5 rounded-xl border text-xs leading-relaxed space-y-2 shadow-inner ${theme.bg}`}>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase">
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            <span>{isSimpleMode ? 'AI Final Takeaway' : 'AI Analytical Rationale Statement'}</span>
          </div>
          <p className="text-slate-800 leading-relaxed font-sans font-medium text-xs">
            {reasoning}
          </p>
        </div>
      )}
    </div>
  );
};

export default AIRecommendation;

