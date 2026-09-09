import express from 'express';
import { defaultWorkflowStore } from '../researchWorkflow/workflow.store.js';
import { defaultReviewEngine } from '../researchWorkflow/workflow.review.engine.js';
import { defaultAssignmentEngine } from '../researchWorkflow/workflow.assignment.engine.js';
import { defaultDistributionEngine } from '../researchWorkflow/workflow.distribution.engine.js';
import { defaultNotificationEngine } from '../researchWorkflow/workflow.notification.engine.js';
import { defaultStaleEngine } from '../researchWorkflow/workflow.stale.engine.js';
import { defaultAuditEngine } from '../researchWorkflow/workflow.audit.engine.js';
import { workflowCopilotTools } from '../researchWorkflow/workflow.tool.js';
import { WorkflowRole, CommentStatus, QuestionStatus, ReviewStatus } from '../researchWorkflow/workflow.types.js';

const router = express.Router();

// Middleware: Extract tenant and user info
const extractContext = (req, res, next) => {
  req.tenantId = req.headers['x-tenant-id'] || req.query.tenantId || req.body.tenantId || 'tenant_default';
  req.userId = req.headers['x-user-id'] || req.query.userId || req.body.userId || 'usr_default';
  req.userRole = req.headers['x-user-role'] || req.query.userRole || req.body.userRole || WorkflowRole.ANALYST;
  req.isAi = req.headers['x-is-ai'] === 'true' || req.body.isAi === true;
  next();
};

router.use(extractContext);

