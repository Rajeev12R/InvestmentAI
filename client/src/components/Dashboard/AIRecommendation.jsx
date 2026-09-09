import React from 'react';
import { Lightbulb, CheckCircle2, XCircle, ChevronRight, Bookmark, ArrowRightLeft, HelpCircle } from 'lucide-react';

const AIRecommendation = ({ 
  recommendation, 
  score, 
  pros = [], 
  cons = [], 
  keyFactors = [], 
  reasoning,
  phase3Decision 
}) => {
  const getRecommendationTheme = (rec) => {
    const formatted = (rec || '').toUpperCase();
    if (formatted === 'BUY' || formatted === 'INVEST' || formatted === 'ACCUMULATE') {
      return {
        bg: 'bg-emerald-50/70 border-emerald-200 text-slate-900',
        badge: 'bg-emerald-600 text-white',
        text: 'text-emerald-700',
        bullet: 'text-emerald-600',
        label: 'BUY / ACCUMULATE'
      };
    } else if (formatted === 'AVOID' || formatted === 'SELL' || formatted === 'PASS') {
      return {
        bg: 'bg-rose-50/70 border-rose-200 text-slate-900',
        badge: 'bg-rose-600 text-white',
        text: 'text-rose-700',
        bullet: 'text-rose-600',
        label: 'AVOID / REDUCE'
      };
    } else if (formatted === 'WATCH') {
      return {
        bg: 'bg-blue-50/70 border-blue-200 text-slate-900',
        badge: 'bg-blue-600 text-white',
        text: 'text-blue-700',
        bullet: 'text-blue-600',
        label: 'WATCH / MONITOR'
      };
    } else {
      return {
        bg: 'bg-amber-50/70 border-amber-200 text-slate-900',
        badge: 'bg-amber-600 text-white',
        text: 'text-amber-700',
        bullet: 'text-amber-600',
        label: 'HOLD / NEUTRAL'
      };
    }
  };

  const theme = getRecommendationTheme(recommendation);
  const convictionLevel = phase3Decision?.convictionLevel || 'MEDIUM';
  const convictionScore = phase3Decision?.convictionScore ?? null;
  const tradeoffs = phase3Decision?.keyTradeoffs || [];
  const falsificationTriggers = phase3Decision?.whatCouldChangeThisDecision || [];

  // Helper to extract clean claim text
  const getClaimText = (item) => {
    if (typeof item === 'string') return item;
    return item?.claim || JSON.stringify(item);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4.5 w-4.5 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Institutional Decision & Factor Breakdown
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Deterministic decision matrix with multi-factor risk, valuation, and investor-fit synthesis.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              Conviction Level
            </span>
            <span className="text-sm font-black text-slate-800">
              {convictionLevel} {convictionScore !== null ? `(${convictionScore}/100)` : ''}
            </span>
          </div>
          <div className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${theme.badge}`}>
            {theme.label}
          </div>
        </div>
      </div>

      {/* Executive Thesis */}
      {reasoning && (
        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl text-xs text-slate-700 leading-relaxed font-medium">
          <span className="font-bold text-slate-900 block mb-1">Executive Thesis:</span>
          {reasoning}
        </div>
      )}

      {/* Conflicting Signal Tradeoff Analysis */}
      {tradeoffs.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
            <ArrowRightLeft className="h-4 w-4 text-amber-600" />
            <span>Signal Tradeoff Analysis</span>
          </div>
          {tradeoffs.map((t, idx) => (
            <div key={idx} className="text-xs text-slate-700 space-y-1">
              <p><strong className="text-emerald-700">Upside:</strong> {t.positive}</p>
              <p><strong className="text-rose-700">Risk Counterweight:</strong> {t.negative}</p>
              <p><strong className="text-amber-800">Resolution:</strong> {t.resolution}</p>
            </div>
          ))}
        </div>
      )}

      {/* 3-Column Factors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pros */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>PRIMARY POSITIVE CATALYSTS</span>
          </div>
          
          {pros.length > 0 ? (
            <ul className="space-y-2.5">
              {pros.map((pro, index) => (
                <li key={index} className="flex gap-2 text-xs text-slate-700 leading-relaxed font-medium">
                  <ChevronRight className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{getClaimText(pro)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">No primary positive catalysts highlighted.</p>
          )}
        </div>

        {/* Cons */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-900 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200">
            <XCircle className="h-4 w-4 text-rose-600" />
            <span>RISK FACTORS & HEADWINDS</span>
          </div>
          
          {cons.length > 0 ? (
            <ul className="space-y-2.5">
              {cons.map((con, index) => (
                <li key={index} className="flex gap-2 text-xs text-slate-700 leading-relaxed font-medium">
                  <ChevronRight className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{getClaimText(con)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">No significant headwinds noted.</p>
          )}
        </div>

        {/* Factors */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <span>MACRO & SECTOR DRIVERS</span>
          </div>
          
          {keyFactors.length > 0 ? (
            <ul className="space-y-2.5">
              {keyFactors.map((factor, index) => (
                <li key={index} className="flex gap-2 text-xs text-slate-700 leading-relaxed font-medium">
                  <ChevronRight className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{getClaimText(factor)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">No macro drivers highlighted.</p>
          )}
        </div>

      </div>

      {/* What Could Change This Decision? (Falsification Triggers) */}
      {falsificationTriggers.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <HelpCircle className="h-4 w-4 text-blue-600" />
            <span>What could change this decision? (Sensitivity & Falsification Triggers)</span>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            {falsificationTriggers.map((trigger, idx) => (
              <li key={idx} className="leading-relaxed">{trigger}</li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
};

export default AIRecommendation;
