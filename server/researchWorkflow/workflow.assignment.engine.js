import crypto from 'crypto';
import {
  AssignmentStatus,
  TaskType,
  TaskStatus,
  PriorityLevel,
  WorkflowRole,
  TeamType,
  deepFreeze
} from './workflow.types.js';
import { defaultWorkflowStore } from './workflow.store.js';
import { defaultAuditEngine } from './workflow.audit.engine.js';

export class WorkflowAssignmentEngine {
  constructor(store = defaultWorkflowStore, auditEngine = defaultAuditEngine) {
    this.store = store;
    this.auditEngine = auditEngine;
  }

  /**
   * Create or update a Research Assignment
   */
  createAssignment({
    tenantId,
    researchProductId,
    subjectIds = [],
    assignedBy,
    assignedTo,
    teamId,
    priority = PriorityLevel.MEDIUM,
    authoritativeSeverity = null,
    dueAt = null,
    status = AssignmentStatus.ASSIGNED
  }) {
    if (!tenantId || !researchProductId || !assignedBy || !assignedTo || !teamId) {
      throw new Error('Assignment requires tenantId, researchProductId, assignedBy, assignedTo, and teamId');
    }

    const assignmentId = `asgn_${crypto.randomBytes(8).toString('hex')}`;
    const record = {
      assignmentId,
      tenantId,
      researchProductId,
      subjectIds: Array.isArray(subjectIds) ? [...subjectIds] : [],
      assignedBy,
      assignedTo,
      teamId,
      priority,
      authoritativeSeverity,
      dueAt,
      status,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = this.store.saveAssignment(record);

    this.auditEngine.logEvent({
      tenantId,
      action: 'ASSIGNMENT_CREATED',
      actorId: assignedBy,
      targetEntity: 'RESEARCH_ASSIGNMENT',
      targetId: assignmentId,
      researchProductId,
      details: { assignedTo, teamId, priority, status }
    });

    return saved;
  }

  updateAssignmentStatus({
    tenantId,
    assignmentId,
    status,
    actorId,
    rationale = ''
  }) {
    const existing = this.store.getEntityAsOf(tenantId, 'assignments', assignmentId);
    if (!existing) throw new Error(`Assignment ${assignmentId} not found`);

    if (!Object.values(AssignmentStatus).includes(status)) {
      throw new Error(`Invalid assignment status: ${status}`);
    }

    const updated = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
      completedAt: status === AssignmentStatus.COMPLETED ? new Date().toISOString() : existing.completedAt,
      version: (existing.version || 1) + 1
    };

    const saved = this.store.saveAssignment(updated);

    this.auditEngine.logEvent({
      tenantId,
      action: `ASSIGNMENT_STATUS_UPDATED_${status}`,
      actorId,
      targetEntity: 'RESEARCH_ASSIGNMENT',
      targetId: assignmentId,
      researchProductId: existing.researchProductId,
      details: { previousStatus: existing.status, status, rationale }
    });

    return saved;
  }

