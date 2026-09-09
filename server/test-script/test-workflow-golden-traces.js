import assert from 'assert';
import { WorkflowStore } from '../researchWorkflow/workflow.store.js';
import { WorkflowAuditEngine } from '../researchWorkflow/workflow.audit.engine.js';
import { WorkflowAssignmentEngine } from '../researchWorkflow/workflow.assignment.engine.js';
import { WorkflowReviewEngine } from '../researchWorkflow/workflow.review.engine.js';
import { WorkflowSLAEngine } from '../researchWorkflow/workflow.sla.engine.js';
import { WorkflowStaleResearchEngine } from '../researchWorkflow/workflow.stale.engine.js';
import { WorkflowDistributionEngine } from '../researchWorkflow/workflow.distribution.engine.js';
import {
  WorkflowRole,
  AssignmentStatus,
  TaskStatus,
  TaskType,
  ReviewStatus,
  CommentStatus,
  PriorityLevel,
  DistributionChannel,
  AcknowledgementStatus,
  FreshnessState
} from '../researchWorkflow/workflow.types.js';

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

console.log('=== Suite 13: 15 Golden Institutional Workflow Traces (Cases A–O) ===');

// Setup fresh engine instance
function createHarness() {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const asgn = new WorkflowAssignmentEngine(store, audit);
  const review = new WorkflowReviewEngine(store, audit);
  const sla = new WorkflowSLAEngine(store, audit);
  const stale = new WorkflowStaleResearchEngine(store, asgn, audit);
  const dist = new WorkflowDistributionEngine(store, review, audit);
  return { store, audit, asgn, review, sla, stale, dist };
}

// Golden A
it('Golden A: Analyst assigned research -> completes task -> submits for review', () => {
  const { store, asgn, review } = createHarness();

  const assignment = asgn.createAssignment({
    tenantId: 'tenant_gold',
    researchProductId: 'rp_gold_a',
    assignedBy: 'pm_lead',
    assignedTo: 'analyst_01',
    teamId: 'tm_equity',
    priority: PriorityLevel.HIGH
  });
  assert.strictEqual(assignment.status, AssignmentStatus.ASSIGNED);

  const task = asgn.createTask({
    tenantId: 'tenant_gold',
    researchProductId: 'rp_gold_a',
    taskType: TaskType.VERIFY_CLAIM,
    priority: PriorityLevel.HIGH,
    title: 'Verify revenue model',
    assignedTo: 'analyst_01',
    createdBy: 'pm_lead'
  });

  asgn.updateTaskStatus({
    tenantId: 'tenant_gold',
    taskId: task.taskId,
    status: TaskStatus.COMPLETED,
    actorId: 'analyst_01',
    resolutionNotes: 'Completed claim verification'
  });

  const rev = review.transitionReview({
    tenantId: 'tenant_gold',
    reviewId: 'rev_gold_a',
    researchProductId: 'rp_gold_a',
    researchVersion: 1,
    nextStatus: ReviewStatus.REVIEW_REQUIRED,
    actorId: 'analyst_01',
    actorRole: WorkflowRole.ANALYST
  });
  assert.strictEqual(rev.status, ReviewStatus.REVIEW_REQUIRED);
});

// Golden B
it('Golden B: Reviewer requests changes -> analyst resubmits -> approval', () => {
  const { review } = createHarness();

  review.transitionReview({
    tenantId: 'tenant_gold',
    reviewId: 'rev_gold_b',
    researchProductId: 'rp_gold_b',
    researchVersion: 1,
    nextStatus: ReviewStatus.UNDER_REVIEW,
    actorId: 'pm_lead',
    actorRole: WorkflowRole.PORTFOLIO_MANAGER
  });

  const reqChanges = review.transitionReview({
    tenantId: 'tenant_gold',
    reviewId: 'rev_gold_b',
    researchProductId: 'rp_gold_b',
    researchVersion: 1,
    nextStatus: ReviewStatus.CHANGES_REQUESTED,
    actorId: 'pm_lead',
    actorRole: WorkflowRole.PORTFOLIO_MANAGER,
    rationale: 'Adjust WACC to 9.0%'
  });
  assert.strictEqual(reqChanges.status, ReviewStatus.CHANGES_REQUESTED);

  const resubmitted = review.transitionReview({
    tenantId: 'tenant_gold',
    reviewId: 'rev_gold_b',
    researchProductId: 'rp_gold_b',
    researchVersion: 1,
    nextStatus: ReviewStatus.RESUBMITTED,
    actorId: 'analyst_01',
    actorRole: WorkflowRole.ANALYST,
    rationale: 'WACC revised to 9.0%'
  });
  assert.strictEqual(resubmitted.status, ReviewStatus.RESUBMITTED);

  const approval = review.submitHumanApproval({
    tenantId: 'tenant_gold',
    reviewId: 'rev_gold_b',
    researchProductId: 'rp_gold_b',
    researchVersion: 1,
    reviewerId: 'pm_lead',
    reviewerRole: WorkflowRole.PORTFOLIO_MANAGER,
    decision: 'APPROVED',
    rationale: 'Satisfied with updated valuation sensitivity',
    packageHash: '0xhash_gold_b_sealed'
  });
  assert.strictEqual(approval.decision, 'APPROVED');
});

