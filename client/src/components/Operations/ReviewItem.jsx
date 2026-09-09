import React from 'react';

const STATUS_OPTIONS = ['REVIEW', 'INVESTIGATING', 'DISMISSED', 'RESOLVED'];

const URGENCY_BADGES = {
  IMMEDIATE: 'bg-red-500/20 text-red-400 border-red-500/30',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  NORMAL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  LOW: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
};

export default function ReviewItem({ review, onStatusChange = null }) {
  if (!review) return null;

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{review.ticker}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${URGENCY_BADGES[review.urgency] || URGENCY_BADGES.NORMAL}`}>
              {review.urgency}
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {review.previousDecision ? `${review.previousDecision} → ` : ''}{review.currentDecision}
            </span>
          </div>
          <p className="text-xs text-slate-300">{review.reason}</p>
        </div>

        {/* Workflow State Selector */}
        <select
          value={review.status}
          onChange={(e) => onStatusChange && onStatusChange(review.reviewId, e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
        <div>Action: <span className="text-indigo-400 font-semibold">{review.recommendedAction}</span></div>
        <div className="font-mono">{new Date(review.createdAt).toLocaleDateString()}</div>
      </div>
    </div>
  );
}
