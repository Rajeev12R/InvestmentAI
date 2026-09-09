import React, { useState } from 'react';
import EvidencePopover from './EvidencePopover';

export default function Citation({ citation }) {
  const [showPopover, setShowPopover] = useState(false);

  if (!citation) return null;

  return (
    <span className="relative inline-block mx-1">
      <button
        onClick={() => setShowPopover(!showPopover)}
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/80 hover:border-emerald-400 transition-colors cursor-pointer"
        title={`Evidence: ${citation.evidenceId} (${citation.sourceAuthority || 'SYSTEM'})`}
      >
        <svg className="w-3 h-3 mr-1 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {citation.evidenceId || citation.citationId}
      </button>

      {showPopover && (
        <EvidencePopover citation={citation} onClose={() => setShowPopover(false)} />
      )}
    </span>
  );
}