// Golden C
it('Golden C: Approved research published', () => {
  const { review, dist } = createHarness();

  const approval = review.submitHumanApproval({
    tenantId: 'tenant_gold',
    reviewId: 'rev_gold_c',
    researchProductId: 'rp_gold_c',
    researchVersion: 1,
    reviewerId: 'pm_lead',
    reviewerRole: WorkflowRole.PORTFOLIO_MANAGER,
    decision: 'APPROVED',
    rationale: 'All checks green',
    packageHash: '0xhash_gold_c'
  });

  const pub = dist.publishResearch({
    tenantId: 'tenant_gold',
    researchProductId: 'rp_gold_c',
    researchVersion: 1,
    approvalId: approval.approvalId,
    publisherId: 'pm_lead',
    publisherRole: WorkflowRole.PORTFOLIO_MANAGER,
    packageHash: '0xhash_gold_c'
  });
  assert.strictEqual(pub.packageHash, '0xhash_gold_c');
});

// Golden D
it('Golden D: Published research receives a material upstream change -> becomes stale', () => {
  const { stale } = createHarness();

  const freshness = stale.evaluateFreshness({
    researchProduct: { researchProductId: 'rp_gold_d', version: 1, createdAt: '2026-01-01T00:00:00Z' },
    asOf: '2026-02-01T00:00:00Z',
    upstreamEvents: [{ type: 'EARNINGS_SURPRISE', description: 'Negative 14% EPS miss' }]
  });
  assert.strictEqual(freshness.isStale, true);
  assert.strictEqual(freshness.state, FreshnessState.STALE);
});

// Golden E
it('Golden E: Stale approval prevents publication', () => {
  const { review, dist } = createHarness();

  const approval = review.submitHumanApproval({
    tenantId: 'tenant_gold',
    reviewId: 'rev_gold_e',
    researchProductId: 'rp_gold_e',
    researchVersion: 1,
    reviewerId: 'pm_lead',
    reviewerRole: WorkflowRole.PORTFOLIO_MANAGER,
    decision: 'APPROVED',
    rationale: 'Approved v1',
    packageHash: '0xhash_initial'
  });

  assert.throws(() => {
    dist.publishResearch({
      tenantId: 'tenant_gold',
      researchProductId: 'rp_gold_e',
      researchVersion: 1,
      approvalId: approval.approvalId,
      publisherId: 'pm_lead',
      publisherRole: WorkflowRole.PORTFOLIO_MANAGER,
      packageHash: '0xhash_initial',
      currentDependencies: { packageHash: '0xhash_CHANGED_UPSTREAM' }
    });
  }, /Publication blocked: Approval is STALE/);
});

// Golden F
it('Golden F: Critical attention event creates review task', () => {
  const { stale } = createHarness();

  const res = stale.handleStaleResearchAlert({
    tenantId: 'tenant_gold',
    researchProduct: { researchProductId: 'rp_gold_f', version: 1 },
    upstreamEvents: [{ type: 'COMPLIANCE_BREACH', description: 'Restricted list violation' }],
    creatorId: 'COMPLIANCE_ENGINE'
  });
  assert.strictEqual(res.taskCreated, true);
  assert.strictEqual(res.task.priority, PriorityLevel.CRITICAL);
});

// Golden G
it('Golden G: SLA breach triggers escalation', () => {
  const { store, sla } = createHarness();

  store.saveTask({
    taskId: 'task_gold_g',
    tenantId: 'tenant_gold',
    researchProductId: 'rp_gold_g',
    taskType: TaskType.VERIFY_CLAIM,
    priority: PriorityLevel.CRITICAL,
    title: 'Overdue task',
    createdBy: 'pm_lead',
    createdAt: '2026-03-01T00:00:00Z',
    dueAt: '2026-03-01T04:00:00Z',
    status: 'PENDING'
  });

  const res = sla.evaluateEscalations('tenant_gold', '2026-03-01T06:00:00Z');
  assert.strictEqual(res.totalEscalated, 1);
  assert.strictEqual(res.escalations[0].id, 'task_gold_g');
});

