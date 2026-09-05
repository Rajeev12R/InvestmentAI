import React from 'react';
import { Target, Award, ShieldCheck, Hourglass, Sparkles, HelpCircle } from 'lucide-react';
import { useInvestorMode } from '../../context/InvestorModeContext';

const ExecutiveSummary = ({ recommendation, score, confidence, horizon }) => {
  const { isSimpleMode } = useInvestorMode();

  const getRecommendationStyle = (rec) => {
    const formatted = (rec || '').toUpperCase();
    if (formatted === 'INVEST' || formatted === 'BUY') {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800',
        badge: 'bg-emerald-600 text-white shadow-emerald-600/20',
        label: isSimpleMode ? '✅ GREEN LIGHT (BUY / INVEST)' : 'INVEST / BUY',
        sub: isSimpleMode 
          ? 'Strong company with healthy cash flow, good profits and fair price.' 
          : 'High Suitability & Fundamental Strength'
      };
    } else if (formatted === 'PASS' || formatted === 'SELL') {
      return {
        bg: 'bg-rose-500/10 border-rose-500/30 text-rose-800',
        badge: 'bg-rose-600 text-white shadow-rose-600/20',
        label: isSimpleMode ? '⚠️ RED LIGHT (PASS / AVOID)' : 'PASS / AVOID',
        sub: isSimpleMode 
          ? 'Heavy debt burden, negative margins or overpriced vs fair value.' 
          : 'Elevated Leverage, Risk or Negative Margin'
      };
    } else {
      return {
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-900',
        badge: 'bg-amber-500 text-slate-950 shadow-amber-500/20 font-black',
        label: isSimpleMode ? '⏳ YELLOW LIGHT (WAIT / HOLD)' : 'HOLD / WAIT',
        sub: isSimpleMode 
          ? 'Good company but wait for a better entry price or next quarter earnings.' 
          : 'Neutral Risk/Reward Profile • Monitor Catalysts'
      };
    }
  };

  const recStyle = getRecommendationStyle(recommendation);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col justify-between h-full space-y-5 shadow-sm">
      <div className="space-y-4">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {isSimpleMode ? 'AI Verdict at a Glance' : 'AI Decision Synthesis'}
            </h3>
          </div>
          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase">
            {isSimpleMode ? 'Aarav Simple Mode' : 'Audited Verdict'}
          </span>
        </div>

        {/* Big Recommendation Card */}
        <div className={`border p-5 rounded-2xl text-center ${recStyle.bg} flex flex-col items-center justify-center space-y-1.5 shadow-inner`}>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
            {isSimpleMode ? 'Should You Invest?' : 'Algorithmic Investment Stance'}
          </span>
          <div className={`px-5 py-1.5 rounded-full text-base sm:text-lg font-black uppercase tracking-wider shadow-md ${recStyle.badge}`}>
            {recStyle.label}
          </div>
          <span className="text-xs font-semibold text-slate-700 pt-1 leading-relaxed">
            {recStyle.sub}
          </span>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
              <Award className="h-3.5 w-3.5 text-blue-600" />
              <span>{isSimpleMode ? 'Overall Score' : 'Suitability'}</span>
            </div>
            <span className="text-xl font-black text-slate-900">
              {score ?? 'N/A'}<span className="text-xs font-normal text-slate-400">/100</span>
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>{isSimpleMode ? 'AI Trust' : 'Confidence'}</span>
            </div>
            <span className="text-xl font-black text-slate-900">
              {confidence ?? '85'}<span className="text-xs font-normal text-slate-400">%</span>
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-center flex flex-col justify-center items-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
              <Hourglass className="h-3.5 w-3.5 text-blue-600" />
              <span>{isSimpleMode ? 'Time Horizon' : 'Horizon'}</span>
            </div>
            <span className="text-xs font-extrabold text-slate-900 uppercase truncate max-w-full">
              {horizon ?? '1–3 Years'}
            </span>
          </div>

        </div>

      </div>

      <div className="text-[10px] text-slate-400 text-center leading-relaxed font-medium border-t border-slate-100 pt-3">
        {isSimpleMode 
          ? '💡 Simple Mode Active: Complex Wall Street equations translated to plain English.'
          : 'Multi-agent neural synthesis across corporate filings, DCF models & sentiment.'}
      </div>
    </div>
  );
};

export default ExecutiveSummary;

