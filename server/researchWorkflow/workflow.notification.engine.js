import crypto from 'crypto';
import { defaultWorkflowStore } from './workflow.store.js';
import { defaultAuditEngine } from './workflow.audit.engine.js';

export class WorkflowNotificationEngine {
  constructor(store = defaultWorkflowStore, auditEngine = defaultAuditEngine) {
    this.store = store;
    this.auditEngine = auditEngine;
    // Map of deduplication key -> lastNotifiedTimestampMs
    this.dedupLedger = new Map();
    this.dedupWindowMs = 5 * 60 * 1000; // 5 minutes deduplication window
  }

  /**
   * Register a subscription
   */
  subscribe({
    tenantId,
    subscriberId,
    subscriberType = 'USER', // 'USER' or 'TEAM'
    targetType, // 'SECURITY', 'PORTFOLIO', 'RESEARCH_PRODUCT', 'THESIS', 'EARNINGS', 'MACRO', 'RISK', 'COMPLIANCE'
    targetId,
    minSeverity = 'LOW'
  }) {
    if (!tenantId || !subscriberId || !targetType || !targetId) {
      throw new Error('Subscription requires tenantId, subscriberId, targetType, and targetId');
    }

    const subscriptionId = `sub_${crypto.randomBytes(8).toString('hex')}`;
    const subRecord = {
      subscriptionId,
      tenantId,
      subscriberId,
      subscriberType,
      targetType,
      targetId,
      minSeverity,
      createdAt: new Date().toISOString()
    };

    const saved = this.store.saveSubscription(subRecord);

    this.auditEngine.logEvent({
      tenantId,
      action: 'SUBSCRIPTION_CREATED',
      actorId: subscriberId,
      targetEntity: 'SUBSCRIPTION',
      targetId: subscriptionId,
      details: { targetType, targetId, minSeverity }
    });

    return saved;
  }

  /**
   * Evaluate whether a notification should be generated or suppressed
   */
  evaluateNotification({
    tenantId,
    event,
    targetType,
    targetId,
    severity = 'MEDIUM',
    recipientId,
    userPermissions = []
  }) {
    if (!tenantId || !recipientId) {
      return {
        decision: 'SUPPRESSED',
        reason: 'Missing tenantId or recipientId'
      };
    }

    // 1. Permission Check
    if (userPermissions.length > 0 && !userPermissions.includes('VIEW') && !userPermissions.includes('ANALYST') && !userPermissions.includes('ADMIN')) {
      return {
        decision: 'SUPPRESSED',
        reason: 'Recipient lacks permissions to view this event'
      };
    }

    // 2. Subscription Matching Check
    const subs = this.store.listEntities(tenantId, 'subscriptions', s => 
      s.subscriberId === recipientId && s.targetType === targetType && (s.targetId === '*' || s.targetId === targetId)
    );

    const isSubscribed = subs.length > 0;
    const isDirectAssignment = event.assignedTo === recipientId;

    if (!isSubscribed && !isDirectAssignment && severity !== 'CRITICAL') {
      return {
        decision: 'SUPPRESSED',
        reason: 'Recipient is not subscribed to target and event is not critical or directly assigned'
      };
    }

    // 3. Deduplication Check
    const dedupKey = `${tenantId}:${recipientId}:${targetType}:${targetId}:${event.action || event.type || 'DEFAULT'}`;
    const now = Date.now();
    const lastNotified = this.dedupLedger.get(dedupKey) || 0;

    if (now - lastNotified < this.dedupWindowMs && severity !== 'CRITICAL') {
      return {
        decision: 'SUPPRESSED',
        reason: 'Deduplicated: Identical notification delivered within recent suppression window',
        dedupKey
      };
    }

    // Record delivery timestamp
    this.dedupLedger.set(dedupKey, now);

    return {
      decision: 'REQUIRED',
      recipientId,
      tenantId,
      targetType,
      targetId,
      severity,
      reason: isDirectAssignment ? 'Direct assignment' : (severity === 'CRITICAL' ? 'Critical severity broadcast' : 'Active subscription match'),
      timestamp: new Date().toISOString()
    };
  }
}

export const defaultNotificationEngine = new WorkflowNotificationEngine();
