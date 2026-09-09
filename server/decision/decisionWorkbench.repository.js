/**
 * @file decisionWorkbench.repository.js
 * Multi-Tenant In-Memory Storage Repository for Phase 37 Investment Decision Workbench.
 */

import crypto from 'crypto';
import {
  WorkbenchDecisionStatus,
  WorkbenchDecisionType,
  DecisionPriority,
  EvidencePolarity,
  EvidenceType,
  ApprovalStatus,
  ImplementationStatus,
  VALID_DECISION_TRANSITIONS,
  computeDeterministicHash
} from './decisionWorkbench.types.js';
import { portfolioRepository } from '../portfolio/portfolio.repository.js';

class DecisionWorkbenchRepository {
  constructor() {
    this.decisions = new Map(); // decisionId -> Decision
    this.versions = new Map(); // `${decisionId}:${versionNumber}` -> DecisionVersion
    this.reviews = new Map(); // `${decisionId}:${reviewId}` -> DecisionReview
    this.approvals = new Map(); // `${decisionId}:${approvalId}` -> DecisionApproval
    this.snapshots = new Map(); // `${decisionId}:${snapshotId}` -> SealedSnapshot
    this._seedDefaultDecisions();
  }

  _seedDefaultDecisions() {
    const now = '2026-09-07T00:00:00.000Z';
    const decisionId = 'DEC-NVDA-001';
    const orgId = 'ORG-ROOT-001';
    const workspaceId = 'WS-DEFAULT-001';
    const portfolioId = 'PORT-DEFAULT-001';

    const defaultDecision = {
      decisionId,
      orgId,
      workspaceId,
      portfolioId,
      ticker: 'NVDA',
      title: 'Strategic Overweight: NVIDIA AI Compute Leadership',
      decisionType: WorkbenchDecisionType.INCREASE,
      priority: DecisionPriority.HIGH,
      status: WorkbenchDecisionStatus.UNDER_REVIEW,
      currentVersion: 1,
      creatorId: 'USR-ROOT-001',
      assignedReviewerId: 'USR-ROOT-001',
      enforceSoD: false,
      currentPosition: {
        weight: 0.10,
        shares: 8000,
        marketValue: 1000000,
        price: 125.00
      },
      proposedPosition: {
        targetWeight: 0.18,
        targetShares: 14400,
        targetMarketValue: 1800000,
        weightDelta: 0.08,
        marketValueDelta: 800000
      },
      portfolioBaselineHash: this._computePortfolioHash(portfolioId, workspaceId, orgId),
      asOf: now,
      createdAt: now,
      updatedAt: now
    };

    const initialVersion = {
      versionId: `${decisionId}:v1`,
      decisionId,
      versionNumber: 1,
      asOf: now,
      thesis: {
        coreThesis: 'Accelerating enterprise capex in AI infrastructure provides sustained multi-quarter revenue visibility with pricing power.',
        keyAssumptions: [
          'Blackwell GPU architectural ramp achieves 80%+ gross margins',
          'Data center hyperscaler demand remains resilient through 2027',
          'Export controls do not materially degrade gross revenue beyond 5%'
        ],
        catalysts: [
          'Upcoming Q3 earnings datacenter revenue surprise',
          'Mass availability of next-generation AI accelerators',
          'Sovereign AI infrastructure commitments'
        ],
        invalidationConditions: [
          'Hyperscaler capex guidance cuts exceeding 15% aggregate',
          'Gross margins compressing below 72% for consecutive quarters',
          'Alternative ASIC adoption eroding market share by >10%'
        ],
        timeHorizon: '12-18 Months',
        expectedReturn: 0.28,
        expectedAlpha: 0.14
      },
      evidence: [
        {
          evidenceId: 'EV-001',
          title: 'Hyperscaler Capex Guidance +24% YoY',
          source: 'SEC Filings / Q2 Aggregation',
          type: EvidenceType.FUNDAMENTAL,
          polarity: EvidencePolarity.SUPPORTING,
          summary: 'Cloud service provider capital expenditure commitments accelerated across Microsoft, Alphabet, Meta and Amazon.',
          confidence: 0.92,
          asOf: now
        },
        {
          evidenceId: 'EV-002',
          title: 'Gross Margin Expansion to 75.2%',
          source: 'Form 10-Q Financial Statements',
          type: EvidenceType.VALUATION,
          polarity: EvidencePolarity.SUPPORTING,
          summary: 'Hardware gross margin expanded 320 bps year-over-year reflecting pricing elasticity.',
          confidence: 0.95,
          asOf: now
        },
        {
          evidenceId: 'EV-003',
          title: 'Customer Concentration: Top 4 Customers = 42% Revenue',
          source: 'Annual 10-K Customer Disclosures',
          type: EvidenceType.RISK,
          polarity: EvidencePolarity.CONTRADICTING,
          summary: 'Four major hyperscalers account for 42% of total recognized revenue, creating asymmetric counterparty risk.',
          confidence: 0.90,
          asOf: now
        },
        {
          evidenceId: 'EV-004',
          title: 'Custom Silicon In-House Development by Major Customers',
          source: 'External Intelligence & Industry Reports',
          type: EvidenceType.TECHNICAL,
          polarity: EvidencePolarity.CONTRADICTING,
          summary: 'Alphabet (TPU) and Amazon (Trainium/Inferentia) actively expanding in-house custom silicon capacity.',
          confidence: 0.85,
          asOf: now
        }
      ],
      alternatives: [
        {
          alternativeId: 'ALT-1',
          name: 'Option A: Proposed Target (18% Weight)',
          targetWeight: 0.18,
          expectedReturn: 0.28,
          incrementalVolatility: 0.024,
          rationale: 'Primary thesis: high conviction upside capture'
        },
        {
          alternativeId: 'ALT-2',
          name: 'Option B: Moderate Increase (14% Weight)',
          targetWeight: 0.14,
          expectedReturn: 0.22,
          incrementalVolatility: 0.012,
          rationale: 'Balanced risk-adjusted expansion within single-stock volatility budget'
        },
        {
          alternativeId: 'ALT-3',
          name: 'Option C: Maintain Current (10% Weight)',
          targetWeight: 0.10,
          expectedReturn: 0.16,
          incrementalVolatility: 0.000,
          rationale: 'Preserve diversification, await next quarter capex confirmation'
        }
      ],
      complianceCheck: {
        status: 'PASS',
        maxSingleStockLimit: 0.25,
        projectedWeight: 0.18,
        isWithinLimits: true,
        evaluatedAt: now
      },
      createdAt: now
    };

    this.decisions.set(decisionId, defaultDecision);
    this.versions.set(`${decisionId}:1`, initialVersion);
  }

