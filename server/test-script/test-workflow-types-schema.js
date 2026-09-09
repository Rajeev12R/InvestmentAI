import assert from 'assert';
import {
  WorkflowRole,
  TeamType,
  AssignmentStatus,
  TaskType,
  TaskStatus,
  ReviewStatus,
  CommentStatus,
  QuestionStatus,
  PriorityLevel,
  FreshnessState,
  DistributionChannel,
  AcknowledgementStatus,
  deepFreeze,
  computeWorkflowHash
} from '../researchWorkflow/workflow.types.js';
import {
  validateWorkspace,
  validateTeam,
  validateUserMembership,
  validateResearchAssignment,
  validateResearchTask,
  validateReview,
  validateComment,
  validateAnnotation,
  validateQuestion,
  validateFollowUp,
  validateApproval,
  validatePublication,
  validateDistribution,
  validateAcknowledgement,
  validateSubscription,
  validateWatchRule,
  validateWorkflowEvent,
  WorkflowValidationError
} from '../researchWorkflow/workflow.schema.js';

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

console.log('=== Suite 1: Workflow Types, Enums & 17 Entity Schemas ===');

// 1. Roles & Enums
it('should verify all WorkflowRole enum values', () => {
  assert.strictEqual(WorkflowRole.VIEWER, 'VIEWER');
  assert.strictEqual(WorkflowRole.ANALYST, 'ANALYST');
  assert.strictEqual(WorkflowRole.EDITOR, 'EDITOR');
  assert.strictEqual(WorkflowRole.PORTFOLIO_MANAGER, 'PORTFOLIO_MANAGER');
  assert.strictEqual(WorkflowRole.ADMIN, 'ADMIN');
  assert.strictEqual(WorkflowRole.AUDITOR, 'AUDITOR');
});

it('should verify TeamType enum values', () => {
  assert.strictEqual(TeamType.EQUITY_RESEARCH, 'EQUITY_RESEARCH');
  assert.strictEqual(TeamType.PORTFOLIO_MANAGEMENT, 'PORTFOLIO_MANAGEMENT');
  assert.strictEqual(TeamType.RISK, 'RISK');
  assert.strictEqual(TeamType.COMPLIANCE, 'COMPLIANCE');
  assert.strictEqual(TeamType.INVESTMENT_COMMITTEE, 'INVESTMENT_COMMITTEE');
  assert.strictEqual(TeamType.OPERATIONS, 'OPERATIONS');
  assert.strictEqual(TeamType.AUDIT, 'AUDIT');
});

it('should verify ReviewStatus and AssignmentStatus enums', () => {
  assert.strictEqual(ReviewStatus.HUMAN_APPROVED, 'HUMAN_APPROVED');
  assert.strictEqual(ReviewStatus.PUBLISHED, 'PUBLISHED');
  assert.strictEqual(AssignmentStatus.IN_PROGRESS, 'IN_PROGRESS');
});

// 2. Deep Freeze & Hashing
it('should freeze objects deeply and compute canonical hashes', () => {
  const obj = { a: 1, b: { c: 'hello' } };
  const frozen = deepFreeze(obj);
  assert.throws(() => { frozen.a = 2; });
  assert.throws(() => { frozen.b.c = 'mutated'; });

  const hash1 = computeWorkflowHash({ a: 1, b: 2 });
  const hash2 = computeWorkflowHash({ b: 2, a: 1 });
  assert.strictEqual(hash1, hash2);
});

// 3. Schema Validators for All 17 Entities
it('should validate WORKSPACE schema', () => {
  const ws = validateWorkspace({
    workspaceId: 'ws_01',
    tenantId: 'tenant_01',
    name: 'Main Investment Workspace',
    createdAt: '2026-03-01T00:00:00Z'
  });
  assert.strictEqual(ws.workspaceId, 'ws_01');
  assert.throws(() => validateWorkspace({ workspaceId: 'ws_02' }), WorkflowValidationError);
});

it('should validate TEAM schema', () => {
  const team = validateTeam({
    teamId: 'tm_01',
    tenantId: 'tenant_01',
    workspaceId: 'ws_01',
    name: 'Equity Fundamental Research',
    type: TeamType.EQUITY_RESEARCH
  });
  assert.strictEqual(team.type, 'EQUITY_RESEARCH');
  assert.throws(() => validateTeam({ teamId: 'tm_02', type: 'INVALID_TEAM' }), WorkflowValidationError);
});

it('should validate USER_MEMBERSHIP schema', () => {
  const mem = validateUserMembership({
    membershipId: 'mem_01',
    tenantId: 'tenant_01',
    userId: 'usr_01',
    teamId: 'tm_01',
    role: WorkflowRole.ANALYST
  });
  assert.strictEqual(mem.role, 'ANALYST');
});

it('should validate RESEARCH_ASSIGNMENT schema', () => {
  const asgn = validateResearchAssignment({
    assignmentId: 'asgn_01',
    tenantId: 'tenant_01',
    researchProductId: 'rp_01',
    assignedBy: 'pm_01',
    assignedTo: 'analyst_01',
    teamId: 'tm_01',
    priority: PriorityLevel.HIGH,
    status: AssignmentStatus.ASSIGNED,
    version: 1
  });
  assert.strictEqual(asgn.priority, 'HIGH');
});