  /**
   * Create a Research Task linked to an underlying object
   */
  createTask({
    tenantId,
    researchProductId,
    taskType = TaskType.VERIFY_CLAIM,
    priority = PriorityLevel.MEDIUM,
    title,
    description = '',
    referencedObjectId = null,
    referencedClaimId = null,
    referencedEvidenceId = null,
    assignedTo = null,
    createdBy,
    dueAt = null
  }) {
    if (!tenantId || !researchProductId || !title || !createdBy) {
      throw new Error('Task requires tenantId, researchProductId, title, and createdBy');
    }

    const taskId = `task_${crypto.randomBytes(8).toString('hex')}`;
    const taskRecord = {
      taskId,
      tenantId,
      researchProductId,
      taskType,
      status: TaskStatus.PENDING,
      priority,
      title,
      description,
      referencedObjectId,
      referencedClaimId,
      referencedEvidenceId,
      assignedTo,
      createdBy,
      dueAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    const saved = this.store.saveTask(taskRecord);

    this.auditEngine.logEvent({
      tenantId,
      action: 'TASK_CREATED',
      actorId: createdBy,
      targetEntity: 'RESEARCH_TASK',
      targetId: taskId,
      researchProductId,
      details: { taskType, priority, title, assignedTo }
    });

    return saved;
  }

  updateTaskStatus({
    tenantId,
    taskId,
    status,
    actorId,
    resolutionNotes = ''
  }) {
    const existing = this.store.getEntityAsOf(tenantId, 'tasks', taskId);
    if (!existing) throw new Error(`Task ${taskId} not found`);

    if (!Object.values(TaskStatus).includes(status)) {
      throw new Error(`Invalid task status: ${status}`);
    }

    const updated = {
      ...existing,
      status,
      resolutionNotes,
      updatedAt: new Date().toISOString(),
      version: (existing.version || 1) + 1
    };

    const saved = this.store.saveTask(updated);

    this.auditEngine.logEvent({
      tenantId,
      action: `TASK_STATUS_UPDATED_${status}`,
      actorId,
      targetEntity: 'RESEARCH_TASK',
      targetId: taskId,
      researchProductId: existing.researchProductId,
      details: { previousStatus: existing.status, status, resolutionNotes }
    });

    return saved;
  }

  /**
   * Deterministic Priority Engine
   * Workflow urgency can be elevated, but authoritative severity is never overwritten.
   */
  resolveEffectivePriority(workflowPriority, authoritativeSeverity) {
    const priorityRanks = {
      [PriorityLevel.LOW]: 1,
      [PriorityLevel.MEDIUM]: 2,
      [PriorityLevel.HIGH]: 3,
      [PriorityLevel.CRITICAL]: 4
    };

    const wfRank = priorityRanks[workflowPriority] || 2;
    const authRank = authoritativeSeverity ? (priorityRanks[authoritativeSeverity] || 0) : 0;

    // Highest rank wins for scheduling
    const effectiveRank = Math.max(wfRank, authRank);
    const resolvedPriority = Object.keys(priorityRanks).find(k => priorityRanks[k] === effectiveRank) || PriorityLevel.MEDIUM;

    return {
      workflowPriority,
      authoritativeSeverity,
      resolvedPriority,
      isElevatedByAuthoritative: authRank > wfRank
    };
  }

  /**
   * Institutional Queue Aggregation
   */
  getQueues(tenantId, userId, userRole, teamIds = []) {
    const allTasks = this.store.listEntities(tenantId, 'tasks');
    const allAssignments = this.store.listEntities(tenantId, 'assignments');
    const allReviews = this.store.listEntities(tenantId, 'reviews');
    const allQuestions = this.store.listEntities(tenantId, 'questions');

    // 1. Analyst Queue: Tasks & Assignments assigned directly to user
    const analystQueue = [
      ...allAssignments.filter(a => a.assignedTo === userId && a.status !== AssignmentStatus.COMPLETED && a.status !== AssignmentStatus.CANCELLED),
      ...allTasks.filter(t => t.assignedTo === userId && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED)
    ];

    // 2. Reviewer Queue: Research needing review
    const reviewerQueue = allReviews.filter(r => 
      ['REVIEW_REQUIRED', 'UNDER_REVIEW', 'RESUBMITTED'].includes(r.status)
    );

    // 3. Risk Queue
    const riskQueue = allTasks.filter(t => 
      t.taskType === TaskType.REVIEW_RISK && t.status !== TaskStatus.COMPLETED
    );

    // 4. Compliance Queue
    const complianceQueue = allTasks.filter(t => 
      t.taskType === TaskType.REVIEW_COMPLIANCE && t.status !== TaskStatus.COMPLETED
    );

    // 5. Investment Committee Queue
    const icQueue = allTasks.filter(t => 
      t.taskType === TaskType.PREPARE_IC_BRIEF && t.status !== TaskStatus.COMPLETED
    );

    // 6. Unresolved Questions Queue
    const unresolvedQuestionsQueue = allQuestions.filter(q => 
      ['OPEN', 'ASSIGNED'].includes(q.status)
    );

    // 7. Team Queue: Work assigned to user's teams
    const teamQueue = allAssignments.filter(a => 
      teamIds.includes(a.teamId) && a.status !== AssignmentStatus.COMPLETED
    );

    return {
      tenantId,
      userId,
      analystQueue,
      reviewerQueue,
      riskQueue,
      complianceQueue,
      icQueue,
      unresolvedQuestionsQueue,
      teamQueue
    };
  }
}

export const defaultAssignmentEngine = new WorkflowAssignmentEngine();
