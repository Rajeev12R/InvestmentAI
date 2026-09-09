import { FreshnessState, PriorityLevel, TaskType } from './workflow.types.js';
import { defaultWorkflowStore } from './workflow.store.js';
import { defaultAssignmentEngine } from './workflow.assignment.engine.js';
import { defaultAuditEngine } from './workflow.audit.engine.js';

export class WorkflowStaleResearchEngine {
  constructor(store = defaultWorkflowStore, assignmentEngine = defaultAssignmentEngine, auditEngine = defaultAuditEngine) {
    this.store = store;
    this.assignmentEngine = assignmentEngine;
    this.auditEngine = auditEngine;
  }

  /**
   * Evaluate Research Product Freshness against current environment and upstream events
   */
  evaluateFreshness({
    researchProduct,
    asOf = new Date().toISOString(),
    upstreamEvents = [], // e.g., [{ type: 'RESTATEMENT' }, { type: 'EARNINGS_SURPRISE' }, { type: 'MACRO_REGIME_CHANGE' }]
    maxAgeDays = 90
  }) {
    if (!researchProduct || !researchProduct.researchProductId) {
      return {
        state: FreshnessState.UNKNOWN,
        isStale: true,
        reasons: ['Invalid or missing research product']
      };
    }

    const reasons = [];
    let state = FreshnessState.CURRENT;

    // 1. Check age
    const createdAtMs = new Date(researchProduct.createdAt || researchProduct.publishedAt || asOf).getTime();
    const asOfMs = new Date(asOf).getTime();
    const ageDays = (asOfMs - createdAtMs) / (1000 * 60 * 60 * 24);

    if (ageDays > maxAgeDays) {
      state = FreshnessState.STALE;
      reasons.push(`Research age (${Math.round(ageDays)} days) exceeds freshness threshold of ${maxAgeDays} days`);
    } else if (ageDays > maxAgeDays * 0.7) {
      state = FreshnessState.AGING;
      reasons.push(`Research is approaching staleness limit (${Math.round(ageDays)} days old)`);
    }

    // 2. Check upstream material events
    for (const evt of upstreamEvents) {
      if (['RESTATEMENT', 'THESIS_BREAKER', 'COMPLIANCE_BREACH'].includes(evt.type)) {
        state = FreshnessState.INVALIDATED;
        reasons.push(`Critical upstream event: ${evt.type} (${evt.description || 'Material fundamental shift'})`);
        break;
      }
      if (['EARNINGS_SURPRISE', 'VALUATION_MATERIAL_CHANGE', 'MACRO_REGIME_CHANGE', 'LIQUIDITY_DETERIORATION'].includes(evt.type)) {
        if (state !== FreshnessState.INVALIDATED) {
          state = FreshnessState.STALE;
          reasons.push(`Upstream material change: ${evt.type} (${evt.description || 'Impacts underlying model/thesis'})`);
        }
      }
    }

    return {
      researchProductId: researchProduct.researchProductId,
      researchVersion: researchProduct.version || 1,
      state,
      isStale: state === FreshnessState.STALE || state === FreshnessState.INVALIDATED,
      ageDays: Math.round(ageDays),
      reasons
    };
  }

  /**
   * Automatically spawn a review task when research becomes stale/invalidated
   */
  handleStaleResearchAlert({
    tenantId,
    researchProduct,
    upstreamEvents = [],
    creatorId = 'SYSTEM_CHANGE_ENGINE',
    asOf = new Date().toISOString()
  }) {
    const freshness = this.evaluateFreshness({ researchProduct, asOf, upstreamEvents });

    if (freshness.isStale) {
      const priority = freshness.state === FreshnessState.INVALIDATED ? PriorityLevel.CRITICAL : PriorityLevel.HIGH;
      
      const createdTask = this.assignmentEngine.createTask({
        tenantId,
        researchProductId: researchProduct.researchProductId,
        taskType: freshness.state === FreshnessState.INVALIDATED ? TaskType.UPDATE_THESIS : TaskType.REVIEW_EVIDENCE,
        priority,
        title: `[FRESHNESS ALERT] Research ${freshness.state}: Review required for ${researchProduct.ticker || researchProduct.researchProductId}`,
        description: `Upstream events triggered freshness change: ${freshness.reasons.join('; ')}`,
        createdBy: creatorId
      });

      this.auditEngine.logEvent({
        tenantId,
        action: 'STALE_RESEARCH_TASK_CREATED',
        actorId: creatorId,
        targetEntity: 'RESEARCH_PRODUCT',
        targetId: researchProduct.researchProductId,
        researchProductId: researchProduct.researchProductId,
        researchVersion: researchProduct.version || 1,
        details: { freshness, createdTaskId: createdTask.taskId }
      });

      return {
        freshness,
        taskCreated: true,
        task: createdTask
      };
    }

    return {
      freshness,
      taskCreated: false,
      task: null
    };
  }
}

export const defaultStaleEngine = new WorkflowStaleResearchEngine();
