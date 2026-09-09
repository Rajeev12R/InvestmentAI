import React, { useState } from 'react';

export default function InvestigationQuestions({ questions = [], ticker = '', onInvestigate = null }) {
  const [activeQuestion, setActiveQuestion] = useState(null);

  if (!questions || questions.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-slate-800">
      <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Deterministic Investigation Questions
      </h5>
      <ul className="space-y-2">
        {questions.map((q, idx) => (
          <li key={idx} className="flex items-start justify-between gap-2 text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-slate-300 leading-relaxed">• {q}</span>
            {onInvestigate && (
              <button
                onClick={() => onInvestigate(q)}
                className="shrink-0 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 px-2 py-1 rounded transition-colors border border-indigo-800/50"
              >
                Investigate
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
