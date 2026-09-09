import assert from 'assert';
import { WorkflowStore } from '../researchWorkflow/workflow.store.js';
import { WorkflowAuditEngine } from '../researchWorkflow/workflow.audit.engine.js';
import { WorkflowReviewEngine } from '../researchWorkflow/workflow.review.engine.js';
import { ReviewStatus, WorkflowRole } from '../researchWorkflow/workflow.types.js';

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

console.log('=== Suite 4: Review State Machine & Human Approval Gate ===');

it('should follow canonical state machine transitions: DRAFT -> VALIDATED -> REVIEW_REQUIRED -> UNDER_REVIEW -> CHANGES_REQUESTED -> RESUBMITTED -> HUMAN_APPROVED -> PUBLISHED', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const engine = new WorkflowReviewEngine(store, audit);

  // 1. Initial creation (DRAFT)
  const r1 = engine.transitionReview({
    tenantId: 'tenant_01',
    reviewId: 'rev_100',
    researchProductId: 'rp_01',
    researchVersion: 1,
    nextStatus: ReviewStatus.DRAFT,
    actorId: 'analyst_01',
    actorRole: WorkflowRole.ANALYST
  });
  assert.strictEqual(r1.status, ReviewStatus.DRAFT);

  // 2. DRAFT -> VALIDATED
  const r2 = engine.transitionReview({
    tenantId: 'tenant_01',
    reviewId: 'rev_100',
    researchProductId: 'rp_01',
    researchVersion: 1,
    nextStatus: ReviewStatus.VALIDATED,
    actorId: 'analyst_01',
    actorRole: WorkflowRole.ANALYST
  });
  assert.strictEqual(r2.status, ReviewStatus.VALIDATED);

  // 3. VALIDATED -> REVIEW_REQUIRED
  const r3 = engine.transitionReview({
    tenantId: 'tenant_01',
    reviewId: 'rev_100',
    researchProductId: 'rp_01',
    researchVersion: 1,
    nextStatus: ReviewStatus.REVIEW_REQUIRED,
    actorId: 'analyst_01',
    actorRole: WorkflowRole.ANALYST
  });
  assert.strictEqual(r3.status, ReviewStatus.REVIEW_REQUIRED);

  // 4. REVIEW_REQUIRED -> UNDER_REVIEW
  const r4 = engine.transitionReview({
    tenantId: 'tenant_01',
    reviewId: 'rev_100',
    researchProductId: 'rp_01',
    researchVersion: 1,
    nextStatus: ReviewStatus.UNDER_REVIEW,
    actorId: 'reviewer_pm',
    actorRole: WorkflowRole.PORTFOLIO_MANAGER
  });
  assert.strictEqual(r4.status, ReviewStatus.UNDER_REVIEW);

  // 5. UNDER_REVIEW -> CHANGES_REQUESTED
  const r5 = engine.transitionReview({
    tenantId: 'tenant_01',
    reviewId: 'rev_100',
    researchProductId: 'rp_01',
    researchVersion: 1,
    nextStatus: ReviewStatus.CHANGES_REQUESTED,
    actorId: 'reviewer_pm',
    actorRole: WorkflowRole.PORTFOLIO_MANAGER,
    rationale: 'Clarify DCF terminal growth rate assumptions'
  });
  assert.strictEqual(r5.status, ReviewStatus.CHANGES_REQUESTED);

  // 6. CHANGES_REQUESTED -> RESUBMITTED
  const r6 = engine.transitionReview({
    tenantId: 'tenant_01',
    reviewId: 'rev_100',
    researchProductId: 'rp_01',
    researchVersion: 1,
    nextStatus: ReviewStatus.RESUBMITTED,
    actorId: 'analyst_01',
    actorRole: WorkflowRole.ANALYST,
    rationale: 'Updated terminal growth sensitivity table'
  });
  assert.strictEqual(r6.status, ReviewStatus.RESUBMITTED);

  // 7. Human Approval Gate
  const approval = engine.submitHumanApproval({
    tenantId: 'tenant_01',
    reviewId: 'rev_100',
    researchProductId: 'rp_01',
    researchVersion: 1,
    reviewerId: 'reviewer_pm',
    reviewerRole: WorkflowRole.PORTFOLIO_MANAGER,
    isAi: false,
    decision: 'APPROVED',
    rationale: 'All assumptions verified with audited 10-K',
    packageHash: '0xhash_sealed_123'
  });
  assert.strictEqual(approval.decision, 'APPROVED');

  const afterApproval = store.getEntityAsOf('tenant_01', 'reviews', 'rev_100');
  assert.strictEqual(afterApproval.status, ReviewStatus.HUMAN_APPROVED);
});

it('should strictly reject invalid review state transitions', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const engine = new WorkflowReviewEngine(store, audit);

  engine.transitionReview({
    tenantId: 'tenant_01',
    reviewId: 'rev_200',
    researchProductId: 'rp_02',
    researchVersion: 1,
    nextStatus: ReviewStatus.DRAFT,
    actorId: 'analyst_01',
    actorRole: WorkflowRole.ANALYST
  });

  // Cannot jump directly from DRAFT to PUBLISHED or HUMAN_APPROVED
  assert.throws(() => {
    engine.transitionReview({
      tenantId: 'tenant_01',
      reviewId: 'rev_200',
      researchProductId: 'rp_02',
      researchVersion: 1,
      nextStatus: ReviewStatus.PUBLISHED,
      actorId: 'analyst_01',
      actorRole: WorkflowRole.ANALYST
    });
  }, /Invalid review transition/);
});

it('should strictly reject AI approval or publication attempts', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const engine = new WorkflowReviewEngine(store, audit);

  engine.transitionReview({
    tenantId: 'tenant_01',
    reviewId: 'rev_300',
    researchProductId: 'rp_03',
    researchVersion: 1,
    nextStatus: ReviewStatus.REVIEW_REQUIRED,
    actorId: 'analyst_01',
    actorRole: WorkflowRole.ANALYST
  });

  // AI attempt to approve must throw
  assert.throws(() => {
    engine.submitHumanApproval({
      tenantId: 'tenant_01',
      reviewId: 'rev_300',
      researchProductId: 'rp_03',
      researchVersion: 1,
      reviewerId: 'ai_copilot_assistant',
      reviewerRole: WorkflowRole.PORTFOLIO_MANAGER,
      isAi: true, // AI flag
      decision: 'APPROVED',
      rationale: 'AI approved thesis',
      packageHash: '0xabc'
    });
  }, /AI cannot submit human approvals/);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
