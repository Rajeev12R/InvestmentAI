import React from 'react';
import { DollarSign, BarChart2, Calendar, ShieldCheck, HelpCircle } from 'lucide-react';

const StockOverview = ({ stock }) => {
  if (!stock) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-center text-slate-500 text-sm font-medium h-full shadow-sm">
        Stock price details unavailable
      </div>
    );
  }

  const {
    currentPrice,
    previousClose,
    open,
    dayHigh,
    dayLow,
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
    averageVolume,
    beta,
    currency,
    exchange
  } = stock;

  const priceDiff = currentPrice && previousClose ? currentPrice - previousClose : 0;
  const pricePercent = previousClose ? (priceDiff / previousClose) * 100 : 0;
  const isUp = priceDiff >= 0;

  const getPositionPercentage = (current, min, max) => {
    if (!current || !min || !max || max === min) return 50;
    const pos = ((current - min) / (max - min)) * 105; // scaling slightly for bubble border
    return Math.max(0, Math.min(100, pos));
  };

  const fiftyTwoWeekPercentage = getPositionPercentage(currentPrice, fiftyTwoWeekLow, fiftyTwoWeekHigh);
  const dayPercentage = getPositionPercentage(currentPrice, dayLow, dayHigh);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between h-full space-y-4 shadow-sm">
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Stock Overview</h3>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full uppercase truncate max-w-[150px]">
            {exchange || 'Equity'}
          </span>
        </div>

        <div className="flex items-baseline justify-between bg-slate-50 border border-slate-100 p-4 rounded-xl shadow-inner">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-450 uppercase block">Last Market Price</span>
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {currentPrice ? currentPrice.toFixed(2) : 'N/A'}
              <span className="text-xs font-semibold text-slate-400 ml-1">{currency || 'USD'}</span>
            </span>
          </div>

          <div className={`text-sm font-bold px-2.5 py-1 rounded-full border ${
            isUp ? 'bg-emerald-50 text-emerald-700 border-emerald-250/60' : 'bg-rose-50 text-rose-700 border-rose-250/60'
          }`}>
            {isUp ? '+' : ''}{priceDiff.toFixed(2)} ({isUp ? '+' : ''}{pricePercent.toFixed(2)}%)
          </div>
        </div>

        <div className="space-y-4 bg-slate-50 border border-slate-100 p-4 rounded-xl">
          {dayLow && dayHigh && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-semibold text-slate-550 uppercase">
                <span>Low: <span className="text-slate-800 font-bold">{dayLow.toFixed(2)}</span></span>
                <span>Day Range</span>
                <span>High: <span className="text-slate-800 font-bold">{dayHigh.toFixed(2)}</span></span>
              </div>
              <div className="relative w-full h-1.5 bg-slate-200 rounded-full">
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow"
                  style={{ left: `calc(${dayPercentage}% - 5px)` }}
                />
              </div>
            </div>
          )}

          {fiftyTwoWeekLow && fiftyTwoWeekHigh && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-semibold text-slate-550 uppercase">
                <span>52W Low: <span className="text-slate-800 font-bold">{fiftyTwoWeekLow.toFixed(2)}</span></span>
                <span>52-Week Range</span>
                <span>52W High: <span className="text-slate-800 font-bold">{fiftyTwoWeekHigh.toFixed(2)}</span></span>
              </div>
              <div className="relative w-full h-1.5 bg-slate-200 rounded-full">
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow"
                  style={{ left: `calc(${fiftyTwoWeekPercentage}% - 5px)` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div className="flex justify-between border-b border-slate-100 pb-1.5">
            <span className="text-slate-500 font-medium">Open:</span>
            <span className="text-slate-800 font-bold">{open ? open.toFixed(2) : 'N/A'}</span>
          </div>

          <div className="flex justify-between border-b border-slate-100 pb-1.5">
            <span className="text-slate-500 font-medium">Prev Close:</span>
            <span className="text-slate-800 font-bold">{previousClose ? previousClose.toFixed(2) : 'N/A'}</span>
          </div>

          <div className="flex justify-between border-b border-slate-100 pb-1.5">
            <span className="text-slate-500 font-medium">Avg Volume:</span>
            <span className="text-slate-800 font-bold">
              {averageVolume ? Number(averageVolume).toLocaleString() : 'N/A'}
            </span>
          </div>

          <div className="flex justify-between border-b border-slate-100 pb-1.5">
            <span className="text-slate-500 font-medium">Beta (3Y):</span>
            <span className="text-slate-800 font-bold">{beta ? beta.toFixed(2) : 'N/A'}</span>
          </div>
        </div>
      </div>

      {beta !== null && (
        <div className="text-[10px] font-semibold text-slate-450 text-center border-t border-slate-100 pt-3">
          Market Volatility Status:{' '}
          <span className={`font-bold ${beta > 1.3 ? 'text-rose-600' : beta > 0.8 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {beta > 1.3 ? 'High Volatility Peer' : beta > 0.8 ? 'Market Trend Correlated' : 'Defensive Low Beta'}
          </span>
        </div>
      )}
    </div>
  );
};

export default StockOverview;
