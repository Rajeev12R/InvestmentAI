import React from 'react';

export default function SuggestedQuestions({ questions = [], onSelectQuestion }) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-800/80">
      <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2 flex items-center">
        <svg className="w-3.5 h-3.5 mr-1 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Suggested Investigation Paths
      </div>
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onSelectQuestion(q)}
            className="text-left text-xs px-2.5 py-1.5 rounded-md bg-slate-800/90 text-slate-200 border border-slate-700/60 hover:bg-slate-700/80 hover:border-sky-500/50 hover:text-sky-200 transition-all duration-150 cursor-pointer flex items-center group"
          >
            <span className="text-sky-400 mr-1.5 opacity-70 group-hover:opacity-100 font-mono">→</span>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
