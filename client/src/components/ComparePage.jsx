import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { compareCompanies } from '../utils/api';
import { 
  Trophy, 
  Swords, 
  TrendingUp, 
  ShieldCheck, 
  Flame, 
  Scale, 
  ArrowRight, 
  Sparkles, 
  Loader2, 
  AlertCircle,
  Plus,
  X,
  ExternalLink
} from 'lucide-react';

const PRESETS = [
  { label: 'Big Tech Titans', tickers: ['AAPL', 'MSFT'] },
  { label: 'AI & Chips', tickers: ['NVDA', 'AMD'] },
  { label: 'IT Services India', tickers: ['TCS.NS', 'INFY.NS'] },
  { label: 'Auto & EV', tickers: ['TSLA', 'F'] }
];

const ComparePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTickersParam = searchParams.get('tickers');
  
  const [tickerInputs, setTickerInputs] = useState(
    initialTickersParam ? initialTickersParam.split(',').map(t => t.trim().toUpperCase()) : ['AAPL', 'MSFT']
  );
  const [newTicker, setNewTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const fetchComparison = async (tickersToFetch) => {
    if (!tickersToFetch || tickersToFetch.length < 2) {
      setError('Please add at least 2 tickers to compare.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await compareCompanies(tickersToFetch);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        throw new Error(res.message || 'Comparison failed.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to compare equities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tickerInputs.length >= 2) {
      fetchComparison(tickerInputs);
    }
  }, []);

  const handleAddTicker = (e) => {
    e.preventDefault();
    const clean = newTicker.trim().toUpperCase();
    if (clean && !tickerInputs.includes(clean) && tickerInputs.length < 4) {
      const updated = [...tickerInputs, clean];
      setTickerInputs(updated);
      setSearchParams({ tickers: updated.join(',') });
      setNewTicker('');
      fetchComparison(updated);
    }
  };

  const handleRemoveTicker = (tickerToRemove) => {
    if (tickerInputs.length <= 2) {
      setError('Comparison requires a minimum of 2 tickers.');
      return;
    }
    const updated = tickerInputs.filter(t => t !== tickerToRemove);
    setTickerInputs(updated);
    setSearchParams({ tickers: updated.join(',') });
    fetchComparison(updated);
  };

  const handleSelectPreset = (presetTickers) => {
    setTickerInputs(presetTickers);
    setSearchParams({ tickers: presetTickers.join(',') });
    fetchComparison(presetTickers);
  };

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-8">
      
      {/* Page Header & Selector */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
                <Swords className="h-4 w-4" />
              </div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">
                PRO FEATURE &bull; MULTI-EQUITY BATTLE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
              Head-to-Head Stock Comparison
            </h1>
            <p className="text-xs text-slate-500 font-medium max-w-2xl">
              Evaluate relative valuation multiples, capital efficiency, operating margins, and automated AI victor verdicts side-by-side.
            </p>
          </div>

          {/* Quick Matchup Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Popular Matchups:</span>
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPreset(p.tickers)}
                className="text-xs font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-xs"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Ticker Pills & Add Input */}
        <div className="flex flex-wrap items-center gap-3">
          {tickerInputs.map((t) => (
            <div 
              key={t}
              className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 px-3.5 py-1.5 rounded-full font-bold text-xs uppercase shadow-xs"
            >
              <span>{t}</span>
              {tickerInputs.length > 2 && (
                <button
                  onClick={() => handleRemoveTicker(t)}
                  className="hover:bg-blue-200/60 p-0.5 rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5 text-blue-600" />
                </button>
              )}
            </div>
          ))}

          {tickerInputs.length < 4 && (
            <form onSubmit={handleAddTicker} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add ticker (e.g. GOOGL)..."
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value)}
                className="bg-slate-100 hover:bg-slate-200/60 border border-slate-200 focus:border-blue-500 focus:bg-white px-3.5 py-1.5 rounded-full text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none uppercase font-semibold transition-all w-48 shadow-inner"
              />
              <button
                type="submit"
                disabled={!newTicker.trim()}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white p-2 rounded-full transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </form>
          )}

          <button
            onClick={() => fetchComparison(tickerInputs)}
            disabled={loading || tickerInputs.length < 2}
            className="ml-auto inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>Compare Now</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center space-y-4 shadow-sm text-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Synthesizing Head-to-Head Intelligence</h3>
            <p className="text-xs text-slate-450 font-medium">Auditing balance sheets, discounted cash flows, and operating performance...</p>
          </div>
        </div>
      )}

      {/* Comparison Results */}
      {result && !loading && (
        <div className="space-y-8">
          
          {/* AI Winner Crown Banner */}
          {result.analysis && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-amber-400" /> AI Comparative Victor Decision
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                    Overall Winner: <span className="text-amber-400">{result.analysis.winnerName || result.analysis.winner}</span> ({result.analysis.winner})
                  </h2>
                </div>

                <Link
                  to={`/company/${result.analysis.winner}`}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-full transition-colors shadow-md w-fit"
                >
                  <span>Full Report</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Summary Statement */}
              <p className="text-sm text-slate-200 leading-relaxed font-sans font-medium">
                {result.analysis.summaryVerdict}
              </p>

              {/* Category Trophies Grid */}
              {result.analysis.categoryWinners && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  
                  {/* Category 1: Growth */}
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-blue-400 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Growth Victor
                      </span>
                      <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                        {result.analysis.categoryWinners.growth?.winner}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-snug">
                      {result.analysis.categoryWinners.growth?.reason}
                    </p>
                  </div>

                  {/* Category 2: Valuation */}
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-emerald-400 flex items-center gap-1">
                        <Scale className="h-3 w-3" /> Valuation Value
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                        {result.analysis.categoryWinners.valuation?.winner}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-snug">
                      {result.analysis.categoryWinners.valuation?.reason}
                    </p>
                  </div>

                  {/* Category 3: Profitability */}
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-amber-400 flex items-center gap-1">
                        <Flame className="h-3 w-3" /> Margins Champion
                      </span>
                      <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                        {result.analysis.categoryWinners.profitability?.winner}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-snug">
                      {result.analysis.categoryWinners.profitability?.reason}
                    </p>
                  </div>

                  {/* Category 4: Solvency */}
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-purple-400 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Balance Sheet
                      </span>
                      <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                        {result.analysis.categoryWinners.balanceSheetHealth?.winner}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-snug">
                      {result.analysis.categoryWinners.balanceSheetHealth?.reason}
                    </p>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* Side-by-Side Comparison Metrics Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Comparative Metrics & Fundamental Matrix
              </h3>
              <span className="text-[10px] text-slate-450 font-bold uppercase">
                {result.stocks.length} Equities Mapped
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-450 font-bold text-[10px] uppercase">
                    <th className="py-3 px-4">Financial Metric</th>
                    {result.stocks.map((s) => (
                      <th key={s.ticker} className="py-3 px-4">
                        <div className="space-y-0.5">
                          <Link 
                            to={`/company/${s.ticker}`}
                            className="text-blue-600 font-extrabold hover:underline flex items-center gap-1 text-xs"
                          >
                            <span>{s.name} ({s.ticker})</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                          <span className="text-[9px] text-slate-400 font-normal block">{s.sector || 'General'}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  
                  {/* Current Market Price */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-700">Market Price</td>
                    {result.stocks.map((s) => (
                      <td key={s.ticker} className="py-3 px-4 font-extrabold text-slate-900 text-sm">
                        {s.currency === 'INR' ? '₹' : '$'}{s.currentPrice || 'N/A'}
                      </td>
                    ))}
                  </tr>

                  {/* DCF Fair Value Target */}
                  <tr className="hover:bg-slate-50 transition-colors bg-blue-50/20">
                    <td className="py-3 px-4 font-bold text-blue-800">DCF Fair Value Target</td>
                    {result.stocks.map((s) => (
                      <td key={s.ticker} className="py-3 px-4 font-bold text-blue-700">
                        {s.currency === 'INR' ? '₹' : '$'}{s.fairValue || 'N/A'}
                        {s.upsidePotential !== undefined && (
                          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            s.upsidePotential >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {s.upsidePotential > 0 ? `+${s.upsidePotential}%` : `${s.upsidePotential}%`}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Valuation Status */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-700">Valuation Status</td>
                    {result.stocks.map((s) => (
                      <td key={s.ticker} className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.valuationRating === 'UNDERVALUED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : s.valuationRating === 'OVERVALUED' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {s.valuationRating || 'FAIRLY VALUED'}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Revenue Growth */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-700">Top-Line Revenue Growth</td>
                    {result.stocks.map((s) => (
                      <td key={s.ticker} className="py-3 px-4 font-semibold text-slate-800">
                        {s.revenueGrowth !== null && s.revenueGrowth !== undefined 
                          ? `${(Number(s.revenueGrowth) * (Math.abs(Number(s.revenueGrowth)) < 1 ? 100 : 1)).toFixed(1)}%` 
                          : 'N/A'}
                      </td>
                    ))}
                  </tr>

                  {/* Operating Margin */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-700">Operating Margin</td>
                    {result.stocks.map((s) => (
                      <td key={s.ticker} className="py-3 px-4 font-semibold text-slate-800">
                        {s.operatingMargin !== null && s.operatingMargin !== undefined 
                          ? `${(Number(s.operatingMargin) * (Math.abs(Number(s.operatingMargin)) < 1 ? 100 : 1)).toFixed(1)}%` 
                          : 'N/A'}
                      </td>
                    ))}
                  </tr>

                  {/* Trailing P/E */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-700">Trailing P/E Ratio</td>
                    {result.stocks.map((s) => (
                      <td key={s.ticker} className="py-3 px-4 font-semibold text-slate-800">
                        {s.peRatio ? `${Number(s.peRatio).toFixed(2)}x` : 'N/A'}
                      </td>
                    ))}
                  </tr>

                  {/* ROE */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-700">Return on Equity (ROE)</td>
                    {result.stocks.map((s) => (
                      <td key={s.ticker} className="py-3 px-4 font-semibold text-slate-800">
                        {s.roe !== null && s.roe !== undefined 
                          ? `${(Number(s.roe) * (Math.abs(Number(s.roe)) < 1 ? 100 : 1)).toFixed(1)}%` 
                          : 'N/A'}
                      </td>
                    ))}
                  </tr>

                  {/* Debt to Cash */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-700">Debt to Cash Ratio</td>
                    {result.stocks.map((s) => (
                      <td key={s.ticker} className="py-3 px-4 font-semibold text-slate-800">
                        {s.debtToCash !== 'N/A' ? `${s.debtToCash}x` : 'N/A'}
                      </td>
                    ))}
                  </tr>

                  {/* Market Cap */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-700">Market Capitalization</td>
                    {result.stocks.map((s) => (
                      <td key={s.ticker} className="py-3 px-4 font-semibold text-slate-800">
                        {s.marketCap ? `${s.currency === 'INR' ? '₹' : '$'}${(Number(s.marketCap) / 1e9).toFixed(2)}B` : 'N/A'}
                      </td>
                    ))}
                  </tr>

                </tbody>
              </table>
            </div>
          </div>

          {/* Key Strategic Takeaways */}
          {result.analysis.keyTakeaways && result.analysis.keyTakeaways.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Key Strategic Takeaways for Portfolio Construction
                </h3>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {result.analysis.keyTakeaways.map((point, idx) => (
                  <li key={idx} className="bg-slate-50 border border-slate-150 p-4 rounded-2xl text-xs text-slate-700 leading-relaxed font-medium">
                    <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full mr-2">
                      {idx + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default ComparePage;
