import { defaultWorkflowStore } from './workflow.store.js';
import { defaultAssignmentEngine } from './workflow.assignment.engine.js';
import { defaultStaleEngine } from './workflow.stale.engine.js';
import { defaultAuditEngine } from './workflow.audit.engine.js';

export const workflowCopilotTools = {
  /**
   * Read-only Queue Inspector
   */
  getResearchQueue: async ({ tenantId, userId, userRole, teamIds = [] }) => {
    return defaultAssignmentEngine.getQueues(tenantId, userId, userRole, teamIds);
  },

  /**
   * Get complete workflow state for a research product
   */
  getResearchWorkflow: async ({ tenantId, researchProductId }) => {
    const reviews = defaultWorkflowStore.listEntities(tenantId, 'reviews', r => r.researchProductId === researchProductId);
    const tasks = defaultWorkflowStore.listEntities(tenantId, 'tasks', t => t.researchProductId === researchProductId);
    const comments = defaultWorkflowStore.listEntities(tenantId, 'comments', c => c.researchProductId === researchProductId);
    const questions = defaultWorkflowStore.listEntities(tenantId, 'questions', q => q.researchProductId === researchProductId);
    const approvals = defaultWorkflowStore.listEntities(tenantId, 'approvals', a => a.researchProductId === researchProductId);
    const publications = defaultWorkflowStore.listEntities(tenantId, 'publications', p => p.researchProductId === researchProductId);
    const distributions = defaultWorkflowStore.listEntities(tenantId, 'distributions', d => d.researchProductId === researchProductId);

    return {
      tenantId,
      researchProductId,
      reviews,
      tasks,
      comments,
      questions,
      approvals,
      publications,
      distributions
    };
  },

  /**
   * Get review & audit history
   */
  getReviewHistory: async ({ tenantId, researchProductId }) => {
    const reviews = defaultWorkflowStore.listEntities(tenantId, 'reviews', r => r.researchProductId === researchProductId);
    const approvals = defaultWorkflowStore.listEntities(tenantId, 'approvals', a => a.researchProductId === researchProductId);
    const events = defaultWorkflowStore.listEntities(tenantId, 'events', e => e.researchProductId === researchProductId);

    return {
      tenantId,
      researchProductId,
      reviews,
      approvals,
      events
    };
  },

  /**
   * Get open questions & follow-ups
   */
  getOpenQuestions: async ({ tenantId, researchProductId = null }) => {
    return defaultWorkflowStore.listEntities(tenantId, 'questions', q => {
      const statusOpen = ['OPEN', 'ASSIGNED'].includes(q.status);
      if (researchProductId) {
        return statusOpen && q.researchProductId === researchProductId;
      }
      return statusOpen;
    });
  },

  /**
   * Get Stale/Invalidated research
   */
  getStaleResearch: async ({ tenantId }) => {
    const publications = defaultWorkflowStore.listEntities(tenantId, 'publications');
    return publications.map(p => {
      const freshness = defaultStaleEngine.evaluateFreshness({ researchProduct: p });
      return {
        publicationId: p.publicationId,
        researchProductId: p.researchProductId,
        researchVersion: p.researchVersion,
        freshness
      };
    }).filter(item => item.freshness.isStale);
  },

  /**
   * Get Pending Approvals
   */
  getPendingApprovals: async ({ tenantId }) => {
    return defaultWorkflowStore.listEntities(tenantId, 'reviews', r => 
      ['REVIEW_REQUIRED', 'UNDER_REVIEW', 'RESUBMITTED'].includes(r.status)
    );
  },

  /**
   * Get Outstanding Acknowledgements
   */
  getAcknowledgementStatus: async ({ tenantId, userId = null }) => {
    return defaultWorkflowStore.listEntities(tenantId, 'acknowledgements', a => {
      if (userId) {
        return a.userId === userId;
      }
      return true;
    });
  },

  /**
   * Explain a workflow audit event
   */
  explainWorkflowEvent: async ({ tenantId, eventId }) => {
    const event = defaultWorkflowStore.getEntityAsOf(tenantId, 'events', eventId);
    if (!event) return { found: false, explanation: `Event ${eventId} not found.` };

    return {
      found: true,
      eventId: event.eventId,
      action: event.action,
      actorId: event.actorId,
      timestamp: event.timestamp,
      targetEntity: event.targetEntity,
      targetId: event.targetId,
      explanation: `Workflow action ${event.action} was executed by actor ${event.actorId} on target ${event.targetEntity}:${event.targetId} at ${event.timestamp}.`
    };
  }
};