// Golden H
it('Golden H: Comment references exact research version', () => {
  const { store } = createHarness();

  const cmt = store.saveComment({
    commentId: 'cmt_gold_h',
    tenantId: 'tenant_gold',
    authorId: 'analyst_01',
    researchProductId: 'rp_gold_h',
    researchVersion: 2,
    body: 'Referencing version 2 revisions',
    status: CommentStatus.OPEN,
    version: 1
  });
  assert.strictEqual(cmt.researchVersion, 2);
});

// Golden I
it('Golden I: New research version does not mutate old comments', () => {
  const { store } = createHarness();

  store.saveComment({
    commentId: 'cmt_v1',
    tenantId: 'tenant_gold',
    authorId: 'analyst_01',
    researchProductId: 'rp_gold_i',
    researchVersion: 1,
    body: 'v1 comment text',
    status: CommentStatus.OPEN,
    version: 1
  });

  store.saveComment({
    commentId: 'cmt_v2',
    tenantId: 'tenant_gold',
    authorId: 'analyst_01',
    researchProductId: 'rp_gold_i',
    researchVersion: 2,
    body: 'v2 new comment text',
    status: CommentStatus.OPEN,
    version: 1
  });

  const v1Comments = store.listEntities('tenant_gold', 'comments', c => c.researchProductId === 'rp_gold_i' && c.researchVersion === 1);
  assert.strictEqual(v1Comments.length, 1);
  assert.strictEqual(v1Comments[0].body, 'v1 comment text');
});

// Golden J
it('Golden J: Research distributed to authorized team', () => {
  const { review, dist } = createHarness();

  const approval = review.submitHumanApproval({
    tenantId: 'tenant_gold',
    reviewId: 'rev_gold_j',
    researchProductId: 'rp_gold_j',
    researchVersion: 1,
    reviewerId: 'pm_lead',
    reviewerRole: WorkflowRole.PORTFOLIO_MANAGER,
    decision: 'APPROVED',
    rationale: 'Valid',
    packageHash: '0xhash_j'
  });

  const pub = dist.publishResearch({
    tenantId: 'tenant_gold',
    researchProductId: 'rp_gold_j',
    researchVersion: 1,
    approvalId: approval.approvalId,
    publisherId: 'pm_lead',
    publisherRole: WorkflowRole.PORTFOLIO_MANAGER,
    packageHash: '0xhash_j'
  });

  const d = dist.distributeResearch({
    tenantId: 'tenant_gold',
    publicationId: pub.publicationId,
    channel: DistributionChannel.TEAM,
    recipientId: 'tm_equity_research',
    distributorId: 'pm_lead'
  });
  assert.strictEqual(d.distribution.channel, DistributionChannel.TEAM);
  assert.strictEqual(d.distribution.recipientId, 'tm_equity_research');
});

// Golden K
it('Golden K: Critical research requires acknowledgement', () => {
  const { review, dist } = createHarness();

  const approval = review.submitHumanApproval({
    tenantId: 'tenant_gold',
    reviewId: 'rev_gold_k',
    researchProductId: 'rp_gold_k',
    researchVersion: 1,
    reviewerId: 'pm_lead',
    reviewerRole: WorkflowRole.PORTFOLIO_MANAGER,
    decision: 'APPROVED',
    rationale: 'Approved',
    packageHash: '0xhash_k'
  });

  const pub = dist.publishResearch({
    tenantId: 'tenant_gold',
    researchProductId: 'rp_gold_k',
    researchVersion: 1,
    approvalId: approval.approvalId,
    publisherId: 'pm_lead',
    publisherRole: WorkflowRole.PORTFOLIO_MANAGER,
    packageHash: '0xhash_k'
  });

  const d = dist.distributeResearch({
    tenantId: 'tenant_gold',
    publicationId: pub.publicationId,
    channel: DistributionChannel.INVESTMENT_COMMITTEE,
    recipientId: 'usr_ic_01',
    distributorId: 'pm_lead',
    requiresAcknowledgement: true
  });
  assert.strictEqual(d.acknowledgement.status, AcknowledgementStatus.REQUIRED);
});

