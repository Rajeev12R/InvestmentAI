import React from 'react';
import { History, ShieldCheck, Hash, Layers } from 'lucide-react';

export default function SnapshotHistory({ snapshots = [], selectedSnapshotId = null, onSelectSnapshot = () => {} }) {
  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-center">
        <p className="text-xs text-slate-400">No snapshot history found for this investment.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-white">Immutable Snapshots</h3>
        </div>
        <span className="text-xs text-slate-400">{snapshots.length} Version(s)</span>
      </div>

      <div className="space-y-2">
        {snapshots.map((snap, idx) => {
          const isSelected = selectedSnapshotId === snap.snapshotId;
          const hashShort = snap.snapshotHash ? snap.snapshotHash.substring(0, 12) + '...' : 'N/A';

          return (
            <div
              key={snap.snapshotId || idx}
              onClick={() => onSelectSnapshot(snap.snapshotId)}
              className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                isSelected
                  ? 'bg-blue-600/10 border-blue-500/50 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-white">
                  T{idx}: {new Date(snap.createdAt).toLocaleString()}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                  v{snap.truthPackageVersion || '1.0.0'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span>Decision: <strong className="text-white">{snap.decisionState?.decision || 'WATCH'}</strong></span>
                <span>Fair Value: <strong className="text-white">${snap.valuationState?.compositeFairValue || snap.valuationState?.dcfFairValue || 'N/A'}</strong></span>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-2 border-t border-slate-800/60 mt-2">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span className="font-mono">SHA-256: {hashShort}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
