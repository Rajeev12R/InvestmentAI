import crypto from 'crypto';
import { ReviewStatus, WorkflowRole, deepFreeze, computeWorkflowHash } from './workflow.types.js';
import { defaultWorkflowStore } from './workflow.store.js';
import { defaultAuditEngine } from './workflow.audit.engine.js';

// Strict State Transition Graph
const ALLOWED_TRANSITIONS = {
  [ReviewStatus.DRAFT]: [ReviewStatus.VALIDATED, ReviewStatus.CANCELLED],
  [ReviewStatus.VALIDATED]: [ReviewStatus.REVIEW_REQUIRED, ReviewStatus.DRAFT],
  [ReviewStatus.REVIEW_REQUIRED]: [ReviewStatus.UNDER_REVIEW, ReviewStatus.CHANGES_REQUESTED],
  [ReviewStatus.UNDER_REVIEW]: [ReviewStatus.CHANGES_REQUESTED, ReviewStatus.HUMAN_APPROVED, ReviewStatus.REJECTED],
  [ReviewStatus.CHANGES_REQUESTED]: [ReviewStatus.RESUBMITTED, ReviewStatus.DRAFT],
  [ReviewStatus.RESUBMITTED]: [ReviewStatus.UNDER_REVIEW, ReviewStatus.HUMAN_APPROVED, ReviewStatus.CHANGES_REQUESTED],
  [ReviewStatus.HUMAN_APPROVED]: [ReviewStatus.PUBLISHED, ReviewStatus.CHANGES_REQUESTED, ReviewStatus.REJECTED],
  [ReviewStatus.PUBLISHED]: [ReviewStatus.SUPERSEDED],
  [ReviewStatus.REJECTED]: [ReviewStatus.DRAFT, ReviewStatus.RESUBMITTED],
  [ReviewStatus.SUPERSEDED]: []
};

export class WorkflowReviewEngine {
  constructor(store = defaultWorkflowStore, auditEngine = defaultAuditEngine) {
    this.store = store;
    this.auditEngine = auditEngine;
  }

  /**
   * Validate if a state transition is permitted
   */
  canTransition(currentStatus, nextStatus) {
    if (!currentStatus || !nextStatus) return false;
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    return allowed.includes(nextStatus);
  }

  /**
   * Create or update a review workflow record
   */
  transitionReview({
    tenantId,
    reviewId,
    researchProductId,
    researchVersion,
    nextStatus,
    actorId,
    actorRole,
    isAi = false,
    rationale = '',
    referencedClaims = [],
    referencedEvidence = []
  }) {
    if (isAi && (nextStatus === ReviewStatus.HUMAN_APPROVED || nextStatus === ReviewStatus.PUBLISHED)) {
      throw new Error('Non-Negotiable Invariant Violation: AI cannot approve or publish research.');
    }

    const existing = this.store.getEntityAsOf(tenantId, 'reviews', reviewId);
    const currentStatus = existing ? existing.status : ReviewStatus.DRAFT;

    // Check transition
    if (existing) {
      if (!this.canTransition(currentStatus, nextStatus)) {
        throw new Error(`Invalid review transition from ${currentStatus} to ${nextStatus}`);
      }
    } else {
      if (nextStatus === ReviewStatus.PUBLISHED || nextStatus === ReviewStatus.SUPERSEDED) {
        throw new Error(`Invalid review transition from ${currentStatus} to ${nextStatus}`);
      }
    }

    const reviewRecord = {
      reviewId: reviewId || `rev_${crypto.randomBytes(8).toString('hex')}`,
      tenantId,
      researchProductId,
      researchVersion: researchVersion || 1,
      status: nextStatus,
      updatedBy: actorId,
      updatedAt: new Date().toISOString(),
      rationale,
      referencedClaims: Array.isArray(referencedClaims) ? [...referencedClaims] : [],
      referencedEvidence: Array.isArray(referencedEvidence) ? [...referencedEvidence] : []
    };

    const saved = this.store.saveReview(reviewRecord);

    this.auditEngine.logEvent({
      tenantId,
      action: `REVIEW_STATUS_CHANGED_${nextStatus}`,
      actorId,
      targetEntity: 'REVIEW',
      targetId: saved.reviewId,
      researchProductId,
      researchVersion,
      details: { previousStatus: currentStatus, nextStatus, rationale }
    });

    return saved;
  }

