import assert from 'assert';
import { WorkflowStore } from '../researchWorkflow/workflow.store.js';
import { WorkflowAuditEngine } from '../researchWorkflow/workflow.audit.engine.js';
import { WorkflowAssignmentEngine } from '../researchWorkflow/workflow.assignment.engine.js';
import { PriorityLevel, TaskType, TaskStatus, AssignmentStatus, ReviewStatus, QuestionStatus } from '../researchWorkflow/workflow.types.js';

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

console.log('=== Suite 8: Institutional Work Queues & Priority Engines ===');

it('should correctly segment work into institutional queues: Analyst, Reviewer, Risk, Compliance, IC, Questions', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const engine = new WorkflowAssignmentEngine(store, audit);

  // 1. Analyst Task
  engine.createTask({
    tenantId: 'tenant_01',
    researchProductId: 'rp_01',
    taskType: TaskType.VERIFY_CLAIM,
    priority: PriorityLevel.HIGH,
    title: 'Analyst task 1',
    assignedTo: 'usr_analyst_01',
    createdBy: 'pm_01'
  });

  // 2. Risk Task
  engine.createTask({
    tenantId: 'tenant_01',
    researchProductId: 'rp_01',
    taskType: TaskType.REVIEW_RISK,
    priority: PriorityLevel.HIGH,
    title: 'Risk task 1',
    assignedTo: 'usr_risk_01',
    createdBy: 'pm_01'
  });

  // 3. Compliance Task
  engine.createTask({
    tenantId: 'tenant_01',
    researchProductId: 'rp_01',
    taskType: TaskType.REVIEW_COMPLIANCE,
    priority: PriorityLevel.CRITICAL,
    title: 'Compliance review',
    assignedTo: 'usr_compliance_01',
    createdBy: 'pm_01'
  });

  // 4. IC Brief Task
  engine.createTask({
    tenantId: 'tenant_01',
    researchProductId: 'rp_01',
    taskType: TaskType.PREPARE_IC_BRIEF,
    priority: PriorityLevel.HIGH,
    title: 'Prepare IC Memo',
    assignedTo: 'usr_analyst_01',
    createdBy: 'pm_01'
  });

  // 5. Review required
  store.saveReview({
    reviewId: 'rev_100',
    tenantId: 'tenant_01',
    researchProductId: 'rp_01',
    researchVersion: 1,
    status: ReviewStatus.REVIEW_REQUIRED
  });

  // 6. Open Question
  store.saveQuestion({
    questionId: 'q_100',
    tenantId: 'tenant_01',
    authorId: 'pm_01',
    researchProductId: 'rp_01',
    question: 'Clarify gross margin seasonality',
    priority: PriorityLevel.MEDIUM,
    status: QuestionStatus.OPEN
  });

  const queues = engine.getQueues('tenant_01', 'usr_analyst_01', 'ANALYST', ['tm_equity']);

  assert.strictEqual(queues.analystQueue.length, 2); // 2 tasks assigned to usr_analyst_01
  assert.strictEqual(queues.reviewerQueue.length, 1);
  assert.strictEqual(queues.riskQueue.length, 1);
  assert.strictEqual(queues.complianceQueue.length, 1);
  assert.strictEqual(queues.icQueue.length, 1);
  assert.strictEqual(queues.unresolvedQuestionsQueue.length, 1);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
