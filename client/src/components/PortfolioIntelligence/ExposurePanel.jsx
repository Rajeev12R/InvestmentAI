import React from 'react';

export default function ExposurePanel({ exposure = null }) {
  if (!exposure) return null;

  const sectorEntries = Object.entries(exposure.sectorExposure || {});

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-500" />
        Sector Allocation & Exposures
      </h3>

      {sectorEntries.length === 0 ? (
        <div className="text-slate-500 text-xs py-4 text-center">No sector exposure data available.</div>
      ) : (
        <div className="space-y-3">
          {sectorEntries.map(([sector, weight]) => (
            <div key={sector} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">{sector}</span>
                <span className="font-mono text-white font-semibold">{(weight * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, weight * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
