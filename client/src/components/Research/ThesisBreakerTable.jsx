import React from 'react';
import { AlertOctagon, ArrowRight } from 'lucide-react';

const ThesisBreakerTable = ({ breakers = [] }) => {
  if (!breakers || breakers.length === 0) {
    return null;
  }

  const getSeverityBadge = (sev) => {
    if (sev === 'CRITICAL') return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    if (sev === 'HIGH') return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
        <AlertOctagon className="h-4.5 w-4.5 text-rose-600" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Thesis Invalidation Triggers ("What would make this thesis wrong?")
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-3 font-bold">Falsification Trigger</th>
              <th className="py-2.5 px-3 font-bold">Current Value</th>
              <th className="py-2.5 px-3 font-bold">Invalidation Threshold</th>
              <th className="py-2.5 px-3 font-bold">Severity</th>
              <th className="py-2.5 px-3 font-bold">Impact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {breakers.map((b, idx) => (
              <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-3 text-slate-900 font-semibold">{b.trigger}</td>
                <td className="py-3 px-3 text-slate-600">{b.currentValue || 'N/A'}</td>
                <td className="py-3 px-3 text-rose-700 font-bold">{b.threshold}</td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] border ${getSeverityBadge(b.severity)}`}>
                    {b.severity}
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-600 text-[11px]">{b.impact || 'Thesis downgrade trigger'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ThesisBreakerTable;