  _computePortfolioHash(portfolioId, workspaceId = null, orgId = null) {
    const portfolio = portfolioRepository.getPortfolioById(portfolioId, workspaceId, orgId);
    if (!portfolio) return '0000000000000000000000000000000000000000000000000000000000000000';
    const canonical = {
      portfolioId: portfolio.portfolioId,
      aum: portfolio.aum,
      cashBalance: portfolio.cashBalance,
      holdings: (portfolio.holdings || []).map(h => ({
        ticker: h.ticker,
        quantity: h.quantity,
        price: h.price,
        weight: h.weight
      }))
    };
    return computeDeterministicHash(canonical);
  }

  createDecision({
    orgId,
    workspaceId,
    portfolioId,
    ticker,
    title,
    decisionType = WorkbenchDecisionType.NEW_POSITION,
    priority = DecisionPriority.MEDIUM,
    creatorId,
    assignedReviewerId = null,
    enforceSoD = false,
    thesis = {},
    evidence = [],
    alternatives = [],
    proposedPosition = {},
    currentPosition = null
  }) {
    if (!orgId || !workspaceId) {
      throw new Error('Tenant scoping (orgId and workspaceId) is required');
    }
    if (!portfolioId) {
      throw new Error('Portfolio ID is required');
    }
    if (!ticker || typeof ticker !== 'string') {
      throw new Error('Target ticker symbol is required');
    }
    if (!title || typeof title !== 'string') {
      throw new Error('Decision title is required');
    }

    const portfolio = portfolioRepository.getPortfolioById(portfolioId, workspaceId, orgId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found in active workspace`);
    }

    const normalizedTicker = ticker.toUpperCase().trim();
    const existingHolding = (portfolio.holdings || []).find(h => h.ticker === normalizedTicker);

    const calculatedCurrentPos = currentPosition || (existingHolding ? {
      weight: existingHolding.weight,
      shares: existingHolding.quantity,
      marketValue: existingHolding.marketValue,
      price: existingHolding.price
    } : {
      weight: 0,
      shares: 0,
      marketValue: 0,
      price: 0
    });

    const decisionId = `DEC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const now = new Date().toISOString();
    const portfolioHash = this._computePortfolioHash(portfolioId, workspaceId, orgId);

    const decision = {
      decisionId,
      orgId,
      workspaceId,
      portfolioId,
      ticker: normalizedTicker,
      title: title.trim(),
      decisionType: Object.values(WorkbenchDecisionType).includes(decisionType) ? decisionType : WorkbenchDecisionType.NEW_POSITION,
      priority: Object.values(DecisionPriority).includes(priority) ? priority : DecisionPriority.MEDIUM,
      status: WorkbenchDecisionStatus.DRAFT,
      currentVersion: 1,
      creatorId: creatorId || 'USR-ROOT-001',
      assignedReviewerId: assignedReviewerId || null,
      enforceSoD: Boolean(enforceSoD),
      currentPosition: calculatedCurrentPos,
      proposedPosition: {
        targetWeight: proposedPosition.targetWeight ?? 0.05,
        targetShares: proposedPosition.targetShares ?? 0,
        targetMarketValue: proposedPosition.targetMarketValue ?? 0,
        weightDelta: (proposedPosition.targetWeight ?? 0.05) - calculatedCurrentPos.weight,
        marketValueDelta: (proposedPosition.targetMarketValue ?? 0) - calculatedCurrentPos.marketValue
      },
      portfolioBaselineHash: portfolioHash,
      asOf: now,
      createdAt: now,
      updatedAt: now
    };

    const initialVersion = {
      versionId: `${decisionId}:v1`,
      decisionId,
      versionNumber: 1,
      asOf: now,
      thesis: {
        coreThesis: thesis.coreThesis || '',
        keyAssumptions: Array.isArray(thesis.keyAssumptions) ? thesis.keyAssumptions : [],
        catalysts: Array.isArray(thesis.catalysts) ? thesis.catalysts : [],
        invalidationConditions: Array.isArray(thesis.invalidationConditions) ? thesis.invalidationConditions : [],
        timeHorizon: thesis.timeHorizon || '6-12 Months',
        expectedReturn: thesis.expectedReturn ?? 0.12,
        expectedAlpha: thesis.expectedAlpha ?? 0.04
      },
      evidence: Array.isArray(evidence) ? evidence.map((e, idx) => ({
        evidenceId: e.evidenceId || `EV-${idx + 1}`,
        title: e.title || 'Evidence Item',
        source: e.source || 'Internal Research',
        type: Object.values(EvidenceType).includes(e.type) ? e.type : EvidenceType.FUNDAMENTAL,
        polarity: Object.values(EvidencePolarity).includes(e.polarity) ? e.polarity : EvidencePolarity.SUPPORTING,
        summary: e.summary || '',
        confidence: e.confidence ?? 0.90,
        asOf: e.asOf || now
      })) : [],
      alternatives: Array.isArray(alternatives) ? alternatives : [],
      complianceCheck: {
        status: 'PASS',
        maxSingleStockLimit: portfolio.mandate?.maxSinglePositionWeight || 0.25,
        projectedWeight: proposedPosition.targetWeight ?? 0.05,
        isWithinLimits: (proposedPosition.targetWeight ?? 0.05) <= (portfolio.mandate?.maxSinglePositionWeight || 0.25),
        evaluatedAt: now
      },
      createdAt: now
    };

    this.decisions.set(decisionId, decision);
    this.versions.set(`${decisionId}:1`, initialVersion);

    return JSON.parse(JSON.stringify({ ...decision, version: initialVersion }));
  }

  getDecisionById(decisionId, workspaceId = null, orgId = null) {
    if (!decisionId) return null;
    const decision = this.decisions.get(decisionId);
    if (!decision) return null;

    if (orgId && decision.orgId !== orgId) return null;
    if (workspaceId && decision.workspaceId !== workspaceId) return null;

    const version = this.versions.get(`${decisionId}:${decision.currentVersion}`);
    const reviews = this.listReviews(decisionId);
    const approvals = this.listApprovals(decisionId);

    return JSON.parse(JSON.stringify({
      ...decision,
      version: version || null,
      reviews,
      approvals
    }));
  }

  listDecisions({ workspaceId, orgId, status = null, ticker = null, portfolioId = null, query = null }) {
    if (!workspaceId && !orgId) return [];

    let list = Array.from(this.decisions.values());

    if (orgId) list = list.filter(d => d.orgId === orgId);
    if (workspaceId) list = list.filter(d => d.workspaceId === workspaceId);
    if (status) list = list.filter(d => d.status === status);
    if (ticker) list = list.filter(d => d.ticker === ticker.toUpperCase());
    if (portfolioId) list = list.filter(d => d.portfolioId === portfolioId);

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      list = list.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.ticker.toLowerCase().includes(q) ||
        d.decisionId.toLowerCase().includes(q)
      );
    }

