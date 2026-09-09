import { PriorityLevel } from './workflow.types.js';
import { defaultWorkflowStore } from './workflow.store.js';
import { defaultAuditEngine } from './workflow.audit.engine.js';

export const DEFAULT_SLA_CONFIG = Object.freeze({
  version: '1.0.0',
  calendarVersion: '2026.1',
  timezone: 'UTC',
  slaDurationsMs: {
    [PriorityLevel.CRITICAL]: 4 * 60 * 60 * 1000,       // 4 hours (same day)
    [PriorityLevel.HIGH]: 24 * 60 * 60 * 1000,          // 1 business day
    [PriorityLevel.MEDIUM]: 3 * 24 * 60 * 60 * 1000,    // 3 business days
    [PriorityLevel.LOW]: 5 * 24 * 60 * 60 * 1000        // 5 business days
  }
});

export class WorkflowSLAEngine {
  constructor(store = defaultWorkflowStore, auditEngine = defaultAuditEngine, config = DEFAULT_SLA_CONFIG) {
    this.store = store;
    this.auditEngine = auditEngine;
    this.config = config;
  }

  /**
   * Compute SLA deadline from a creation timestamp and priority
   */
  calculateDueAt(createdAtIso, priority = PriorityLevel.MEDIUM) {
    const startMs = new Date(createdAtIso).getTime();
    const durationMs = this.config.slaDurationsMs[priority] || this.config.slaDurationsMs[PriorityLevel.MEDIUM];
    const dueMs = startMs + durationMs;
    return new Date(dueMs).toISOString();
  }

  /**
   * Check if a task or assignment is overdue as of a given timestamp
   */
  checkSLAStatus(item, asOf = new Date().toISOString()) {
    if (!item.dueAt) {
      // Auto-compute dueAt if missing
      const dueAt = this.calculateDueAt(item.createdAt || asOf, item.priority || PriorityLevel.MEDIUM);
      const isOverdue = new Date(asOf).getTime() > new Date(dueAt).getTime();
      return {
        isOverdue,
        dueAt,
        slaVersion: this.config.version,
        timeRemainingMs: Math.max(0, new Date(dueAt).getTime() - new Date(asOf).getTime())
      };
    }

    const isOverdue = new Date(asOf).getTime() > new Date(item.dueAt).getTime();
    return {
      isOverdue,
      dueAt: item.dueAt,
      slaVersion: this.config.version,
      timeRemainingMs: Math.max(0, new Date(item.dueAt).getTime() - new Date(asOf).getTime())
    };
  }

  /**
   * Deterministic Escalation Engine
   * Evaluates overdue workflow items and applies deterministic escalation rules.
   */
  evaluateEscalations(tenantId, asOf = new Date().toISOString()) {
    const tasks = this.store.listEntities(tenantId, 'tasks', t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
    const assignments = this.store.listEntities(tenantId, 'assignments', a => a.status !== 'COMPLETED' && a.status !== 'CANCELLED');

    const escalations = [];

    // Evaluate Tasks
    for (const task of tasks) {
      const sla = this.checkSLAStatus(task, asOf);
      if (sla.isOverdue && !task.escalated) {
        // Deterministic Escalation
        const escalatedTask = {
          ...task,
          escalated: true,
          escalatedAt: asOf,
          escalationReason: `SLA breach on priority ${task.priority} (Due: ${sla.dueAt})`
        };
        this.store.saveTask(escalatedTask);

        this.auditEngine.logEvent({
          tenantId,
          action: 'TASK_SLA_ESCALATED',
          actorId: 'SYSTEM_SLA_ENGINE',
          targetEntity: 'RESEARCH_TASK',
          targetId: task.taskId,
          researchProductId: task.researchProductId,
          details: { sla, priority: task.priority }
        });

        escalations.push({
          type: 'TASK',
          id: task.taskId,
          dueAt: sla.dueAt,
          priority: task.priority,
          reason: escalatedTask.escalationReason
        });
      }
    }

    // Evaluate Assignments
    for (const asgn of assignments) {
      const sla = this.checkSLAStatus(asgn, asOf);
      if (sla.isOverdue && !asgn.escalated) {
        const escalatedAsgn = {
          ...asgn,
          escalated: true,
          escalatedAt: asOf,
          escalationReason: `SLA breach on assignment priority ${asgn.priority} (Due: ${sla.dueAt})`
        };
        this.store.saveAssignment(escalatedAsgn);

        this.auditEngine.logEvent({
          tenantId,
          action: 'ASSIGNMENT_SLA_ESCALATED',
          actorId: 'SYSTEM_SLA_ENGINE',
          targetEntity: 'RESEARCH_ASSIGNMENT',
          targetId: asgn.assignmentId,
          researchProductId: asgn.researchProductId,
          details: { sla, priority: asgn.priority }
        });

        escalations.push({
          type: 'ASSIGNMENT',
          id: asgn.assignmentId,
          dueAt: sla.dueAt,
          priority: asgn.priority,
          reason: escalatedAsgn.escalationReason
        });
      }
    }

    return {
      tenantId,
      asOf,
      totalEscalated: escalations.length,
      escalations
    };
  }
}

export const defaultSLAEngine = new WorkflowSLAEngine();
