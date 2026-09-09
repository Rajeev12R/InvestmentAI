/**
 * server/earnings/earnings.thesis.engine.js
 * 
 * Phase 21: Thesis Catalyst & Breaker Impact Engine (Phase 4/8/13 Integration)
 * Evaluates earnings against investment thesis pillars, catalysts, and breaker conditions.
 * Prevents AI from silently rewriting investment theses.
 */

import { EventClassification } from './earnings.types.js';

export function evaluateEarningsThesisImpact(investmentThesis, earningsEvidence) {
  if (!investmentThesis || typeof investmentThesis !== 'object') {
    return {
      hasThesis: false,
      thesisStatus: 'NO_THESIS_DEFINED',
      classification: EventClassification.UNAVAILABLE
    };
  }

  const thesisPillars = investmentThesis.pillars || [];
  const breakers = investmentThesis.breakers || [];

  const triggeredBreakers = [];
  const confirmedCatalysts = [];

  // 1. Check Breakers (e.g. Operating Margin < 20% or Revenue Growth < 0%)
  for (const breaker of breakers) {
    if (breaker.condition === 'OPERATING_MARGIN_BELOW' && typeof earningsEvidence.operatingMarginActual === 'number') {
      if (earningsEvidence.operatingMarginActual < breaker.threshold) {
        triggeredBreakers.push({
          breakerId: breaker.id || 'BREAKER_MARGIN',
          description: breaker.description || `Operating margin fell below ${(breaker.threshold * 100)}%`,
          actualValue: earningsEvidence.operatingMarginActual,
          threshold: breaker.threshold,
          status: 'BREAKER_TRIGGERED'
        });
      }
    }
    if (breaker.condition === 'REVENUE_DECLINE' && typeof earningsEvidence.revenueGrowthActual === 'number') {
      if (earningsEvidence.revenueGrowthActual < 0) {
        triggeredBreakers.push({
          breakerId: breaker.id || 'BREAKER_REV_DECLINE',
          description: 'Revenue growth turned negative',
          actualValue: earningsEvidence.revenueGrowthActual,
          status: 'BREAKER_TRIGGERED'
        });
      }
    }
  }

  // 2. Check Catalysts (e.g. Revenue Beat > 5%)
  if (earningsEvidence.revenueSurprisePct && earningsEvidence.revenueSurprisePct > 0.05) {
    confirmedCatalysts.push({
      catalyst: 'EARNINGS_ACCELERATION',
      detail: `Revenue beat expectations by ${(earningsEvidence.revenueSurprisePct * 100).toFixed(2)}%`
    });
  }

  const thesisIntact = triggeredBreakers.length === 0;

  return {
    thesisId: investmentThesis.id || 'THESIS_DEFAULT',
    ticker: investmentThesis.ticker,
    thesisIntact,
    triggeredBreakers,
    confirmedCatalysts,
    implication: thesisIntact ? 'THESIS_CONFIRMED' : 'THESIS_UNDER_PRESSURE',
    requiresHumanReview: triggeredBreakers.length > 0,
    rule: 'AI_CANNOT_SILENTLY_MUTATE_INVESTMENT_THESIS',
    classification: EventClassification.DERIVED
  };
}

export const ThesisLifecycleState = Object.freeze({
  CURRENT_THESIS: 'CURRENT_THESIS',
  CHANGE_PROPOSED: 'CHANGE_PROPOSED',
  HUMAN_REVIEW: 'HUMAN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  NEW_THESIS_VERSION: 'NEW_THESIS_VERSION'
});

export class ThesisStateMachine {
  constructor() {
    // Map<thesisId, Array<ThesisVersionRecord>>
    this.thesisHistory = new Map();
    // Map<thesisId, ProposalRecord>
    this.pendingProposals = new Map();
  }

