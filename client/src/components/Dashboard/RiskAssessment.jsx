import React from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, ShieldX } from 'lucide-react';

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
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        bar: 'bg-emerald-500',
        width: '30%'
      };
    } else if (formatted === 'HIGH') {
      return {
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        bar: 'bg-rose-500',
        width: '90%'
      };
    } else {
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        bar: 'bg-amber-500',
        width: '60%'
      };
    }
  };

  const getOverallStyle = (level) => {
    const formatted = (level || '').toUpperCase();
    if (formatted === 'LOW') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (formatted === 'HIGH') return 'text-rose-700 bg-rose-50 border-rose-200';
    return 'text-amber-700 bg-amber-50 border-amber-200';
  };

  const riskCategories = [
    { label: 'Financial & Balance Sheet Risk', data: financialRisk },
    { label: 'Market & Valuation Volatility', data: marketRisk },
    { label: 'Competitor & Moat Erosion', data: competitionRisk },
    { label: 'Sentiment & Regulatory Feeds', data: sentimentRisk }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col justify-between h-full space-y-5 shadow-sm">
      <div className="space-y-4">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Quantitative Risk Radar</h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-slate-400 uppercase text-[10px]">THREAT LEVEL:</span>
            <span className={`font-black uppercase px-2.5 py-0.5 rounded-full text-[10px] tracking-wider border ${getOverallStyle(overallRisk)}`}>
              {overallRisk || 'MODERATE'}
            </span>
          </div>
        </div>

        {/* 4 Risk Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {riskCategories.map((cat, idx) => {
            if (!cat.data) return null;
            const style = getBadgeStyle(cat.data.level);

            return (
              <div 
                key={idx} 
                className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-tight">
                      {cat.label}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${style.badge}`}>
                      {cat.data.level || 'MEDIUM'}
                    </span>
                  </div>
                  
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full ${style.bar} rounded-full`} style={{ width: style.width }} />
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  {cat.data.reason || 'No specific threat factors analyzed for this vector.'}
                </p>
              </div>
            );
          })}
        </div>

        {/* Risk Bullet Summary */}
        {summary && summary.length > 0 && (
          <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-2 shadow-inner">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 uppercase border-b border-slate-200 pb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span>Primary Risk Vectors Highlighted</span>
            </div>
            <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700 font-medium">
              {summary.map((sumText, i) => (
                <li key={i} className="leading-snug">
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
