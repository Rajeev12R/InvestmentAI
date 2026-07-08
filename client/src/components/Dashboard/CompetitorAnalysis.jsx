import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Users, Search } from 'lucide-react';

const CompetitorAnalysis = ({ competitors }) => {
  const navigate = useNavigate();

  if (!competitors || !competitors.primaryCompetitors || competitors.primaryCompetitors.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-center text-slate-500 text-sm font-medium h-full shadow-sm">
        Competitor peers data unavailable
      </div>
    );
  }

  const { industry, marketPosition, primaryCompetitors } = competitors;

  const handlePeerAnalyze = (ticker) => {
    if (ticker) {
      navigate(`/company/${ticker.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between h-full space-y-4 shadow-sm">
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Competitor Analysis</h3>
          </div>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full uppercase">
            Peers List
          </span>
        </div>
        {marketPosition && (
          <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-1 shadow-inner">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-450 uppercase">
              <Target className="h-3.5 w-3.5 text-slate-400" />
              <span>Positioning & Sector Status</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-semibold">
              {marketPosition}
            </p>
          </div>
        )}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-450 uppercase block tracking-wider">
            Primary peer indexing
          </span>
          <div className="border border-slate-150 rounded-xl overflow-hidden shadow-inner">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-55/70 bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase">
                  <th className="p-3 font-semibold">Company Name</th>
                  <th className="p-3 font-semibold">Ticker</th>
                  <th className="p-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {primaryCompetitors.map((peer, idx) => (
                  <tr 
                    key={idx} 
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-3 font-bold text-slate-800">
                      {peer.name}
                    </td>
                    <td className="p-3">
                      <span 
                        onClick={() => handlePeerAnalyze(peer.ticker)}
                        className="bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 px-2.5 py-0.5 rounded-full text-slate-700 font-bold transition-colors uppercase cursor-pointer text-[11px]"
                      >
                        {peer.ticker}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handlePeerAnalyze(peer.ticker)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2.5 py-1.5 rounded-full transition-colors cursor-pointer uppercase"
                      >
                        <Search className="h-2.5 w-2.5 stroke-[2.5]" />
                        Analyze
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="text-[10px] font-semibold text-slate-400 text-center leading-relaxed mt-2 border-t border-slate-100 pt-3">
        Industry classification: {industry || 'Unspecified'}
      </div>
    </div>
  );
};

export default CompetitorAnalysis;
