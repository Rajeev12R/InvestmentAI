import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, TrendingDown, Sliders, ShieldAlert, Sparkles, BarChart3, HelpCircle, ShieldCheck, Scale, Layers } from 'lucide-react';
import FinancialTooltip from '../Common/FinancialTooltip';

const ValuationModel = ({ valuation, stock, financials }) => {
  const currentPrice = Number(stock?.currentPrice || valuation?.currentPrice || 0);
  const initialGrowth = Number(valuation?.assumptions?.baseGrowthRate ?? 9.0);
  const initialDiscount = Number(valuation?.assumptions?.discountRate ?? 9.5);
  const initialTerminal = Number(valuation?.assumptions?.terminalGrowthRate ?? 2.5);
  const baseFCF = Number(valuation?.assumptions?.freeCashFlow || financials?.freeCashFlow || financials?.netIncome || 1000000000);
  const sharesOutstanding = Number(valuation?.assumptions?.sharesOutstanding || (currentPrice > 0 && financials?.marketCap ? financials.marketCap / currentPrice : 1000000000));
  const totalCash = Number(financials?.totalCash || 0);
  const totalDebt = Number(financials?.totalDebt || 0);

  // Interactive slider states
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
        const yearGrowth = gRate * Math.pow(0.91, year - 1);
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

    const marginOfSafety = currentPrice > 0 && targetPrice > currentPrice
        ? ((targetPrice - currentPrice) / targetPrice) * 100
        : 0;

    let rating = "FAIRLY VALUED";
    let badgeColor = "bg-amber-500 text-white";
    if (upside > 15) {
        rating = "UNDERVALUED";
        badgeColor = "bg-emerald-600 text-white";
    } else if (upside < -12) {
        rating = "OVERVALUED";
        badgeColor = "bg-rose-600 text-white";
    }

    return {
        targetPrice: Number(targetPrice.toFixed(2)),
        upside: Number(upside.toFixed(1)),
        marginOfSafety: Number(marginOfSafety.toFixed(1)),
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
  const wacc = valuation?.waccBreakdown || {};
  const scenarios = valuation?.scenarios || {};
  const reverseDcf = valuation?.reverseDcf || {};

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Institutional Valuation & WACC Engine</h2>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
              Multi-Model DCF
            </span>
          </div>
          <p className="text-xs text-slate-500">
            5-Year Unlevered FCFF model + CAPM-derived WACC discount rate + Reverse DCF implied growth.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleReset}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Sliders className="h-3.5 w-3.5" />
            Reset Baseline Assumptions
          </button>
        </div>
      </div>

      {/* Tri-Scenario Fair Value Banner (Bear, Base, Bull) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Current Price */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Market Price</div>
          <div className="text-2xl font-black text-slate-900 my-1">
            {currencySymbol}{currentPrice.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">Live Exchange Quote</div>
        </div>

        {/* Bear Case Scenario */}
        <div className="bg-rose-50/40 border border-rose-200 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center justify-between">
            <span>Bear Case</span>
            <span className="text-[9px]">High WACC / -2.5% Growth</span>
          </div>
          <div className="text-2xl font-black text-slate-900 my-1">
            {currencySymbol}{scenarios.bear?.price ? scenarios.bear.price.toFixed(2) : (currentPrice * 0.85).toFixed(2)}
          </div>
          <div className="text-[11px] font-bold text-rose-600">
            {scenarios.bear?.upside !== undefined ? `${scenarios.bear.upside}%` : '-15.0%'} downside buffer
          </div>
        </div>

        {/* Base Case DCF Fair Value */}
        <div className="bg-blue-50/60 border border-blue-300 p-4 rounded-xl flex flex-col justify-between shadow-xs">
          <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center justify-between">
            <span>Base Case (DCF Target)</span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold ${computedValuation.badgeColor}`}>
              {computedValuation.rating}
            </span>
          </div>
          <div className="text-2xl font-black text-blue-900 my-1">
            {currencySymbol}{computedValuation.targetPrice}
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className={computedValuation.upside >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
              {computedValuation.upside >= 0 ? `+${computedValuation.upside}%` : `${computedValuation.upside}%`} Implied Upside
            </span>
            {computedValuation.marginOfSafety > 0 && (
              <span className="text-slate-600 text-[10px]">
                MoS: {computedValuation.marginOfSafety}%
              </span>
            )}
          </div>
        </div>

        {/* Bull Case Scenario */}
        <div className="bg-emerald-50/40 border border-emerald-200 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
            <span>Bull Case</span>
            <span className="text-[9px]">Low WACC / +2.0% Growth</span>
          </div>
          <div className="text-2xl font-black text-slate-900 my-1">
            {currencySymbol}{scenarios.bull?.price ? scenarios.bull.price.toFixed(2) : (currentPrice * 1.35).toFixed(2)}
          </div>
          <div className="text-[11px] font-bold text-emerald-700">
            +{scenarios.bull?.upside !== undefined ? scenarios.bull.upside : '35.0'}% expansion target
          </div>
        </div>

      </div>

      {/* Reverse DCF & WACC Derivation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Transparent WACC Inspector */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Transparent WACC Derivation
              </span>
            </div>
            <span className="text-sm font-black text-blue-700">
              {wacc.calculatedWacc || 9.50}% WACC
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold block">Risk-Free Rate (Rf)</span>
              <span className="font-bold text-slate-800">{wacc.riskFreeRate || 4.25}%</span>
              <span className="text-[9px] text-slate-400 block truncate">{wacc.riskFreeSource || "10Y Treasury"}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold block">Beta Volatility (β)</span>
              <span className="font-bold text-slate-800">{wacc.beta || 1.10}</span>
              <span className="text-[9px] text-slate-400 block">5Y Monthly</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold block">Equity Risk Premium</span>
              <span className="font-bold text-slate-800">{wacc.equityRiskPremium || 5.5}%</span>
              <span className="text-[9px] text-slate-400 block">Historical ERP</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold block">Cost of Equity (Re)</span>
              <span className="font-bold text-slate-800">{wacc.costOfEquity || 10.3}%</span>
              <span className="text-[9px] text-slate-400 block">Rf + β × ERP</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold block">Cost of Debt (Rd)</span>
              <span className="font-bold text-slate-800">{wacc.costOfDebt || 5.2}%</span>
              <span className="text-[9px] text-slate-400 block">After-Tax Shield</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold block">Capital Weights</span>
              <span className="font-bold text-slate-800">{wacc.equityWeight || 80}% E / {wacc.debtWeight || 20}% D</span>
              <span className="text-[9px] text-slate-400 block">Capital Structure</span>
            </div>
          </div>
        </div>

        {/* Reverse DCF & Implied Growth Comparison */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Reverse DCF Market Expectations
                </span>
              </div>
              <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Priced-In Growth
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-600">Market-Implied FCF Growth Rate:</span>
                <span className="font-bold text-purple-900 text-sm">
                  {reverseDcf.impliedGrowthPercent !== undefined ? `${reverseDcf.impliedGrowthPercent}%` : '8.2%'}
                </span>
              </div>
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-600">Base DCF Forecasted Growth Rate:</span>
                <span className="font-bold text-blue-900 text-sm">
                  +{growthRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-white p-3 rounded-lg border border-slate-100">
            {growthRate > (reverseDcf.impliedGrowthPercent || 8) ? (
              <span className="text-emerald-700 font-semibold">
                ✓ Value Divergence: Actual company trajectory (+{growthRate}%) exceeds market priced-in expectations ({reverseDcf.impliedGrowthPercent}%).
              </span>
            ) : (
              <span className="text-amber-700 font-semibold">
                ⚠ Growth Hurdle: Current market price requires sustained {reverseDcf.impliedGrowthPercent}% compounding to justify valuation.
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Interactive DCF Sliders & 5-Year Cash Flow Projection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        
        {/* Sliders (6 cols) */}
        <div className="lg:col-span-6 space-y-4 bg-slate-50/50 border border-slate-200 p-5 rounded-xl">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
            Interactive Model Governance Sliders
          </div>

          {/* Growth Rate Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <FinancialTooltip termKey="freeCashFlow" label="Projected FCF Growth (Yrs 1-5)">
                <span>5-Yr FCF Growth Rate</span>
              </FinancialTooltip>
              <span className="font-mono text-blue-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                +{growthRate.toFixed(1)}%
              </span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="30" 
              step="0.5"
              value={growthRate}
              onChange={(e) => setGrowthRate(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
          </div>

          {/* Discount Rate (WACC) Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <FinancialTooltip termKey="wacc" label="Discount Rate / WACC">
                <span>WACC Discount Rate</span>
              </FinancialTooltip>
              <span className="font-mono text-blue-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                {discountRate.toFixed(1)}%
              </span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="18" 
              step="0.25"
              value={discountRate}
              onChange={(e) => setDiscountRate(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
          </div>

          {/* Terminal Growth Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <FinancialTooltip termKey="dcf" label="Terminal Growth Rate">
                <span>Terminal Perpetual Growth (g)</span>
              </FinancialTooltip>
              <span className="font-mono text-blue-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                {terminalGrowth.toFixed(1)}%
              </span>
            </div>
            <input 
              type="range" 
              min="1.0" 
              max="4.0" 
              step="0.1"
              value={terminalGrowth}
              onChange={(e) => setTerminalGrowth(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
          </div>
        </div>

        {/* 5-Year Cash Flow Projection Table (6 cols) */}
        <div className="lg:col-span-6 bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span>5-YEAR CASH FLOW FORECAST</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Discounted PV</span>
          </div>

          <div className="space-y-2">
            {computedValuation.projectedFlows.map((flow) => (
              <div key={flow.year} className="flex items-center justify-between bg-white border border-slate-100 px-3 py-2 rounded-lg text-xs">
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

    </div>
  );
};

export default ValuationModel;
