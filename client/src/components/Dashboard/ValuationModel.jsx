import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Sliders, 
  ShieldAlert, 
  Sparkles, 
  BarChart3, 
  HelpCircle, 
  ShieldCheck, 
  Scale, 
  Layers, 
  Grid3X3, 
  Users, 
  AlertCircle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronRight,
  Target,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import FinancialTooltip from '../Common/FinancialTooltip';

const ValuationModel = ({ valuation, stock, financials, competitors }) => {
  const currentPrice = Number(stock?.currentPrice || valuation?.currentPrice || 0);
  const currencySymbol = stock?.currency === 'INR' ? '₹' : '$';
  
  // Model data bundles from Valuation Engine
  const dcf = valuation?.dcf || {};
  const relativeValuation = valuation?.relativeValuation || {};
  const reverseDcf = valuation?.reverseDcf || {};
  const scenarios = valuation?.scenarios || {};
  const wacc = valuation?.waccBreakdown || {};
  const sensitivityGrid = valuation?.sensitivityGrid || [];
  const valuationRange = valuation?.valuationRange || {};
  const modelAgreement = valuation?.modelAgreement || {};

  const isDcfAvailable = dcf.status === 'CALCULATED' && dcf.fairValue !== null;

  // Active view tab state
  const [activeTab, setActiveTab] = useState('dcf'); // 'dcf' | 'relative' | 'reverseDcf' | 'sensitivity' | 'agreement'
  const [expandedMultiple, setExpandedMultiple] = useState('P/E');

  // Interactive slider states for live scenario inspection
  const initialGrowth = Number(dcf.forecast?.[0]?.growthRatePercent ?? valuation?.assumptions?.baseGrowthRate ?? 8.0);
  const initialDiscount = Number(wacc.calculatedWacc ?? 9.5);
  const initialTerminal = Number(dcf.terminalGrowth ?? 2.5);
  const baseFCF = Number(financials?.freeCashFlow || 0);
  const sharesOutstanding = Number(stock?.sharesOutstanding || dcf.sharesOutstanding || 0);
  const totalCash = Number(financials?.totalCash || 0);
  const totalDebt = Number(financials?.totalDebt || 0);

  const [growthRate, setGrowthRate] = useState(initialGrowth);
  const [discountRate, setDiscountRate] = useState(initialDiscount);
  const [terminalGrowth, setTerminalGrowth] = useState(initialTerminal);

  // Real-time client DCF computation when sliders change
  const computedValuation = useMemo(() => {
    if (!isDcfAvailable || baseFCF <= 0 || sharesOutstanding <= 0) {
      return null;
    }

    const gRate = growthRate / 100;
    const dRate = Math.max(0.04, discountRate / 100);
    const tRate = Math.min(dRate - 0.005, terminalGrowth / 100);

    const projectedFlows = [];
    let currentFlow = baseFCF;
    let pvSum = 0;

    for (let year = 1; year <= 5; year++) {
      const yearGrowth = gRate * Math.pow(0.91, year - 1);
      currentFlow = currentFlow * (1 + yearGrowth);
      const discountFactor = 1 / Math.pow(1 + dRate, year);
      const pv = currentFlow * discountFactor;
      pvSum += pv;
      projectedFlows.push({
        year,
        forecastFCF: currentFlow,
        growthRatePercent: Number((yearGrowth * 100).toFixed(1)),
        discountFactor: Number(discountFactor.toFixed(4)),
        presentValue: pv
      });
    }

    const terminalFCF = currentFlow * (1 + tRate);
    const terminalValue = terminalFCF / (dRate - tRate);
    const pvTerminalValue = terminalValue / Math.pow(1 + dRate, 5);

    const enterpriseVal = pvSum + pvTerminalValue;
    const netDebt = totalDebt - totalCash;
    const equityVal = enterpriseVal - netDebt;

    let targetPrice = equityVal > 0 && sharesOutstanding > 0 ? equityVal / sharesOutstanding : null;

    const upside = (targetPrice !== null && currentPrice > 0)
      ? Number((((targetPrice - currentPrice) / currentPrice) * 100).toFixed(2))
      : null;

    const marginOfSafety = (targetPrice !== null && currentPrice > 0 && targetPrice > 0)
      ? Number((((targetPrice - currentPrice) / targetPrice) * 100).toFixed(2))
      : null;

    let rating = "FAIRLY VALUED";
    let badgeColor = "bg-amber-500 text-white";
    if (upside !== null) {
      if (upside > 15) {
        rating = "UNDERVALUED";
        badgeColor = "bg-emerald-600 text-white";
      } else if (upside < -12) {
        rating = "OVERVALUED";
        badgeColor = "bg-rose-600 text-white";
      }
    }

    return {
      targetPrice: targetPrice !== null ? Number(targetPrice.toFixed(2)) : null,
      upside,
      marginOfSafety,
      rating,
      badgeColor,
      projectedFlows,
      pvSum,
      pvTerminalValue,
      enterpriseVal,
      equityVal,
      netDebt
    };
  }, [isDcfAvailable, growthRate, discountRate, terminalGrowth, baseFCF, sharesOutstanding, totalCash, totalDebt, currentPrice]);

  const handleReset = () => {
    setGrowthRate(initialGrowth);
    setDiscountRate(initialDiscount);
    setTerminalGrowth(initialTerminal);
  };

  const activeFairValue = computedValuation?.targetPrice ?? dcf.fairValue ?? valuation?.fairValuePriceTarget;
  const activeUpside = computedValuation?.upside ?? dcf.upsidePotential ?? dcf.upside ?? valuation?.upsidePotential;
  const activeMoS = computedValuation?.marginOfSafety ?? dcf.marginOfSafety ?? valuation?.marginOfSafety;

  const peers = relativeValuation.peers || [];
  const excludedPeers = relativeValuation.excludedPeers || [];
  const distributions = relativeValuation.distributions || {};
  const zScores = relativeValuation.zScores || {};
  const framework = relativeValuation.framework || {};
  const relMethods = relativeValuation.methods || {};

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
      
      {/* Header with Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Institutional Valuation & Sector Intelligence</h2>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
              Phase 2B Multi-Engine
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Synthesis of 5-Year FCFF DCF, Sector-Specific Relative Multiples, Reverse DCF Expectations, and Model Dispersion.
          </p>
        </div>

        {/* View Selection Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dcf')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dcf'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            DCF & WACC
          </button>
          <button
            onClick={() => setActiveTab('relative')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'relative'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-3.5 w-3.5 text-indigo-600" />
            Relative Multiples
          </button>
          <button
            onClick={() => setActiveTab('reverseDcf')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reverseDcf'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-purple-600" />
            Reverse DCF
          </button>
          <button
            onClick={() => setActiveTab('sensitivity')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sensitivity'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            Sensitivity Grid
          </button>
          <button
            onClick={() => setActiveTab('agreement')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'agreement'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="h-3.5 w-3.5" />
            Model Agreement
          </button>
        </div>
      </div>

      {/* TOP HEADLINE CARDS: Live Fair Value Target & Scenario Spectrum */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Headline Fair Value Target */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Composite Fair Value Target
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${computedValuation?.badgeColor || 'bg-blue-600 text-white'}`}>
              {computedValuation?.rating || valuation?.valuationRating || 'EVALUATED'}
            </span>
          </div>

          <div className="my-2">
            <div className="text-3xl font-black tracking-tight text-white">
              {activeFairValue !== null && activeFairValue !== undefined
                ? `${currencySymbol}${activeFairValue.toFixed(2)}`
                : 'UNAVAILABLE'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Market: {currencySymbol}{currentPrice.toFixed(2)}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-xs">
            <div className="flex items-center gap-1 font-semibold">
              {activeUpside !== null && activeUpside !== undefined ? (
                <>
                  {activeUpside >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                  )}
                  <span className={activeUpside >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {activeUpside >= 0 ? `+${activeUpside}%` : `${activeUpside}%`} Upside
                  </span>
                </>
              ) : (
                <span className="text-slate-400">Upside Unavailable</span>
              )}
            </div>

            <div className="text-slate-300 text-[11px] font-medium">
              MoS: {activeMoS !== null && activeMoS !== undefined ? (
                <span className={activeMoS >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {activeMoS >= 0 ? `+${activeMoS}%` : `${activeMoS}%`}
                </span>
              ) : 'N/A'}
            </div>
          </div>
        </div>

        {/* Bear Scenario Card */}
        <div className="bg-rose-50/40 border border-rose-200 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center justify-between">
            <span>Bear Scenario</span>
            <span className="text-[9px]">High WACC / -3% Growth</span>
          </div>
          <div className="text-2xl font-black text-slate-900 my-1">
            {scenarios.bear?.fairValue !== null && scenarios.bear?.fairValue !== undefined 
              ? `${currencySymbol}${scenarios.bear.fairValue.toFixed(2)}`
              : 'UNAVAILABLE'}
          </div>
          <div className="text-[11px] font-bold text-rose-700 flex items-center justify-between">
            <span>{scenarios.bear?.upside !== null && scenarios.bear?.upside !== undefined ? `${scenarios.bear.upside}%` : 'Unavailable'}</span>
            {scenarios.bear?.marginOfSafety !== null && scenarios.bear?.marginOfSafety !== undefined && (
              <span className="text-[10px] font-normal text-slate-600">MoS: {scenarios.bear.marginOfSafety}%</span>
            )}
          </div>
        </div>

        {/* Base Scenario Card */}
        <div className="bg-blue-50/40 border border-blue-200 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center justify-between">
            <span>Base Scenario</span>
            <span className="text-[9px]">Base WACC & Trajectory</span>
          </div>
          <div className="text-2xl font-black text-slate-900 my-1">
            {scenarios.base?.fairValue !== null && scenarios.base?.fairValue !== undefined 
              ? `${currencySymbol}${scenarios.base.fairValue.toFixed(2)}`
              : (dcf.fairValue ? `${currencySymbol}${dcf.fairValue.toFixed(2)}` : 'UNAVAILABLE')}
          </div>
          <div className="text-[11px] font-bold text-blue-700 flex items-center justify-between">
            <span>{scenarios.base?.upside !== null && scenarios.base?.upside !== undefined ? `${scenarios.base.upside >= 0 ? '+' : ''}${scenarios.base.upside}%` : 'Unavailable'}</span>
            {scenarios.base?.marginOfSafety !== null && scenarios.base?.marginOfSafety !== undefined && (
              <span className="text-[10px] font-normal text-slate-600">MoS: {scenarios.base.marginOfSafety}%</span>
            )}
          </div>
        </div>

        {/* Bull Scenario Card */}
        <div className="bg-emerald-50/40 border border-emerald-200 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
            <span>Bull Scenario</span>
            <span className="text-[9px]">Low WACC / +3% Growth</span>
          </div>
          <div className="text-2xl font-black text-slate-900 my-1">
            {scenarios.bull?.fairValue !== null && scenarios.bull?.fairValue !== undefined 
              ? `${currencySymbol}${scenarios.bull.fairValue.toFixed(2)}`
              : 'UNAVAILABLE'}
          </div>
          <div className="text-[11px] font-bold text-emerald-700 flex items-center justify-between">
            <span>{scenarios.bull?.upside !== null && scenarios.bull?.upside !== undefined ? `${scenarios.bull.upside >= 0 ? '+' : ''}${scenarios.bull.upside}%` : 'Unavailable'}</span>
            {scenarios.bull?.marginOfSafety !== null && scenarios.bull?.marginOfSafety !== undefined && (
              <span className="text-[10px] font-normal text-slate-600">MoS: {scenarios.bull.marginOfSafety}%</span>
            )}
          </div>
        </div>

      </div>

      {/* TAB CONTENT 1: DCF MODEL & WACC INSPECTOR */}
      {activeTab === 'dcf' && (
        <div className="space-y-6">
          {!isDcfAvailable ? (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-900">DCF Valuation Status: UNAVAILABLE</h4>
                  <p className="text-xs text-amber-800">
                    {dcf.reason || "Free Cash Flow (FCF) or reliable balance sheet data is unavailable in primary financial feeds."}
                  </p>
                  <p className="text-[11px] text-amber-700">
                    <strong>Institutional Truth Layer Invariant:</strong> InvestmentAI strictly avoids fabricating synthetic FCF or defaulting missing cash flows to zero.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Interactive Governance Sliders & 5-Year Cash Flow Projection */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Sliders (6 cols) */}
                <div className="lg:col-span-6 space-y-4 bg-slate-50/50 border border-slate-200 p-5 rounded-xl">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Interactive Model Governance
                    </span>
                    <button 
                      onClick={handleReset}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Sliders className="h-3 w-3" />
                      Reset Baseline
                    </button>
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
                        {discountRate.toFixed(2)}%
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
                      max="3.5" 
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
                    {(computedValuation?.projectedFlows || dcf.forecast || []).map((flow) => (
                      <div key={flow.year} className="flex items-center justify-between bg-white border border-slate-100 px-3 py-2 rounded-lg text-xs">
                        <div className="flex items-center gap-2 font-medium text-slate-700">
                          <span className="bg-blue-50 text-blue-700 font-bold text-[10px] px-1.5 py-0.5 rounded">
                            Yr {flow.year}
                          </span>
                          <span>+{flow.growthRatePercent ?? flow.growth}% growth</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 block">
                            {currencySymbol}{((flow.forecastFCF || flow.amount || 0) / 1e9).toFixed(2)}B
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            PV: {currencySymbol}{((flow.presentValue || flow.pv || 0) / 1e9).toFixed(2)}B
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Equity Bridge Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Enterprise Value to Equity Bridge
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block">PV of 5-Yr Flows</span>
                    <span className="font-bold text-slate-800">
                      {currencySymbol}{(((computedValuation?.pvSum || dcf.pvExplicitForecast || 0)) / 1e9).toFixed(2)}B
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block">PV of Terminal Value</span>
                    <span className="font-bold text-slate-800">
                      {currencySymbol}{(((computedValuation?.pvTerminalValue || dcf.terminalValue || 0)) / 1e9).toFixed(2)}B
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block">Net Debt Deducted</span>
                    <span className="font-bold text-slate-800">
                      {currencySymbol}{(((computedValuation?.netDebt || dcf.netDebt || 0)) / 1e9).toFixed(2)}B
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block">Shares Outstanding</span>
                    <span className="font-bold text-slate-800">
                      {sharesOutstanding > 0 ? (sharesOutstanding / 1e9).toFixed(2) + 'B' : 'UNAVAILABLE'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* WACC Derivation Panel */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Transparent CAPM WACC Derivation
                </span>
              </div>
              <span className="text-sm font-black text-blue-700">
                {wacc.calculatedWacc ? `${wacc.calculatedWacc}% WACC` : 'WACC UNAVAILABLE'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block">Risk-Free Rate (Rf)</span>
                <span className="font-bold text-slate-800">{wacc.riskFreeRate ? `${wacc.riskFreeRate}%` : 'UNAVAILABLE'}</span>
                <span className="text-[9px] text-slate-400 block truncate">{wacc.riskFreeSource || "Sovereign Benchmark"}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block">Beta Volatility (β)</span>
                <span className="font-bold text-slate-800">{wacc.beta ?? 'UNAVAILABLE'}</span>
                <span className="text-[9px] text-slate-400 block">5Y Monthly</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block">Equity Risk Premium</span>
                <span className="font-bold text-slate-800">{wacc.equityRiskPremium || 5.5}%</span>
                <span className="text-[9px] text-amber-600 font-semibold block">ESTIMATED (5.5%)</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block">Cost of Equity (Ke)</span>
                <span className="font-bold text-slate-800">{wacc.costOfEquity ? `${wacc.costOfEquity}%` : 'UNAVAILABLE'}</span>
                <span className="text-[9px] text-slate-400 block">Rf + β × ERP</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block">Cost of Debt (Kd)</span>
                <span className="font-bold text-slate-800">{wacc.costOfDebt ? `${wacc.costOfDebt}%` : 'UNAVAILABLE'}</span>
                <span className="text-[9px] text-slate-400 block">After-Tax Shield</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block">Capital Weights</span>
                <span className="font-bold text-slate-800">{wacc.equityWeight || 80}% E / {wacc.debtWeight || 20}% D</span>
                <span className="text-[9px] text-slate-400 block">Capital Structure</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: PHASE 2B RELATIVE VALUATION & SECTOR INTELLIGENCE */}
      {activeTab === 'relative' && (
        <div className="space-y-6">
          
          {/* Sector Framework Banner */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-indigo-700" />
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  Sector Classification & Framework
                </span>
                <span className="bg-indigo-100 text-indigo-800 font-bold text-[10px] px-2 py-0.5 rounded">
                  {relativeValuation.sectorClassification || "Canonical"}
                </span>
              </div>
              <p className="text-xs text-indigo-950 font-medium">
                {framework.rationale || "Valuation framework custom-tailored to operating asset characteristics."}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-xs">
              <div className="bg-white px-3 py-1.5 rounded-lg border border-indigo-100">
                <span className="text-[10px] text-slate-400 block font-semibold">Primary Methods</span>
                <span className="font-bold text-indigo-900">{framework.primaryMethods?.join(', ') || 'P/E, EV/EBITDA'}</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-lg border border-indigo-100">
                <span className="text-[10px] text-slate-400 block font-semibold">Operating Peers</span>
                <span className="font-bold text-indigo-900">{relativeValuation.peerCount || peers.length} Verified</span>
              </div>
            </div>
          </div>

          {relativeValuation.status === 'UNAVAILABLE' ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900">Relative Valuation Status: UNAVAILABLE</h4>
                <p className="mt-1">{relativeValuation.reason || "Insufficient comparable operating company peers found in primary feeds."}</p>
              </div>
            </div>
          ) : (
            <>
              {/* 3-Point Multiple Fair Value Spectrum */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Sector Multiple Implied Fair Value Ranges
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Conservative (P25) • Base (Median) • Optimistic (P75)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {['P/E', 'EV/EBITDA', 'P/B', 'EV/Revenue'].map((mKey) => {
                    const methodData = relMethods[mKey];
                    const isProhibited = framework.prohibitedMethods?.includes(mKey);
                    const isCalculated = methodData?.status === 'CALCULATED';
                    const isSelected = expandedMultiple === mKey;

                    return (
                      <div 
                        key={mKey}
                        onClick={() => isCalculated && setExpandedMultiple(mKey)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-200 shadow-xs' 
                            : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase mb-2">
                          <span>{mKey} Model</span>
                          {isProhibited ? (
                            <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Prohibited</span>
                          ) : isCalculated ? (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Active</span>
                          ) : (
                            <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Unavailable</span>
                          )}
                        </div>

                        <div className="text-xl font-black text-slate-900 my-1">
                          {isCalculated && methodData.impliedValues?.base !== undefined
                            ? `${currencySymbol}${methodData.impliedValues.base.toFixed(2)}`
                            : (isProhibited ? 'NOT APPROPRIATE' : 'UNAVAILABLE')}
                        </div>

                        {isCalculated && methodData.impliedValues ? (
                          <div className="text-[10px] text-slate-500 font-medium flex justify-between border-t border-slate-200/60 pt-2 mt-2">
                            <span>P25: {currencySymbol}{methodData.impliedValues.conservative}</span>
                            <span>P75: {currencySymbol}{methodData.impliedValues.optimistic}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-2 truncate">
                            {methodData?.reason || "Not supported for entity"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Multiple Formula Drilldown Inspector */}
              {relMethods[expandedMultiple]?.status === 'CALCULATED' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Info className="h-4 w-4 text-indigo-600" />
                      <span>{expandedMultiple} Valuation Formula Inspector</span>
                    </div>
                    <span className="text-[11px] font-mono text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {relMethods[expandedMultiple]?.formula}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 pt-1">
                    Calculated from grounded company facts and filtered peer multiple distribution:
                    <span className="font-semibold text-slate-900 ml-1">
                      Median Multiple = {relMethods[expandedMultiple]?.multiples?.base}x
                    </span>
                  </div>
                </div>
              )}

              {/* Statistical Z-Score Benchmarking Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Company vs Peer Group Z-Score Statistical Benchmarks
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Direction-Aware: Multiples (lower is cheaper) • Margins/Growth (higher is stronger)
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="p-3">Financial Metric</th>
                        <th className="p-3">Company Fact</th>
                        <th className="p-3">Peer Median</th>
                        <th className="p-3">Peer Mean (μ)</th>
                        <th className="p-3">Std Dev (σ)</th>
                        <th className="p-3">Z-Score (σ)</th>
                        <th className="p-3">Statistical Positioning</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {[
                        { key: 'pe', label: 'P/E Multiple', isMult: true },
                        { key: 'evEbitda', label: 'EV/EBITDA Multiple', isMult: true },
                        { key: 'pb', label: 'Price-to-Book (P/B)', isMult: true },
                        { key: 'revenueGrowth', label: 'Revenue Growth', isPct: true },
                        { key: 'ebitdaMargin', label: 'EBITDA Margin', isPct: true },
                        { key: 'roe', label: 'Return on Equity (ROE)', isPct: true }
                      ].map(({ key, label, isMult, isPct }) => {
                        const zData = zScores[key];
                        if (!zData || zData.status !== 'CALCULATED') return null;

                        const formatVal = (v) => {
                          if (v === null || v === undefined) return 'N/A';
                          if (isPct) return `${(v * 100).toFixed(1)}%`;
                          if (isMult) return `${Number(v).toFixed(1)}x`;
                          return Number(v).toFixed(2);
                        };

                        const isDiscountOrOutperf = zData.zScore !== null && (isMult ? zData.zScore < 0 : zData.zScore > 0);

                        return (
                          <tr key={key} className="hover:bg-slate-50 font-medium">
                            <td className="p-3 font-bold text-slate-800">{label}</td>
                            <td className="p-3 font-bold text-indigo-900">{formatVal(zData.companyValue)}</td>
                            <td className="p-3 text-slate-600">{formatVal(zData.peerMedian)}</td>
                            <td className="p-3 text-slate-600">{formatVal(zData.peerMean)}</td>
                            <td className="p-3 text-slate-500">{formatVal(zData.peerStdDev)}</td>
                            <td className="p-3">
                              <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                                isDiscountOrOutperf 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {zData.zScore > 0 ? `+${zData.zScore}` : zData.zScore}σ
                              </span>
                            </td>
                            <td className="p-3 text-slate-700 text-[11px]">{zData.interpretation}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Verified Operating Peer Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Grounded Peer Set Composition
                  </div>
                  <span className="text-[10px] text-slate-500">
                    ETFs, indexes, and negative multiple anomalies strictly filtered out
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="p-3">Ticker</th>
                        <th className="p-3">Company Name</th>
                        <th className="p-3">Sector / Focus</th>
                        <th className="p-3">P/E</th>
                        <th className="p-3">EV/EBITDA</th>
                        <th className="p-3">P/B</th>
                        <th className="p-3">Selection Rationale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {peers.map((peer, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-indigo-700 font-mono">{peer.ticker}</td>
                          <td className="p-3 font-semibold text-slate-800">{peer.name}</td>
                          <td className="p-3 text-slate-500">{peer.sector || 'Peer'}</td>
                          <td className="p-3 font-mono">{peer.pe ? `${Number(peer.pe).toFixed(1)}x` : 'N/A'}</td>
                          <td className="p-3 font-mono">{peer.evEbitda ? `${Number(peer.evEbitda).toFixed(1)}x` : 'N/A'}</td>
                          <td className="p-3 font-mono">{peer.pb ? `${Number(peer.pb).toFixed(1)}x` : 'N/A'}</td>
                          <td className="p-3 text-[11px] text-slate-500 max-w-xs truncate">{peer.selectionRationale}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>
      )}

      {/* TAB CONTENT 3: REVERSE DCF */}
      {activeTab === 'reverseDcf' && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Reverse DCF Market Expectations (Exact Bisection Root Solver)
              </span>
            </div>
            <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              Priced-In Growth
            </span>
          </div>

          {reverseDcf.status === 'UNAVAILABLE' ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800">
              {reverseDcf.reason || "Reverse DCF is unavailable because Free Cash Flow is missing or market price is outside valid numerical root range."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-2">
                <span className="text-xs text-slate-500">Market-Implied FCF Growth Rate:</span>
                <div className="text-2xl font-black text-purple-900">
                  {reverseDcf.impliedGrowthPercent !== null && reverseDcf.impliedGrowthPercent !== undefined
                    ? `${reverseDcf.impliedGrowthPercent}%`
                    : 'UNAVAILABLE'}
                </div>
                <p className="text-[11px] text-slate-500">
                  The sustained annual compound growth rate required over the next 5 years to justify the current stock price of {currencySymbol}{currentPrice.toFixed(2)}.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-2">
                <span className="text-xs text-slate-500">Expectation Hurdle Interpretation:</span>
                <div className="text-xs text-slate-700 font-medium">
                  {reverseDcf.expectationAnalysis || "Market expectations calculated directly from numerical bisection."}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 4: SENSITIVITY GRID */}
      {activeTab === 'sensitivity' && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 overflow-x-auto">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                DCF Sensitivity Matrix: WACC (Discount Rate) × Terminal Growth (g)
              </span>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Deterministic 5x5 Matrix
            </span>
          </div>

          {sensitivityGrid.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800">
              Sensitivity grid requires a valid base DCF configuration with available FCF and shares outstanding.
            </div>
          ) : (
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="p-2.5 text-left font-bold text-slate-700">WACC \ g</th>
                  {sensitivityGrid[0]?.cells?.map((c, idx) => (
                    <th key={idx} className="p-2.5 font-bold text-slate-700">
                      g = {c.terminalGrowthPercent}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sensitivityGrid.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-800 text-left bg-slate-100/50">
                      WACC = {row.waccPercent}%
                    </td>
                    {row.cells.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2.5 font-mono font-semibold">
                        {cell.fairValue !== null ? (
                          <span className={cell.fairValue > currentPrice ? 'text-emerald-700 font-bold' : 'text-slate-800'}>
                            {currencySymbol}{cell.fairValue.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB CONTENT 5: MODEL AGREEMENT & DISPERSION */}
      {activeTab === 'agreement' && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Cross-Model Valuation Dispersion & Agreement
                </span>
              </div>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                modelAgreement.disagreementStatus === 'LOW_DISAGREEMENT'
                  ? 'bg-emerald-100 text-emerald-800'
                  : modelAgreement.disagreementStatus === 'MODERATE_DISAGREEMENT'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {modelAgreement.disagreementStatus || 'EVALUATED'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block">Valid Models</span>
                <span className="font-bold text-slate-800">{modelAgreement.validModelCount || 0} Models</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block">Dispersion (CV)</span>
                <span className="font-bold text-slate-800">
                  {modelAgreement.coefficientOfVariation !== null && modelAgreement.coefficientOfVariation !== undefined
                    ? `${(modelAgreement.coefficientOfVariation * 100).toFixed(1)}%`
                    : 'N/A'}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block">Model Range (Min - Max)</span>
                <span className="font-bold text-slate-800">
                  {modelAgreement.min !== null && modelAgreement.max !== null
                    ? `${currencySymbol}${modelAgreement.min} - ${currencySymbol}${modelAgreement.max}`
                    : 'N/A'}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block">Model Mean</span>
                <span className="font-bold text-slate-800">
                  {modelAgreement.mean !== null ? `${currencySymbol}${modelAgreement.mean}` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Models Table */}
            <div className="bg-white border border-slate-100 rounded-lg p-3">
              <div className="text-[11px] font-bold text-slate-700 uppercase mb-2">Evaluated Models Breakdown</div>
              <div className="space-y-1.5 text-xs">
                {Object.entries(modelAgreement.validModels || {}).map(([mName, val]) => (
                  <div key={mName} className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-600 font-medium">{mName}</span>
                    <span className="font-bold text-slate-900">{currencySymbol}{val.toFixed(2)}</span>
                  </div>
                ))}
                {Object.entries(modelAgreement.unavailableModels || {}).map(([mName, u]) => (
                  <div key={mName} className="flex justify-between py-1 border-b border-slate-50 text-slate-400">
                    <span>{mName}</span>
                    <span className="text-[10px] italic">{u.reason || 'UNAVAILABLE'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ValuationModel;
