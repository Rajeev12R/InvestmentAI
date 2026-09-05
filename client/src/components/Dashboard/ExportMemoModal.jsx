import React from 'react';
import { X, Printer, Download, FileText, CheckCircle2, ShieldCheck, Building2, TrendingUp } from 'lucide-react';

const ExportMemoModal = ({ isOpen, onClose, data, ticker }) => {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const currencySymbol = data.stockData?.currency === 'INR' ? '₹' : '$';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Action Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-slate-800 text-sm">
              Institutional Investment Memo Preview
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Investment Memo Document */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 print:p-0 print:overflow-visible text-slate-900 bg-white" id="printable-memo">
          
          {/* Memo Header */}
          <div className="border-b-2 border-slate-900 pb-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                  INVESTMENT MEMORANDUM &bull; CONFIDENTIAL
                </span>
                <h1 className="text-3xl font-extrabold text-slate-900 uppercase tracking-tight mt-1">
                  {data.companyProfile?.name || ticker} ({data.companyProfile?.ticker || ticker})
                </h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Sector: {data.companyProfile?.sector || 'General'} &bull; Industry: {data.companyProfile?.industry || 'Equities'} &bull; Exchange: {data.companyProfile?.exchange || 'Global'}
                </p>
              </div>

              <div className="text-right">
                <div className="inline-block bg-slate-900 text-white text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded">
                  {data.recommendation || 'HOLD'}
                </div>
                <div className="text-xs font-bold text-slate-700 mt-2">
                  Suitability Score: <span className="text-blue-600 font-extrabold text-base">{data.investmentScore}/100</span>
                </div>
                <div className="text-[10px] text-slate-450 font-medium">
                  Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-4 gap-4 bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-450 block">Market Price</span>
                <span className="font-bold text-slate-900">{currencySymbol}{data.stockData?.currentPrice || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-450 block">DCF Fair Value</span>
                <span className="font-bold text-blue-700">{currencySymbol}{data.valuation?.fairValuePriceTarget || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-450 block">Market Cap</span>
                <span className="font-bold text-slate-900">
                  {data.financials?.marketCap ? `${currencySymbol}${(data.financials.marketCap / 1e9).toFixed(2)}B` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-450 block">Horizon</span>
                <span className="font-bold text-slate-900">{data.investmentHorizon || 'Medium Term'}</span>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Thesis */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
              1. Executive Investment Thesis
            </h2>
            <p className="text-xs leading-relaxed text-slate-700 text-justify font-sans">
              {data.reasoning}
            </p>
          </div>

          {/* Section 2: Key Catalysts & Pros/Cons */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
              2. Catalyst Matrix & Qualitative Evidence
            </h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Primary Bull Vectors (Pros)</span>
                <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                  {data.pros?.map((pro, i) => (
                    <li key={i} className="leading-snug">{pro}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-rose-800 uppercase block">Primary Bear Vectors (Cons & Risks)</span>
                <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                  {data.cons?.map((con, i) => (
                    <li key={i} className="leading-snug">{con}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Section 3: Financial Fundamentals & Risk Breakdown */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
              3. Fundamental Audit & Risk Vectors
            </h2>
            
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <tbody>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold">
                  <td className="p-2 text-slate-600">Revenue Growth</td>
                  <td className="p-2 font-bold text-slate-900">
                    {data.financials?.revenueGrowth ? `${(Number(data.financials.revenueGrowth) * 100).toFixed(1)}%` : 'N/A'}
                  </td>
                  <td className="p-2 text-slate-600">Operating Margin</td>
                  <td className="p-2 font-bold text-slate-900">
                    {data.financials?.operatingMargin ? `${(Number(data.financials.operatingMargin) * 100).toFixed(1)}%` : 'N/A'}
                  </td>
                </tr>
                <tr className="border-b border-slate-200 font-semibold">
                  <td className="p-2 text-slate-600">Trailing P/E Ratio</td>
                  <td className="p-2 font-bold text-slate-900">{data.financials?.peRatio || 'N/A'}</td>
                  <td className="p-2 text-slate-600">Return on Equity (ROE)</td>
                  <td className="p-2 font-bold text-slate-900">
                    {data.financials?.roe ? `${(Number(data.financials.roe) * 100).toFixed(1)}%` : 'N/A'}
                  </td>
                </tr>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold">
                  <td className="p-2 text-slate-600">Free Cash Flow</td>
                  <td className="p-2 font-bold text-slate-900">
                    {data.financials?.freeCashFlow ? `${currencySymbol}${(data.financials.freeCashFlow / 1e9).toFixed(2)}B` : 'N/A'}
                  </td>
                  <td className="p-2 text-slate-600">Overall Risk Rating</td>
                  <td className="p-2 font-bold text-slate-900">{data.risks?.overallRisk || 'MEDIUM'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Compliance & Disclaimer */}
          <div className="border-t border-slate-200 pt-4 text-[9px] text-slate-450 leading-relaxed space-y-1">
            <span className="font-bold uppercase tracking-wider block">Institutional Disclaimer:</span>
            <p>
              This document is generated by InvestmentAI for analytical and research support purposes only. It does not constitute formal financial, tax, or fiduciary investment advice. Past performance is no guarantee of future returns.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ExportMemoModal;
