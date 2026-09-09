/**
 * @file retention.engine.js
 * Configurable Data Retention Engine for Phase 9 Institutional Governance.
 */

import { RetentionCategory } from './audit.types.js';
import { auditRepository } from './audit.repository.js';

export class RetentionEngine {
  constructor() {
    this.policies = new Map(); // workspaceId -> policies
    this._initDefaultPolicies();
  }

  _initDefaultPolicies() {
    this.defaultPolicy = {
      [RetentionCategory.FINANCIAL_TRUTH]: { retentionDays: 3650, immutable: true, autoPurge: false }, // 10 years, immutable
      [RetentionCategory.AUDIT_LOGS]: { retentionDays: 2555, immutable: true, autoPurge: false }, // 7 years, immutable
      [RetentionCategory.RAW_SOURCE_RECORDS]: { retentionDays: 365, immutable: false, autoPurge: false },
      [RetentionCategory.RESEARCH_CONVERSATIONS]: { retentionDays: 730, immutable: false, autoPurge: false },
      [RetentionCategory.JOB_RECORDS]: { retentionDays: 90, immutable: false, autoPurge: true },
      [RetentionCategory.TEMPORARY_ARTIFACTS]: { retentionDays: 30, immutable: false, autoPurge: true }
    };
  }

  getWorkspacePolicy(workspaceId = 'default') {
    return this.policies.get(workspaceId) || this.defaultPolicy;
  }

  updateWorkspacePolicy(workspaceId, category, policyUpdate, actorId = 'SYSTEM') {
    if (!RetentionCategory[category]) {
      throw new Error(`Invalid retention category: ${category}`);
    }

    const current = { ...this.getWorkspacePolicy(workspaceId) };
    if (current[category]?.immutable && policyUpdate.retentionDays < current[category].retentionDays) {
      throw new Error(`Cannot reduce retention period for immutable category '${category}'`);
    }

    current[category] = { ...current[category], ...policyUpdate };
    this.policies.set(workspaceId, current);

    auditRepository.appendEvent({
      workspaceId,
      actorId,
      actorType: 'USER',
      action: 'retention.policy_executed',
      resourceType: 'RETENTION_POLICY',
      resourceId: category,
      result: 'SUCCESS',
      metadata: { category, policy: current[category] }
    });

    return current[category];
  }

  evaluateRetention(workspaceId = 'default', category, recordTimestamp) {
    const policy = this.getWorkspacePolicy(workspaceId)[category];
    if (!policy) return { shouldRetain: true, reason: 'No policy found' };

    const recordAgeDays = (Date.now() - new Date(recordTimestamp).getTime()) / (1000 * 60 * 60 * 24);
    const shouldRetain = recordAgeDays <= policy.retentionDays;

    return {
      category,
      recordAgeDays: Math.floor(recordAgeDays),
      retentionDays: policy.retentionDays,
      shouldRetain,
      isImmutable: policy.immutable || false
    };
  }
}

export const retentionEngine = new RetentionEngine();
