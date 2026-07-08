import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, ShieldAlert, BarChart3, Newspaper } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/company/${searchTerm.trim().toUpperCase()}`);
    }
  };

  const handleQuickSelect = (ticker) => {
    navigate(`/company/${ticker}`);
  };

  const sampleTickers = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN'];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 bg-slate-50 text-slate-800 max-w-5xl mx-auto w-full">
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-semibold text-blue-700">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Professional Investment Analyst Assistant</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
          Investment <span className="text-blue-600">AI</span>
        </h1>
        <p className="text-sm md:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Search ticker symbols to generate comprehensive, institutional-grade equity reports. Powered by live SEC records, corporate filings, market news sentiment, and risk auditing models.
        </p>
      </div>

      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-md">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                required
                placeholder="Search by company name or ticker (e.g. AAPL, TSLA)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-transparent focus:border-blue-500 focus:bg-white rounded-full pl-12 pr-4 py-4 text-base text-slate-900 placeholder:text-slate-500 focus:outline-none shadow-inner transition-all duration-200"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-full text-sm tracking-wider uppercase transition-colors shrink-0 shadow-sm cursor-pointer"
            >
              Analyze Company
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
          <span className="font-medium text-slate-500 uppercase tracking-wider">Peers Indexes:</span>
          <div className="flex flex-wrap gap-2">
            {sampleTickers.map((ticker) => (
              <button
                key={ticker}
                onClick={() => handleQuickSelect(ticker)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full cursor-pointer transition-colors border border-transparent hover:border-slate-300"
              >
                {ticker}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full mt-20 border-t border-slate-200 pt-12">
        <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-wider">
            <BarChart3 className="h-4.5 w-4.5" />
            <span>Fundementals</span>
          </div>
          <p className="text-xs text-slate-550 leading-relaxed font-medium">
            Aggregates profit margins, operating returns, liquidity status, debt ratios, and historical valuations.
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-wider">
            <TrendingUp className="h-4.5 w-4.5" />
            <span>Peer Groups</span>
          </div>
          <p className="text-xs text-slate-555 leading-relaxed font-medium">
            Identifies core competitor indexes, maps market positions, and tracks relative performance.
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-wider">
            <Newspaper className="h-4.5 w-4.5" />
            <span>News Audits</span>
          </div>
          <p className="text-xs text-slate-555 leading-relaxed font-medium">
            Analyzes global press feeds and investor publications for real-time sentiment shifts.
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-wider">
            <ShieldAlert className="h-4.5 w-4.5" />
            <span>Risk Ledger</span>
          </div>
          <p className="text-xs text-slate-555 leading-relaxed font-medium">
            Assesses operational, competitive, market-driven, and currency-based investment threats.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