// 1. Queues
router.get('/queue', async (req, res) => {
  try {
    const teamIds = req.query.teamIds ? req.query.teamIds.split(',') : [];
    const queues = defaultAssignmentEngine.getQueues(req.tenantId, req.userId, req.userRole, teamIds);
    res.json({ success: true, ...queues });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Assignments
router.get('/assignments', (req, res) => {
  try {
    const list = defaultWorkflowStore.listEntities(req.tenantId, 'assignments');
    res.json({ success: true, total: list.length, assignments: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/assignments', (req, res) => {
  try {
    const created = defaultAssignmentEngine.createAssignment({
      tenantId: req.tenantId,
      researchProductId: req.body.researchProductId,
      subjectIds: req.body.subjectIds,
      assignedBy: req.userId,
      assignedTo: req.body.assignedTo,
      teamId: req.body.teamId,
      priority: req.body.priority,
      authoritativeSeverity: req.body.authoritativeSeverity,
      dueAt: req.body.dueAt
    });
    res.status(201).json({ success: true, assignment: created });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.patch('/assignments/:id', (req, res) => {
  try {
    const updated = defaultAssignmentEngine.updateAssignmentStatus({
      tenantId: req.tenantId,
      assignmentId: req.params.id,
      status: req.body.status,
      actorId: req.userId,
      rationale: req.body.rationale
    });
    res.json({ success: true, assignment: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 3. Tasks
router.get('/tasks', (req, res) => {
  try {
    const list = defaultWorkflowStore.listEntities(req.tenantId, 'tasks');
    res.json({ success: true, total: list.length, tasks: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/tasks', (req, res) => {
  try {
    const task = defaultAssignmentEngine.createTask({
      tenantId: req.tenantId,
      researchProductId: req.body.researchProductId,
      taskType: req.body.taskType,
      priority: req.body.priority,
      title: req.body.title,
      description: req.body.description,
      referencedObjectId: req.body.referencedObjectId,
      referencedClaimId: req.body.referencedClaimId,
      referencedEvidenceId: req.body.referencedEvidenceId,
      assignedTo: req.body.assignedTo,
      createdBy: req.userId,
      dueAt: req.body.dueAt
    });
    res.status(201).json({ success: true, task });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.patch('/tasks/:id', (req, res) => {
  try {
    const updated = defaultAssignmentEngine.updateTaskStatus({
      tenantId: req.tenantId,
      taskId: req.params.id,
      status: req.body.status,
      actorId: req.userId,
      resolutionNotes: req.body.resolutionNotes
    });
    res.json({ success: true, task: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 4. Reviews & Human Approval
router.get('/reviews', (req, res) => {
  try {
    const list = defaultWorkflowStore.listEntities(req.tenantId, 'reviews');
    res.json({ success: true, total: list.length, reviews: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/reviews', (req, res) => {
  try {
    const review = defaultReviewEngine.transitionReview({
      tenantId: req.tenantId,
      reviewId: req.body.reviewId,
      researchProductId: req.body.researchProductId,
      researchVersion: req.body.researchVersion,
      nextStatus: req.body.nextStatus || ReviewStatus.REVIEW_REQUIRED,
      actorId: req.userId,
      actorRole: req.userRole,
      isAi: req.isAi,
      rationale: req.body.rationale,
      referencedClaims: req.body.referencedClaims,
      referencedEvidence: req.body.referencedEvidence
    });
    res.status(201).json({ success: true, review });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/reviews/:id/approve', (req, res) => {
  try {
    if (req.isAi) {
      return res.status(403).json({ success: false, error: 'AI cannot approve research' });
    }
    const approval = defaultReviewEngine.submitHumanApproval({
      tenantId: req.tenantId,
      reviewId: req.params.id,
      researchProductId: req.body.researchProductId,
      researchVersion: req.body.researchVersion || 1,
      reviewerId: req.userId,
      reviewerRole: req.userRole,
      isAi: false,
      decision: 'APPROVED',
      rationale: req.body.rationale,
      packageHash: req.body.packageHash,
      evidenceSnapshotHash: req.body.evidenceSnapshotHash,
      contextHash: req.body.contextHash,
      graphVersion: req.body.graphVersion,
      modelVersions: req.body.modelVersions
    });
    res.json({ success: true, approval });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/reviews/:id/reject', (req, res) => {
  try {
    if (req.isAi) {
      return res.status(403).json({ success: false, error: 'AI cannot reject research' });
    }
    const approval = defaultReviewEngine.submitHumanApproval({
      tenantId: req.tenantId,
      reviewId: req.params.id,
      researchProductId: req.body.researchProductId,
      researchVersion: req.body.researchVersion || 1,
      reviewerId: req.userId,
      reviewerRole: req.userRole,
      isAi: false,
      decision: 'REJECTED',
      rationale: req.body.rationale || 'Rejected by reviewer',
      packageHash: req.body.packageHash || 'N/A'
    });
    res.json({ success: true, approval });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/reviews/:id/request-changes', (req, res) => {
  try {
    const review = defaultReviewEngine.transitionReview({
      tenantId: req.tenantId,
      reviewId: req.params.id,
      researchProductId: req.body.researchProductId,
      researchVersion: req.body.researchVersion || 1,
      nextStatus: ReviewStatus.CHANGES_REQUESTED,
      actorId: req.userId,
      actorRole: req.userRole,
      isAi: req.isAi,
      rationale: req.body.rationale || 'Changes requested'
    });
    res.json({ success: true, review });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 5. Comments & Annotations
router.get('/comments', (req, res) => {
  try {
    const { researchProductId } = req.query;
    const list = defaultWorkflowStore.listEntities(req.tenantId, 'comments', c => {
      return researchProductId ? c.researchProductId === researchProductId : true;
    });
    res.json({ success: true, total: list.length, comments: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/comments', (req, res) => {
  try {
    const commentRecord = {
      commentId: `cmt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      tenantId: req.tenantId,
      authorId: req.userId,
      researchProductId: req.body.researchProductId,
      researchVersion: req.body.researchVersion || 1,
      parentCommentId: req.body.parentCommentId || null,
      referencedObjectId: req.body.referencedObjectId || null,
      referencedClaimId: req.body.referencedClaimId || null,
      body: req.body.body,
      status: CommentStatus.OPEN,
      version: 1,
      createdAt: new Date().toISOString()
    };
    const saved = defaultWorkflowStore.saveComment(commentRecord);
    defaultAuditEngine.logEvent({
      tenantId: req.tenantId,
      action: 'COMMENT_CREATED',
      actorId: req.userId,
      targetEntity: 'COMMENT',
      targetId: saved.commentId,
      researchProductId: req.body.researchProductId,
      researchVersion: req.body.researchVersion || 1,
      details: { body: req.body.body }
    });
    res.status(201).json({ success: true, comment: saved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/comments/:id/resolve', (req, res) => {
  try {
    const existing = defaultWorkflowStore.getEntityAsOf(req.tenantId, 'comments', req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Comment not found' });
    const updated = {
      ...existing,
      status: CommentStatus.RESOLVED,
      resolvedBy: req.userId,
      resolvedAt: new Date().toISOString(),
      version: (existing.version || 1) + 1
    };
    const saved = defaultWorkflowStore.saveComment(updated);
    defaultAuditEngine.logEvent({
      tenantId: req.tenantId,
      action: 'COMMENT_RESOLVED',
      actorId: req.userId,
      targetEntity: 'COMMENT',
      targetId: req.params.id,
      researchProductId: existing.researchProductId,
      details: { previousStatus: existing.status }
    });
    res.json({ success: true, comment: saved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/comments/:id/reopen', (req, res) => {
  try {
    const existing = defaultWorkflowStore.getEntityAsOf(req.tenantId, 'comments', req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Comment not found' });
    const updated = {
      ...existing,
      status: CommentStatus.REOPENED,
      reopenedBy: req.userId,
      reopenedAt: new Date().toISOString(),
      version: (existing.version || 1) + 1
    };
    const saved = defaultWorkflowStore.saveComment(updated);
    defaultAuditEngine.logEvent({
      tenantId: req.tenantId,
      action: 'COMMENT_REOPENED',
      actorId: req.userId,
      targetEntity: 'COMMENT',
      targetId: req.params.id,
      researchProductId: existing.researchProductId
    });
    res.json({ success: true, comment: saved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 6. Questions
router.get('/questions', (req, res) => {
  try {
    const { researchProductId } = req.query;
    const list = defaultWorkflowStore.listEntities(req.tenantId, 'questions', q => {
      return researchProductId ? q.researchProductId === researchProductId : true;
    });
    res.json({ success: true, total: list.length, questions: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/questions', (req, res) => {
  try {
    const qRecord = {
      questionId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      tenantId: req.tenantId,
      authorId: req.userId,
      researchProductId: req.body.researchProductId,
      referencedObjectId: req.body.referencedObjectId || null,
      question: req.body.question,
      priority: req.body.priority || 'MEDIUM',
      status: QuestionStatus.OPEN,
      createdAt: new Date().toISOString()
    };
    const saved = defaultWorkflowStore.saveQuestion(qRecord);
    defaultAuditEngine.logEvent({
      tenantId: req.tenantId,
      action: 'QUESTION_CREATED',
      actorId: req.userId,
      targetEntity: 'QUESTION',
      targetId: saved.questionId,
      researchProductId: req.body.researchProductId
    });
    res.status(201).json({ success: true, question: saved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/questions/:id/answer', (req, res) => {
  try {
    const existing = defaultWorkflowStore.getEntityAsOf(req.tenantId, 'questions', req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Question not found' });
    const updated = {
      ...existing,
      answer: req.body.answer,
      answeredBy: req.userId,
      answeredAt: new Date().toISOString(),
      referencedEvidenceId: req.body.referencedEvidenceId || null,
      status: QuestionStatus.ANSWERED
    };
    const saved = defaultWorkflowStore.saveQuestion(updated);
    defaultAuditEngine.logEvent({
      tenantId: req.tenantId,
      action: 'QUESTION_ANSWERED',
      actorId: req.userId,
      targetEntity: 'QUESTION',
      targetId: req.params.id,
      researchProductId: existing.researchProductId,
      details: { answer: req.body.answer }
    });
    res.json({ success: true, question: saved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/questions/:id/close', (req, res) => {
  try {
    const existing = defaultWorkflowStore.getEntityAsOf(req.tenantId, 'questions', req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Question not found' });
    const updated = {
      ...existing,
      status: QuestionStatus.CLOSED,
      closedBy: req.userId,
      closedAt: new Date().toISOString()
    };
    const saved = defaultWorkflowStore.saveQuestion(updated);
    defaultAuditEngine.logEvent({
      tenantId: req.tenantId,
      action: 'QUESTION_CLOSED',
      actorId: req.userId,
      targetEntity: 'QUESTION',
      targetId: req.params.id,
      researchProductId: existing.researchProductId
    });
    res.json({ success: true, question: saved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 7. Stale Research & Pending Approvals
router.get('/stale-research', async (req, res) => {
  try {
    const staleList = await workflowCopilotTools.getStaleResearch({ tenantId: req.tenantId });
    res.json({ success: true, total: staleList.length, staleResearch: staleList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/pending-approvals', async (req, res) => {
  try {
    const list = await workflowCopilotTools.getPendingApprovals({ tenantId: req.tenantId });
    res.json({ success: true, total: list.length, pendingApprovals: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Publications
router.get('/publications', (req, res) => {
  try {
    const list = defaultWorkflowStore.listEntities(req.tenantId, 'publications');
    res.json({ success: true, total: list.length, publications: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/publications', (req, res) => {
  try {
    const pub = defaultDistributionEngine.publishResearch({
      tenantId: req.tenantId,
      researchProductId: req.body.researchProductId,
      researchVersion: req.body.researchVersion,
      approvalId: req.body.approvalId,
      publisherId: req.userId,
      publisherRole: req.userRole,
      isAi: req.isAi,
      packageHash: req.body.packageHash,
      currentDependencies: req.body.currentDependencies
    });
    res.status(201).json({ success: true, publication: pub });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 9. Distributions
router.get('/distributions', (req, res) => {
  try {
    const list = defaultWorkflowStore.listEntities(req.tenantId, 'distributions');
    res.json({ success: true, total: list.length, distributions: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/distributions', (req, res) => {
  try {
    const result = defaultDistributionEngine.distributeResearch({
      tenantId: req.tenantId,
      publicationId: req.body.publicationId,
      channel: req.body.channel,
      recipientId: req.body.recipientId,
      distributorId: req.userId,
      requiresAcknowledgement: req.body.requiresAcknowledgement,
      ackDueAt: req.body.ackDueAt
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 10. Acknowledgements
router.get('/acknowledgements', (req, res) => {
  try {
    const list = defaultWorkflowStore.listEntities(req.tenantId, 'acknowledgements');
    res.json({ success: true, total: list.length, acknowledgements: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/acknowledgements', (req, res) => {
  try {
    const ack = defaultDistributionEngine.acknowledgeResearch({
      tenantId: req.tenantId,
      acknowledgementId: req.body.acknowledgementId,
      userId: req.userId,
      notes: req.body.notes
    });
    res.json({ success: true, acknowledgement: ack });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 11. Subscriptions
router.get('/subscriptions', (req, res) => {
  try {
    const list = defaultWorkflowStore.listEntities(req.tenantId, 'subscriptions');
    res.json({ success: true, total: list.length, subscriptions: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/subscriptions', (req, res) => {
  try {
    const sub = defaultNotificationEngine.subscribe({
      tenantId: req.tenantId,
      subscriberId: req.userId,
      subscriberType: req.body.subscriberType || 'USER',
      targetType: req.body.targetType,
      targetId: req.body.targetId,
      minSeverity: req.body.minSeverity
    });
    res.status(201).json({ success: true, subscription: sub });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/subscriptions/:id', (req, res) => {
  try {
    const existing = defaultWorkflowStore.getEntityAsOf(req.tenantId, 'subscriptions', req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Subscription not found' });
    // In our append-only store we mark cancelled/deleted
    const deleted = { ...existing, status: 'CANCELLED', deletedAt: new Date().toISOString() };
    defaultWorkflowStore.saveSubscription(deleted);
    res.json({ success: true, message: 'Subscription cancelled' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 12. Audit Trail
router.get('/audit', (req, res) => {
  try {
    const integrity = defaultAuditEngine.verifyAuditTrail(req.tenantId);
    const events = defaultWorkflowStore.listEntities(req.tenantId, 'events');
    res.json({ success: true, integrity, totalEvents: events.length, events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
