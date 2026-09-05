import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';

const MARKET_ITEMS = [
  { symbol: 'S&P 500', price: '5,864.67', change: '+0.82%', up: true, isIndex: true },
  { symbol: 'NASDAQ', price: '18,518.61', change: '+1.24%', up: true, isIndex: true },
  { symbol: 'NIFTY 50', price: '25,235.90', change: '+0.45%', up: true, isIndex: true },
  { symbol: 'NVDA', price: '$138.25', change: '+3.14%', up: true, ticker: 'NVDA' },
  { symbol: 'AAPL', price: '$228.50', change: '+0.64%', up: true, ticker: 'AAPL' },
  { symbol: 'MSFT', price: '$448.20', change: '+1.10%', up: true, ticker: 'MSFT' },
  { symbol: 'TSLA', price: '$248.10', change: '+2.85%', up: true, ticker: 'TSLA' },
  { symbol: 'AMZN', price: '$186.40', change: '+0.95%', up: true, ticker: 'AMZN' },
  { symbol: 'TCS', price: '₹4,512.00', change: '+1.35%', up: true, ticker: 'TCS.NS' },
  { symbol: 'BTC/USD', price: '$64,280', change: '+2.40%', up: true, isCrypto: true },
  { symbol: '10Y YIELD', price: '4.08%', change: '-0.04%', up: false, isIndex: true }
];

const TickerBar = () => {
  return (
    <div className="h-8 bg-slate-900 border-b border-slate-800/80 text-[11px] overflow-hidden flex items-center select-none">
      <div className="flex items-center px-3 bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[9px] shrink-0 z-10 border-r border-slate-800 gap-1.5 shadow-sm">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
        <span>Live Markets</span>
      </div>

      <div className="flex overflow-x-auto no-scrollbar scrollbar-none whitespace-nowrap animate-marquee hover:pause gap-6 px-4">
        {[...MARKET_ITEMS, ...MARKET_ITEMS].map((item, idx) => {
          const content = (
            <div key={idx} className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
              <span className="font-extrabold text-slate-300">{item.symbol}</span>
              <span className="text-slate-400 font-mono text-[10px]">{item.price}</span>
              <span className={`inline-flex items-center text-[10px] font-bold ${
                item.up ? 'text-emerald-400' : 'text-rose-400'
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
