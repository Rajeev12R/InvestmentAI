import React from 'react';
import { ExternalLink, ShieldCheck, Zap } from 'lucide-react';

const SponsoredBrokerBanner = ({ ticker, currency = 'USD' }) => {
  const isINR = currency === 'INR' || ticker?.endsWith('.NS') || ticker?.endsWith('.BO');

  return (
    <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-slate-50 border border-blue-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm text-slate-800">
      <div className="flex items-center gap-3.5">
        <div className="p-2.5 bg-blue-100 border border-blue-200 rounded-xl text-blue-700 shrink-0">
          <Zap className="h-5 w-5" />
        </div>
        <div className="space-y-0.5 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase tracking-wider">
              {isINR ? 'Partner Broker • Zero Brokerage' : 'Commission-Free Trading Partner'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Sponsored Partner</span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-900">
            {isINR 
              ? `Execute trades on ${ticker || 'equities'} with Zero Brokerage via Partner Platform` 
              : `Execute live institutional orders for ${ticker || 'this equity'} with $0 Commission`}
          </p>
        </div>
      </div>

      <a
        href="https://zerodha.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm shrink-0 cursor-pointer"
      >
        <span>Open Trading Account</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
};

export default SponsoredBrokerBanner;

