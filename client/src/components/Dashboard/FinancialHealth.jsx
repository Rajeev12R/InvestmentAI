import React from 'react';
import { DollarSign, Percent, TrendingUp, Landmark, Activity, Compass, ShieldCheck } from 'lucide-react';
import { formatCurrency, formatPercent, formatRatio } from '../../utils/formatters';
import FinancialTooltip from '../Common/FinancialTooltip';

const FinancialHealth = ({ financials }) => {
  if (!financials) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-center text-slate-500 text-sm font-medium h-full shadow-sm">
        Financial metrics unavailable
      </div>
    );
  }

  const {
    revenue,
    revenueGrowth,
    netIncome,
    operatingMargin,
    profitMargin,
    freeCashFlow,
    totalCash,
    totalDebt,
    currentRatio,
    quickRatio,
    marketCap,
    peRatio,
    eps,
    roe,
    roa,
    dividendYield,
    currency = 'USD'
  } = financials;

  const renderMarginGauge = (label, value, termKey) => {
    if (value === null || value === undefined) return null;
    let numeric = Number(value);
    if (Math.abs(numeric) < 1 && numeric !== 0) {
      numeric = numeric * 100;
    }
    const displayVal = Math.max(-50, Math.min(100, numeric));
    const widthPercentage = displayVal < 0 ? 0 : displayVal;
    const isNegative = numeric < 0;

    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-slate-600">
          <FinancialTooltip termKey={termKey} label={label}>
            <span>{label}</span>
          </FinancialTooltip>
          <span className={isNegative ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
            {formatPercent(value)}
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${isNegative ? 'bg-rose-500' : 'bg-blue-600'}`}
            style={{ width: `${widthPercentage}%` }}
          />
        </div>
      </div>
    );
  };

  const cashVal = Number(totalCash || 0);
  const debtVal = Number(totalDebt || 0);
  const totalBar = cashVal + debtVal;
  const cashPercent = totalBar > 0 ? (cashVal / totalBar) * 100 : 50;
  const debtPercent = totalBar > 0 ? (debtVal / totalBar) * 100 : 50;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col justify-between h-full space-y-6 shadow-sm">
      <div className="space-y-4">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Landmark className="h-4.5 w-4.5 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Financial Health & Capital Structure
            </h3>
          </div>
          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-full uppercase">
            Currency: {currency}
          </span>
        </div>

        {/* Primary 4 Fundamental KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          
          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-450 uppercase block">Annual Revenue</span>
            <span className="text-base font-bold text-slate-900 block truncate">
              {formatCurrency(revenue, currency)}
            </span>
            {revenueGrowth !== null && (
              <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                revenueGrowth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {formatPercent(revenueGrowth)} YoY
              </span>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-450 uppercase block">Market Cap</span>
            <span className="text-base font-bold text-slate-900 block truncate">
              {formatCurrency(marketCap, currency)}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Valuation</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-450 uppercase block">Net Income</span>
            <span className="text-base font-bold text-slate-900 block truncate">
              {formatCurrency(netIncome, currency)}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Bottom Line</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-1">
            <FinancialTooltip termKey="freeCashFlow" label="Free Cash Flow">
              <span className="text-[10px] font-bold text-slate-450 uppercase block">Free Cash Flow</span>
            </FinancialTooltip>
            <span className="text-base font-bold text-slate-900 block truncate">
              {formatCurrency(freeCashFlow, currency)}
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 uppercase">Liquidity</span>
          </div>

        </div>

        {/* Breakdown Subsections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
          
          {/* Profitability & Returns */}
          <div className="space-y-4 bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200 pb-1.5">
              Profitability & Returns
            </span>
            {renderMarginGauge('Operating Margin', operatingMargin, 'operatingMargin')}
            {renderMarginGauge('Net Profit Margin', profitMargin, 'netProfitMargin')}
            {renderMarginGauge('Return on Equity (ROE)', roe, 'roe')}
            {roa !== null && renderMarginGauge('Return on Assets (ROA)', roa, 'roe')}
          </div>

          {/* Key Valuation Ratios */}
          <div className="space-y-4 bg-slate-50 border border-slate-200/80 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200 pb-1.5 mb-3.5">
                Key Valuation & Liquidity Ratios
              </span>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                
                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <FinancialTooltip termKey="peRatio" label="P/E Ratio">
                    <span className="text-slate-600 font-medium">P/E Ratio:</span>
                  </FinancialTooltip>
                  <span className="font-bold text-slate-900">{peRatio ? `${peRatio.toFixed(2)}x` : 'N/A'}</span>
                </div>

                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-600 font-medium">EPS (TTM):</span>
                  <span className="font-bold text-slate-900">{eps ? `${eps.toFixed(2)}` : 'N/A'}</span>
                </div>

                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <FinancialTooltip termKey="currentRatio" label="Current Ratio">
                    <span className="text-slate-600 font-medium">Current Ratio:</span>
                  </FinancialTooltip>
                  <span className={`font-bold ${currentRatio >= 1.5 ? 'text-emerald-700' : currentRatio >= 1.0 ? 'text-amber-700' : 'text-rose-700'}`}>
                    {formatRatio(currentRatio)}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <FinancialTooltip termKey="quickRatio" label="Quick Ratio">
                    <span className="text-slate-600 font-medium">Quick Ratio:</span>
                  </FinancialTooltip>
                  <span className="font-bold text-slate-900">{formatRatio(quickRatio)}</span>
                </div>

                <div className="flex justify-between border-b border-slate-200/60 pb-1 col-span-2">
                  <span className="text-slate-600 font-medium">Dividend Yield:</span>
                  <span className="font-bold text-slate-900">{dividendYield ? formatPercent(dividendYield) : '0.00%'}</span>
                </div>

              </div>
            </div>

            {/* Cash vs Debt Solvency Bar */}
            {(totalCash !== null || totalDebt !== null) && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-emerald-700 uppercase">Cash: {formatCurrency(totalCash, currency)}</span>
                  <span className="text-rose-700 uppercase">Debt: {formatCurrency(totalDebt, currency)}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                  {cashVal === 0 && debtVal === 0 ? (
                    <div className="w-full bg-slate-200" />
                  ) : (
                    <>
                      <div className="h-full bg-emerald-500" style={{ width: `${cashPercent}%` }} />
                      <div className="h-full bg-rose-500" style={{ width: `${debtPercent}%` }} />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default FinancialHealth;
