/**
 * @file audit.engine.js
 * Institutional Audit Trail Engine for Phase 9.
 * Links decisions, snapshots, reviews, approvals, and user operations.
 */

import { auditRepository } from './audit.repository.js';
import { AuditAction, AuditResult } from './audit.types.js';

export class AuditEngine {
  constructor(repo = auditRepository) {
    this.repo = repo;
  }

  logEvent(params) {
    return this.repo.appendEvent(params);
  }

  logAuthEvent({ workspaceId = 'default', userId, action, result, metadata = {}, requestId }) {
    return this.repo.appendEvent({
      workspaceId,
      actorId: userId,
      actorType: 'USER',
      action,
      resourceType: 'AUTH',
      resourceId: userId,
      result,
      metadata,
      requestId
    });
  }

  logDecisionReviewApproval({
    workspaceId,
    actorId,
    reviewId,
    ticker,
    decision,
    attentionId,
    truthPackageHash,
    snapshotId,
    actionApproved,
    metadata = {}
  }) {
    return this.repo.appendEvent({
      workspaceId,
      actorId,
      actorType: 'USER',
      action: AuditAction.DECISION_ACTION_APPROVED,
      resourceType: 'DECISION_REVIEW',
      resourceId: reviewId,
      result: AuditResult.SUCCESS,
      metadata: {
        ticker,
        decision,
        attentionId,
        truthPackageHash,
        snapshotId,
        actionApproved,
        isTradeExecuted: false, // Invariant: trades are never executed automatically
        ...metadata
      }
    });
  }

  logCopilotAccess({ workspaceId, actorId, ticker, intent, contextHash, conversationId }) {
    return this.repo.appendEvent({
      workspaceId,
      actorId,
      actorType: 'USER',
      action: AuditAction.COPILOT_QUERY_EXECUTED,
      resourceType: 'COPILOT_CONVERSATION',
      resourceId: conversationId,
      result: AuditResult.SUCCESS,
      metadata: {
        ticker,
        intent,
        contextHash
      }
    });
  }

  listAuditEvents({ workspaceId, limit = 100, action = null, actorId = null }) {
    return this.repo.listEvents({ workspaceId, limit, action, actorId });
  }

  verifyIntegrity() {
    return this.repo.verifyChainIntegrity();
  }
}

export const auditEngine = new AuditEngine();
