import React, { useState } from 'react';
import { X, ShieldCheck, Database, Calendar, Calculator, CheckCircle2, AlertTriangle, HelpCircle, ExternalLink, Search } from 'lucide-react';

const EvidenceDrawer = ({ isOpen, onClose, provenance = [], confidence = {} }) => {
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const categories = ['ALL', 'GROUNDED', 'CALCULATED', 'ESTIMATED'];

  const filteredItems = provenance.filter(item => {
    const matchesCategory = filterCategory === 'ALL' || item.status === filterCategory;
    const matchesSearch = item.metric.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.source && item.source.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (item.period && item.period.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Truth Layer & Evidence Graph</h2>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${confidence?.integrityCheck !== false ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-amber-100 text-amber-800 border-amber-200"}`}>
                {confidence?.integrityCheck !== false ? "Truth Package Sealed" : "Unsealed / Incomplete"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Full transparency: View raw inputs, exact formulas, reporting periods, and verified data sources for every metric.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Confidence Summary Banner */}
        <div className="p-4 bg-blue-50/60 border-b border-blue-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="text-slate-500">Analysis Confidence Score:</span>
            <span className="ml-2 font-bold text-blue-700 text-sm">
              {confidence?.overall !== null && confidence?.overall !== undefined ? `${confidence.overall}%` : "UNAVAILABLE"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <span>Completeness: <strong>{confidence?.dataCompleteness !== null && confidence?.dataCompleteness !== undefined ? `${confidence.dataCompleteness}%` : "UNAVAILABLE"}</strong></span>
            <span>•</span>
            <span>Source Quality: <strong>{confidence?.sourceQuality !== null && confidence?.sourceQuality !== undefined ? `${confidence.sourceQuality}%` : "UNAVAILABLE"}</strong></span>
            <span>•</span>
            <span>Freshness: <strong>{confidence?.freshness !== null && confidence?.freshness !== undefined ? `${confidence.freshness}%` : "UNAVAILABLE"}</strong></span>
          </div>
        </div>


        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search evidence by metric or source..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  filterCategory === cat 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Evidence List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No evidence records found matching the filter.
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <div 
                key={item.id || idx}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-blue-300 transition-all space-y-3"
              >
                {/* Item Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.metric}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        item.status === 'GROUNDED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        item.status === 'CALCULATED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        item.status === 'ESTIMATED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {item.status === 'GROUNDED' && <CheckCircle2 className="h-3 w-3" />}
                        {item.status === 'CALCULATED' && <Calculator className="h-3 w-3" />}
                        {item.status === 'ESTIMATED' && <AlertTriangle className="h-3 w-3" />}
                        {item.status}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {item.period}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-slate-900">{item.formattedValue}</span>
                  </div>
                </div>

                {/* Formula (if calculated) */}
                {item.formula && (
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[11px] font-mono text-slate-700">
                    <div className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider mb-1">Mathematical Formula:</div>
                    {item.formula}
                  </div>
                )}

                {/* Primary Source Lineage */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 truncate">
                    <Database className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">Source: <strong className="text-slate-700">{item.source}</strong></span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Constitution of InvestmentAI: Every available figure is classified by source hierarchy and calculation status.</span>
        </div>


      </div>
    </div>
  );
};

export default EvidenceDrawer;