it('should validate RESEARCH_TASK schema', () => {
  const task = validateResearchTask({
    taskId: 'task_01',
    tenantId: 'tenant_01',
    researchProductId: 'rp_01',
    taskType: TaskType.VERIFY_CLAIM,
    status: TaskStatus.PENDING,
    priority: PriorityLevel.HIGH,
    title: 'Verify revenue restatement in 10-K',
    createdBy: 'pm_01'
  });
  assert.strictEqual(task.taskType, 'VERIFY_CLAIM');
});

it('should validate REVIEW schema', () => {
  const rev = validateReview({
    reviewId: 'rev_01',
    tenantId: 'tenant_01',
    researchProductId: 'rp_01',
    researchVersion: 1,
    status: ReviewStatus.REVIEW_REQUIRED
  });
  assert.strictEqual(rev.status, 'REVIEW_REQUIRED');
});

it('should validate COMMENT schema', () => {
  const cmt = validateComment({
    commentId: 'cmt_01',
    tenantId: 'tenant_01',
    authorId: 'usr_01',
    researchProductId: 'rp_01',
    researchVersion: 1,
    body: 'Checked footnote 14 on inventory reserve.',
    status: CommentStatus.OPEN,
    version: 1
  });
  assert.strictEqual(cmt.body, 'Checked footnote 14 on inventory reserve.');
});

it('should validate ANNOTATION schema', () => {
  const ann = validateAnnotation({
    annotationId: 'ann_01',
    tenantId: 'tenant_01',
    authorId: 'usr_01',
    researchProductId: 'rp_01',
    researchVersion: 1,
    referencedClaimId: 'C1',
    note: 'Primary confirmation from SEC filing EDGAR'
  });
  assert.strictEqual(ann.referencedClaimId, 'C1');
});

it('should validate QUESTION and FOLLOW_UP schemas', () => {
  const q = validateQuestion({
    questionId: 'q_01',
    tenantId: 'tenant_01',
    authorId: 'pm_01',
    researchProductId: 'rp_01',
    question: 'Why did gross margin decline by 120bps in Q4?',
    priority: PriorityLevel.HIGH,
    status: QuestionStatus.OPEN
  });
  assert.strictEqual(q.priority, 'HIGH');

  const f = validateFollowUp({
    followUpId: 'f_01',
    tenantId: 'tenant_01',
    questionId: 'q_01',
    authorId: 'pm_01',
    actionRequired: 'Request management clarification on input cost inflation'
  });
  assert.strictEqual(f.followUpId, 'f_01');
});

it('should validate APPROVAL, PUBLICATION, DISTRIBUTION & ACKNOWLEDGEMENT schemas', () => {
  const appr = validateApproval({
    approvalId: 'appr_01',
    tenantId: 'tenant_01',
    researchProductId: 'rp_01',
    researchVersion: 1,
    reviewerId: 'pm_01',
    decision: 'APPROVED',
    rationale: 'All valuation models cross-checked and consistent',
    packageHash: '0xabc123'
  });
  assert.strictEqual(appr.decision, 'APPROVED');

  const pub = validatePublication({
    publicationId: 'pub_01',
    tenantId: 'tenant_01',
    researchProductId: 'rp_01',
    researchVersion: 1,
    approvalId: 'appr_01',
    publisherId: 'pm_01',
    packageHash: '0xabc123',
    publishedAt: '2026-03-01T12:00:00Z'
  });
  assert.strictEqual(pub.publicationId, 'pub_01');

  const dist = validateDistribution({
    distributionId: 'dist_01',
    tenantId: 'tenant_01',
    publicationId: 'pub_01',
    channel: DistributionChannel.INVESTMENT_COMMITTEE,
    recipientId: 'IC_GROUP',
    distributorId: 'pm_01',
    researchVersion: 1,
    packageHash: '0xabc123'
  });
  assert.strictEqual(dist.channel, 'INVESTMENT_COMMITTEE');

  const ack = validateAcknowledgement({
    acknowledgementId: 'ack_01',
    tenantId: 'tenant_01',
    publicationId: 'pub_01',
    userId: 'ic_member_01',
    researchVersion: 1,
    status: AcknowledgementStatus.REQUIRED
  });
  assert.strictEqual(ack.status, 'REQUIRED');
});

it('should validate SUBSCRIPTION, WATCH_RULE & WORKFLOW_EVENT schemas', () => {
  const sub = validateSubscription({
    subscriptionId: 'sub_01',
    tenantId: 'tenant_01',
    subscriberId: 'usr_01',
    targetType: 'SECURITY',
    targetId: 'NVDA'
  });
  assert.strictEqual(sub.targetType, 'SECURITY');

  const wr = validateWatchRule({
    ruleId: 'wr_01',
    tenantId: 'tenant_01',
    eventType: 'EARNINGS_SURPRISE'
  });
  assert.strictEqual(wr.eventType, 'EARNINGS_SURPRISE');

  const evt = validateWorkflowEvent({
    eventId: 'evt_01',
    tenantId: 'tenant_01',
    action: 'APPROVAL_RECORDED',
    actorId: 'pm_01',
    targetEntity: 'APPROVAL',
    targetId: 'appr_01',
    timestamp: '2026-03-01T12:00:00Z',
    eventHash: '0xhash01'
  });
  assert.strictEqual(evt.action, 'APPROVAL_RECORDED');
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
