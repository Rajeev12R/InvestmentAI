import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Star, 
  Trash2, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Plus, 
  Search, 
  Download,
  AlertCircle,
  FileEdit,
  Check
} from 'lucide-react';

const WatchlistPage = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [newTickerInput, setNewTickerInput] = useState('');
  const [editingNoteTicker, setEditingNoteTicker] = useState(null);
  const [noteText, setNoteText] = useState('');

  // Load watchlist from local storage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('investmentai_watchlist') || '[]');
      if (saved.length === 0) {
        // Seed default watchlist for demo if empty
        const initialSeed = [
          {
            ticker: 'NVDA',
            name: 'NVIDIA Corporation',
            price: 138.25,
            fairValue: 165.00,
            upside: 19.3,
            recommendation: 'INVEST',
            score: 88,
            currency: 'USD',
            notes: 'Leading supplier for AI enterprise compute clusters.'
          },
          {
            ticker: 'AAPL',
            name: 'Apple Inc.',
            price: 228.50,
            fairValue: 242.00,
            upside: 5.9,
            recommendation: 'HOLD',
            score: 75,
            currency: 'USD',
            notes: 'Solid free cash flow generator and ecosystem services growth.'
          }
        ];
        localStorage.setItem('investmentai_watchlist', JSON.stringify(initialSeed));
        setWatchlist(initialSeed);
      } else {
        setWatchlist(saved);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveWatchlist = (items) => {
    setWatchlist(items);
    localStorage.setItem('investmentai_watchlist', JSON.stringify(items));
  };

  const handleAddTicker = (e) => {
    e.preventDefault();
    const clean = newTickerInput.trim().toUpperCase();
    if (!clean) return;

    if (watchlist.some(item => item.ticker === clean)) {
      alert(`${clean} is already in your watchlist.`);
      return;
    }

    const newItem = {
      ticker: clean,
      name: clean,
      price: 0,
      fairValue: 0,
      upside: 0,
      recommendation: 'UNANALYZED',
      score: 50,
      currency: 'USD',
      notes: 'Added from Watchlist center. Run analysis for full valuation.'
    };

    saveWatchlist([newItem, ...watchlist]);
    setNewTickerInput('');
  };

  const handleRemoveItem = (tickerToRemove) => {
    const updated = watchlist.filter(item => item.ticker !== tickerToRemove);
    saveWatchlist(updated);
  };

  const handleSaveNote = (ticker) => {
    const updated = watchlist.map(item => {
      if (item.ticker === ticker) {
        return { ...item, notes: noteText };
      }
      return item;
    });
    saveWatchlist(updated);
    setEditingNoteTicker(null);
  };

  const handleStartEditNote = (item) => {
    setEditingNoteTicker(item.ticker);
    setNoteText(item.notes || '');
  };

  // Metrics
  const totalTracked = watchlist.length;
  const undervaluedCount = watchlist.filter(item => item.upside > 10).length;

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-8">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="bg-amber-500 text-white p-1.5 rounded-lg shadow-sm">
                <Star className="h-4 w-4 fill-white" />
              </div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-600">
                PORTFOLIO RADAR &bull; WATCHLIST
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
              Equity Watchlist & Price Targets
            </h1>
            <p className="text-xs text-slate-500 font-medium max-w-2xl">
              Track real-time valuations, DCF target price gaps, custom investment notes, and potential entry catalysts.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-450 block">Tracked</span>
              <span className="text-lg font-black text-slate-900">{totalTracked}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Undervalued</span>
              <span className="text-lg font-black text-emerald-700">{undervaluedCount}</span>
            </div>
          </div>
        </div>

        {/* Add Ticker Form */}
        <form onSubmit={handleAddTicker} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-450" />
            <input
              type="text"
              placeholder="Add ticker to watchlist (e.g. MSFT, TSLA, TCS.NS)..."
              value={newTickerInput}
              onChange={(e) => setNewTickerInput(e.target.value)}
              className="w-full bg-slate-100 hover:bg-slate-200/60 border border-slate-200 focus:border-blue-500 focus:bg-white pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none rounded-full uppercase font-semibold transition-all shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={!newTickerInput.trim()}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Stock</span>
          </button>
        </form>
      </div>

      {/* Watchlist Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Tracked Equities Matrix
          </h3>
          <span className="text-[10px] text-slate-450 font-bold uppercase">
            Auto-saved locally
          </span>
        </div>

        {watchlist.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Star className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Your watchlist is currently empty.</p>
            <p className="text-[10px] text-slate-450">Add tickers using the form above or click "Watchlist" on any equity dashboard.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-450 font-bold text-[10px] uppercase">
                  <th className="py-3 px-4">Equity / Ticker</th>
                  <th className="py-3 px-4">Market Price</th>
                  <th className="py-3 px-4">DCF Fair Value</th>
                  <th className="py-3 px-4">Implied Gap</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Thesis Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {watchlist.map((item) => {
                  const currencySym = item.currency === 'INR' ? '₹' : '$';
                  const isEditingThisNote = editingNoteTicker === item.ticker;

                  return (
                    <tr key={item.ticker} className="hover:bg-slate-50 transition-colors">
                      {/* Equity / Ticker */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <Link 
                            to={`/company/${item.ticker}`}
                            className="font-extrabold text-blue-600 hover:underline flex items-center gap-1 text-xs"
                          >
                            <span>{item.ticker}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                          <span className="text-[10px] text-slate-500 font-medium block truncate max-w-[180px]">
                            {item.name}
                          </span>
                        </div>
                      </td>

                      {/* Market Price */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.price ? `${currencySym}${item.price}` : 'N/A'}
                      </td>

                      {/* DCF Fair Value */}
                      <td className="py-3 px-4 font-bold text-blue-700">
                        {item.fairValue ? `${currencySym}${item.fairValue}` : 'N/A'}
                      </td>

                      {/* Implied Gap */}
                      <td className="py-3 px-4 font-bold">
                        {item.upside !== undefined && item.upside !== 0 ? (
                          <span className={`inline-flex items-center gap-1 text-xs ${
                            item.upside > 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {item.upside > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                            <span>{item.upside > 0 ? `+${item.upside}%` : `${item.upside}%`}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">--</span>
                        )}
                      </td>

                      {/* Rating */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          item.recommendation === 'INVEST' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : item.recommendation === 'PASS' 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.recommendation || 'HOLD'}
                        </span>
                      </td>

                      {/* Thesis Notes */}
                      <td className="py-3 px-4 max-w-xs">
                        {isEditingThisNote ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              className="bg-white border border-blue-400 rounded px-2 py-1 text-xs w-full focus:outline-none shadow-inner"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveNote(item.ticker)}
                              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => handleStartEditNote(item)}
                            className="group flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                            title="Click to edit thesis note"
                          >
                            <span className="truncate max-w-[220px] text-xs">
                              {item.notes || 'Add note...'}
                            </span>
                            <FileEdit className="h-3 w-3 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/company/${item.ticker}`}
                            className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors"
                          >
                            Analyze
                          </Link>
                          <button
                            onClick={() => handleRemoveItem(item.ticker)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                            title="Remove from watchlist"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default WatchlistPage;
