import React from 'react';
import { Zap, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const CatalystRadar = ({ catalysts = [] }) => {
  if (!catalysts || catalysts.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center text-xs text-slate-400">
        No immediate catalysts identified in current reporting window.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
        <Zap className="h-4.5 w-4.5 text-amber-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Catalyst & Catalyst Radar
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {catalysts.map((cat, idx) => {
          const isPositive = cat.expectedDirection === 'POSITIVE';
          return (
            <div
              key={idx}
              className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-2 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-tight bg-slate-200/70 px-2 py-0.5 rounded">
                  {cat.type}
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 border ${
                    isPositive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {cat.expectedDirection}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {cat.description}
              </p>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold pt-1 border-t border-slate-200/50">
                <Clock className="h-3 w-3" />
                <span>Horizon: {cat.timeHorizon || '12-24 Months'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CatalystRadar;
