import React, { useState, useEffect } from 'react';

export default function ResearchWorkflowDashboard() {
  const [activeTab, setActiveTab] = useState('myQueue');
  const [selectedProduct, setSelectedProduct] = useState('NVDA_INITIATION_2026');
  const [activeClaimId, setActiveClaimId] = useState(null);
  const [comments, setComments] = useState([
    {
      commentId: 'cmt_001',
      authorId: 'analyst_01',
      researchProductId: 'NVDA_INITIATION_2026',
      researchVersion: 1,
      referencedClaimId: 'C1',
      body: 'Verified against 10-K filed on Feb 28. Revenue figure is exact.',
      status: 'RESOLVED',
      createdAt: '2026-03-01T10:15:00Z'
    },
    {
      commentId: 'cmt_002',
      authorId: 'reviewer_pm_01',
      researchProductId: 'NVDA_INITIATION_2026',
      researchVersion: 1,
      referencedClaimId: 'C5',
      body: 'AI hypothesis regarding interconnect switching costs requires customer survey evidence.',
      status: 'OPEN',
      createdAt: '2026-03-01T11:20:00Z'
    }
  ]);
  const [newCommentText, setNewCommentText] = useState('');

  const [queues, setQueues] = useState({
    myTasks: [
      { id: 'task_101', title: 'Verify Taiwan Strait supply chain concentration', priority: 'HIGH', dueAt: '2026-03-05T17:00:00Z', status: 'IN_PROGRESS' },
      { id: 'task_102', title: 'Review Q4 DCF terminal growth assumptions', priority: 'MEDIUM', dueAt: '2026-03-07T17:00:00Z', status: 'PENDING' }
    ],
    teamBacklog: [
      { id: 'asgn_201', team: 'EQUITY_RESEARCH', title: 'NVDA Q4 Earnings Model Update', assignedTo: 'analyst_01', priority: 'HIGH', status: 'ASSIGNED' },
      { id: 'asgn_202', team: 'RISK', title: 'H1 Portfolio Factor Exposure Stress', assignedTo: 'risk_officer_01', priority: 'CRITICAL', status: 'IN_PROGRESS' }
    ],
    reviewQueue: [
      { reviewId: 'rev_301', researchProductId: 'NVDA_INITIATION_2026', version: 1, status: 'REVIEW_REQUIRED', author: 'analyst_01', submittedAt: '2026-03-01T09:00:00Z' }
    ],
    approvalQueue: [
      { approvalId: 'appr_401', researchProductId: 'NVDA_INITIATION_2026', version: 1, reviewer: 'pm_lead_01', status: 'HUMAN_APPROVED', packageHash: '0x8f2d...a3e9', approvedAt: '2026-03-01T14:30:00Z' }
    ],
    publications: [
      { publicationId: 'pub_501', researchProductId: 'NVDA_INITIATION_2026', version: 1, publishedBy: 'pm_lead_01', publishedAt: '2026-03-01T15:00:00Z', packageHash: '0x8f2d...a3e9' }
    ],
    distributions: [
      { distributionId: 'dist_601', publicationId: 'pub_501', channel: 'INVESTMENT_COMMITTEE', recipient: 'IC_MEMBERS', ackStatus: 'ACKNOWLEDGED' },
      { distributionId: 'dist_602', publicationId: 'pub_501', channel: 'PORTFOLIO', recipient: 'GROWTH_FUND_01', ackStatus: 'REQUIRED' }
    ],
    staleResearch: [
      { productId: 'AAPL_UPDATE_2025', reason: 'Upstream earnings restatement detected', freshness: 'INVALIDATED', ageDays: 110 }
    ],
    auditTimeline: [
      { eventId: 'wf_evt_001', action: 'ASSIGNMENT_CREATED', actor: 'pm_lead_01', time: '2026-03-01T08:00:00Z', hash: '8a7b...11c4' },
      { eventId: 'wf_evt_002', action: 'REVIEW_STATUS_CHANGED_REVIEW_REQUIRED', actor: 'analyst_01', time: '2026-03-01T09:00:00Z', hash: '9b8c...22d5' },
      { eventId: 'wf_evt_003', action: 'RESEARCH_HUMAN_APPROVED', actor: 'pm_lead_01', time: '2026-03-01T14:30:00Z', hash: 'ac9d...33e6' },
      { eventId: 'wf_evt_004', action: 'RESEARCH_PUBLISHED', actor: 'pm_lead_01', time: '2026-03-01T15:00:00Z', hash: 'bd0e...44f7' }
    ]
  });

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    const newC = {
      commentId: `cmt_${Date.now()}`,
      authorId: 'current_user',
      researchProductId: selectedProduct,
      researchVersion: 1,
      referencedClaimId: activeClaimId,
      body: newCommentText,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };
    setComments([...comments, newC]);
    setNewCommentText('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            Institutional Research Operations & Workflow
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic Governance, Review Cycles, Human Approvals & Auditable Distribution Ledger
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs rounded-full font-mono">
            HUMAN_GATE_ENFORCED
          </span>
          <span className="px-3 py-1 bg-indigo-950/80 border border-indigo-700 text-indigo-300 text-xs rounded-full font-mono">
            AUDIT_CHAIN_VERIFIED
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-800 my-6 overflow-x-auto pb-2 text-sm font-medium">
        {[
          { id: 'myQueue', label: 'My Queue' },
          { id: 'teamQueue', label: 'Team Queue' },
          { id: 'reviewQueue', label: 'Review Queue' },
          { id: 'workspace', label: 'Research Workspace' },
          { id: 'approvals', label: 'Approval Queue' },
          { id: 'publications', label: 'Publications' },
          { id: 'distributions', label: 'Distribution Center' },
          { id: 'stale', label: 'Stale Research' },
          { id: 'audit', label: 'Audit Timeline' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: My Queue */}
      {activeTab === 'myQueue' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Active Tasks Assigned to You</h2>
          <div className="grid gap-3">
            {queues.myTasks.map(task => (
              <div key={task.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center hover:border-slate-700">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100">{task.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${task.priority === 'HIGH' ? 'bg-amber-900/60 text-amber-300 border border-amber-700' : 'bg-slate-800 text-slate-300'}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Due: {new Date(task.dueAt).toLocaleString()} • Status: {task.status}</div>
                </div>
                <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-lg text-white">
                  Open Task
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Team Queue */}
      {activeTab === 'teamQueue' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Team Backlog & Assignments</h2>
          <div className="grid gap-3">
            {queues.teamBacklog.map(item => (
              <div key={item.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded">
                      {item.team}
                    </span>
                    <span className="font-semibold text-slate-100">{item.title}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Assignee: {item.assignedTo} • Priority: {item.priority} • Status: {item.status}</div>
                </div>
                <span className="text-xs text-slate-400">In Progress</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Review Queue */}
      {activeTab === 'reviewQueue' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Research Products Pending Review</h2>
          <div className="grid gap-3">
            {queues.reviewQueue.map(rev => (
              <div key={rev.reviewId} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-100">{rev.researchProductId} (v{rev.version})</div>
                  <div className="text-xs text-slate-400 mt-1">Author: {rev.author} • Submitted: {new Date(rev.submittedAt).toLocaleString()}</div>
                </div>
                <button onClick={() => setActiveTab('workspace')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-lg text-white">
                  Conduct Peer Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Research Workspace (Claims, Evidence, Comments) */}
      {activeTab === 'workspace' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Synthesis & Claim Navigation */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-100 text-base">NVDA Initiation Brief (v1)</h3>
                <span className="text-xs px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded font-mono">
                  VALIDATED
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Comprehensive evaluation of NVDA indicates strong fundamental momentum with $100.0M revenue (+12.5% YoY) and $150.0 DCF fair value vs current market spot of $140.0.
              </p>

              {/* Claims & Evidence Deep Lineage */}
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lineage Claims & Evidence Links</div>
                {[
                  { id: 'C1', text: 'Reported FY revenue of $100.0M with 12.5% YoY growth', type: 'FACT', evidence: 'EV_SEC_10K_2024' },
                  { id: 'C2', text: 'DCF model fair value estimate is $150.0 (WACC: 8.5%)', type: 'MODEL_ESTIMATE', evidence: 'EV_VAL_DCF_01' },
                  { id: 'C5', text: 'Hypothesis: Proprietary interconnect creates 3-year switching cost barrier', type: 'AI_HYPOTHESIS', evidence: 'UNVERIFIED_PROSE' }
                ].map(claim => (
                  <div
                    key={claim.id}
                    onClick={() => setActiveClaimId(claim.id)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                      activeClaimId === claim.id
                        ? 'bg-indigo-950/70 border-indigo-500'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono font-bold text-indigo-300">Claim {claim.id}</span>
                      <span className="font-mono text-slate-400">Evidence: {claim.evidence}</span>
                    </div>
                    <div className="text-slate-200">{claim.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Workflow Collaboration & Threaded Comments Panel */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Threaded Review Comments</h3>
            {activeClaimId && (
              <div className="text-xs text-indigo-400 bg-indigo-950/40 p-2 rounded border border-indigo-800">
                Filtering comments on: Claim {activeClaimId}
                <button onClick={() => setActiveClaimId(null)} className="ml-2 underline text-indigo-300">Clear</button>
              </div>
            )}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {comments
                .filter(c => !activeClaimId || c.referencedClaimId === activeClaimId)
                .map(c => (
                  <div key={c.commentId} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="font-mono text-cyan-400">{c.authorId}</span>
                      <span>{c.status}</span>
                    </div>
                    <p className="text-slate-200">{c.body}</p>
                    <div className="text-[10px] text-slate-500">{new Date(c.createdAt).toLocaleTimeString()}</div>
                  </div>
                ))}
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <textarea
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                placeholder={activeClaimId ? `Add comment on Claim ${activeClaimId}...` : "Add general review comment..."}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                rows="2"
              />
              <button
                onClick={handleAddComment}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-lg text-white"
              >
                Submit Comment (Version-Bound)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Approval Queue */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Human Approval Sign-off Ledger</h2>
          <div className="grid gap-3">
            {queues.approvalQueue.map(appr => (
              <div key={appr.approvalId} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-100">{appr.researchProductId} (v{appr.version})</div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    Approved by: {appr.reviewer} • Sealed Hash: {appr.packageHash}
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs rounded-full font-mono">
                  {appr.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Publications */}
      {activeTab === 'publications' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Immutable Publications Ledger</h2>
          <div className="grid gap-3">
            {queues.publications.map(pub => (
              <div key={pub.publicationId} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-100">{pub.researchProductId} (v{pub.version})</div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    Published: {new Date(pub.publishedAt).toLocaleString()} • Hash: {pub.packageHash}
                  </div>
                </div>
                <span className="px-3 py-1 bg-cyan-950 text-cyan-300 border border-cyan-700 text-xs rounded-full font-mono">
                  PUBLISHED_IMMUTABLE
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Distribution Center */}
      {activeTab === 'distributions' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Controlled Research Distribution & Acknowledgement</h2>
          <div className="grid gap-3">
            {queues.distributions.map(dist => (
              <div key={dist.distributionId} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-100">Channel: {dist.channel} → {dist.recipient}</div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">Publication Ref: {dist.publicationId}</div>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full font-mono border ${
                  dist.ackStatus === 'ACKNOWLEDGED'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-amber-950 text-amber-300 border-amber-700'
                }`}>
                  ACK: {dist.ackStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 8: Stale Research */}
      {activeTab === 'stale' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Stale & Invalidated Research Queue</h2>
          <div className="grid gap-3">
            {queues.staleResearch.map(stale => (
              <div key={stale.productId} className="p-4 bg-slate-900 border border-red-900/60 rounded-xl flex justify-between items-center">
                <div>
                  <div className="font-semibold text-red-300">{stale.productId}</div>
                  <div className="text-xs text-slate-400 mt-1">{stale.reason} ({stale.ageDays} days old)</div>
                </div>
                <button className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-xs font-semibold rounded-lg text-white">
                  Spawn Re-Review Task
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 9: Audit Timeline */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Cryptographically Chained Collaboration Audit Log</h2>
          <div className="space-y-2">
            {queues.auditTimeline.map(evt => (
              <div key={evt.eventId} className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <span className="font-mono font-bold text-indigo-400">{evt.action}</span>
                  <span className="text-slate-400 ml-2">by {evt.actor} at {new Date(evt.time).toLocaleTimeString()}</span>
                </div>
                <span className="font-mono text-slate-500">Hash: {evt.hash}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
