import React, { useEffect, useState } from 'react';
import { Loader2, Check, Circle } from 'lucide-react';

const STAGES = [
  { id: 'company', label: 'Company Research', detail: 'Fetching company profiles, employees, sector and descriptions...' },
  { id: 'financial', label: 'Financial Analysis', detail: 'Auditing income statements, debt, ratios and cash flow statistics...' },
  { id: 'stock', label: 'Stock Analysis', detail: 'Retrieving real-time quotes, averages, historical pricing boundaries...' },
  { id: 'news', label: 'News Analysis', detail: 'Scanning global news indices, sentiment metrics, and press releases...' },
  { id: 'competitor', label: 'Competitor Analysis', detail: 'Structuring peer group comparison matrix and market position mapping...' },
  { id: 'risk', label: 'Risk Assessment', detail: 'Evaluating quantitative, regulatory, market, and balance sheet risk vectors...' },
  { id: 'decision', label: 'Investment Decision', detail: 'Consolidating evidence variables to generate the final suitability grading...' }
];

const LoadingProgress = ({ ticker, progressIndex = 0 }) => {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    if (progressIndex > activeStage) {
      setActiveStage(progressIndex);
    } else {
      const interval = setInterval(() => {
        setActiveStage((prev) => {
          if (prev < STAGES.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 2500);

      return () => clearInterval(interval);
    }
  }, [progressIndex]);

  useEffect(() => {
    setActiveStage(progressIndex);
  }, [progressIndex]);

  const percentage = Math.round(((activeStage + 0.5) / STAGES.length) * 100);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800 max-w-2xl mx-auto w-full">
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-md">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold tracking-wider text-blue-600 uppercase">Analysis Engine Active</span>
            <h2 className="text-lg font-bold text-slate-900">
              Analyzing Equity: <span className="text-blue-600 uppercase">{ticker}</span>
            </h2>
          </div>
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-500">
            <span>Overall Progress: {percentage}%</span>
            <span>Running analysis models...</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-700 ease-out" 
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {STAGES.map((stage, idx) => {
            const isCompleted = idx < activeStage;
            const isCurrent = idx === activeStage;
            const isPending = idx > activeStage;

            return (
              <div 
                key={stage.id} 
                className={`flex gap-4 p-3 rounded-lg border transition-all duration-300 ${
                  isCurrent 
                    ? 'bg-blue-50/40 border-blue-100 shadow-sm' 
                    : 'border-transparent'
                }`}
              >
                <div className="mt-0.5 shrink-0 flex items-center justify-center">
                  {isCompleted && (
                    <div className="h-5 w-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                      <Check className="h-3 w-3 text-blue-600 stroke-[3]" />
                    </div>
                  )}
                  {isCurrent && (
                    <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                      <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                    </div>
                  )}
                  {isPending && (
                    <div className="h-5 w-5 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                      <Circle className="h-1.5 w-1.5 text-slate-300 fill-slate-350" />
                    </div>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span 
                      className={`text-sm font-semibold ${
                        isCompleted ? 'text-slate-800' : isCurrent ? 'text-blue-700 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {stage.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        Running
                      </span>
                    )}
                  </div>
                  <p 
                    className={`text-xs ${
                      isCurrent ? 'text-slate-600' : 'text-slate-450'
                    }`}
                  >
                    {stage.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LoadingProgress;
