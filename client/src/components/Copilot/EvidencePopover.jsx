import React from 'react';

export default function EvidencePopover({ citation, onClose }) {
  if (!citation) return null;

  return (
    <div className="absolute z-50 bottom-full left-0 mb-2 w-80 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl text-left text-xs text-slate-300">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <span className="font-semibold text-emerald-400 flex items-center">
          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Verified Grounded Evidence
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200">✕</button>
      </div>

      <div className="mt-2 space-y-1.5">
        <div><span className="text-slate-500">Evidence ID:</span> <span className="font-mono text-slate-200">{citation.evidenceId}</span></div>
        <div><span className="text-slate-500">Source Type:</span> <span className="text-slate-200">{citation.sourceType || 'Truth Layer Package'}</span></div>
        <div><span className="text-slate-500">Authority:</span> <span className="text-slate-200">{citation.sourceAuthority || 'Tier 1 Official Record'}</span></div>
        <div><span className="text-slate-500">Claim:</span> <span className="text-slate-300 italic">{citation.claim}</span></div>
        {citation.packageHash && (
          <div>
            <span className="text-slate-500">Seal Hash:</span>{' '}
            <span className="font-mono text-[10px] text-emerald-400/80 break-all">{citation.packageHash.slice(0, 24)}...</span>
          </div>
        )}
      </div>
    </div>
  );
}
