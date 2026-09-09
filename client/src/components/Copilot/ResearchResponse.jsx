import React from 'react';

export default function ResearchResponse({ researchFindings = [] }) {
  if (!researchFindings || researchFindings.length === 0) return null;

  return (
    <div className="my-2 p-3 bg-sky-950/30 rounded-lg border border-sky-800/40 text-xs text-slate-300">
      <div className="font-semibold text-sky-400 flex items-center mb-1.5">
        <svg className="w-3.5 h-3.5 mr-1 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        Grounded Research Intelligence
      </div>
      <ul className="list-disc list-inside space-y-1">
        {researchFindings.map((f, i) => (
          <li key={i} className="text-slate-300">
            {typeof f === 'string' ? f : f.finding || f.claim || JSON.stringify(f)}
          </li>
        ))}
      </ul>
    </div>
  );
}
