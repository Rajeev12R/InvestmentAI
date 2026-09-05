import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Target, Users, Search, Swords, ArrowRight } from 'lucide-react';

const CompetitorAnalysis = ({ competitors, currentTicker }) => {
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
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col justify-between h-full space-y-4 shadow-sm">
      <div className="space-y-4">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Competitor Peer Intelligence</h3>
          </div>
          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-full uppercase">
            Sector Matrix
          </span>
        </div>

        {marketPosition && (
          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-1 shadow-inner">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-450 uppercase">
              <Target className="h-3.5 w-3.5 text-blue-600" />
              <span>Positioning & Moat Assessment</span>
            </div>
            <p className="text-xs text-slate-800 leading-relaxed font-semibold">
              {marketPosition}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
            Primary Peer Benchmarks & One-Click Battles
          </span>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <th className="p-3 font-semibold">Competitor</th>
                  <th className="p-3 font-semibold">Ticker</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {primaryCompetitors.map((peer, idx) => (
                  <tr 
                    key={idx} 
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-3 font-bold text-slate-900">
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
                      <div className="flex items-center justify-end gap-1.5">
                        {currentTicker && (
                          <Link
                            to={`/compare?tickers=${currentTicker},${peer.ticker}`}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2.5 py-1 rounded-full transition-colors uppercase cursor-pointer shadow-xs"
                            title="Battle Compare Head-to-Head"
                          >
                            <Swords className="h-3 w-3" />
                            Battle
                          </Link>
                        )}
                        <button
                          onClick={() => handlePeerAnalyze(peer.ticker)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2.5 py-1 rounded-full transition-colors cursor-pointer uppercase"
                        >
                          <Search className="h-3 w-3" />
                          Analyze
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="text-[10px] font-bold text-slate-400 text-center leading-relaxed mt-2 border-t border-slate-100 pt-3">
        Industry Sector: <span className="text-slate-700 font-extrabold uppercase">{industry || 'General Equities'}</span>
      </div>
    </div>
  );
};

export default CompetitorAnalysis;
