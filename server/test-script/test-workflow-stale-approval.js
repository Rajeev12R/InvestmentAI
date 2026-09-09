import assert from 'assert';
import { WorkflowStore } from '../researchWorkflow/workflow.store.js';
import { WorkflowAuditEngine } from '../researchWorkflow/workflow.audit.engine.js';
import { WorkflowReviewEngine } from '../researchWorkflow/workflow.review.engine.js';
import { WorkflowDistributionEngine } from '../researchWorkflow/workflow.distribution.engine.js';
import { WorkflowRole, ReviewStatus } from '../researchWorkflow/workflow.types.js';

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

console.log('=== Suite 5: Stale Approval Detection & Publication Blocking ===');

it('should detect stale approval when packageHash or evidence changes post-approval and block publication', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const reviewEngine = new WorkflowReviewEngine(store, audit);
  const distEngine = new WorkflowDistributionEngine(store, reviewEngine, audit);

  // 1. Create review and approve
  reviewEngine.transitionReview({
    tenantId: 'tenant_01',
    reviewId: 'rev_100',
    researchProductId: 'rp_100',
    researchVersion: 1,
    nextStatus: ReviewStatus.UNDER_REVIEW,
    actorId: 'reviewer_pm',
    actorRole: WorkflowRole.PORTFOLIO_MANAGER
  });

  const approval = reviewEngine.submitHumanApproval({
    tenantId: 'tenant_01',
    reviewId: 'rev_100',
    researchProductId: 'rp_100',
    researchVersion: 1,
    reviewerId: 'reviewer_pm',
    reviewerRole: WorkflowRole.PORTFOLIO_MANAGER,
    isAi: false,
    decision: 'APPROVED',
    rationale: 'Valid package',
    packageHash: '0xhash_v1_initial',
    evidenceSnapshotHash: '0xev_snap_01'
  });

  // 2. Freshness check with matching dependencies -> VALID_APPROVAL
  const checkFresh = reviewEngine.checkApprovalFreshness('tenant_01', approval.approvalId, {
    packageHash: '0xhash_v1_initial',
    evidenceSnapshotHash: '0xev_snap_01'
  });
  assert.strictEqual(checkFresh.status, 'VALID_APPROVAL');
  assert.strictEqual(checkFresh.isFresh, true);

  // 3. Mutate package dependency post-approval -> STALE_APPROVAL
  const checkStale = reviewEngine.checkApprovalFreshness('tenant_01', approval.approvalId, {
    packageHash: '0xhash_v1_MUTATED_FACTS',
    evidenceSnapshotHash: '0xev_snap_01'
  });
  assert.strictEqual(checkStale.status, 'STALE_APPROVAL');
  assert.strictEqual(checkStale.isFresh, false);

  // 4. Attempt publication with mutated dependencies -> must be BLOCKED
  assert.throws(() => {
    distEngine.publishResearch({
      tenantId: 'tenant_01',
      researchProductId: 'rp_100',
      researchVersion: 1,
      approvalId: approval.approvalId,
      publisherId: 'pm_lead',
      publisherRole: WorkflowRole.PORTFOLIO_MANAGER,
      packageHash: '0xhash_v1_initial',
      currentDependencies: {
        packageHash: '0xhash_v1_MUTATED_FACTS'
      }
    });
  }, /Publication blocked: Approval is STALE/);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