  /**
   * Human Approval Gate
   */
  submitHumanApproval({
    tenantId,
    reviewId,
    researchProductId,
    researchVersion,
    reviewerId,
    reviewerRole,
    isAi = false,
    decision = 'APPROVED',
    rationale,
    packageHash,
    evidenceSnapshotHash = '',
    contextHash = '',
    graphVersion = '1.0',
    modelVersions = {}
  }) {
    if (isAi) {
      throw new Error('AI cannot submit human approvals.');
    }
    if (![WorkflowRole.PORTFOLIO_MANAGER, WorkflowRole.EDITOR, WorkflowRole.ADMIN].includes(reviewerRole)) {
      throw new Error(`Role ${reviewerRole} is unauthorized to approve research. Requires EDITOR, PORTFOLIO_MANAGER, or ADMIN.`);
    }
    if (!packageHash || typeof packageHash !== 'string') {
      throw new Error('packageHash is required to seal an approval.');
    }
    if (!rationale || typeof rationale !== 'string' || rationale.trim().length === 0) {
      throw new Error('Approval rationale is mandatory.');
    }

    // If review doesn't exist yet, initialize it under review
    const existing = this.store.getEntityAsOf(tenantId, 'reviews', reviewId);
    if (!existing) {
      this.transitionReview({
        tenantId,
        reviewId,
        researchProductId,
        researchVersion,
        nextStatus: ReviewStatus.UNDER_REVIEW,
        actorId: reviewerId,
        actorRole: reviewerRole,
        isAi: false,
        rationale: 'Initialized for review'
      });
    }

    // Must transition review state machine to HUMAN_APPROVED or REJECTED or CHANGES_REQUESTED
    const nextStatus = decision === 'APPROVED' ? ReviewStatus.HUMAN_APPROVED :
      (decision === 'REJECTED' ? ReviewStatus.REJECTED : ReviewStatus.CHANGES_REQUESTED);

    const updatedReview = this.transitionReview({
      tenantId,
      reviewId,
      researchProductId,
      researchVersion,
      nextStatus,
      actorId: reviewerId,
      actorRole: reviewerRole,
      isAi: false,
      rationale
    });

    const approvalId = `appr_${crypto.randomBytes(8).toString('hex')}`;
    const approvalRecord = {
      approvalId,
      tenantId,
      reviewId: updatedReview.reviewId,
      researchProductId,
      researchVersion,
      reviewerId,
      reviewerRole,
      decision,
      rationale,
      packageHash,
      evidenceSnapshotHash,
      contextHash,
      graphVersion,
      modelVersions,
      approvedAt: new Date().toISOString()
    };

    const savedApproval = this.store.saveApproval(approvalRecord);

    this.auditEngine.logEvent({
      tenantId,
      action: `RESEARCH_HUMAN_${decision}`,
      actorId: reviewerId,
      targetEntity: 'APPROVAL',
      targetId: approvalId,
      researchProductId,
      researchVersion,
      details: { decision, packageHash, rationale }
    });

    return savedApproval;
  }

  /**
   * Stale Approval Detection
   * Evaluates if any dependency (packageHash, modelVersions, evidence) has changed since approval
   */
  checkApprovalFreshness(tenantId, approvalId, currentDependencies = {}) {
    const approval = this.store.getEntityAsOf(tenantId, 'approvals', approvalId);
    if (!approval) throw new Error(`Approval ${approvalId} not found`);

    const isStale = (
      (currentDependencies.packageHash && currentDependencies.packageHash !== approval.packageHash) ||
      (currentDependencies.evidenceSnapshotHash && currentDependencies.evidenceSnapshotHash !== approval.evidenceSnapshotHash) ||
      (currentDependencies.graphVersion && currentDependencies.graphVersion !== approval.graphVersion)
    );

    return {
      approvalId,
      isFresh: !isStale,
      status: isStale ? 'STALE_APPROVAL' : 'VALID_APPROVAL',
      approvalTimestamp: approval.approvedAt,
      reasons: isStale ? ['Dependencies or package hash mutated post-approval. Re-review mandatory.'] : []
    };
  }
}

export const defaultReviewEngine = new WorkflowReviewEngine();
