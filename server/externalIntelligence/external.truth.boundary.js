import crypto from 'crypto';
import { VerificationStatus, computeExternalHash } from './external.types.js';
import { defaultExternalStore } from './external.store.js';

export class ExternalTruthBoundaryEngine {
  constructor(store = defaultExternalStore) {
    this.store = store;
  }

  /**
   * Create an External Truth Update Candidate
   * External data NEVER directly mutates Truth facts; it creates a promotion candidate.
   */
  createPromotionCandidate(tenantId = 'tenant_default', {
    targetFactId,
    observationIds = [],
    proposedValue,
    derivation = 'ALTERNATIVE_SIGNAL_SYNTHESIS',
    verificationStatus = VerificationStatus.UNVERIFIED,
    createdBy
  }) {
    if (!targetFactId || !observationIds || observationIds.length === 0 || proposedValue === undefined) {
      throw new Error('createPromotionCandidate requires targetFactId, observationIds, and proposedValue');
    }

    const candidateId = `cand_truth_${crypto.randomBytes(8).toString('hex')}`;
    const candidateRecord = {
      candidateId,
      targetFactId,
      observationIds: [...observationIds],
      proposedValue,
      derivation,
      verificationStatus,
      reviewStatus: 'PENDING_HUMAN_REVIEW',
      promotedAt: null,
      promotedBy: null,
      createdBy: createdBy || 'SYSTEM',
      createdAt: new Date().toISOString()
    };

    return this.store.saveCandidate(tenantId, candidateRecord);
  }

  /**
   * Human Promotion Gate
   * Promotes candidate only if authorized human reviewer signs off AND verification meets criteria.
   */
  promoteCandidateToTruth(tenantId = 'tenant_default', candidateId, {
    reviewerId,
    reviewerRole,
    isAi = false,
    decision = 'PROMOTED', // 'PROMOTED' or 'REJECTED'
    rationale
  }) {
    if (isAi) {
      throw new Error('AI cannot promote external observation candidates to authoritative Truth facts.');
    }
    if (!['PORTFOLIO_MANAGER', 'EDITOR', 'ADMIN'].includes(reviewerRole)) {
      throw new Error(`Role ${reviewerRole} is unauthorized to promote external candidates to Truth.`);
    }

    const candidate = this.store.getEntityAsOf(tenantId, 'candidates', candidateId);
    if (!candidate) throw new Error(`Promotion candidate ${candidateId} not found`);

    if (decision === 'PROMOTED') {
      // Must be backed by primary/regulatory verified observations
      const obsList = candidate.observationIds.map(id => this.store.getEntityAsOf(tenantId, 'observations', id)).filter(Boolean);
      const hasVerifiedSource = obsList.some(obs => {
        const src = this.store.getEntityAsOf(tenantId, 'sources', obs.sourceId);
        return src && (src.verificationStatus === VerificationStatus.VERIFIED_PRIMARY || src.verificationStatus === VerificationStatus.VERIFIED_REGULATORY);
      });

      if (!hasVerifiedSource && candidate.verificationStatus !== VerificationStatus.VERIFIED_PRIMARY && candidate.verificationStatus !== VerificationStatus.VERIFIED_REGULATORY) {
        throw new Error('Promotion rejected: Candidate lacks VERIFIED_PRIMARY or VERIFIED_REGULATORY source evidence.');
      }
    }

    const updated = {
      ...candidate,
      reviewStatus: decision,
      promotedAt: decision === 'PROMOTED' ? new Date().toISOString() : null,
      promotedBy: reviewerId,
      reviewerRole,
      rationale: rationale || 'Promoted following human truth verification'
    };

    return this.store.saveCandidate(tenantId, updated);
  }
}

export const defaultTruthBoundary = new ExternalTruthBoundaryEngine();