  registerThesis(tenantId, thesisData) {
    if (!thesisData || !thesisData.id || !thesisData.ticker) {
      throw new Error('Valid thesisData with id and ticker required');
    }
    const versionRecord = Object.freeze({
      version: 1,
      tenantId,
      thesisId: thesisData.id,
      ticker: thesisData.ticker.toUpperCase(),
      pillars: Object.freeze([...(thesisData.pillars || [])]),
      breakers: Object.freeze([...(thesisData.breakers || [])]),
      state: ThesisLifecycleState.CURRENT_THESIS,
      approvedBy: thesisData.approvedBy || 'HUMAN_PORTFOLIO_MANAGER',
      timestamp: new Date().toISOString()
    });

    this.thesisHistory.set(thesisData.id, [versionRecord]);
    return versionRecord;
  }

  getActiveThesis(thesisId) {
    const history = this.thesisHistory.get(thesisId);
    if (!history || history.length === 0) return null;
    return history[history.length - 1];
  }

  getThesisHistory(thesisId) {
    return this.thesisHistory.get(thesisId) || [];
  }

  proposeChange(thesisId, proposal) {
    const active = this.getActiveThesis(thesisId);
    if (!active) throw new Error(`Thesis ${thesisId} not found`);

    const proposalRecord = Object.freeze({
      proposalId: `PROP-${thesisId}-${Date.now()}`,
      thesisId,
      currentVersion: active.version,
      proposedPillars: Object.freeze([...(proposal.pillars || active.pillars)]),
      proposedBreakers: Object.freeze([...(proposal.breakers || active.breakers)]),
      rationale: proposal.rationale || 'Event-driven thesis adjustment',
      evidenceSource: proposal.evidenceSource || null,
      state: ThesisLifecycleState.CHANGE_PROPOSED,
      proposedAt: new Date().toISOString()
    });

    this.pendingProposals.set(thesisId, proposalRecord);
    return proposalRecord;
  }

  submitForReview(thesisId) {
    const prop = this.pendingProposals.get(thesisId);
    if (!prop) throw new Error(`No pending proposal for thesis ${thesisId}`);
    const reviewRecord = Object.freeze({
      ...prop,
      state: ThesisLifecycleState.HUMAN_REVIEW
    });
    this.pendingProposals.set(thesisId, reviewRecord);
    return reviewRecord;
  }

  approveProposal(thesisId, reviewerId) {
    if (!reviewerId || typeof reviewerId !== 'string') {
      throw new Error('Human reviewer authorization is required to approve thesis changes');
    }
    const prop = this.pendingProposals.get(thesisId);
    if (!prop) throw new Error(`No pending proposal for thesis ${thesisId}`);
    if (prop.state !== ThesisLifecycleState.HUMAN_REVIEW && prop.state !== ThesisLifecycleState.CHANGE_PROPOSED) {
      throw new Error(`Cannot approve proposal in state ${prop.state}`);
    }

    const history = this.thesisHistory.get(thesisId);
    const newVersionNum = history.length + 1;

    const newVersion = Object.freeze({
      version: newVersionNum,
      tenantId: history[0].tenantId,
      thesisId,
      ticker: history[0].ticker,
      pillars: prop.proposedPillars,
      breakers: prop.proposedBreakers,
      state: ThesisLifecycleState.CURRENT_THESIS,
      approvedBy: reviewerId,
      priorVersionHash: `V${newVersionNum - 1}`,
      timestamp: new Date().toISOString()
    });

    history.push(newVersion);
    this.pendingProposals.delete(thesisId);
    return newVersion;
  }

  rejectProposal(thesisId, reviewerId, reason) {
    if (!reviewerId) throw new Error('Reviewer ID required to reject proposal');
    const prop = this.pendingProposals.get(thesisId);
    if (!prop) throw new Error(`No pending proposal for thesis ${thesisId}`);

    const rejectedRecord = Object.freeze({
      ...prop,
      state: ThesisLifecycleState.REJECTED,
      rejectedBy: reviewerId,
      reason: reason || 'Rejected by human review',
      rejectedAt: new Date().toISOString()
    });

    this.pendingProposals.delete(thesisId);
    return rejectedRecord;
  }
}

export const defaultThesisStateMachine = new ThesisStateMachine();
