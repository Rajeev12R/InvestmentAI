import React, { useState } from 'react';

export default function CopilotInput({ onSendMessage, disabled = false, depth = 'STANDARD', onDepthChange }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-slate-800 bg-slate-950 p-4">
      {/* Controls Bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-medium text-slate-400">Depth:</span>
          {['QUICK', 'STANDARD', 'DEEP'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDepthChange && onDepthChange(d)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                depth === d
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-slate-500">Evidence-Grounded • Deterministic Fallback</span>
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your portfolio, valuations, thesis breakers, or decisions (e.g. 'Why did AAPL move to WATCH?')..."
          rows={2}
          disabled={disabled}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center justify-center transition-colors cursor-pointer ${
            disabled || !input.trim()
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
          }`}
        >
          {disabled ? (
            <svg className="animate-spin w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <span>Send</span>
          )}
        </button>
      </form>
    </div>
  );
}
