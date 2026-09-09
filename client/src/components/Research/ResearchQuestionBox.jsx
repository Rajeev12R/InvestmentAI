import React, { useState } from 'react';
import { Search, Sparkles, Send, Loader2, HelpCircle } from 'lucide-react';
import axios from 'axios';

const PRESET_QUESTIONS = [
  'Why should I buy or avoid this stock?',
  'What are the primary risk factors?',
  'What would make this thesis wrong?',
  'Is reported earnings quality supported by cash flow?',
  'What growth expectations are implied in today\'s price?'
];

const ResearchQuestionBox = ({ ticker, onOpenEvidence }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState(null);

  const handleAsk = async (questionToAsk) => {
    const q = (questionToAsk || query).trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const baseUrl = isLocalhost ? (import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:3000') : (import.meta.env.VITE_API_URL || 'https://investmentai-kfg5.onrender.com');

      const response = await axios.post(`${baseUrl}/api/research/question`, {
        ticker,
        researchQuestion: q
      });

      if (response.data && response.data.success) {
        setAnswer(response.data.data);
      } else {
        setError(response.data?.error || 'Failed to process research query');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error executing research query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-150 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Ask the AI Research Analyst
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">Air-Gapped Truth Layer Reasoning</span>
      </div>

      {/* Preset Quick Pills */}
      <div className="flex flex-wrap gap-2">
        {PRESET_QUESTIONS.map((pq, idx) => (
          <button
            key={idx}
            onClick={() => {
              setQuery(pq);
              handleAsk(pq);
            }}
            disabled={loading}
            className="text-[11px] font-medium text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 px-3 py-1 rounded-full transition-all cursor-pointer"
          >
            {pq}
          </button>
        ))}
      </div>

      {/* Search Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(query);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Ask any question about ${ticker || 'this stock'}...`}
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          <span>Query</span>
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Answer Output */}
      {answer && (
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="text-[11px] font-bold text-slate-800 uppercase">Research Analyst Synthesis:</span>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
              Confidence: {answer.confidence || 'HIGH'}
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {answer.summary}
          </p>

          {answer.keyDrivers && answer.keyDrivers.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Supporting Verified Drivers:</span>
              <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600">
                {answer.keyDrivers.map((kd, idx) => (
                  <li key={idx}>
                    {typeof kd === 'string' ? kd : kd.claim}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResearchQuestionBox;
