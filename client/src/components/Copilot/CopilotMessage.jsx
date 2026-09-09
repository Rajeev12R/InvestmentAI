import React from 'react';
import Citation from './Citation';
import DecisionExplanation from './DecisionExplanation';
import ResearchResponse from './ResearchResponse';
import PortfolioAnswer from './PortfolioAnswer';
import ReviewAction from './ReviewAction';
import SuggestedQuestions from './SuggestedQuestions';

export default function CopilotMessage({
  message,
  onSelectQuestion,
  onTriggerReview
}) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-2xl bg-sky-950/70 border border-sky-600/40 rounded-2xl rounded-tr-sm px-4 py-3 text-slate-100 text-sm shadow-md">
          <p className="whitespace-pre-wrap">{message.content}</p>
          <span className="text-[10px] text-sky-400/60 block text-right mt-1 font-mono">
            {new Date(message.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-3xl w-full bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-sm p-4 text-slate-200 text-sm shadow-xl space-y-3">
        {/* Header with intent and seal badge */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-semibold text-xs text-slate-300">InvestmentAI Analyst</span>
            {message.intent && (
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
                {message.intent}
              </span>
            )}
          </div>
          {message.contextHash && (
            <span className="text-[10px] font-mono text-emerald-400/70 flex items-center" title="SHA-256 Verified Sealed Package">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {message.contextHash.slice(0, 10)}...
            </span>
          )}
        </div>

        {/* Main analytical answer */}
        <div className="text-slate-200 leading-relaxed space-y-2">
          <p className="whitespace-pre-wrap">{message.content || message.answer}</p>
        </div>

        {/* Structured Decision Explanation */}
        {(message.decision || (message.whyMatters && message.whyMatters.length > 0)) && (
          <DecisionExplanation
            decision={message.decision}
            whyMatters={message.whyMatters}
            whatChanged={message.whatChanged}
          />
        )}

        {/* Grounded Research Findings */}
        {message.relatedResearch && message.relatedResearch.length > 0 && (
          <ResearchResponse researchFindings={message.relatedResearch} />
        )}

        {/* Citations List */}
        {message.citations && message.citations.length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Grounded Evidence Citations:
            </span>
            <div className="flex flex-wrap gap-1">
              {message.citations.map((c, i) => (
                <Citation key={i} citation={c} />
              ))}
            </div>
          </div>
        )}

        {/* Review Action Card */}
        {message.decision === 'AVOID' && (
          <ReviewAction
            ticker={message.ticker}
            attentionId={message.attentionId}
            onTriggerReview={onTriggerReview}
          />
        )}

        {/* Suggested Follow-up Questions */}
        {message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
          <SuggestedQuestions
            questions={message.suggestedQuestions}
            onSelectQuestion={onSelectQuestion}
          />
        )}
      </div>
    </div>
  );
}
