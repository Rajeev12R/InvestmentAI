import React, { useState } from 'react';
import { X, UserCheck, Sliders, Shield, Target, Clock, Sparkles } from 'lucide-react';

const InvestorProfileModal = ({ isOpen, onClose, activeProfile, onSaveProfile }) => {
  const [horizon, setHorizon] = useState(activeProfile?.horizon || 'Long (3-5 Years)');
  const [riskTolerance, setRiskTolerance] = useState(activeProfile?.riskTolerance || 'Moderate / Balanced');
  const [goal, setGoal] = useState(activeProfile?.goal || 'Capital Growth & Compounding');

  if (!isOpen) return null;

  const horizons = [
    { label: 'Short (< 1 Year)', desc: 'Tactical trading & capital preservation' },
    { label: 'Medium (1-3 Years)', desc: 'Cyclical recovery & multi-year expansion' },
    { label: 'Long (3-5 Years)', desc: 'Core compounder & business lifecycle growth' },
    { label: 'Ultra-Long (5+ Years)', desc: 'Generational wealth & buy-and-hold investing' }
  ];

  const riskLevels = [
    { label: 'Conservative / Preservation', desc: 'Prioritize low volatility, fortress balance sheets, and dividend yields' },
    { label: 'Moderate / Balanced', desc: 'Balanced blend of established quality and valuation upside' },
    { label: 'Aggressive / High Growth', desc: 'Willing to accept higher beta and valuation multiple swings for high CAGR' }
  ];

  const goals = [
    { label: 'Capital Growth & Compounding', desc: 'Long-term equity appreciation and earnings expansion' },
    { label: 'Dividend & Cash Yield', desc: 'Steady, defensive recurring dividend payout generation' },
    { label: 'Deep Value & Margin of Safety', desc: 'Buying high-discount, unloved assets trading below intrinsic value' },
    { label: 'Balanced Total Return', desc: 'Combination of income and moderate capital appreciation' }
  ];

  const handleSave = () => {
    onSaveProfile({ horizon, riskTolerance, goal });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Custom Investor Fit Profile</h2>
              <p className="text-xs text-slate-500">Personalize suitability scoring to match your exact investment criteria</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Time Horizon */}
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <Clock className="h-4 w-4 text-blue-600" />
              Target Investment Horizon
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {horizons.map(h => (
                <button
                  key={h.label}
                  type="button"
                  onClick={() => setHorizon(h.label)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    horizon === h.label
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs">{h.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{h.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Risk Tolerance */}
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <Shield className="h-4 w-4 text-emerald-600" />
              Risk Tolerance & Volatility Appetite
            </label>
            <div className="space-y-2">
              {riskLevels.map(r => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setRiskTolerance(r.label)}
                  className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    riskTolerance === r.label
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs">{r.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Investment Goal */}
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <Target className="h-4 w-4 text-purple-600" />
              Primary Investment Objective
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {goals.map(g => (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => setGoal(g.label)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    goal === g.label
                      ? 'border-purple-600 bg-purple-50/50 text-purple-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs">{g.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{g.desc}</div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">Recalculates Investor Fit score dynamically</span>
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Apply Profile
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InvestorProfileModal;