    return JSON.parse(JSON.stringify(list.map(d => ({
      ...d,
      version: this.versions.get(`${d.decisionId}:${d.currentVersion}`) || null
    }))));
  }

  updateDecision(decisionId, updates = {}, workspaceId = null, orgId = null, actorId = 'USR-ROOT-001') {
    const decision = this.decisions.get(decisionId);
    if (!decision) throw new Error(`Decision ${decisionId} not found`);

    if (orgId && decision.orgId !== orgId) throw new Error('IDOR Violation: Organization mismatch');
    if (workspaceId && decision.workspaceId !== workspaceId) throw new Error('IDOR Violation: Workspace mismatch');

    if (['CLOSED', 'SUPERSEDED', 'CANCELLED', 'REJECTED'].includes(decision.status)) {
      throw new Error(`Cannot update decision in terminal ${decision.status} status`);
    }

    const now = new Date().toISOString();
    let isMaterialChange = false;

    // Check if thesis, evidence, alternatives, or proposed weight changed materially
    if (updates.thesis || updates.evidence || updates.alternatives || updates.proposedPosition) {
      isMaterialChange = true;
    }

    if (updates.title) decision.title = updates.title.trim();
    if (updates.priority) decision.priority = updates.priority;
    if (updates.decisionType) decision.decisionType = updates.decisionType;
    if (updates.assignedReviewerId !== undefined) decision.assignedReviewerId = updates.assignedReviewerId;
    if (updates.enforceSoD !== undefined) decision.enforceSoD = Boolean(updates.enforceSoD);

    if (updates.proposedPosition) {
      decision.proposedPosition = {
        ...decision.proposedPosition,
        ...updates.proposedPosition,
        weightDelta: (updates.proposedPosition.targetWeight ?? decision.proposedPosition.targetWeight) - decision.currentPosition.weight
      };
    }

    if (isMaterialChange) {
      const newVersionNum = decision.currentVersion + 1;
      const prevVersion = this.versions.get(`${decisionId}:${decision.currentVersion}`) || {};

      const newVersion = {
        versionId: `${decisionId}:v${newVersionNum}`,
        decisionId,
        versionNumber: newVersionNum,
        asOf: now,
        thesis: updates.thesis ? { ...prevVersion.thesis, ...updates.thesis } : prevVersion.thesis,
        evidence: updates.evidence || prevVersion.evidence || [],
        alternatives: updates.alternatives || prevVersion.alternatives || [],
        complianceCheck: updates.complianceCheck || prevVersion.complianceCheck || { status: 'PASS', evaluatedAt: now },
        createdAt: now
      };

      this.versions.set(`${decisionId}:${newVersionNum}`, newVersion);
      decision.currentVersion = newVersionNum;

      // Invalidate existing approvals due to new version
      this._invalidateApprovals(decisionId, 'Decision version bumped due to material update');
    }

    decision.updatedAt = now;
    return this.getDecisionById(decisionId, workspaceId, orgId);
  }

  updateStatus(decisionId, newStatus, workspaceId = null, orgId = null, actorId = 'USR-ROOT-001') {
    const decision = this.decisions.get(decisionId);
    if (!decision) throw new Error(`Decision ${decisionId} not found`);

    if (orgId && decision.orgId !== orgId) throw new Error('IDOR Violation: Organization mismatch');
    if (workspaceId && decision.workspaceId !== workspaceId) throw new Error('IDOR Violation: Workspace mismatch');

    const currentStatus = decision.status;
    const allowed = VALID_DECISION_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new Error(`Illegal status transition from ${currentStatus} to ${newStatus}`);
    }

    decision.status = newStatus;
    decision.updatedAt = new Date().toISOString();

    return this.getDecisionById(decisionId, workspaceId, orgId);
  }

  // =========================================================================
  // Reviews & Challenges
  // =========================================================================

  submitReview(decisionId, { reviewerId, comment, isChallenge = false, challengeCategory = null }, workspaceId = null, orgId = null) {
    const decision = this.decisions.get(decisionId);
    if (!decision) throw new Error(`Decision ${decisionId} not found`);

    if (orgId && decision.orgId !== orgId) throw new Error('IDOR Violation: Organization mismatch');
    if (workspaceId && decision.workspaceId !== workspaceId) throw new Error('IDOR Violation: Workspace mismatch');

    if (['CLOSED', 'CANCELLED', 'REJECTED'].includes(decision.status)) {
      throw new Error(`Cannot submit review on a ${decision.status} decision`);
    }

    const reviewId = `REV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const review = {
      reviewId,
      decisionId,
      versionNumber: decision.currentVersion,
      reviewerId,
      isChallenge: Boolean(isChallenge),
      challengeCategory: challengeCategory || null,
      comment: comment || '',
      createdAt: now
    };

    this.reviews.set(`${decisionId}:${reviewId}`, review);

    if (isChallenge && decision.status === WorkbenchDecisionStatus.UNDER_REVIEW) {
      decision.status = WorkbenchDecisionStatus.CHALLENGED;
      decision.updatedAt = now;
    }

    return review;
  }

  listReviews(decisionId) {
    const list = [];
    for (const [key, rev] of this.reviews.entries()) {
      if (key.startsWith(`${decisionId}:`)) {
        list.push(rev);
      }
    }
    return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  // =========================================================================
  // Human Approvals & Stale Invalidation
  // =========================================================================

  recordApproval(decisionId, { approverId, approverRole, conditions = [] }, workspaceId = null, orgId = null) {
    const decision = this.decisions.get(decisionId);
    if (!decision) throw new Error(`Decision ${decisionId} not found`);

    if (orgId && decision.orgId !== orgId) throw new Error('IDOR Violation: Organization mismatch');
    if (workspaceId && decision.workspaceId !== workspaceId) throw new Error('IDOR Violation: Workspace mismatch');

    if (decision.status !== WorkbenchDecisionStatus.UNDER_REVIEW && decision.status !== WorkbenchDecisionStatus.CHALLENGED) {
      throw new Error(`Decision must be UNDER_REVIEW or CHALLENGED to approve. Current: ${decision.status}`);
    }

    // Segregation of Duties (SoD) Guard
    if (decision.enforceSoD && decision.creatorId === approverId) {
      throw new Error(`Segregation of Duties Violation: Decision creator (${approverId}) cannot approve their own decision`);
    }

    // Stale Context Check: verify portfolio state has not drifted since decision creation
    const currentPortfolioHash = this._computePortfolioHash(decision.portfolioId, workspaceId, orgId);
    const isStale = currentPortfolioHash !== decision.portfolioBaselineHash;

    const approvalId = `APP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const approval = {
      approvalId,
      decisionId,
      versionNumber: decision.currentVersion,
      approverId,
      approverRole,
      status: isStale ? ApprovalStatus.STALE : ApprovalStatus.APPROVED,
      isStale,
      conditions: conditions || [],
      portfolioBaselineHash: currentPortfolioHash,
      createdAt: now
    };

    this.approvals.set(`${decisionId}:${approvalId}`, approval);

    if (!isStale) {
      decision.status = WorkbenchDecisionStatus.APPROVED;
      decision.updatedAt = now;
    }

    return approval;
  }

  _invalidateApprovals(decisionId, reason) {
    for (const [key, app] of this.approvals.entries()) {
      if (key.startsWith(`${decisionId}:`) && app.status === ApprovalStatus.APPROVED) {
        app.status = ApprovalStatus.STALE;
        app.staleReason = reason;
        app.invalidatedAt = new Date().toISOString();
      }
    }
  }

  listApprovals(decisionId) {
    const list = [];
    for (const [key, app] of this.approvals.entries()) {
      if (key.startsWith(`${decisionId}:`)) {
        list.push(app);
      }
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // =========================================================================
  // Implementation Handoff
  // =========================================================================

  recordImplementation(decisionId, { actorId, executionNotes = '' }, workspaceId = null, orgId = null) {
    const decision = this.decisions.get(decisionId);
    if (!decision) throw new Error(`Decision ${decisionId} not found`);

    if (orgId && decision.orgId !== orgId) throw new Error('IDOR Violation: Organization mismatch');
    if (workspaceId && decision.workspaceId !== workspaceId) throw new Error('IDOR Violation: Workspace mismatch');

    if (decision.status !== WorkbenchDecisionStatus.APPROVED && decision.status !== WorkbenchDecisionStatus.IMPLEMENTATION_PENDING) {
      throw new Error(`Cannot implement decision in status ${decision.status}. Must be APPROVED or IMPLEMENTATION_PENDING`);
    }

    const latestApproval = this.listApprovals(decisionId)[0];
    if (!latestApproval || latestApproval.status !== ApprovalStatus.APPROVED) {
      throw new Error('Cannot implement decision without an active, non-stale human authorization');
    }

    const now = new Date().toISOString();
    decision.status = WorkbenchDecisionStatus.IMPLEMENTED;
    decision.implementation = {
      status: ImplementationStatus.EXECUTED,
      actorId,
      executionNotes,
      implementedAt: now
    };
    decision.updatedAt = now;

    return this.getDecisionById(decisionId, workspaceId, orgId);
  }

  // =========================================================================
  // Sealed Point-in-Time Snapshots
  // =========================================================================

  saveSnapshot(decisionId, payload = {}, workspaceId = null, orgId = null) {
    const decision = this.getDecisionById(decisionId, workspaceId, orgId);
    if (!decision) throw new Error(`Decision ${decisionId} not found`);

    const snapshotId = payload.snapshotId || `SNAP-DEC-${decisionId}-${Date.now()}`;
    const asOf = payload.asOf || new Date().toISOString();

    const rawSnapshot = {
      snapshotId,
      decisionId,
      orgId: decision.orgId,
      workspaceId: decision.workspaceId,
      portfolioId: decision.portfolioId,
      ticker: decision.ticker,
      title: decision.title,
      status: decision.status,
      version: decision.version,
      reviews: decision.reviews,
      approvals: decision.approvals,
      currentPosition: decision.currentPosition,
      proposedPosition: decision.proposedPosition,
      analytics: payload.analytics || null,
      asOf,
      createdAt: new Date().toISOString()
    };

    const integrityHash = computeDeterministicHash(rawSnapshot);
    const sealedSnapshot = {
      ...rawSnapshot,
      integrityHash,
      isSealed: true
    };

    const key = `${decisionId}:${snapshotId}`;
    this.snapshots.set(key, sealedSnapshot);

    return JSON.parse(JSON.stringify(sealedSnapshot));
  }

  getSnapshotById(decisionId, snapshotId, workspaceId = null, orgId = null) {
    const key = `${decisionId}:${snapshotId}`;
    const snapshot = this.snapshots.get(key);
    if (!snapshot) return null;

    if (orgId && snapshot.orgId !== orgId) return null;
    if (workspaceId && snapshot.workspaceId !== workspaceId) return null;

    return JSON.parse(JSON.stringify(snapshot));
  }

  listSnapshots(decisionId, workspaceId = null, orgId = null) {
    const list = [];
    for (const [key, snap] of this.snapshots.entries()) {
      if (key.startsWith(`${decisionId}:`)) {
        if (!orgId || snap.orgId === orgId) {
          if (!workspaceId || snap.workspaceId === workspaceId) {
            list.push(snap);
          }
        }
      }
    }
    return list.sort((a, b) => new Date(b.asOf) - new Date(a.asOf));
  }

  getSnapshotAsOf(decisionId, asOfTimestamp, workspaceId = null, orgId = null) {
    const snapshots = this.listSnapshots(decisionId, workspaceId, orgId);
    if (snapshots.length === 0) return null;

    const targetTime = new Date(asOfTimestamp).getTime();
    if (isNaN(targetTime)) return null;

    const valid = snapshots
      .filter(s => new Date(s.asOf).getTime() <= targetTime)
      .sort((a, b) => new Date(b.asOf).getTime() - new Date(a.asOf).getTime());

    return valid.length > 0 ? valid[0] : null;
  }
}

export const decisionWorkbenchRepository = new DecisionWorkbenchRepository();
export default decisionWorkbenchRepository;
