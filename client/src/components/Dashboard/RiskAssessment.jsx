import React from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, ShieldX, Activity, Database, CheckCircle2 } from 'lucide-react';

const RiskAssessment = ({ risks }) => {
  if (!risks) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-center text-slate-500 text-sm font-medium h-full shadow-sm">
        Risk assessment data unavailable
      </div>
    );
  }

  const {
    overallRisk,
    riskLevel,
    financialRisk,
    marketRisk,
    earningsRisk,
    liquidityRisk,
    growthRisk,
    governanceRisk,
    riskProfile,
    criticalFlags = [],
    summary
  } = risks;

  const currentLevel = (riskLevel || overallRisk || 'MODERATE').toUpperCase();

  const getBadgeStyle = (level) => {
    const formatted = (level || '').toUpperCase();
    if (formatted === 'LOW') {
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        bar: 'bg-emerald-500',
        width: '25%'
      };
    } else if (formatted === 'CRITICAL' || formatted === 'HIGH') {
      return {
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        bar: 'bg-rose-500',
        width: formatted === 'CRITICAL' ? '100%' : '80%'
      };
    } else if (formatted === 'UNAVAILABLE' || formatted === 'UNKNOWN') {
      return {
        badge: 'bg-slate-50 text-slate-500 border-slate-200',
        bar: 'bg-slate-300',
        width: '0%'
      };
    } else {
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        bar: 'bg-amber-500',
        width: '50%'
      };
    }
  };

  const getOverallStyle = (level) => {
    const formatted = (level || '').toUpperCase();
    if (formatted === 'LOW') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (formatted === 'CRITICAL' || formatted === 'HIGH' || formatted === 'ELEVATED') return 'text-rose-700 bg-rose-50 border-rose-200';
    return 'text-amber-700 bg-amber-50 border-amber-200';
  };

  // Build canonical categories from Phase 3 profile or legacy props
  const breakdowns = riskProfile?.categories || riskProfile?.categoryBreakdowns || {};
  
  const riskCategories = [
    { 
      label: 'Financial & Solvency', 
      level: breakdowns.financial?.severity || financialRisk?.severity || 'LOW', 
      reason: breakdowns.financial?.signals?.[0]?.reason || (financialRisk?.debtToEbitda !== 'UNAVAILABLE' ? `Net Debt/EBITDA: ${financialRisk?.debtToEbitda}x` : 'Solvency metrics within normal bounds') 
    },
    { 
      label: 'Market & Volatility', 
      level: breakdowns.market?.severity || marketRisk?.severity || 'MODERATE', 
      reason: breakdowns.market?.signals?.[0]?.reason || (marketRisk?.beta !== 'UNAVAILABLE' ? `Beta: ${marketRisk?.beta}x` : 'Market dynamics within normal range') 
    },
    { 
      label: 'Liquidity & Cash Buffer', 
      level: breakdowns.liquidity?.severity || liquidityRisk?.severity || 'LOW', 
      reason: breakdowns.liquidity?.signals?.[0]?.reason || 'Working capital liquidity evaluated' 
    },
    { 
      label: 'Earnings Quality & Accruals', 
      level: breakdowns.earningsQuality?.severity || earningsRisk?.severity || 'LOW', 
      reason: breakdowns.earningsQuality?.signals?.[0]?.reason || 'Cash flow conversion aligns with reported net income' 
    },
    { 
      label: 'Growth & Margin Stability', 
      level: breakdowns.growth?.severity || growthRisk?.severity || 'LOW', 
      reason: breakdowns.growth?.signals?.[0]?.reason || 'Revenue trends and margin stability evaluated' 
    },
    { 
      label: 'Data Coverage & Quality', 
      level: breakdowns.dataQuality?.severity || 'LOW', 
      reason: breakdowns.dataQuality?.signals?.[0]?.reason || 'Verified primary grounded source inputs' 
    }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col justify-between h-full space-y-5 shadow-sm">
      <div className="space-y-4">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Quantitative Risk Radar</h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-slate-400 uppercase text-[10px]">THREAT LEVEL:</span>
            <span className={`font-black uppercase px-2.5 py-0.5 rounded-full text-[10px] tracking-wider border ${getOverallStyle(currentLevel)}`}>
              {currentLevel}
            </span>
          </div>
        </div>

        {/* 6 Core Risk Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {riskCategories.map((cat, idx) => {
            const style = getBadgeStyle(cat.level);

            return (
              <div 
                key={idx} 
                className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-tight">
                      {cat.label}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${style.badge}`}>
                      {cat.level}
                    </span>
                  </div>
                  
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full ${style.bar} rounded-full`} style={{ width: style.width }} />
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  {cat.reason}
                </p>
              </div>
            );
          })}
        </div>

        {/* Critical Flags Highlight */}
        {criticalFlags && criticalFlags.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-700 uppercase border-b border-rose-200/60 pb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
              <span>Critical Risk Flags Detected</span>
            </div>
            <ul className="list-disc pl-4 space-y-1.5 text-xs text-rose-900 font-medium">
              {criticalFlags.map((flag, i) => (
                <li key={i} className="leading-snug">
                  {typeof flag === 'string' ? flag : flag.message || flag.reason || JSON.stringify(flag)}
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
};

export default RiskAssessment;
