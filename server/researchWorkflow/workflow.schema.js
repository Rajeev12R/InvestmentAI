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
  deepFreeze
} from './workflow.types.js';

export class WorkflowValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'WorkflowValidationError';
    this.errors = errors;
  }
}

/**
 * Validate Workspace Entity
 */
export function validateWorkspace(ws) {
  const errors = [];
  if (!ws || typeof ws !== 'object') throw new WorkflowValidationError('Workspace must be an object');
  if (!ws.workspaceId || typeof ws.workspaceId !== 'string') errors.push('workspaceId is required');
  if (!ws.tenantId || typeof ws.tenantId !== 'string') errors.push('tenantId is required');
  if (!ws.name || typeof ws.name !== 'string') errors.push('name is required');
  if (!ws.createdAt) errors.push('createdAt is required');
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid Workspace: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...ws });
}

/**
 * Validate Team Entity
 */
export function validateTeam(team) {
  const errors = [];
  if (!team || typeof team !== 'object') throw new WorkflowValidationError('Team must be an object');
  if (!team.teamId || typeof team.teamId !== 'string') errors.push('teamId is required');
  if (!team.tenantId || typeof team.tenantId !== 'string') errors.push('tenantId is required');
  if (!team.workspaceId || typeof team.workspaceId !== 'string') errors.push('workspaceId is required');
  if (!team.name || typeof team.name !== 'string') errors.push('name is required');
  if (!team.type || !Object.values(TeamType).includes(team.type)) errors.push(`Invalid team type: ${team.type}`);
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid Team: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...team });
}

/**
 * Validate User Membership
 */
export function validateUserMembership(m) {
  const errors = [];
  if (!m || typeof m !== 'object') throw new WorkflowValidationError('Membership must be an object');
  if (!m.membershipId || typeof m.membershipId !== 'string') errors.push('membershipId is required');
  if (!m.tenantId || typeof m.tenantId !== 'string') errors.push('tenantId is required');
  if (!m.userId || typeof m.userId !== 'string') errors.push('userId is required');
  if (!m.teamId || typeof m.teamId !== 'string') errors.push('teamId is required');
  if (!m.role || !Object.values(WorkflowRole).includes(m.role)) errors.push(`Invalid role: ${m.role}`);
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid UserMembership: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...m });
}

/**
 * Validate Research Assignment
 */
