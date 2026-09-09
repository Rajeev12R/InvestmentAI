import assert from 'assert';
import { WorkflowStore } from '../researchWorkflow/workflow.store.js';
import { WorkflowAuditEngine } from '../researchWorkflow/workflow.audit.engine.js';
import { WorkflowReviewEngine } from '../researchWorkflow/workflow.review.engine.js';
import { WorkflowDistributionEngine } from '../researchWorkflow/workflow.distribution.engine.js';
import { WorkflowRole, DistributionChannel, AcknowledgementStatus } from '../researchWorkflow/workflow.types.js';

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

console.log('=== Suite 11: Immutable Publication & Distribution Ledger ===');

it('should publish approved research and prevent unauthorized publication', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const reviewEngine = new WorkflowReviewEngine(store, audit);
  const distEngine = new WorkflowDistributionEngine(store, reviewEngine, audit);

  // 1. Create and Approve
  const approval = reviewEngine.submitHumanApproval({
    tenantId: 'tenant_01',
    reviewId: 'rev_100',
    researchProductId: 'rp_100',
    researchVersion: 1,
    reviewerId: 'pm_lead',
    reviewerRole: WorkflowRole.PORTFOLIO_MANAGER,
    decision: 'APPROVED',
    rationale: 'Fully verified',
    packageHash: '0xhash_pub_test_123'
  });

  // 2. Publish as PORTFOLIO_MANAGER
  const pub = distEngine.publishResearch({
    tenantId: 'tenant_01',
    researchProductId: 'rp_100',
    researchVersion: 1,
    approvalId: approval.approvalId,
    publisherId: 'pm_lead',
    publisherRole: WorkflowRole.PORTFOLIO_MANAGER,
    packageHash: '0xhash_pub_test_123'
  });

  assert.strictEqual(pub.researchProductId, 'rp_100');
  assert.strictEqual(pub.packageHash, '0xhash_pub_test_123');

  // 3. Attempt publication with unauthorized role (e.g., VIEWER or AUDITOR)
  assert.throws(() => {
    distEngine.publishResearch({
      tenantId: 'tenant_01',
      researchProductId: 'rp_100',
      researchVersion: 1,
      approvalId: approval.approvalId,
      publisherId: 'viewer_user',
      publisherRole: WorkflowRole.VIEWER,
      packageHash: '0xhash_pub_test_123'
    });
  }, /unauthorized to publish research/);
});

it('should distribute publication across institutional channels and track critical acknowledgements', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const reviewEngine = new WorkflowReviewEngine(store, audit);
  const distEngine = new WorkflowDistributionEngine(store, reviewEngine, audit);

  const approval = reviewEngine.submitHumanApproval({
    tenantId: 'tenant_01',
    reviewId: 'rev_200',
    researchProductId: 'rp_200',
    researchVersion: 1,
    reviewerId: 'pm_lead',
    reviewerRole: WorkflowRole.PORTFOLIO_MANAGER,
    decision: 'APPROVED',
    rationale: 'Valid',
    packageHash: '0xhash_dist_01'
  });

  const pub = distEngine.publishResearch({
    tenantId: 'tenant_01',
    researchProductId: 'rp_200',
    researchVersion: 1,
    approvalId: approval.approvalId,
    publisherId: 'pm_lead',
    publisherRole: WorkflowRole.PORTFOLIO_MANAGER,
    packageHash: '0xhash_dist_01'
  });

  const distResult = distEngine.distributeResearch({
    tenantId: 'tenant_01',
    publicationId: pub.publicationId,
    channel: DistributionChannel.INVESTMENT_COMMITTEE,
    recipientId: 'ic_member_01',
    distributorId: 'pm_lead',
    requiresAcknowledgement: true,
    ackDueAt: '2026-03-02T17:00:00Z'
  });

  assert.strictEqual(distResult.distribution.channel, DistributionChannel.INVESTMENT_COMMITTEE);
  assert.ok(distResult.acknowledgement);
  assert.strictEqual(distResult.acknowledgement.status, AcknowledgementStatus.REQUIRED);

  // Acknowledge by recipient
  const acked = distEngine.acknowledgeResearch({
    tenantId: 'tenant_01',
    acknowledgementId: distResult.acknowledgement.acknowledgementId,
    userId: 'ic_member_01',
    notes: 'Reviewed thesis and position sizing.'
  });

  assert.strictEqual(acked.status, AcknowledgementStatus.ACKNOWLEDGED);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
