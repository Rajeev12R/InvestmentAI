import React, { useState } from 'react';
import { X, Share2, Copy, Check, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';

const ShareScorecardModal = ({ isOpen, onClose, data, ticker }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const currencySymbol = data.stockData?.currency === 'INR' ? '₹' : '$';
  const upside = data.valuation?.upsidePotential ?? 0;

  const handleCopyText = () => {
    const summaryText = `📊 InvestmentAI Analysis: ${data.companyProfile?.name || ticker} (${ticker})
🎯 Recommendation: ${data.recommendation || 'HOLD'}
⭐️ Suitability Score: ${data.investmentScore}/100
💰 Market Price: ${currencySymbol}${data.stockData?.currentPrice || 'N/A'}
📈 DCF Fair Value: ${currencySymbol}${data.valuation?.fairValuePriceTarget || 'N/A'} (${upside > 0 ? '+' : ''}${upside}%)
⚡️ Key Thesis: ${data.reasoning?.slice(0, 140)}...

Analyze more at: https://investment-ai-gray.vercel.app/company/${ticker}`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-blue-600" />
            <span className="font-bold text-slate-800 text-sm">
              Share Investment Scorecard
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Visual Social Card */}
        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white rounded-2xl p-6 border border-slate-700 shadow-xl space-y-5">
            <div className="flex justify-between items-start border-b border-slate-700/80 pb-4">
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Investment AI Scorecard
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight text-white mt-1">
                  {data.companyProfile?.name || ticker}
                </h3>
                <span className="text-xs text-slate-450 font-semibold">{ticker} &bull; {data.companyProfile?.sector || 'Equity'}</span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-450 block">Rating</span>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  data.recommendation === 'INVEST' ? 'bg-emerald-500 text-slate-950' : data.recommendation === 'PASS' ? 'bg-rose-500 text-white' : 'bg-amber-400 text-slate-950'
                }`}>
                  {data.recommendation || 'HOLD'}
                </div>
              </div>
            </div>

            {/* Score & DCF Target */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl">
                <span className="text-[10px] font-semibold text-slate-450 uppercase block">Suitability Score</span>
                <span className="text-3xl font-black text-white">
                  {data.investmentScore}<span className="text-sm font-normal text-slate-400">/100</span>
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl">
                <span className="text-[10px] font-semibold text-slate-450 uppercase block">DCF Fair Value</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-blue-400">
                    {currencySymbol}{data.valuation?.fairValuePriceTarget || data.stockData?.currentPrice || 'N/A'}
                  </span>
                  <span className={`text-xs font-bold ${upside >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {upside > 0 ? `+${upside}%` : `${upside}%`}
                  </span>
                </div>
              </div>
            </div>

            {/* Bull Points */}
            <div className="space-y-1 text-xs text-slate-300">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block">Primary Catalysts</span>
              <p className="line-clamp-2 italic text-slate-200">
                "{data.reasoning?.slice(0, 160)}..."
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleCopyText}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-md cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Scorecard Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Summary for Twitter / LinkedIn
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ShareScorecardModal;
