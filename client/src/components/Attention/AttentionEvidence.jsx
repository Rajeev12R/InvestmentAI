import React from 'react';

export default function AttentionEvidence({ item }) {
  if (!item) return null;

  return (
    <div className="mt-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
      <div className="flex justify-between items-center text-slate-500 font-sans text-xs mb-1">
        <span className="font-semibold uppercase tracking-wider text-slate-400">Cryptographic Provenance</span>
        <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 text-[10px]">SEALED</span>
      </div>
      <div className="truncate">
        <span className="text-slate-500">Package Hash: </span>
        <span className="text-slate-300">{item.packageHash || 'N/A'}</span>
      </div>
      <div className="truncate">
        <span className="text-slate-500">Snapshot ID: </span>
        <span className="text-slate-300">{item.snapshotId || 'N/A'}</span>
      </div>
      {item.changeIds && item.changeIds.length > 0 && (
        <div className="truncate">
          <span className="text-slate-500">Change IDs: </span>
          <span className="text-indigo-400">{item.changeIds.join(', ')}</span>
        </div>
      )}
      {item.eventIds && item.eventIds.length > 0 && (
        <div className="truncate">
          <span className="text-slate-500">Event IDs: </span>
          <span className="text-amber-400">{item.eventIds.join(', ')}</span>
        </div>
      )}
    </div>
  );
}
