import React, { useState } from 'react';
import { HelpCircle, Info, Sparkles } from 'lucide-react';
import { GLOSSARY } from '../../utils/formatters';

const FinancialTooltip = ({ termKey, label, children }) => {
  const [show, setShow] = useState(false);
  const info = GLOSSARY[termKey];

  if (!info) return <span>{children || label}</span>;

  return (
    <div className="relative inline-flex items-center group">
      <span className="cursor-help flex items-center gap-1 border-b border-dotted border-slate-400/60 hover:border-blue-500 transition-colors">
        {children || label}
        <Info className="h-3 w-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
      </span>

      {/* Floating Tooltip Card */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none backdrop-blur-md">
        <div className="space-y-1.5 text-left">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-blue-400" />
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
              {info.title}
            </span>
          </div>
          <p className="text-xs text-slate-200 font-normal leading-relaxed font-sans">
            {info.simple}
          </p>
          <div className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
            Rule of thumb: {info.benchmark}
          </div>
        </div>
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  );
};

export default FinancialTooltip;
