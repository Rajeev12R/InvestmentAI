import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, TrendingDown, Sliders, ShieldAlert, Sparkles, BarChart3, HelpCircle } from 'lucide-react';

const ValuationModel = ({ valuation, stock, financials }) => {
  const currentPrice = Number(stock?.currentPrice || valuation?.currentPrice || 0);
  const initialGrowth = Number(valuation?.assumptions?.baseGrowthRate ?? 10);
  const initialDiscount = Number(valuation?.assumptions?.discountRate ?? 9.5);
  const initialTerminal = Number(valuation?.assumptions?.terminalGrowthRate ?? 2.5);
  const baseFCF = Number(valuation?.assumptions?.freeCashFlow || financials?.freeCashFlow || financials?.netIncome || 1000000000);
  const sharesOutstanding = Number(valuation?.assumptions?.sharesOutstanding || (currentPrice > 0 && financials?.marketCap ? financials.marketCap / currentPrice : 1000000000));
  const totalCash = Number(financials?.totalCash || 0);
  const totalDebt = Number(financials?.totalDebt || 0);

  // User interactive state sliders
  const [growthRate, setGrowthRate] = useState(initialGrowth);
  const [discountRate, setDiscountRate] = useState(initialDiscount);
  const [terminalGrowth, setTerminalGrowth] = useState(initialTerminal);

  // Real-time client DCF computation when sliders change
  const computedValuation = useMemo(() => {
    const gRate = growthRate / 100;
    const dRate = Math.max(0.04, discountRate / 100);
    const tRate = Math.min(dRate - 0.01, terminalGrowth / 100);

    const projectedFlows = [];
    let currentFlow = baseFCF > 0 ? baseFCF : (financials?.marketCap ? financials.marketCap * 0.04 : 1000000000);
    let pvSum = 0;

    for (let year = 1; year <= 5; year++) {
        const yearGrowth = gRate * Math.pow(0.92, year - 1);
        currentFlow = currentFlow * (1 + yearGrowth);
        const pv = currentFlow / Math.pow(1 + dRate, year);
        pvSum += pv;
        projectedFlows.push({
            year,
            amount: currentFlow,
            pv: pv,
            growth: (yearGrowth * 100).toFixed(1)
        });
    }

    const terminalFCF = currentFlow * (1 + tRate);
    const terminalValue = terminalFCF / (dRate - tRate);
    const pvTerminalValue = terminalValue / Math.pow(1 + dRate, 5);

    const enterpriseVal = pvSum + pvTerminalValue;
    const equityVal = enterpriseVal + totalCash - totalDebt;

    let targetPrice = currentPrice;
    if (sharesOutstanding > 0 && equityVal > 0) {
        targetPrice = equityVal / sharesOutstanding;
    }

    if (currentPrice > 0) {
        targetPrice = Math.max(currentPrice * 0.35, Math.min(currentPrice * 2.5, targetPrice));
    }

    const upside = currentPrice > 0 
        ? ((targetPrice - currentPrice) / currentPrice) * 100
        : 0;

    let rating = "FAIRLY VALUED";
    let badgeColor = "bg-amber-500 text-white";
    if (upside > 15) {
        rating = "UNDERVALUED";
        badgeColor = "bg-emerald-600 text-white";
    } else if (upside < -15) {
        rating = "OVERVALUED";
        badgeColor = "bg-rose-600 text-white";
    }

    return {
        targetPrice: Number(targetPrice.toFixed(2)),
        upside: Number(upside.toFixed(1)),
        rating,
        badgeColor,
        projectedFlows,
        pvSum,
        pvTerminalValue,
        enterpriseVal
    };
  }, [growthRate, discountRate, terminalGrowth, baseFCF, sharesOutstanding, totalCash, totalDebt, currentPrice, financials]);

  const handleReset = () => {
    setGrowthRate(initialGrowth);
    setDiscountRate(initialDiscount);
    setTerminalGrowth(initialTerminal);
  };

  const currencySymbol = stock?.currency === 'INR' ? '₹' : '$';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-6 shadow-sm">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calculator className="h-4.5 w-4.5 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Interactive DCF & Intrinsic Valuation Engine
            </h3>
          </div>
          <p className="text-xs text-slate-450 font-semibold">
            5-Year Discounted Cash Flow model with real-time sensitivity sliders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors"
          >
            Reset Assumptions
          </button>
          <div className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${computedValuation.badgeColor}`}>
            {computedValuation.rating}
          </div>
        </div>
      </div>

      {/* Primary KPI Target Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Fair Value Price Target */}
        <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/40 border border-blue-100 p-4 rounded-xl space-y-1">
          <FinancialTooltip termKey="dcf" label="DCF Fair Value">
            <span className="text-[10px] font-bold uppercase text-blue-700 tracking-wider">
              Fair Value Price Target
            </span>
          </FinancialTooltip>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {currencySymbol}{computedValuation.targetPrice}
            </span>
            <span className="text-xs font-semibold text-slate-500">DCF Intrinsic</span>
          </div>
        </div>

        {/* Current Market Price */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
            Current Market Price
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">
              {currencySymbol}{currentPrice || 'N/A'}
            </span>
            <span className="text-xs font-semibold text-slate-450">Exchange Close</span>
          </div>
        </div>

        {/* Upside / Downside Potential */}
        <div className={`border p-4 rounded-xl space-y-1 ${
          computedValuation.upside >= 0 
            ? 'bg-emerald-50/50 border-emerald-100' 
            : 'bg-rose-50/50 border-rose-100'
        }`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${
            computedValuation.upside >= 0 ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            Implied Valuation Gap
          </span>
          <div className="flex items-center gap-1.5">
            {computedValuation.upside >= 0 ? (
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-rose-600" />
            )}
            <span className={`text-2xl font-extrabold ${
              computedValuation.upside >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {computedValuation.upside > 0 ? `+${computedValuation.upside}%` : `${computedValuation.upside}%`}
            </span>
          </div>
        </div>

      </div>

      {/* Interactive Controls & Sensitivity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        
        {/* Sliders Box */}
        <div className="lg:col-span-6 bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 border-b border-slate-200 pb-2">
            <Sliders className="h-4 w-4 text-blue-600" />
            <span>ADJUST VALUATION DRIVERS</span>
          </div>

          {/* Slider 1: Growth Rate */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <FinancialTooltip termKey="freeCashFlow" label="Projected FCF Growth">
                <span className="text-slate-600">Projected FCF Growth (Yr 1-5):</span>
              </FinancialTooltip>
              <span className="font-bold text-blue-600">{growthRate.toFixed(1)}%</span>
            </div>
            <input 
              type="range" 
              min="2" 
              max="35" 
              step="0.5"
              value={growthRate}
              onChange={(e) => setGrowthRate(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>Conservative (2%)</span>
              <span>Baseline ({initialGrowth}%)</span>
              <span>Hyper-Growth (35%)</span>
            </div>
          </div>

          {/* Slider 2: Discount Rate */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <FinancialTooltip termKey="wacc" label="Discount Rate / WACC">
                <span className="text-slate-600">Discount Rate / WACC:</span>
              </FinancialTooltip>
              <span className="font-bold text-blue-600">{discountRate.toFixed(1)}%</span>
            </div>
            <input 
              type="range" 
              min="6" 
              max="16" 
              step="0.5"
              value={discountRate}
              onChange={(e) => setDiscountRate(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>Low Cost (6%)</span>
              <span>Standard (9.5%)</span>
              <span>High Risk (16%)</span>
            </div>
          </div>


          {/* Slider 3: Terminal Growth Rate */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600">Terminal Growth Rate:</span>
              <span className="font-bold text-blue-600">{terminalGrowth.toFixed(1)}%</span>
            </div>
            <input 
              type="range" 
              min="1.0" 
              max="4.5" 
              step="0.1"
              value={terminalGrowth}
              onChange={(e) => setTerminalGrowth(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>GDP Matched (2.0%)</span>
              <span>Baseline (2.5%)</span>
              <span>Optimistic (4.5%)</span>
            </div>
          </div>
        </div>

        {/* 5-Year Cash Flow Projection Table */}
        <div className="lg:col-span-6 bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span>5-YEAR CASH FLOW FORECAST</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-450 uppercase">Discounted PV</span>
          </div>

          <div className="space-y-2">
            {computedValuation.projectedFlows.map((flow) => (
              <div key={flow.year} className="flex items-center justify-between bg-white border border-slate-150 px-3 py-2 rounded-lg text-xs">
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <span className="bg-blue-50 text-blue-700 font-bold text-[10px] px-1.5 py-0.5 rounded">
                    Yr {flow.year}
                  </span>
                  <span>+{flow.growth}% growth</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block">
                    {currencySymbol}{(flow.amount / 1e9).toFixed(2)}B
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    PV: {currencySymbol}{(flow.pv / 1e9).toFixed(2)}B
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Sensitivity Matrix */}
      {valuation?.sensitivity && valuation.sensitivity.length > 0 && (
        <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              VALUATION SENSITIVITY MATRIX (Price Target vs Discount & Growth Rates)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-450 font-bold text-[10px] uppercase">
                  <th className="py-2 px-3">Discount Rate \ Growth</th>
                  <th className="py-2 px-3">-2% Bear Growth</th>
                  <th className="py-2 px-3 font-bold text-blue-700">Base Growth</th>
                  <th className="py-2 px-3">+2% Bull Growth</th>
                </tr>
              </thead>
              <tbody>
                {valuation.sensitivity.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-slate-100 hover:bg-white transition-colors">
                    <td className="py-2 px-3 font-bold text-slate-700">
                      {row.discountRate}% WACC
                    </td>
                    {row.values.map((v, vIdx) => (
                      <td key={vIdx} className={`py-2 px-3 font-semibold ${
                        v.fairValue > currentPrice ? 'text-emerald-700 font-bold' : 'text-slate-700'
                      }`}>
                        {currencySymbol}{v.fairValue}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default ValuationModel;
