import React, { useState } from 'react';

export default function FollowUpPanel({ followUps = [], onUpdateStatus = null, onCreateFollowUp = null }) {
  const [newQuestion, setNewQuestion] = useState('');
  const [newTicker, setNewTicker] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newTicker || !newQuestion) return;
    if (onCreateFollowUp) {
      onCreateFollowUp({ ticker: newTicker.toUpperCase(), question: newQuestion });
    }
    setNewQuestion('');
    setNewTicker('');
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          Active Investigation Follow-Ups
        </h3>
        <span className="text-xs text-slate-400 font-mono">{followUps.length} tracked</span>
      </div>

      {/* New Follow-up Quick Form */}
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value)}
          placeholder="Ticker"
          className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 uppercase font-mono"
        />
        <input
          type="text"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Investigation question or action..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!newTicker || !newQuestion}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Add
        </button>
      </form>

      {/* Follow-ups List */}
      {followUps.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-xs">
          No active follow-ups. Select an investigation question from Attention cards to track.
        </div>
      ) : (
        <div className="space-y-2.5">
          {followUps.map(f => (
            <div key={f.followUpId} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-start justify-between gap-3 text-xs">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white font-mono">{f.ticker}</span>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">
                    {f.status}
                  </span>
                </div>
                <p className="text-slate-300">{f.question}</p>
                {f.findings && <p className="text-[11px] text-emerald-400 mt-1">Findings: {f.findings}</p>}
              </div>

              {onUpdateStatus && (
                <select
                  value={f.status}
                  onChange={(e) => onUpdateStatus(f.followUpId, e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                >
                  <option value="INVESTIGATING">INVESTIGATING</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="DISMISSED">DISMISSED</option>
                </select>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
