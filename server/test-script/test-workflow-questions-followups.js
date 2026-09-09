import assert from 'assert';
import { WorkflowStore } from '../researchWorkflow/workflow.store.js';
import { QuestionStatus, PriorityLevel } from '../researchWorkflow/workflow.types.js';

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

console.log('=== Suite 7: Questions, Answers & Evidence Lineage ===');

it('should manage question lifecycle: OPEN -> ANSWERED -> VERIFIED -> CLOSED', () => {
  const store = new WorkflowStore();

  // 1. Create Question
  const q1 = store.saveQuestion({
    questionId: 'q_101',
    tenantId: 'tenant_01',
    authorId: 'ic_member_01',
    researchProductId: 'rp_01',
    question: 'How sensitive is DCF valuation to a 50bps rate hike?',
    priority: PriorityLevel.HIGH,
    status: QuestionStatus.OPEN,
    createdAt: '2026-03-01T09:00:00Z'
  });
  assert.strictEqual(q1.status, QuestionStatus.OPEN);

  // 2. Answer Question with evidence citation
  const q2 = store.saveQuestion({
    ...q1,
    answer: 'DCF fair value decreases by $4.50 (3.0%) per 50bps WACC increase.',
    answeredBy: 'analyst_01',
    answeredAt: '2026-03-01T10:30:00Z',
    referencedEvidenceId: 'EV_VAL_DCF_SENSITIVITY_TABLE',
    status: QuestionStatus.ANSWERED
  });
  assert.strictEqual(q2.status, QuestionStatus.ANSWERED);
  assert.strictEqual(q2.referencedEvidenceId, 'EV_VAL_DCF_SENSITIVITY_TABLE');

  // 3. Verify Answer
  const q3 = store.saveQuestion({
    ...q2,
    status: QuestionStatus.VERIFIED,
    verifiedBy: 'ic_member_01',
    verifiedAt: '2026-03-01T11:00:00Z'
  });
  assert.strictEqual(q3.status, QuestionStatus.VERIFIED);

  // 4. Close Question
  const q4 = store.saveQuestion({
    ...q3,
    status: QuestionStatus.CLOSED,
    closedAt: '2026-03-01T11:15:00Z'
  });
  assert.strictEqual(q4.status, QuestionStatus.CLOSED);
});

it('should create explicit follow-up actions referencing parent questions', () => {
  const store = new WorkflowStore();

  const followUp = store.saveFollowUp({
    followUpId: 'fu_201',
    tenantId: 'tenant_01',
    questionId: 'q_101',
    authorId: 'ic_member_01',
    actionRequired: 'Update table 4 in IC Brief with new WACC sensitivity run',
    dueAt: '2026-03-02T17:00:00Z',
    createdAt: '2026-03-01T11:30:00Z'
  });

  assert.strictEqual(followUp.questionId, 'q_101');
  assert.strictEqual(followUp.actionRequired, 'Update table 4 in IC Brief with new WACC sensitivity run');
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
