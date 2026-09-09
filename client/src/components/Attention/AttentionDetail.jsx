import React from 'react';
import AttentionEvidence from './AttentionEvidence.jsx';
import InvestigationQuestions from './InvestigationQuestions.jsx';

export default function AttentionDetail({ item, onInvestigate = null }) {
  if (!item) return null;

  return (
    <div className="space-y-4 pt-4 border-t border-slate-800">
      {/* Why it Matters */}
      {item.whyMatters && item.whyMatters.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1.5">Why This Matters</h5>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
            {item.whyMatters.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {/* What Changed */}
      {item.whatChanged && item.whatChanged.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1.5">What Changed (T0 → T1)</h5>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
            {item.whatChanged.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {/* What Invalidates */}
      {item.whatInvalidates && item.whatInvalidates.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">What Would Invalidate This Concern</h5>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
            {item.whatInvalidates.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Score Components Breakdown */}
      {item.score?.components && (
        <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800 text-xs">
          <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] block mb-2">Score Components Breakdown</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300 text-[11px]">
            <div>Decision: <span className="text-indigo-400 font-mono">+{item.score.components.decisionChange}</span></div>
            <div>Breaker: <span className="text-amber-400 font-mono">+{item.score.components.thesisBreaker}</span></div>
            <div>Valuation: <span className="text-cyan-400 font-mono">+{item.score.components.valuationDrift}</span></div>
            <div>Risk: <span className="text-rose-400 font-mono">+{item.score.components.riskDrift}</span></div>
            <div>Materiality: <span className="text-emerald-400 font-mono">+{item.score.components.eventMateriality}</span></div>
            <div>Exposure: <span className="text-purple-400 font-mono">+{item.score.components.portfolioExposure}</span></div>
            <div>Recency: <span className="text-slate-400 font-mono">+{item.score.components.recency}</span></div>
            <div>Total: <span className="text-white font-bold font-mono">{item.score.totalScore} pts</span></div>
          </div>
        </div>
      )}

      {/* Investigation Questions */}
      <InvestigationQuestions
        questions={item.investigationQuestions}
        ticker={item.ticker}
        onInvestigate={onInvestigate}
      />

      {/* Cryptographic Evidence */}
      <AttentionEvidence item={item} />
    </div>
  );
}
