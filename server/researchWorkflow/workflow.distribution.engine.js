import crypto from 'crypto';
import {
  DistributionChannel,
  AcknowledgementStatus,
  WorkflowRole,
  ReviewStatus
} from './workflow.types.js';
import { defaultWorkflowStore } from './workflow.store.js';
import { defaultReviewEngine } from './workflow.review.engine.js';
import { defaultAuditEngine } from './workflow.audit.engine.js';

export class WorkflowDistributionEngine {
  constructor(store = defaultWorkflowStore, reviewEngine = defaultReviewEngine, auditEngine = defaultAuditEngine) {
    this.store = store;
    this.reviewEngine = reviewEngine;
    this.auditEngine = auditEngine;
  }

  /**
   * Publish an Approved Research Product
   */
  publishResearch({
    tenantId,
    researchProductId,
    researchVersion = 1,
    approvalId,
    publisherId,
    publisherRole,
    isAi = false,
    packageHash,
    currentDependencies = {}
  }) {
    if (isAi) {
      throw new Error('AI cannot publish research products.');
    }
    if (![WorkflowRole.PORTFOLIO_MANAGER, WorkflowRole.EDITOR, WorkflowRole.ADMIN].includes(publisherRole)) {
      throw new Error(`Role ${publisherRole} is unauthorized to publish research.`);
    }

    // Verify approval exists
    const approval = this.store.getEntityAsOf(tenantId, 'approvals', approvalId);
    if (!approval) {
      throw new Error(`Approval ${approvalId} not found.`);
    }
    if (approval.decision !== 'APPROVED') {
      throw new Error(`Cannot publish research with approval decision: ${approval.decision}`);
    }

    // Verify freshness of approval (Stale Approval Check)
    const freshness = this.reviewEngine.checkApprovalFreshness(tenantId, approvalId, currentDependencies);
    if (!freshness.isFresh) {
      throw new Error(`Publication blocked: Approval is STALE (${freshness.reasons.join('; ')}). Re-review required.`);
    }

    const publicationId = `pub_${crypto.randomBytes(8).toString('hex')}`;
    const pubRecord = {
      publicationId,
      tenantId,
      researchProductId,
      researchVersion,
      approvalId,
      publisherId,
      publisherRole,
      packageHash,
      publishedAt: new Date().toISOString()
    };

    const savedPub = this.store.savePublication(pubRecord);

    // Transition review state to PUBLISHED
    this.reviewEngine.transitionReview({
      tenantId,
      reviewId: approval.reviewId,
      researchProductId,
      researchVersion,
      nextStatus: ReviewStatus.PUBLISHED,
      actorId: publisherId,
      actorRole: publisherRole,
      isAi: false,
      rationale: `Published by ${publisherId}`
    });

    this.auditEngine.logEvent({
      tenantId,
      action: 'RESEARCH_PUBLISHED',
      actorId: publisherId,
      targetEntity: 'PUBLICATION',
      targetId: publicationId,
      researchProductId,
      researchVersion,
      details: { approvalId, packageHash }
    });

    return savedPub;
  }

  /**
   * Distribute Published Research to a Channel / Recipient
   */
  distributeResearch({
    tenantId,
    publicationId,
    channel,
    recipientId,
    distributorId,
    requiresAcknowledgement = false,
    ackDueAt = null
  }) {
    if (!tenantId || !publicationId || !channel || !recipientId || !distributorId) {
      throw new Error('Distribution requires tenantId, publicationId, channel, recipientId, and distributorId');
    }
    if (!Object.values(DistributionChannel).includes(channel)) {
      throw new Error(`Invalid distribution channel: ${channel}`);
    }

    const publication = this.store.getEntityAsOf(tenantId, 'publications', publicationId);
    if (!publication) {
      throw new Error(`Publication ${publicationId} not found`);
    }

    const distributionId = `dist_${crypto.randomBytes(8).toString('hex')}`;
    const distRecord = {
      distributionId,
      tenantId,
      publicationId,
      researchProductId: publication.researchProductId,
      researchVersion: publication.researchVersion,
      channel,
      recipientId,
      distributorId,
      packageHash: publication.packageHash,
      requiresAcknowledgement,
      distributedAt: new Date().toISOString()
    };

    const savedDist = this.store.saveDistribution(distRecord);

    this.auditEngine.logEvent({
      tenantId,
      action: 'RESEARCH_DISTRIBUTED',
      actorId: distributorId,
      targetEntity: 'DISTRIBUTION',
      targetId: distributionId,
      researchProductId: publication.researchProductId,
      researchVersion: publication.researchVersion,
      details: { channel, recipientId, requiresAcknowledgement }
    });

    // Create acknowledgement requirement if requested
    let createdAck = null;
    if (requiresAcknowledgement) {
      const acknowledgementId = `ack_${crypto.randomBytes(8).toString('hex')}`;
      const ackRecord = {
        acknowledgementId,
        tenantId,
        publicationId,
        distributionId,
        researchProductId: publication.researchProductId,
        researchVersion: publication.researchVersion,
        userId: recipientId,
        status: AcknowledgementStatus.REQUIRED,
        requiredAt: new Date().toISOString(),
        dueAt: ackDueAt
      };
      createdAck = this.store.saveAcknowledgement(ackRecord);

      this.auditEngine.logEvent({
        tenantId,
        action: 'ACKNOWLEDGEMENT_REQUIRED_CREATED',
        actorId: distributorId,
        targetEntity: 'ACKNOWLEDGEMENT',
        targetId: acknowledgementId,
        researchProductId: publication.researchProductId,
        researchVersion: publication.researchVersion,
        details: { recipientId, dueAt: ackDueAt }
      });
    }

    return {
      distribution: savedDist,
      acknowledgement: createdAck
    };
  }

  /**
   * Submit Acknowledgement by Recipient
   */
  acknowledgeResearch({
    tenantId,
    acknowledgementId,
    userId,
    notes = ''
  }) {
    const existing = this.store.getEntityAsOf(tenantId, 'acknowledgements', acknowledgementId);
    if (!existing) {
      throw new Error(`Acknowledgement ${acknowledgementId} not found`);
    }
    if (existing.userId !== userId) {
      throw new Error(`User ${userId} cannot acknowledge on behalf of ${existing.userId}`);
    }

    const updated = {
      ...existing,
      status: AcknowledgementStatus.ACKNOWLEDGED,
      acknowledgedAt: new Date().toISOString(),
      notes
    };

    const savedAck = this.store.saveAcknowledgement(updated);

    this.auditEngine.logEvent({
      tenantId,
      action: 'RESEARCH_ACKNOWLEDGED',
      actorId: userId,
      targetEntity: 'ACKNOWLEDGEMENT',
      targetId: acknowledgementId,
      researchProductId: existing.researchProductId,
      researchVersion: existing.researchVersion,
      details: { notes }
    });

    return savedAck;
  }
}

export const defaultDistributionEngine = new WorkflowDistributionEngine();
