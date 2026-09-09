import React, { useState } from 'react';

export default function ReviewAction({ ticker, attentionId, onTriggerReview }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReview = async () => {
    setLoading(true);
    try {
      if (onTriggerReview) {
        await onTriggerReview({ ticker, attentionId });
        setSuccess(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mt-2 text-xs text-emerald-400 flex items-center">
        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
        Review item logged in Operations Queue
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center space-x-2">
      <button
        onClick={handleReview}
        disabled={loading}
        className="px-2.5 py-1 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-200 text-xs font-medium flex items-center transition-colors cursor-pointer"
      >
        <svg className="w-3.5 h-3.5 mr-1 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        {loading ? 'Adding to Queue...' : `Add ${ticker || 'Holding'} to Decision Review Queue`}
      </button>
    </div>
  );
}