export function validateResearchAssignment(a) {
  const errors = [];
  if (!a || typeof a !== 'object') throw new WorkflowValidationError('ResearchAssignment must be an object');
  if (!a.assignmentId || typeof a.assignmentId !== 'string') errors.push('assignmentId is required');
  if (!a.tenantId || typeof a.tenantId !== 'string') errors.push('tenantId is required');
  if (!a.researchProductId || typeof a.researchProductId !== 'string') errors.push('researchProductId is required');
  if (!a.assignedBy || typeof a.assignedBy !== 'string') errors.push('assignedBy is required');
  if (!a.assignedTo || typeof a.assignedTo !== 'string') errors.push('assignedTo is required');
  if (!a.teamId || typeof a.teamId !== 'string') errors.push('teamId is required');
  if (!a.priority || !Object.values(PriorityLevel).includes(a.priority)) errors.push(`Invalid priority: ${a.priority}`);
  if (!a.status || !Object.values(AssignmentStatus).includes(a.status)) errors.push(`Invalid status: ${a.status}`);
  if (a.subjectIds && !Array.isArray(a.subjectIds)) errors.push('subjectIds must be an array');
  if (typeof a.version !== 'number') errors.push('version must be a number');
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid ResearchAssignment: ${errors.join(', ')}`, errors);
  return deepFreeze({
    ...a,
    subjectIds: Array.isArray(a.subjectIds) ? [...a.subjectIds] : []
  });
}

/**
 * Validate Research Task
 */
export function validateResearchTask(t) {
  const errors = [];
  if (!t || typeof t !== 'object') throw new WorkflowValidationError('ResearchTask must be an object');
  if (!t.taskId || typeof t.taskId !== 'string') errors.push('taskId is required');
  if (!t.tenantId || typeof t.tenantId !== 'string') errors.push('tenantId is required');
  if (!t.researchProductId || typeof t.researchProductId !== 'string') errors.push('researchProductId is required');
  if (!t.taskType || !Object.values(TaskType).includes(t.taskType)) errors.push(`Invalid taskType: ${t.taskType}`);
  if (!t.status || !Object.values(TaskStatus).includes(t.status)) errors.push(`Invalid status: ${t.status}`);
  if (!t.priority || !Object.values(PriorityLevel).includes(t.priority)) errors.push(`Invalid priority: ${t.priority}`);
  if (!t.title || typeof t.title !== 'string') errors.push('title is required');
  if (!t.createdBy || typeof t.createdBy !== 'string') errors.push('createdBy is required');
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid ResearchTask: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...t });
}

/**
 * Validate Review
 */
export function validateReview(r) {
  const errors = [];
  if (!r || typeof r !== 'object') throw new WorkflowValidationError('Review must be an object');
  if (!r.reviewId || typeof r.reviewId !== 'string') errors.push('reviewId is required');
  if (!r.tenantId || typeof r.tenantId !== 'string') errors.push('tenantId is required');
  if (!r.researchProductId || typeof r.researchProductId !== 'string') errors.push('researchProductId is required');
  if (typeof r.researchVersion !== 'number') errors.push('researchVersion must be a number');
  if (!r.status || !Object.values(ReviewStatus).includes(r.status)) errors.push(`Invalid review status: ${r.status}`);
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid Review: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...r });
}

/**
 * Validate Comment
 */
export function validateComment(c) {
  const errors = [];
  if (!c || typeof c !== 'object') throw new WorkflowValidationError('Comment must be an object');
  if (!c.commentId || typeof c.commentId !== 'string') errors.push('commentId is required');
  if (!c.tenantId || typeof c.tenantId !== 'string') errors.push('tenantId is required');
  if (!c.authorId || typeof c.authorId !== 'string') errors.push('authorId is required');
  if (!c.researchProductId || typeof c.researchProductId !== 'string') errors.push('researchProductId is required');
  if (typeof c.researchVersion !== 'number') errors.push('researchVersion must be a number');
  if (!c.body || typeof c.body !== 'string' || c.body.trim().length === 0) errors.push('body is required and non-empty');
  if (!c.status || !Object.values(CommentStatus).includes(c.status)) errors.push(`Invalid comment status: ${c.status}`);
  if (typeof c.version !== 'number') errors.push('version must be a number');
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid Comment: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...c });
}

/**
 * Validate Annotation
 */
export function validateAnnotation(a) {
  const errors = [];
  if (!a || typeof a !== 'object') throw new WorkflowValidationError('Annotation must be an object');
  if (!a.annotationId || typeof a.annotationId !== 'string') errors.push('annotationId is required');
  if (!a.tenantId || typeof a.tenantId !== 'string') errors.push('tenantId is required');
  if (!a.authorId || typeof a.authorId !== 'string') errors.push('authorId is required');
  if (!a.researchProductId || typeof a.researchProductId !== 'string') errors.push('researchProductId is required');
  if (typeof a.researchVersion !== 'number') errors.push('researchVersion must be a number');
  if (!a.referencedEvidenceId && !a.referencedClaimId) errors.push('referencedEvidenceId or referencedClaimId is required');
  if (!a.note || typeof a.note !== 'string') errors.push('note is required');
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid Annotation: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...a });
}

/**
 * Validate Question
 */
export function validateQuestion(q) {
  const errors = [];
  if (!q || typeof q !== 'object') throw new WorkflowValidationError('Question must be an object');
  if (!q.questionId || typeof q.questionId !== 'string') errors.push('questionId is required');
  if (!q.tenantId || typeof q.tenantId !== 'string') errors.push('tenantId is required');
  if (!q.authorId || typeof q.authorId !== 'string') errors.push('authorId is required');
  if (!q.researchProductId || typeof q.researchProductId !== 'string') errors.push('researchProductId is required');
  if (!q.question || typeof q.question !== 'string' || q.question.trim().length === 0) errors.push('question text is required');
  if (!q.status || !Object.values(QuestionStatus).includes(q.status)) errors.push(`Invalid question status: ${q.status}`);
  if (!q.priority || !Object.values(PriorityLevel).includes(q.priority)) errors.push(`Invalid priority: ${q.priority}`);
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid Question: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...q });
}

/**
 * Validate Follow-up
 */
export function validateFollowUp(f) {
  const errors = [];
  if (!f || typeof f !== 'object') throw new WorkflowValidationError('FollowUp must be an object');
  if (!f.followUpId || typeof f.followUpId !== 'string') errors.push('followUpId is required');
  if (!f.tenantId || typeof f.tenantId !== 'string') errors.push('tenantId is required');
  if (!f.questionId || typeof f.questionId !== 'string') errors.push('questionId is required');
  if (!f.authorId || typeof f.authorId !== 'string') errors.push('authorId is required');
  if (!f.actionRequired || typeof f.actionRequired !== 'string') errors.push('actionRequired is required');
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid FollowUp: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...f });
}

/**
 * Validate Approval Request & Record
 */
export function validateApproval(appr) {
  const errors = [];
  if (!appr || typeof appr !== 'object') throw new WorkflowValidationError('Approval must be an object');
  if (!appr.approvalId || typeof appr.approvalId !== 'string') errors.push('approvalId is required');
  if (!appr.tenantId || typeof appr.tenantId !== 'string') errors.push('tenantId is required');
  if (!appr.researchProductId || typeof appr.researchProductId !== 'string') errors.push('researchProductId is required');
  if (typeof appr.researchVersion !== 'number') errors.push('researchVersion must be a number');
  if (!appr.reviewerId || typeof appr.reviewerId !== 'string') errors.push('reviewerId is required');
  if (!appr.decision || !['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'].includes(appr.decision)) errors.push(`Invalid decision: ${appr.decision}`);
  if (!appr.rationale || typeof appr.rationale !== 'string') errors.push('rationale is required');
  if (!appr.packageHash || typeof appr.packageHash !== 'string') errors.push('packageHash is required');
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid Approval: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...appr });
}

/**
 * Validate Publication
 */
export function validatePublication(pub) {
  const errors = [];
  if (!pub || typeof pub !== 'object') throw new WorkflowValidationError('Publication must be an object');
  if (!pub.publicationId || typeof pub.publicationId !== 'string') errors.push('publicationId is required');
  if (!pub.tenantId || typeof pub.tenantId !== 'string') errors.push('tenantId is required');
  if (!pub.researchProductId || typeof pub.researchProductId !== 'string') errors.push('researchProductId is required');
  if (typeof pub.researchVersion !== 'number') errors.push('researchVersion must be a number');
  if (!pub.approvalId || typeof pub.approvalId !== 'string') errors.push('approvalId is required');
  if (!pub.publisherId || typeof pub.publisherId !== 'string') errors.push('publisherId is required');
  if (!pub.packageHash || typeof pub.packageHash !== 'string') errors.push('packageHash is required');
  if (!pub.publishedAt) errors.push('publishedAt is required');
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid Publication: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...pub });
}

/**
 * Validate Distribution
 */
export function validateDistribution(d) {
  const errors = [];
  if (!d || typeof d !== 'object') throw new WorkflowValidationError('Distribution must be an object');
  if (!d.distributionId || typeof d.distributionId !== 'string') errors.push('distributionId is required');
  if (!d.tenantId || typeof d.tenantId !== 'string') errors.push('tenantId is required');
  if (!d.publicationId || typeof d.publicationId !== 'string') errors.push('publicationId is required');
  if (!d.channel || !Object.values(DistributionChannel).includes(d.channel)) errors.push(`Invalid channel: ${d.channel}`);
  if (!d.recipientId || typeof d.recipientId !== 'string') errors.push('recipientId is required');
  if (!d.distributorId || typeof d.distributorId !== 'string') errors.push('distributorId is required');
  if (typeof d.researchVersion !== 'number') errors.push('researchVersion must be a number');
  if (!d.packageHash || typeof d.packageHash !== 'string') errors.push('packageHash is required');
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid Distribution: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...d });
}

/**
 * Validate Acknowledgement
 */
export function validateAcknowledgement(ack) {
  const errors = [];
  if (!ack || typeof ack !== 'object') throw new WorkflowValidationError('Acknowledgement must be an object');
  if (!ack.acknowledgementId || typeof ack.acknowledgementId !== 'string') errors.push('acknowledgementId is required');
  if (!ack.tenantId || typeof ack.tenantId !== 'string') errors.push('tenantId is required');
  if (!ack.publicationId && !ack.distributionId) errors.push('publicationId or distributionId is required');
  if (!ack.userId || typeof ack.userId !== 'string') errors.push('userId is required');
  if (typeof ack.researchVersion !== 'number') errors.push('researchVersion must be a number');
  if (!ack.status || !Object.values(AcknowledgementStatus).includes(ack.status)) errors.push(`Invalid status: ${ack.status}`);
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid Acknowledgement: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...ack });
}

/**
 * Validate Subscription & Watch Rule
 */
export function validateSubscription(sub) {
  const errors = [];
  if (!sub || typeof sub !== 'object') throw new WorkflowValidationError('Subscription must be an object');
  if (!sub.subscriptionId || typeof sub.subscriptionId !== 'string') errors.push('subscriptionId is required');
  if (!sub.tenantId || typeof sub.tenantId !== 'string') errors.push('tenantId is required');
  if (!sub.subscriberId || typeof sub.subscriberId !== 'string') errors.push('subscriberId is required');
  if (!sub.targetType || typeof sub.targetType !== 'string') errors.push('targetType is required');
  if (!sub.targetId || typeof sub.targetId !== 'string') errors.push('targetId is required');
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid Subscription: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...sub });
}

export function validateWatchRule(wr) {
  const errors = [];
  if (!wr || typeof wr !== 'object') throw new WorkflowValidationError('WatchRule must be an object');
  if (!wr.ruleId || typeof wr.ruleId !== 'string') errors.push('ruleId is required');
  if (!wr.tenantId || typeof wr.tenantId !== 'string') errors.push('tenantId is required');
  if (!wr.eventType || typeof wr.eventType !== 'string') errors.push('eventType is required');
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid WatchRule: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...wr });
}

/**
 * Validate Workflow Audit Event
 */
export function validateWorkflowEvent(e) {
  const errors = [];
  if (!e || typeof e !== 'object') throw new WorkflowValidationError('WorkflowEvent must be an object');
  if (!e.eventId || typeof e.eventId !== 'string') errors.push('eventId is required');
  if (!e.tenantId || typeof e.tenantId !== 'string') errors.push('tenantId is required');
  if (!e.action || typeof e.action !== 'string') errors.push('action is required');
  if (!e.actorId || typeof e.actorId !== 'string') errors.push('actorId is required');
  if (!e.targetEntity || typeof e.targetEntity !== 'string') errors.push('targetEntity is required');
  if (!e.targetId || typeof e.targetId !== 'string') errors.push('targetId is required');
  if (!e.timestamp) errors.push('timestamp is required');
  if (e.eventHash === undefined) errors.push('eventHash is required');
  if (errors.length > 0) throw new WorkflowValidationError(`Invalid WorkflowEvent: ${errors.join(', ')}`, errors);
  return deepFreeze({ ...e });
}
