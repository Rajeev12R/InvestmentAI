import React from 'react';
import { ExternalLink, ShieldCheck, Zap } from 'lucide-react';

const SponsoredBrokerBanner = ({ ticker, currency = 'USD' }) => {
  const isINR = currency === 'INR' || ticker?.endsWith('.NS') || ticker?.endsWith('.BO');

  return (
    <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-800/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg text-white">
      <div className="flex items-center gap-3.5">
        <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400 shrink-0">
          <Zap className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded uppercase tracking-wider">
              {isINR ? 'Partner Broker • ₹0 Brokerage' : 'Commission-Free Trading'}
            </span>
            <span className="text-[10px] text-slate-450 font-medium">Sponsored</span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-100">
            {isINR 
              ? `Trade ${ticker || 'equities'} with Zero Brokerage on Zerodha / Groww` 
              : `Execute trades for ${ticker || 'this stock'} with $0 Commission`}
          </p>
        </div>
      </div>

      <a
        href="https://zerodha.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shrink-0 cursor-pointer"
      >
        <span>Open Demat Account</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
};

export default SponsoredBrokerBanner;
