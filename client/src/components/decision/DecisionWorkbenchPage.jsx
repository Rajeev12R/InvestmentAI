import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getDecisionApi,
  updateDecisionStatusApi,
  submitDecisionReviewApi,
  approveDecisionApi,
  rejectDecisionApi,
  implementDecisionApi,
  getDecisionImpactApi,
  createDecisionSnapshotApi,
  getDecisionSnapshotsApi
} from '../../utils/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import StateView from '../ui/StateView';
import { FinancialValue } from '../ui/FinancialValue';

export default function DecisionWorkbenchPage() {
  const { decisionId } = useParams();
  const navigate = useNavigate();

  const [decision, setDecision] = useState(null);
  const [impact, setImpact] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('THESIS'); // THESIS, IMPACT, ALTERNATIVES, REVIEWS, APPROVAL, AUDIT

  // Modals & Forms
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isChallengeMode, setIsChallengeMode] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [challengeCategory, setChallengeCategory] = useState('VALUATION');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [showImplementModal, setShowImplementModal] = useState(false);
  const [executionNotes, setExecutionNotes] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const fetchDecisionData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [decRes, impRes, snapRes] = await Promise.all([
        getDecisionApi(decisionId),
        getDecisionImpactApi(decisionId).catch(() => ({ data: { data: null } })),
        getDecisionSnapshotsApi(decisionId).catch(() => ({ data: { snapshots: [] } }))
      ]);
      setDecision(decRes.data?.decision || null);
      setImpact(impRes.data?.data || null);
      setSnapshots(snapRes.data?.snapshots || []);
    } catch (err) {
      setError(err.message || 'Failed to load decision workbench');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisionData();
  }, [decisionId]);

  const handleStatusTransition = async (newStatus) => {
    setActionLoading(true);
    try {
      await updateDecisionStatusApi(decisionId, newStatus);
      await fetchDecisionData();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewComment) return;

    setActionLoading(true);
    try {
      await submitDecisionReviewApi(decisionId, {
        comment: reviewComment,
        isChallenge: isChallengeMode,
        challengeCategory: isChallengeMode ? challengeCategory : null
      });
      setShowReviewModal(false);
      setReviewComment('');
      await fetchDecisionData();
    } catch (err) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await approveDecisionApi(decisionId, {
        conditions: ['Verified compliant with portfolio mandate', 'Risk limits within tolerance']
      });
      if (res.data?.isStale) {
        alert('Warning: Decision approved but flagged STALE because underlying portfolio state drifted!');
      }
      await fetchDecisionData();
    } catch (err) {
      alert(err.message || 'Failed to approve decision');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await rejectDecisionApi(decisionId, { reason: rejectReason });
      setShowRejectModal(false);
      await fetchDecisionData();
    } catch (err) {
      alert(err.message || 'Failed to reject decision');
    } finally {
      setActionLoading(false);
    }
  };

  const handleImplement = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await implementDecisionApi(decisionId, { executionNotes });
      setShowImplementModal(false);
      await fetchDecisionData();
    } catch (err) {
      alert(err.message || 'Failed to implement decision');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    setActionLoading(true);
    try {
      await createDecisionSnapshotApi(decisionId, { analytics: impact });
      await fetchDecisionData();
      alert('Point-in-Time Sealed Snapshot created successfully!');
    } catch (err) {
      alert(err.message || 'Failed to create snapshot');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <StateView loading={true} />;
  }

  if (error || !decision) {
    return (
      <StateView
        error={error || 'Decision not found'}
        onRetry={fetchDecisionData}
      />
    );
  }

  const v = decision.version || {};
  const thesis = v.thesis || {};
  const evidence = v.evidence || [];
  const supportingEvidence = evidence.filter(e => e.polarity === 'SUPPORTING');
  const contradictingEvidence = evidence.filter(e => e.polarity === 'CONTRADICTING');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success">APPROVED</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="warning">UNDER REVIEW</Badge>;
      case 'CHALLENGED':
        return <Badge variant="danger">CHALLENGED</Badge>;
      case 'IMPLEMENTED':
        return <Badge variant="info">IMPLEMENTED</Badge>;
      case 'MONITORED':
        return <Badge variant="neutral">MONITORED</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">REJECTED</Badge>;
      case 'DRAFT':
        return <Badge variant="neutral">DRAFT</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb / Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/app/decisions')}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
        >
          ← Back to Decisions Registry
        </button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCreateSnapshot} loading={actionLoading}>
            🔒 Seal PIT Snapshot
          </Button>
        </div>
      </div>

      {/* Decision Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-extrabold text-emerald-400 font-mono tracking-tight">{decision.ticker}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                {decision.decisionType}
              </span>
              {getStatusBadge(decision.status)}
              <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                v{decision.currentVersion}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1.5">{decision.title}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Decision ID: <span className="font-mono text-slate-300">{decision.decisionId}</span> • Portfolio: <span className="font-mono text-slate-300">{decision.portfolioId}</span> • Creator: <span className="font-mono text-slate-300">{decision.creatorId}</span>
            </p>
          </div>

          {/* Action Ribbon */}
          <div className="flex flex-wrap items-center gap-2">
            {decision.status === 'DRAFT' && (
              <Button
                variant="primary"
                onClick={() => handleStatusTransition('UNDER_REVIEW')}
                loading={actionLoading}
              >
                Submit for Review →
              </Button>
            )}

            {(decision.status === 'UNDER_REVIEW' || decision.status === 'CHALLENGED') && (
              <>
                <Button
                  variant="outline"
                  onClick={() => { setIsChallengeMode(true); setShowReviewModal(true); }}
                >
                  ⚡ Challenge Thesis
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setIsChallengeMode(false); setShowReviewModal(true); }}
                >
                  + Add Review Note
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowRejectModal(true)}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApprove}
                  loading={actionLoading}
                >
                  ✓ Authorize & Approve
                </Button>
              </>
            )}

            {decision.status === 'APPROVED' && (
              <Button
                variant="primary"
                onClick={() => setShowImplementModal(true)}
                loading={actionLoading}
              >
                Handoff to Implementation →
              </Button>
            )}

            {decision.status === 'IMPLEMENTED' && (
              <Button
                variant="outline"
                onClick={() => handleStatusTransition('MONITORED')}
                loading={actionLoading}
              >
                Begin Post-Decision Monitoring
              </Button>
            )}
          </div>
        </div>

        {/* Quick Position Delta Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
            <span className="text-slate-400 block mb-0.5">Current Weight</span>
            <span className="text-sm font-bold font-mono text-slate-200">
              {((decision.currentPosition?.weight || 0) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
            <span className="text-slate-400 block mb-0.5">Target Weight</span>
            <span className="text-sm font-bold font-mono text-emerald-400">
              {((decision.proposedPosition?.targetWeight || 0) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
            <span className="text-slate-400 block mb-0.5">Weight Delta</span>
            <span className={`text-sm font-bold font-mono ${decision.proposedPosition?.weightDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(decision.proposedPosition?.weightDelta >= 0 ? '+' : '') + ((decision.proposedPosition?.weightDelta || 0) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
            <span className="text-slate-400 block mb-0.5">Segregation of Duties</span>
            <span className="text-sm font-bold text-slate-300">
              {decision.enforceSoD ? '🔒 Enforced' : 'Standard'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('THESIS')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'THESIS'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Thesis & Evidence
        </button>
        <button
          onClick={() => setActiveTab('IMPACT')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'IMPACT'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Portfolio & Risk Impact
        </button>
        <button
          onClick={() => setActiveTab('ALTERNATIVES')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'ALTERNATIVES'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Alternatives & Scenarios
        </button>
        <button
          onClick={() => setActiveTab('REVIEWS')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'REVIEWS'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Peer Reviews & Challenges ({decision.reviews?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('APPROVAL')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'APPROVAL'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Authorization & Implementation
        </button>
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'AUDIT'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Audit & Snapshots ({snapshots.length})
        </button>
      </div>

      {/* Tab 1: Thesis & Evidence */}
      {activeTab === 'THESIS' && (
        <div className="space-y-6">
          {/* Core Thesis Card */}
          <Card title="Investment Thesis & Assumptions">
            <div className="space-y-4">
              <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                  Core Thesis Statement
                </span>
                <p className="text-sm text-slate-200 leading-relaxed font-sans">
                  {thesis.coreThesis || 'No core thesis statement provided.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Key Assumptions</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {(thesis.keyAssumptions || []).map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Expected Catalysts</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {(thesis.catalysts || []).map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                  <span className="text-rose-400 block mb-1 font-semibold">Invalidation Criteria</span>
                  <ul className="list-disc list-inside space-y-1 text-rose-300/90">
                    {(thesis.invalidationConditions || []).map((inv, i) => (
                      <li key={i}>{inv}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* Evidence Grid: Supporting vs Contradicting Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Supporting Evidence */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Supporting Evidence ({supportingEvidence.length})
                </h3>
              </div>

              <div className="space-y-3">
                {supportingEvidence.map((ev) => (
                  <Card key={ev.evidenceId} className="border-emerald-900/40 bg-emerald-950/10">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-emerald-300">{ev.title}</span>
                        <Badge variant="success">CONF: {Math.round(ev.confidence * 100)}%</Badge>
                      </div>
                      <p className="text-xs text-slate-300">{ev.summary}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 font-mono">
                        <span>Source: {ev.source}</span>
                        <span>Type: {ev.type}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Contradicting Evidence & Disagreements */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  Contradicting Evidence & Bear Arguments ({contradictingEvidence.length})
                </h3>
              </div>

              <div className="space-y-3">
                {contradictingEvidence.map((ev) => (
                  <Card key={ev.evidenceId} className="border-rose-900/40 bg-rose-950/10">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-rose-300">{ev.title}</span>
                        <Badge variant="danger">CONF: {Math.round(ev.confidence * 100)}%</Badge>
                      </div>
                      <p className="text-xs text-slate-300">{ev.summary}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 font-mono">
                        <span>Source: {ev.source}</span>
                        <span>Type: {ev.type}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Portfolio & Risk Impact */}
      {activeTab === 'IMPACT' && impact && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Exposure Card */}
            <Card title="Concentration & Exposure Shift">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-2 rounded bg-slate-950">
                  <span className="text-slate-400">Baseline HHI:</span>
                  <span className="font-mono text-slate-200">{impact.exposureImpact?.baselineHHI?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950">
                  <span className="text-slate-400">Projected HHI:</span>
                  <span className="font-mono text-emerald-400">{impact.exposureImpact?.projectedHHI?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950">
                  <span className="text-slate-400">Effective N (N_eff):</span>
                  <span className="font-mono text-slate-200">
                    {impact.exposureImpact?.baselineNEff?.toFixed(1)} → {impact.exposureImpact?.projectedNEff?.toFixed(1)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Risk Card */}
            <Card title="Forecast Risk & Volatility Shift">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-2 rounded bg-slate-950">
                  <span className="text-slate-400">Annualized Volatility:</span>
                  <span className="font-mono text-slate-200">
                    {((impact.riskImpact?.baselineVolatility || 0) * 100).toFixed(2)}% → {((impact.riskImpact?.projectedVolatility || 0) * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950">
                  <span className="text-slate-400">Parametric VaR 95%:</span>
                  <span className="font-mono text-slate-200">
                    {((impact.riskImpact?.baselineVaR95 || 0) * 100).toFixed(2)}% → {((impact.riskImpact?.projectedVaR95 || 0) * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950">
                  <span className="text-slate-400">Expected Shortfall 95%:</span>
                  <span className="font-mono text-slate-200">
                    {((impact.riskImpact?.baselineES95 || 0) * 100).toFixed(2)}% → {((impact.riskImpact?.projectedES95 || 0) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </Card>

            {/* Compliance Gate Card */}
            <Card title="Mandate Compliance Gate">
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-slate-950">
                  <span className="text-slate-400">Single Position Limit:</span>
                  <span className="font-mono text-slate-200">
                    {((impact.complianceImpact?.maxSinglePositionLimit || 0.25) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-950">
                  <span className="text-slate-400">Projected Weight:</span>
                  <span className="font-mono text-emerald-400">
                    {((impact.complianceImpact?.projectedSinglePositionWeight || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-950">
                  <span className="text-slate-400">Compliance Status:</span>
                  <Badge variant={impact.complianceImpact?.isWithinLimits ? 'success' : 'danger'}>
                    {impact.complianceImpact?.singlePositionStatus || 'PASS'}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 3: Alternatives & Scenarios */}
      {activeTab === 'ALTERNATIVES' && (
        <div className="space-y-6">
          <Card title="Decision Alternatives Comparison">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Option Name</th>
                    <th className="py-2.5 px-3">Target Weight</th>
                    <th className="py-2.5 px-3">Expected Return</th>
                    <th className="py-2.5 px-3">Incremental Vol</th>
                    <th className="py-2.5 px-3">Strategic Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {(v.alternatives || []).map((alt) => (
                    <tr key={alt.alternativeId} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-semibold text-slate-200 font-sans">{alt.name}</td>
                      <td className="py-2.5 px-3 text-emerald-400">{(alt.targetWeight * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-slate-300">{(alt.expectedReturn * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-slate-400">+{(alt.incrementalVolatility * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans">{alt.rationale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {impact?.scenarios && (
            <Card title="Macro Regime & Scenario Stress Analysis">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {impact.scenarios.map((scen) => (
                  <div key={scen.scenarioId} className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-xs space-y-2">
                    <span className="font-semibold text-slate-200 block">{scen.name}</span>
                    <div className="flex justify-between text-slate-400">
                      <span>Expected Return:</span>
                      <span className={`font-mono ${scen.expectedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(scen.expectedReturn * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Portfolio Impact:</span>
                      <span className={`font-mono ${scen.portfolioReturnImpact >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(scen.portfolioReturnImpact >= 0 ? '+' : '') + ((scen.portfolioReturnImpact || 0) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab 4: Peer Reviews & Challenges */}
      {activeTab === 'REVIEWS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Review & Challenge Ledger</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setIsChallengeMode(true); setShowReviewModal(true); }}>
                ⚡ Raise Challenge
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setIsChallengeMode(false); setShowReviewModal(true); }}>
                + Add Review Note
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {(decision.reviews || []).length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-900/40 rounded-lg border border-slate-800">
                No peer reviews or challenges submitted yet.
              </div>
            ) : (
              decision.reviews.map((rev) => (
                <div
                  key={rev.reviewId}
                  className={`p-4 rounded-lg border ${
                    rev.isChallenge
                      ? 'bg-rose-950/20 border-rose-900/50'
                      : 'bg-slate-950/60 border-slate-800'
                  } space-y-2`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-300 font-semibold">{rev.reviewerId}</span>
                      {rev.isChallenge ? (
                        <Badge variant="danger">CHALLENGE: {rev.challengeCategory}</Badge>
                      ) : (
                        <Badge variant="info">REVIEW NOTE</Badge>
                      )}
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">{new Date(rev.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">{rev.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Authorization & Implementation */}
      {activeTab === 'APPROVAL' && (
        <div className="space-y-6">
          <Card title="Human Authorization Records">
            <div className="space-y-4">
              {(decision.approvals || []).length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 bg-slate-950/40 rounded-lg border border-slate-800">
                  Decision is pending formal authorization.
                </div>
              ) : (
                decision.approvals.map((app) => (
                  <div
                    key={app.approvalId}
                    className={`p-4 rounded-lg border ${
                      app.isStale
                        ? 'bg-amber-950/20 border-amber-900/50'
                        : 'bg-emerald-950/20 border-emerald-900/50'
                    } space-y-2 text-xs`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-200">Approver: {app.approverId}</span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {app.approverRole}
                        </span>
                        <Badge variant={app.isStale ? 'warning' : 'success'}>
                          {app.status}
                        </Badge>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">{new Date(app.createdAt).toLocaleString()}</span>
                    </div>

                    {app.isStale && (
                      <div className="text-amber-300 bg-amber-950/40 p-2 rounded border border-amber-800/60 text-[11px]">
                        ⚠️ This approval was invalidated because the underlying portfolio holdings or decision version changed after authorization.
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Implementation Handoff Status */}
          <Card title="Implementation Handoff & Execution">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2 rounded bg-slate-950">
                <span className="text-slate-400">Execution Status:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {decision.implementation?.status || 'NOT_STARTED'}
                </span>
              </div>
              {decision.implementation && (
                <>
                  <div className="flex justify-between p-2 rounded bg-slate-950">
                    <span className="text-slate-400">Implemented By:</span>
                    <span className="font-mono text-slate-200">{decision.implementation.actorId}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950">
                    <span className="text-slate-400 block mb-1">Execution Notes:</span>
                    <span className="text-slate-300">{decision.implementation.executionNotes || 'None'}</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 6: Audit & Snapshots */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-6">
          <Card title="Point-in-Time Sealed Snapshots Ledger">
            <div className="space-y-3">
              {snapshots.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No snapshots sealed for this decision yet.
                </div>
              ) : (
                snapshots.map((snap) => (
                  <div key={snap.snapshotId} className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 text-xs space-y-1 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-semibold">{snap.snapshotId}</span>
                      <span className="text-slate-400">{new Date(snap.asOf).toLocaleString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      SHA-256 Hash: <span className="text-slate-300">{snap.integrityHash}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Review / Challenge Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={isChallengeMode ? 'Submit Peer Challenge' : 'Submit Review Note'}
      >
        <form onSubmit={handleSubmitReview} className="space-y-4">
          {isChallengeMode && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Challenge Category</label>
              <select
                value={challengeCategory}
                onChange={(e) => setChallengeCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="VALUATION">VALUATION / MULTIPLE COMPRESSION</option>
                <option value="MACRO">MACRO / INTEREST RATE RISK</option>
                <option value="COMPETITION">COMPETITIVE PRESSURE / MOAT EROSION</option>
                <option value="EXECUTION">EXECUTION RISK / CAPEX MISALLOCATION</option>
                <option value="REGULATORY">REGULATORY / ANTITRUST</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {isChallengeMode ? 'State Specific Challenge & Contradicting Evidence' : 'Reviewer Note'}
            </label>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={4}
              placeholder={isChallengeMode ? 'Explain the counter-thesis, margin of safety concern, or conflicting data point...' : 'Add your institutional review feedback...'}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setShowReviewModal(false)}>
              Cancel
            </Button>
            <Button variant={isChallengeMode ? 'danger' : 'primary'} type="submit" loading={actionLoading}>
              {isChallengeMode ? 'Submit Challenge' : 'Submit Note'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Investment Decision"
      >
        <form onSubmit={handleReject} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Rejection Rationale</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="State the formal reason for rejection..."
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" loading={actionLoading}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>

      {/* Implementation Modal */}
      <Modal
        isOpen={showImplementModal}
        onClose={() => setShowImplementModal(false)}
        title="Implementation Handoff"
      >
        <form onSubmit={handleImplement} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Execution / Staging Notes</label>
            <textarea
              value={executionNotes}
              onChange={(e) => setExecutionNotes(e.target.value)}
              rows={3}
              placeholder="Execution broker, order routing strategy (TWAP/VWAP), limits..."
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setShowImplementModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={actionLoading}>
              Confirm Implementation Handoff
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
