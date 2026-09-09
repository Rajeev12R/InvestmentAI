import assert from 'assert';
import { WorkflowStore } from '../researchWorkflow/workflow.store.js';
import { WorkflowAuditEngine } from '../researchWorkflow/workflow.audit.engine.js';
import { WorkflowSLAEngine } from '../researchWorkflow/workflow.sla.engine.js';
import { PriorityLevel, TaskType } from '../researchWorkflow/workflow.types.js';

let totalAssertions = 0;
function it(desc, fn) {
  try {
    fn();
    totalAssertions++;
  } catch (err) {
    console.error(`FAILED: ${desc}`);
    throw err;
  }
}

console.log('=== Suite 9: SLA Due Dates & Deterministic Escalation ===');

it('should calculate SLA deadlines accurately according to priority configuration', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const slaEngine = new WorkflowSLAEngine(store, audit);

  const baseTime = '2026-03-01T08:00:00.000Z';

  // Critical = 4 hours
  const criticalDue = slaEngine.calculateDueAt(baseTime, PriorityLevel.CRITICAL);
  assert.strictEqual(criticalDue, '2026-03-01T12:00:00.000Z');

  // High = 24 hours (1 day)
  const highDue = slaEngine.calculateDueAt(baseTime, PriorityLevel.HIGH);
  assert.strictEqual(highDue, '2026-03-02T08:00:00.000Z');

  // Medium = 72 hours (3 days)
  const mediumDue = slaEngine.calculateDueAt(baseTime, PriorityLevel.MEDIUM);
  assert.strictEqual(mediumDue, '2026-03-04T08:00:00.000Z');
});

it('should evaluate overdue items and deterministically escalate without loop duplication', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const slaEngine = new WorkflowSLAEngine(store, audit);

  // Create an overdue critical task
  store.saveTask({
    taskId: 'task_critical_overdue',
    tenantId: 'tenant_01',
    researchProductId: 'rp_01',
    taskType: TaskType.VERIFY_CLAIM,
    priority: PriorityLevel.CRITICAL,
    title: 'Urgent claim verification',
    createdBy: 'pm_lead',
    createdAt: '2026-03-01T08:00:00.000Z',
    dueAt: '2026-03-01T12:00:00.000Z',
    status: 'PENDING'
  });

  // Evaluate as of 14:00 (2 hours after deadline)
  const result1 = slaEngine.evaluateEscalations('tenant_01', '2026-03-01T14:00:00.000Z');
  assert.strictEqual(result1.totalEscalated, 1);
  assert.strictEqual(result1.escalations[0].id, 'task_critical_overdue');

  // Second evaluation as of 15:00 should not re-escalate already escalated task
  const result2 = slaEngine.evaluateEscalations('tenant_01', '2026-03-01T15:00:00.000Z');
  assert.strictEqual(result2.totalEscalated, 0);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
