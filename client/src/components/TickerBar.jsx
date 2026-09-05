import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMarketTickersApi } from '../utils/api';

const TickerBar = () => {
  const [tickers, setTickers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveTickers = async () => {
    try {
      const res = await getMarketTickersApi();
      if (res.success && res.data && res.data.length > 0) {
        setTickers(res.data);
      }
    } catch (e) {
      console.warn('Failed to load market ticker feed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveTickers();
    const interval = setInterval(fetchLiveTickers, 60000); // 60s live poll
    return () => clearInterval(interval);
  }, []);

  if (tickers.length === 0 && loading) {
    return (
      <div className="h-8 bg-white border-b border-slate-200 text-[11px] text-slate-500 flex items-center px-4 justify-between font-mono select-none shadow-xs">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Connecting Global Markets Feed...</span>
        </div>
      </div>
    );
  }

  const displayList = tickers.length > 0 ? [...tickers, ...tickers] : [];

  return (
    <div className="h-8 bg-white border-b border-slate-200 text-[11px] overflow-hidden flex items-center select-none shadow-xs">
      <div className="flex items-center px-3 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[9px] shrink-0 z-10 border-r border-slate-200 gap-1.5 shadow-xs">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>LIVE GLOBAL MARKETS</span>
      </div>

      <div className="flex overflow-x-auto no-scrollbar scrollbar-none whitespace-nowrap animate-marquee hover:pause gap-6 px-4">
        {displayList.map((item, idx) => {
          const content = (
            <div key={idx} className="inline-flex items-center gap-1.5 text-slate-700 hover:text-blue-600 transition-colors cursor-pointer">
              <span className="font-extrabold text-slate-900">{item.symbol}</span>
              <span className="text-slate-600 font-mono text-[10px] font-medium">{item.price}</span>
              <span className={`inline-flex items-center text-[10px] font-bold ${
                item.up ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {item.up ? <TrendingUp className="h-2.5 w-2.5 mr-0.5" /> : <TrendingDown className="h-2.5 w-2.5 mr-0.5" />}
                {item.change}
              </span>
            </div>
          );

          return item.ticker ? (
            <Link key={idx} to={`/company/${item.ticker}`} className="inline-block">
              {content}
            </Link>
          ) : (
            <div key={idx} className="inline-block">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TickerBar;

