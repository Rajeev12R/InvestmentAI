import React from 'react';
import { Info, Sparkles, BookOpen, Code2, Compass } from 'lucide-react';
import { GLOSSARY } from '../../utils/formatters';

const FinancialTooltip = ({ termKey, label, children }) => {
  const info = GLOSSARY[termKey];

  if (!info) return <span>{children || label}</span>;

  return (
    <span className="relative inline-flex items-center group">
      <span className="cursor-help inline-flex items-center gap-1 border-b border-dashed border-slate-400/80 hover:border-blue-600 transition-colors text-inherit">
        {children || label}
        <Info className="h-3 w-3 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
      </span>

      {/* MDN-Style Reference Card Popover */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 p-3.5 bg-white border border-slate-300 rounded-xl shadow-xl text-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 pointer-events-none text-left font-sans not-italic block">
        <span className="space-y-2 block">
          
          {/* Header */}
          <span className="flex items-center justify-between border-b border-slate-150 pb-1.5 block">
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight block">
              {info.title}
            </span>
            {info.category && (
              <span className="text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full uppercase block">
                {info.category}
              </span>
            )}
          </span>

          {/* Definition */}
          <span className="text-xs text-slate-600 leading-relaxed font-normal block">
            {info.definition}
          </span>

          {/* Formula */}
          {info.formula && (
            <span className="bg-slate-50 border border-slate-200 p-2 rounded-lg block space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Formula:
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-800 block">
                {info.formula}
              </span>
            </span>
          )}

          {/* Benchmark Guide */}
          {info.benchmark && (
            <span className="text-[10px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200 font-medium block">
              <span className="font-bold text-blue-700 uppercase block text-[9px] mb-0.5">Benchmark / Reference:</span>
              {info.benchmark}
            </span>
          )}
        </span>

        {/* Bottom arrow */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />
      </span>
    </span>
  );
};

export default FinancialTooltip;

