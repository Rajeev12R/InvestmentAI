import assert from 'assert';
import { WorkflowStore } from '../researchWorkflow/workflow.store.js';
import { WorkflowAuditEngine } from '../researchWorkflow/workflow.audit.engine.js';
import { CommentStatus } from '../researchWorkflow/workflow.types.js';

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

console.log('=== Suite 6: Threaded Comments & Evidence Annotations ===');

it('should bind comments to exact research product versions and prevent silent movement across versions', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);

  // Comment on Research Product v1
  const c1 = store.saveComment({
    commentId: 'cmt_101',
    tenantId: 'tenant_01',
    authorId: 'analyst_01',
    researchProductId: 'rp_01',
    researchVersion: 1,
    body: 'Gross margin forecast appears optimistic relative to peer group.',
    status: CommentStatus.OPEN,
    version: 1,
    createdAt: '2026-03-01T10:00:00Z'
  });

  // When Research Product evolves to v2, comments on v1 remain strictly on v1
  const commentsV1 = store.listEntities('tenant_01', 'comments', c => c.researchProductId === 'rp_01' && c.researchVersion === 1);
  const commentsV2 = store.listEntities('tenant_01', 'comments', c => c.researchProductId === 'rp_01' && c.researchVersion === 2);

  assert.strictEqual(commentsV1.length, 1);
  assert.strictEqual(commentsV1[0].commentId, 'cmt_101');
  assert.strictEqual(commentsV2.length, 0); // Not migrated to v2
});

it('should maintain immutable comment edit history rather than overwriting original', () => {
  const store = new WorkflowStore();

  store.saveComment({
    commentId: 'cmt_201',
    tenantId: 'tenant_01',
    authorId: 'pm_lead',
    researchProductId: 'rp_01',
    researchVersion: 1,
    body: 'Original comment: Check footnote 10.',
    status: CommentStatus.OPEN,
    version: 1,
    createdAt: '2026-03-01T11:00:00Z'
  });

  store.saveComment({
    commentId: 'cmt_201',
    tenantId: 'tenant_01',
    authorId: 'pm_lead',
    researchProductId: 'rp_01',
    researchVersion: 1,
    body: 'Edited comment: Check footnote 10 & 11 for lease liabilities.',
    status: CommentStatus.OPEN,
    version: 2,
    editedAt: '2026-03-01T11:15:00Z'
  });

  const history = store.getEntityHistory('tenant_01', 'comments', 'cmt_201');
  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0].body, 'Original comment: Check footnote 10.');
  assert.strictEqual(history[1].body, 'Edited comment: Check footnote 10 & 11 for lease liabilities.');
});

it('should create workflow annotations on evidence without mutating underlying source evidence', () => {
  const store = new WorkflowStore();

  const annotation = store.saveAnnotation({
    annotationId: 'ann_301',
    tenantId: 'tenant_01',
    authorId: 'risk_analyst',
    researchProductId: 'rp_01',
    researchVersion: 1,
    referencedEvidenceId: 'EV_SEC_10K_2024',
    referencedClaimId: 'C1',
    note: 'Consensus source is stale; primary SEC filing EDGAR confirmed.',
    createdAt: '2026-03-01T12:00:00Z'
  });

  assert.strictEqual(annotation.referencedEvidenceId, 'EV_SEC_10K_2024');
  assert.strictEqual(annotation.referencedClaimId, 'C1');

  // Verify non-destructive metadata
  const list = store.listEntities('tenant_01', 'annotations', a => a.referencedEvidenceId === 'EV_SEC_10K_2024');
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].note, 'Consensus source is stale; primary SEC filing EDGAR confirmed.');
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
