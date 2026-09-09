import React from 'react';
import { Plus, Trash2, Eye, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function WatchlistTable({
  watchlist = [],
  onSelectTicker = () => {},
  onRemoveTicker = () => {},
  onAddTicker = () => {},
  onCaptureSnapshot = () => {},
  selectedTicker = '',
  loading = false
}) {
  const [newTicker, setNewTicker] = React.useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (newTicker.trim()) {
      onAddTicker(newTicker.trim().toUpperCase());
      setNewTicker('');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-semibold text-white">Monitored Investments</h3>
          <p className="text-xs text-slate-400">Institutional continuous tracking & change intelligence</p>
        </div>
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add ticker (e.g. MSFT)..."
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>
      </div>

      {watchlist.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-xs">
          No tickers added to watchlist. Add AAPL, JPM, or RELIANCE.NS to begin tracking.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="pb-2 font-medium">Ticker</th>
                <th className="pb-2 font-medium">Added Date</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {watchlist.map((item, idx) => {
                const isSelected = selectedTicker === item.ticker;

                return (
                  <tr
                    key={item.ticker || idx}
                    className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-600/10 border-l-2 border-blue-500' : ''
                    }`}
                    onClick={() => onSelectTicker(item.ticker)}
                  >
                    <td className="py-3 font-mono font-bold text-white flex items-center gap-2">
                      <span>{item.ticker}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                      )}
                    </td>
                    <td className="py-3 text-slate-400 font-mono">
                      {new Date(item.addedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {item.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onCaptureSnapshot(item.ticker)}
                          disabled={loading}
                          className="px-2 py-1 text-[11px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
                          title="Capture updated snapshot"
                        >
                          <RefreshCw className={`w-3 h-3 ${loading && isSelected ? 'animate-spin' : ''}`} />
                          Snapshot
                        </button>
                        <button
                          onClick={() => onRemoveTicker(item.ticker)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove ticker"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
  );
}
