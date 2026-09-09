import { deepFreeze } from './workflow.types.js';
import {
  validateWorkspace,
  validateTeam,
  validateUserMembership,
  validateResearchAssignment,
  validateResearchTask,
  validateReview,
  validateComment,
  validateAnnotation,
  validateQuestion,
  validateFollowUp,
  validateApproval,
  validatePublication,
  validateDistribution,
  validateAcknowledgement,
  validateSubscription,
  validateWatchRule,
  validateWorkflowEvent
} from './workflow.schema.js';

export class WorkflowStore {
  constructor() {
    this.reset();
  }

  reset() {
    // Tenant-isolated tables
    // tenantId -> entityType -> id -> [versioned entries]
    this.tables = new Map();
  }

  _getTenantTable(tenantId, entityType) {
    if (!this.tables.has(tenantId)) {
      this.tables.set(tenantId, new Map());
    }
    const tenantMap = this.tables.get(tenantId);
    if (!tenantMap.has(entityType)) {
      tenantMap.set(entityType, new Map());
    }
    return tenantMap.get(entityType);
  }

  /**
   * Save an entity revision with validation & immutable versioning
   */
  saveEntity(tenantId, entityType, entity, validator) {
    if (!tenantId || typeof tenantId !== 'string') throw new Error('Valid tenantId required');
    const validated = validator ? validator(entity) : entity;
    const table = this._getTenantTable(tenantId, entityType);

    // Explicit canonical entity primary key mapping
    const ENTITY_PRIMARY_KEYS = {
      workspaces: 'workspaceId',
      teams: 'teamId',
      memberships: 'membershipId',
      assignments: 'assignmentId',
      tasks: 'taskId',
      reviews: 'reviewId',
      comments: 'commentId',
      annotations: 'annotationId',
      questions: 'questionId',
      followUps: 'followUpId',
      approvals: 'approvalId',
      publications: 'publicationId',
      distributions: 'distributionId',
      acknowledgements: 'acknowledgementId',
      subscriptions: 'subscriptionId',
      watchRules: 'ruleId',
      events: 'eventId'
    };

    const idKey = ENTITY_PRIMARY_KEYS[entityType] || 'id';
    const id = validated[idKey] || validated.id;
    if (!id) throw new Error(`Entity missing primary key ${idKey}`);

    if (!table.has(id)) {
      table.set(id, []);
    }
    const history = table.get(id);

    // Create immutable versioned copy with record timestamp
    const record = deepFreeze({
      ...validated,
      _storeVersion: history.length + 1,
      _savedAt: validated.createdAt || validated.timestamp || validated.publishedAt || new Date().toISOString()
    });

    history.push(record);
    return record;
  }

  // Typed convenience savers
  saveWorkspace(ws) { return this.saveEntity(ws.tenantId, 'workspaces', ws, validateWorkspace); }
  saveTeam(team) { return this.saveEntity(team.tenantId, 'teams', team, validateTeam); }
  saveMembership(m) { return this.saveEntity(m.tenantId, 'memberships', m, validateUserMembership); }
  saveAssignment(a) { return this.saveEntity(a.tenantId, 'assignments', a, validateResearchAssignment); }
  saveTask(t) { return this.saveEntity(t.tenantId, 'tasks', t, validateResearchTask); }
  saveReview(r) { return this.saveEntity(r.tenantId, 'reviews', r, validateReview); }
  saveComment(c) { return this.saveEntity(c.tenantId, 'comments', c, validateComment); }
  saveAnnotation(a) { return this.saveEntity(a.tenantId, 'annotations', a, validateAnnotation); }
  saveQuestion(q) { return this.saveEntity(q.tenantId, 'questions', q, validateQuestion); }
  saveFollowUp(f) { return this.saveEntity(f.tenantId, 'followUps', f, validateFollowUp); }
  saveApproval(appr) { return this.saveEntity(appr.tenantId, 'approvals', appr, validateApproval); }
  savePublication(pub) { return this.saveEntity(pub.tenantId, 'publications', pub, validatePublication); }
  saveDistribution(d) { return this.saveEntity(d.tenantId, 'distributions', d, validateDistribution); }
  saveAcknowledgement(ack) { return this.saveEntity(ack.tenantId, 'acknowledgements', ack, validateAcknowledgement); }
  saveSubscription(sub) { return this.saveEntity(sub.tenantId, 'subscriptions', sub, validateSubscription); }
  saveWatchRule(wr) { return this.saveEntity(wr.tenantId, 'watchRules', wr, validateWatchRule); }
  saveEvent(e) { return this.saveEntity(e.tenantId, 'events', e, validateWorkflowEvent); }

  /**
   * Point-in-Time Temporal Retrieval: gets state as of a specified ISO timestamp
   */
  getEntityAsOf(tenantId, entityType, id, asOf = null) {
    const table = this._getTenantTable(tenantId, entityType);
    if (!table.has(id)) return null;
    const history = table.get(id);
    if (history.length === 0) return null;

    if (!asOf) {
      return history[history.length - 1]; // Latest
    }

    const cutoff = new Date(asOf).getTime();
    for (let i = history.length - 1; i >= 0; i--) {
      const recordTime = new Date(history[i]._savedAt || history[i].createdAt || history[i].timestamp || 0).getTime();
      if (recordTime <= cutoff) {
        return history[i];
      }
    }
    return null;
  }

  /**
   * List entities with tenant isolation & optional temporal cutoff
   */
  listEntities(tenantId, entityType, filterFn = null, asOf = null) {
    const table = this._getTenantTable(tenantId, entityType);
    const results = [];
    for (const [id] of table.entries()) {
      const entity = this.getEntityAsOf(tenantId, entityType, id, asOf);
      if (entity && (!filterFn || filterFn(entity))) {
        results.push(entity);
      }
    }
    return results;
  }

  /**
   * Get complete revision history of an entity
   */
  getEntityHistory(tenantId, entityType, id) {
    const table = this._getTenantTable(tenantId, entityType);
    if (!table.has(id)) return [];
    return [...table.get(id)];
  }
}

export const defaultWorkflowStore = new WorkflowStore();
