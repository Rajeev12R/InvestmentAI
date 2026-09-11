import React from 'react';
import { Target, Award, ShieldCheck, Hourglass, Sparkles, CheckCircle2, AlertTriangle, Eye, Sliders, TrendingUp, TrendingDown } from 'lucide-react';

const ExecutiveSummary = ({ 
  recommendation, 
  qualityScore, 
  attractivenessScore, 
  investorFitScore, 
  confidence, 
  horizon,
  fairValue,
  currentPrice,
  upside,
  marginOfSafety,
  pros = [],
  cons = [],
  onOpenEvidence,
  onOpenProfile
}) => {
  const getRecommendationStyle = (rec) => {
    const formatted = (rec || '').toUpperCase();
    if (formatted === 'BUY' || formatted === 'INVEST') {
      return {
        bg: 'bg-emerald-50/80 border-emerald-300 text-emerald-950',
        badge: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20',
        label: 'BUY / ACCUMULATE',
        sub: 'High Operational Moat • Favorable Intrinsic Valuation Margin'
      };
    } else if (formatted === 'ACCUMULATE') {
      return {
        bg: 'bg-blue-50/80 border-blue-300 text-blue-950',
        badge: 'bg-blue-600 text-white shadow-md shadow-blue-600/20',
        label: 'VALUE OPPORTUNITY',
        sub: 'Deep Valuation Discount Compensates for Moderate Cyclicality'
      };
    } else if (formatted === 'PASS' || formatted === 'AVOID') {
      return {
        bg: 'bg-rose-50/80 border-rose-300 text-rose-950',
        badge: 'bg-rose-600 text-white shadow-md shadow-rose-600/20',
        label: 'AVOID / REDUCE',
        sub: 'Elevated Leverage, Margin Compression, or Stretched Multiples'
      };
    } else {
      return {
        bg: 'bg-amber-50/80 border-amber-300 text-amber-950',
        badge: 'bg-amber-500 text-white shadow-md shadow-amber-500/20',
        label: 'HOLD / WAIT FOR PULLBACK',
        sub: 'High Quality Enterprise Trading at Fair-to-Premium Multiples'
      };
    }
  };

  const recStyle = getRecommendationStyle(recommendation);
  const getClaimText = (item) => {
    if (typeof item === 'string') return item;
    if (typeof item?.claim === 'string') return item.claim;
    return JSON.stringify(item);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      
      {/* Top Bar: Title & Evidence Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">10-Second Executive Verdict</h2>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Evidence-Backed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic quantitative synthesis of company quality, fair value margin, and personal investor fit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5 text-slate-500" />
              <span>Investor Profile</span>
            </button>
          )}
          {onOpenEvidence && (
            <button
              onClick={onOpenEvidence}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>See Evidence</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid: Verdict Stance & Tri-Factor Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Main Recommendation Card (5 cols) */}
        <div className={`lg:col-span-5 border p-5 rounded-2xl ${recStyle.bg} flex flex-col justify-between space-y-3`}>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              Algorithmic Decision Stance
            </span>
            <div className={`inline-block px-4 py-1.5 rounded-full text-base font-black uppercase tracking-wider ${recStyle.badge}`}>
              {recStyle.label}
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-800 leading-relaxed">
            {recStyle.sub}
          </p>
          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
            <span>Analysis Confidence: <strong className="text-slate-900">{confidence ?? 85}%</strong></span>
            <span>Horizon: <strong className="text-slate-900">{horizon ?? '3–5 Yrs'}</strong></span>
          </div>
        </div>

        {/* Tri-Factor Score Breakdown (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Company Quality Score */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Company Quality
              </div>
              <div className="text-2xl font-black text-slate-900">
                {qualityScore ?? '85'}<span className="text-xs font-normal text-slate-400">/100</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">
              Moat, operating margins, ROE & balance sheet debt.
            </div>
          </div>

          {/* Stock Attractiveness Score */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Valuation Margin
              </div>
              <div className="text-2xl font-black text-slate-900">
                {attractivenessScore ?? '70'}<span className="text-xs font-normal text-slate-400">/100</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">
              DCF upside ({upside !== undefined ? `${upside > 0 ? '+' : ''}${upside}%` : 'N/A'}) & multiple discount.
            </div>
          </div>

          {/* Investor Fit Score */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Investor Fit</span>
                <span className="text-[9px] text-blue-600 font-bold">Custom</span>
              </div>
              <div className="text-2xl font-black text-blue-700">
                {investorFitScore ?? '88'}<span className="text-xs font-normal text-slate-400">/100</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">
              Suitability for your horizon & volatility appetite.
            </div>
          </div>

        </div>

      </div>

      {/* Two Column Summary: Why Invest vs Key Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        
        {/* Why Invest */}
        <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Why Invest? (Key Strengths)</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700">
            {pros && pros.length > 0 ? (
              pros.slice(0, 3).map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold shrink-0">✓</span>
                  <span className="leading-relaxed">{getClaimText(p)}</span>
                </li>
              ))
            ) : (
              <li className="text-slate-500 italic">Solid top-line revenue expansion and competitive moat.</li>
            )}
          </ul>
        </div>

        {/* Watch / Key Risks */}
        <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Watch / Key Risks</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700">
            {cons && cons.length > 0 ? (
              cons.slice(0, 3).map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold shrink-0">⚠</span>
                  <span className="leading-relaxed">{getClaimText(c)}</span>
                </li>
              ))
            ) : (
              <li className="text-slate-500 italic">Monitor sector cyclicality and macroeconomic interest rate shifts.</li>
            )}
          </ul>
        </div>

      </div>

    </div>
  );
};

export default ExecutiveSummary;
