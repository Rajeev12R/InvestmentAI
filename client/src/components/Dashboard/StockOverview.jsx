import React from 'react';
import { DollarSign, BarChart2, Calendar, ShieldCheck, Activity } from 'lucide-react';
import FinancialTooltip from '../Common/FinancialTooltip';

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
    currency = 'USD',
    exchange
  } = stock;

  const currencySymbol = (currency || '').toUpperCase() === 'INR' ? '₹' : '$';
  const priceDiff = currentPrice && previousClose ? currentPrice - previousClose : 0;
  const pricePercent = previousClose ? (priceDiff / previousClose) * 100 : 0;
  const isUp = priceDiff >= 0;

  const getPositionPercentage = (current, min, max) => {
    if (!current || !min || !max || max === min) return 50;
    const pos = ((current - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, pos));
  };

  const fiftyTwoWeekPercentage = getPositionPercentage(currentPrice, fiftyTwoWeekLow, fiftyTwoWeekHigh);
  const dayPercentage = getPositionPercentage(currentPrice, dayLow, dayHigh);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col justify-between h-full space-y-4 shadow-sm">
      <div className="space-y-4">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4.5 w-4.5 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Stock & Price Boundaries</h3>
          </div>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full uppercase truncate max-w-[150px]">
            {exchange || 'Exchange'}
          </span>
        </div>

        {/* Current Price Banner */}
        <div className="flex items-baseline justify-between bg-slate-50 border border-slate-200/80 p-4 rounded-xl shadow-inner">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-450 uppercase block">Last Market Price</span>
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {currencySymbol}{currentPrice ? currentPrice.toFixed(2) : 'N/A'}
              <span className="text-xs font-semibold text-slate-400 ml-1.5">{currency}</span>
            </span>
          </div>

          <div className={`text-xs font-black px-3 py-1 rounded-full border ${
            isUp ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {isUp ? '+' : ''}{currencySymbol}{priceDiff.toFixed(2)} ({isUp ? '+' : ''}{pricePercent.toFixed(2)}%)
          </div>
        </div>

        {/* Day & 52-Week Range Sliders */}
        <div className="space-y-4 bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
          
          {dayLow && dayHigh && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                <span>Low: <span className="text-slate-900 font-extrabold">{currencySymbol}{dayLow.toFixed(2)}</span></span>
                <span className="text-slate-400 font-semibold">Day Range</span>
                <span>High: <span className="text-slate-900 font-extrabold">{currencySymbol}{dayHigh.toFixed(2)}</span></span>
              </div>
              <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${dayPercentage}%` }}
                />
              </div>
            </div>
          )}

          {fiftyTwoWeekLow && fiftyTwoWeekHigh && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                <span>52W L: <span className="text-slate-900 font-extrabold">{currencySymbol}{fiftyTwoWeekLow.toFixed(2)}</span></span>
                <span className="text-slate-400 font-semibold">52-Week Boundary</span>
                <span>52W H: <span className="text-slate-900 font-extrabold">{currencySymbol}{fiftyTwoWeekHigh.toFixed(2)}</span></span>
              </div>
              <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all"
                  style={{ width: `${fiftyTwoWeekPercentage}%` }}
                />
              </div>
            </div>
          )}

        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
          <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
            <span className="text-slate-500 font-medium">Open:</span>
            <span className="text-slate-900 font-bold">{open ? `${currencySymbol}${open.toFixed(2)}` : 'N/A'}</span>
          </div>

          <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
            <span className="text-slate-500 font-medium">Prev Close:</span>
            <span className="text-slate-900 font-bold">{previousClose ? `${currencySymbol}${previousClose.toFixed(2)}` : 'N/A'}</span>
          </div>

          <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
            <span className="text-slate-500 font-medium">3M Avg Volume:</span>
            <span className="text-slate-900 font-bold">
              {averageVolume ? Number(averageVolume).toLocaleString() : 'N/A'}
            </span>
          </div>

          <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
            <FinancialTooltip termKey="beta" label="Beta Volatility">
              <span className="text-slate-500 font-medium">Beta (3Y):</span>
            </FinancialTooltip>
            <span className="text-slate-900 font-bold">{beta ? beta.toFixed(2) : 'N/A'}</span>
          </div>
        </div>

      </div>

      {beta !== null && (
        <div className="text-[10px] font-bold text-slate-500 text-center border-t border-slate-100 pt-3">
          Market Volatility Status:{' '}
          <span className={`uppercase font-extrabold ${beta > 1.3 ? 'text-rose-600' : beta > 0.8 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {beta > 1.3 ? 'High Volatility Swings' : beta > 0.8 ? 'Market Index Correlated' : 'Defensive & Stable'}
          </span>
        </div>
      )}
    </div>
  );
};

export default StockOverview;
