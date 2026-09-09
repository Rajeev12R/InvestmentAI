import React from 'react';

const PRIORITY_STYLES = {
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  LOW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  INFORMATIONAL: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
};

export default function AttentionPriorityBadge({ priority = 'INFORMATIONAL', score = null }) {
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.INFORMATIONAL;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {priority}
      {score !== null && score !== undefined && (
        <span className="text-[10px] opacity-80">({typeof score === 'object' ? score.totalScore : score} pts)</span>
      )}
    </span>
  );
}