// Golden L
it('Golden L: Unauthorized user cannot access restricted research across tenants', () => {
  const { store } = createHarness();

  store.saveTask({
    taskId: 'task_tenant_x',
    tenantId: 'tenant_x',
    researchProductId: 'rp_x',
    taskType: TaskType.VERIFY_CLAIM,
    priority: PriorityLevel.HIGH,
    title: 'Secret X',
    createdBy: 'usr_x',
    status: TaskStatus.PENDING
  });

  const listY = store.listEntities('tenant_y', 'tasks');
  assert.strictEqual(listY.length, 0);
});

// Golden M
it('Golden M: AI suggests workflow action but cannot execute privileged mutation', () => {
  const { review } = createHarness();

  assert.throws(() => {
    review.submitHumanApproval({
      tenantId: 'tenant_gold',
      reviewId: 'rev_m',
      researchProductId: 'rp_m',
      researchVersion: 1,
      reviewerId: 'ai_copilot',
      reviewerRole: WorkflowRole.PORTFOLIO_MANAGER,
      isAi: true,
      decision: 'APPROVED',
      rationale: 'AI approved',
      packageHash: '0xhash_m'
    });
  }, /AI cannot submit human approvals/);
});

// Golden N
it('Golden N: Historical workflow reconstructed as of T', () => {
  const { audit } = createHarness();

  audit.logEvent({
    tenantId: 'tenant_gold',
    action: 'TASK_CREATED',
    actorId: 'usr_01',
    targetEntity: 'TASK',
    targetId: 't_01',
    timestamp: '2026-03-01T08:00:00Z'
  });

  audit.logEvent({
    tenantId: 'tenant_gold',
    action: 'TASK_COMPLETED',
    actorId: 'usr_01',
    targetEntity: 'TASK',
    targetId: 't_01',
    timestamp: '2026-03-01T14:00:00Z'
  });

  const asOf10 = audit.reconstructHistoricalState('tenant_gold', '2026-03-01T10:00:00Z');
  assert.strictEqual(asOf10.eventsCount, 1);
  assert.strictEqual(asOf10.events[0].action, 'TASK_CREATED');
});

// Golden O
it('Golden O: Full audit chain from assignment -> review -> approval -> publication -> distribution -> acknowledgement', () => {
  const { asgn, review, dist, audit } = createHarness();

  // 1. Assignment
  const asgnObj = asgn.createAssignment({
    tenantId: 'tenant_gold',
    researchProductId: 'rp_gold_o',
    assignedBy: 'pm_lead',
    assignedTo: 'analyst_01',
    teamId: 'tm_equity',
    priority: PriorityLevel.HIGH
  });

  // 2. Review
  const rev = review.transitionReview({
    tenantId: 'tenant_gold',
    reviewId: 'rev_gold_o',
    researchProductId: 'rp_gold_o',
    researchVersion: 1,
    nextStatus: ReviewStatus.UNDER_REVIEW,
    actorId: 'pm_lead',
    actorRole: WorkflowRole.PORTFOLIO_MANAGER
  });

  // 3. Approval
  const approval = review.submitHumanApproval({
    tenantId: 'tenant_gold',
    reviewId: 'rev_gold_o',
    researchProductId: 'rp_gold_o',
    researchVersion: 1,
    reviewerId: 'pm_lead',
    reviewerRole: WorkflowRole.PORTFOLIO_MANAGER,
    decision: 'APPROVED',
    rationale: 'Comprehensive approval',
    packageHash: '0xhash_gold_o'
  });

  // 4. Publication
  const pub = dist.publishResearch({
    tenantId: 'tenant_gold',
    researchProductId: 'rp_gold_o',
    researchVersion: 1,
    approvalId: approval.approvalId,
    publisherId: 'pm_lead',
    publisherRole: WorkflowRole.PORTFOLIO_MANAGER,
    packageHash: '0xhash_gold_o'
  });

  // 5. Distribution
  const d = dist.distributeResearch({
    tenantId: 'tenant_gold',
    publicationId: pub.publicationId,
    channel: DistributionChannel.INVESTMENT_COMMITTEE,
    recipientId: 'usr_ic_01',
    distributorId: 'pm_lead',
    requiresAcknowledgement: true
  });

  // 6. Acknowledgement
  dist.acknowledgeResearch({
    tenantId: 'tenant_gold',
    acknowledgementId: d.acknowledgement.acknowledgementId,
    userId: 'usr_ic_01',
    notes: 'Acknowledged by IC member'
  });

  // Verify Audit Chain Integrity
  const integrity = audit.verifyAuditTrail('tenant_gold');
  assert.strictEqual(integrity.valid, true);
  assert.strictEqual(integrity.violations.length, 0);
  assert.strictEqual(integrity.totalEvents >= 6, true);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
