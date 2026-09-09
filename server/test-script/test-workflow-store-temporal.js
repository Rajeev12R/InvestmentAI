import assert from 'assert';
import { WorkflowStore } from '../researchWorkflow/workflow.store.js';
import { PriorityLevel, TaskStatus, TaskType } from '../researchWorkflow/workflow.types.js';

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

console.log('=== Suite 2: Multi-Tenant Store & Point-in-Time Temporal Cutoff ===');

it('should strictly isolate entities between different tenants', () => {
  const store = new WorkflowStore();

  store.saveTask({
    taskId: 'task_t1_01',
    tenantId: 'tenant_alpha',
    researchProductId: 'rp_01',
    taskType: TaskType.VERIFY_CLAIM,
    status: TaskStatus.PENDING,
    priority: PriorityLevel.HIGH,
    title: 'Alpha Secret Task',
    createdBy: 'user_alpha'
  });

  store.saveTask({
    taskId: 'task_t2_01',
    tenantId: 'tenant_beta',
    researchProductId: 'rp_01',
    taskType: TaskType.VERIFY_CLAIM,
    status: TaskStatus.PENDING,
    priority: PriorityLevel.LOW,
    title: 'Beta Secret Task',
    createdBy: 'user_beta'
  });

  const alphaTasks = store.listEntities('tenant_alpha', 'tasks');
  const betaTasks = store.listEntities('tenant_beta', 'tasks');

  assert.strictEqual(alphaTasks.length, 1);
  assert.strictEqual(alphaTasks[0].title, 'Alpha Secret Task');
  assert.strictEqual(betaTasks.length, 1);
  assert.strictEqual(betaTasks[0].title, 'Beta Secret Task');

  // Cross tenant access returns null
  assert.strictEqual(store.getEntityAsOf('tenant_alpha', 'tasks', 'task_t2_01'), null);
  assert.strictEqual(store.getEntityAsOf('tenant_beta', 'tasks', 'task_t1_01'), null);
});

it('should maintain immutable revision history for each entity mutation', () => {
  const store = new WorkflowStore();

  const v1 = store.saveTask({
    taskId: 'task_100',
    tenantId: 'tenant_main',
    researchProductId: 'rp_01',
    taskType: TaskType.VERIFY_CLAIM,
    status: TaskStatus.PENDING,
    priority: PriorityLevel.MEDIUM,
    title: 'Draft Task v1',
    createdBy: 'analyst_01',
    createdAt: '2026-03-01T10:00:00.000Z'
  });

  const v2 = store.saveTask({
    taskId: 'task_100',
    tenantId: 'tenant_main',
    researchProductId: 'rp_01',
    taskType: TaskType.VERIFY_CLAIM,
    status: TaskStatus.IN_PROGRESS,
    priority: PriorityLevel.HIGH,
    title: 'Draft Task v2 (Elevated)',
    createdBy: 'analyst_01',
    createdAt: '2026-03-01T12:00:00.000Z'
  });

  const v3 = store.saveTask({
    taskId: 'task_100',
    tenantId: 'tenant_main',
    researchProductId: 'rp_01',
    taskType: TaskType.VERIFY_CLAIM,
    status: TaskStatus.COMPLETED,
    priority: PriorityLevel.HIGH,
    title: 'Draft Task v3 (Done)',
    createdBy: 'analyst_01',
    createdAt: '2026-03-01T14:00:00.000Z'
  });

  const history = store.getEntityHistory('tenant_main', 'tasks', 'task_100');
  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[0].status, TaskStatus.PENDING);
  assert.strictEqual(history[1].status, TaskStatus.IN_PROGRESS);
  assert.strictEqual(history[2].status, TaskStatus.COMPLETED);
});

it('should accurately reconstruct state point-in-time as of timestamp T', () => {
  const store = new WorkflowStore();

  store.saveTask({
    taskId: 'task_200',
    tenantId: 'tenant_main',
    researchProductId: 'rp_01',
    taskType: TaskType.UPDATE_THESIS,
    status: TaskStatus.PENDING,
    priority: PriorityLevel.MEDIUM,
    title: 'Thesis Review Step 1',
    createdBy: 'analyst_01',
    createdAt: '2026-03-01T08:00:00.000Z'
  });

  store.saveTask({
    taskId: 'task_200',
    tenantId: 'tenant_main',
    researchProductId: 'rp_01',
    taskType: TaskType.UPDATE_THESIS,
    status: TaskStatus.IN_PROGRESS,
    priority: PriorityLevel.HIGH,
    title: 'Thesis Review Step 2',
    createdBy: 'analyst_01',
    createdAt: '2026-03-01T11:00:00.000Z'
  });

  store.saveTask({
    taskId: 'task_200',
    tenantId: 'tenant_main',
    researchProductId: 'rp_01',
    taskType: TaskType.UPDATE_THESIS,
    status: TaskStatus.COMPLETED,
    priority: PriorityLevel.HIGH,
    title: 'Thesis Review Step 3',
    createdBy: 'analyst_01',
    createdAt: '2026-03-01T15:00:00.000Z'
  });

  // Query as of 09:00: should see v1 (PENDING)
  const asOf09 = store.getEntityAsOf('tenant_main', 'tasks', 'task_200', '2026-03-01T09:00:00.000Z');
  assert.strictEqual(asOf09.status, TaskStatus.PENDING);

  // Query as of 12:00: should see v2 (IN_PROGRESS)
  const asOf12 = store.getEntityAsOf('tenant_main', 'tasks', 'task_200', '2026-03-01T12:00:00.000Z');
  assert.strictEqual(asOf12.status, TaskStatus.IN_PROGRESS);

  // Query as of 16:00: should see v3 (COMPLETED)
  const asOf16 = store.getEntityAsOf('tenant_main', 'tasks', 'task_200', '2026-03-01T16:00:00.000Z');
  assert.strictEqual(asOf16.status, TaskStatus.COMPLETED);

  // Query as of 07:00 (before creation): should return null
  const asOf07 = store.getEntityAsOf('tenant_main', 'tasks', 'task_200', '2026-03-01T07:00:00.000Z');
  assert.strictEqual(asOf07, null);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
