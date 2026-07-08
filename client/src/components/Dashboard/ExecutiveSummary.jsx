import React from 'react';
import { Target, Award, ShieldCheck, Hourglass } from 'lucide-react';

const ExecutiveSummary = ({ recommendation, score, confidence, horizon }) => {
  const getRecommendationStyle = (rec) => {
    const formatted = (rec || '').toUpperCase();
    if (formatted === 'INVEST' || formatted === 'BUY') {
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
        text: 'text-emerald-700',
        label: 'INVEST / BUY'
      };
    } else if (formatted === 'PASS' || formatted === 'SELL') {
      return {
        bg: 'bg-rose-50 text-rose-800 border-rose-200/80',
        text: 'text-rose-700',
        label: 'PASS / AVOID'
      };
    } else {
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200/80',
        text: 'text-amber-700',
        label: 'HOLD / WAIT'
      };
    }
  };

  const recStyle = getRecommendationStyle(recommendation);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between h-full shadow-sm">
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Executive Summary</h3>
          <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
            Analysis Verified
          </span>
        </div>
        <div className={`border p-4.5 rounded-xl text-center ${recStyle.bg} flex flex-col justify-center shadow-inner`}>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-1">
            System Recommendation
          </span>
          <span className="text-3xl font-extrabold tracking-tight">
            {recStyle.label}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2.5 pt-2">
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
              <Award className="h-3.5 w-3.5 text-blue-600" />
              <span>Score</span>
            </div>
            <span className="text-xl font-extrabold text-slate-800">
              {score ?? 'N/A'}<span className="text-xs font-semibold text-slate-400">/100</span>
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>Confidence</span>
            </div>
            <span className="text-xl font-extrabold text-slate-800">
              {confidence ?? 'N/A'}<span className="text-xs font-semibold text-slate-400">%</span>
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center flex flex-col justify-center items-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
              <Hourglass className="h-3.5 w-3.5 text-blue-600" />
              <span>Horizon</span>
            </div>
            <span className="text-xs font-bold text-slate-800 uppercase truncate max-w-full">
              {horizon ?? 'N/A'}
            </span>
          </div>
        </div>
      </div>
      <div className="text-[10px] text-slate-400 mt-5 text-center leading-relaxed font-medium">
        Algorithmic data compilation. Evaluate independently before investing.
      </div>
    </div>
  );
};

export default ExecutiveSummary;
