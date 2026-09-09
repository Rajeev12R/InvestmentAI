import assert from 'assert';
import { WorkflowStore } from '../researchWorkflow/workflow.store.js';
import { WorkflowAuditEngine } from '../researchWorkflow/workflow.audit.engine.js';
import { WorkflowAssignmentEngine } from '../researchWorkflow/workflow.assignment.engine.js';
import { AssignmentStatus, TaskStatus, TaskType, PriorityLevel } from '../researchWorkflow/workflow.types.js';

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

console.log('=== Suite 3: Assignments, Tasks & Priority Mapping ===');

it('should create research assignment and update status through lifecycle', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const engine = new WorkflowAssignmentEngine(store, audit);

  const asgn = engine.createAssignment({
    tenantId: 'tenant_01',
    researchProductId: 'rp_100',
    subjectIds: ['NVDA'],
    assignedBy: 'pm_lead',
    assignedTo: 'analyst_01',
    teamId: 'tm_equity',
    priority: PriorityLevel.HIGH
  });

  assert.strictEqual(asgn.status, AssignmentStatus.ASSIGNED);
  assert.strictEqual(asgn.priority, PriorityLevel.HIGH);

  // Update to IN_PROGRESS
  const inProg = engine.updateAssignmentStatus({
    tenantId: 'tenant_01',
    assignmentId: asgn.assignmentId,
    status: AssignmentStatus.IN_PROGRESS,
    actorId: 'analyst_01'
  });
  assert.strictEqual(inProg.status, AssignmentStatus.IN_PROGRESS);
  assert.strictEqual(inProg.version, 2);

  // Update to COMPLETED
  const comp = engine.updateAssignmentStatus({
    tenantId: 'tenant_01',
    assignmentId: asgn.assignmentId,
    status: AssignmentStatus.COMPLETED,
    actorId: 'analyst_01'
  });
  assert.strictEqual(comp.status, AssignmentStatus.COMPLETED);
  assert.ok(comp.completedAt);
});

it('should link tasks to underlying claims and evidence without mutating financial facts', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const engine = new WorkflowAssignmentEngine(store, audit);

  const task = engine.createTask({
    tenantId: 'tenant_01',
    researchProductId: 'rp_100',
    taskType: TaskType.VERIFY_CLAIM,
    priority: PriorityLevel.CRITICAL,
    title: 'Verify Q4 Datacenter Revenue Claim C1',
    description: 'Check 10-K filing footnote 3',
    referencedClaimId: 'C1',
    referencedEvidenceId: 'EV_SEC_10K_2024',
    assignedTo: 'analyst_01',
    createdBy: 'pm_lead'
  });

  assert.strictEqual(task.referencedClaimId, 'C1');
  assert.strictEqual(task.referencedEvidenceId, 'EV_SEC_10K_2024');
  assert.strictEqual(task.status, TaskStatus.PENDING);

  // Complete task
  const resolved = engine.updateTaskStatus({
    tenantId: 'tenant_01',
    taskId: task.taskId,
    status: TaskStatus.COMPLETED,
    actorId: 'analyst_01',
    resolutionNotes: 'Verified: Exact match with audited 10-K schedule.'
  });
  assert.strictEqual(resolved.status, TaskStatus.COMPLETED);
  assert.strictEqual(resolved.resolutionNotes, 'Verified: Exact match with audited 10-K schedule.');
});

it('should correctly distinguish workflow priority from authoritative severity in priority engine', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const engine = new WorkflowAssignmentEngine(store, audit);

  // Case 1: Workflow Low, Authoritative Critical -> Effective Critical
  const p1 = engine.resolveEffectivePriority(PriorityLevel.LOW, PriorityLevel.CRITICAL);
  assert.strictEqual(p1.resolvedPriority, PriorityLevel.CRITICAL);
  assert.strictEqual(p1.isElevatedByAuthoritative, true);

  // Case 2: Workflow High, Authoritative Medium -> Effective High
  const p2 = engine.resolveEffectivePriority(PriorityLevel.HIGH, PriorityLevel.MEDIUM);
  assert.strictEqual(p2.resolvedPriority, PriorityLevel.HIGH);
  assert.strictEqual(p2.isElevatedByAuthoritative, false);

  // Case 3: Authoritative null -> Workflow Priority retained
  const p3 = engine.resolveEffectivePriority(PriorityLevel.MEDIUM, null);
  assert.strictEqual(p3.resolvedPriority, PriorityLevel.MEDIUM);
  assert.strictEqual(p3.isElevatedByAuthoritative, false);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
