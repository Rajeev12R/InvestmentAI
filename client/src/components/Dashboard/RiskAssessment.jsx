import React from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';

const RiskAssessment = ({ risks }) => {
  if (!risks) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-center text-slate-500 text-sm font-medium h-full shadow-sm">
        Risk assessment data unavailable
      </div>
    );
  }

  const {
    overallRisk,
    financialRisk,
    marketRisk,
    competitionRisk,
    sentimentRisk,
    summary
  } = risks;

  const getBadgeStyle = (level) => {
    const formatted = (level || '').toUpperCase();
    if (formatted === 'LOW') {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
    } else if (formatted === 'HIGH') {
      return 'bg-rose-50 text-rose-700 border border-rose-200/80';
    } else if (formatted === 'MEDIUM' || formatted === 'MODERATE') {
      return 'bg-amber-50 text-amber-700 border border-amber-200/80';
    }
    return 'bg-slate-100 text-slate-650 border border-slate-200';
  };

  const getOverallStyle = (level) => {
    const formatted = (level || '').toUpperCase();
    if (formatted === 'LOW') return 'text-emerald-700 bg-emerald-50 border border-emerald-100';
    if (formatted === 'HIGH') return 'text-rose-700 bg-rose-50 border border-rose-100';
    return 'text-amber-700 bg-amber-50 border border-amber-100';
  };

  const riskCategories = [
    { label: 'Financial Risk', data: financialRisk },
    { label: 'Market Risk', data: marketRisk },
    { label: 'Competition Risk', data: competitionRisk },
    { label: 'Sentiment Risk', data: sentimentRisk }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between h-full space-y-4 shadow-sm">
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-blue-600 animate-pulse" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Risk Assessment Ledger</h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-slate-450 uppercase">OVERALL RISK:</span>
            <span className={`font-bold uppercase px-2.5 py-0.5 rounded-full text-[10px] tracking-wide ${getOverallStyle(overallRisk)}`}>
              {overallRisk || 'N/A'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {riskCategories.map((cat, idx) => {
            if (!cat.data) return null;
            return (
              <div 
                key={idx} 
                className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between border-b border-slate-200/50 pb-1.5">
                  <span className="text-[10px] font-bold text-slate-800 uppercase">
                    {cat.label}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getBadgeStyle(cat.data.level)}`}>
                    {cat.data.level || 'UNKNOWN'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-550 leading-relaxed font-medium">
                  {cat.data.reason || 'No specific threat factors analyzed for this area.'}
                </p>
              </div>
            );
          })}
        </div>

        {summary && summary.length > 0 && (
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2 shadow-inner">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-450 uppercase border-b border-slate-200/55 pb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span>Risk Summaries</span>
            </div>
            <ul className="list-disc pl-4.5 space-y-1.5 text-[11px] text-slate-600 font-medium">
              {summary.map((sumText, i) => (
                <li key={i} className="leading-relaxed">
                  {sumText}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskAssessment;
