import React, { useState, useEffect } from 'react';
import ReviewItem from './ReviewItem.jsx';
import FollowUpPanel from './FollowUpPanel.jsx';

export default function DecisionReviewQueue() {
  const [reviews, setReviews] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOperationsData = async () => {
    setLoading(true);
    try {
      const [revRes, fupRes] = await Promise.all([
        fetch('/api/operations/reviews'),
        fetch('/api/operations/followups')
      ]);
      if (revRes.ok) {
        const revData = await revRes.json();
        setReviews(revData.reviews || []);
      }
      if (fupRes.ok) {
        const fupData = await fupRes.json();
        setFollowUps(fupData.followUps || []);
      }
    } catch (e) {
      console.error('Failed to fetch operations data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperationsData();
  }, []);

  const handleStatusChange = async (reviewId, newStatus) => {
    try {
      const res = await fetch(`/api/operations/reviews/${reviewId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchOperationsData();
      }
    } catch (e) {
      console.error('Failed to update review status:', e);
    }
  };

  const handleCreateFollowUp = async ({ ticker, question }) => {
    try {
      const res = await fetch('/api/operations/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, question })
      });
      if (res.ok) {
        fetchOperationsData();
      }
    } catch (e) {
      console.error('Failed to create follow up:', e);
    }
  };

  const handleUpdateFollowUp = async (followUpId, status) => {
    try {
      const res = await fetch(`/api/operations/followups/${followUpId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchOperationsData();
      }
    } catch (e) {
      console.error('Failed to update follow up status:', e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Decision Review Queue</h2>
          <p className="text-sm text-slate-400 mt-1">
            Actionable investment decisions flagged for review due to deterministic decision changes, thesis-breakers, or valuation shifts.
          </p>
        </div>
        <button
          onClick={fetchOperationsData}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? 'Refreshing...' : 'Sync Operations'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Decision Reviews */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Flagged Decision Reviews ({reviews.length})
          </h3>

          {reviews.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-800 text-slate-500 text-sm">
              All investment decisions are currently up to date with verified truth packages.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map(rev => (
                <ReviewItem
                  key={rev.reviewId}
                  review={rev}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Follow-up Operations */}
        <div className="lg:col-span-1">
          <FollowUpPanel
            followUps={followUps}
            onCreateFollowUp={handleCreateFollowUp}
            onUpdateStatus={handleUpdateFollowUp}
          />
        </div>
      </div>
    </div>
  );
}
