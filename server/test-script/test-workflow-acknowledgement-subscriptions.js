import assert from 'assert';
import { WorkflowStore } from '../researchWorkflow/workflow.store.js';
import { WorkflowAuditEngine } from '../researchWorkflow/workflow.audit.engine.js';
import { WorkflowNotificationEngine } from '../researchWorkflow/workflow.notification.engine.js';

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

console.log('=== Suite 12: Subscriptions & Notification Engine ===');

it('should route notifications based on active subscriptions and direct assignments', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const engine = new WorkflowNotificationEngine(store, audit);

  // Subscribe user 1 to NVDA research
  engine.subscribe({
    tenantId: 'tenant_01',
    subscriberId: 'user_01',
    targetType: 'SECURITY',
    targetId: 'NVDA'
  });

  // Event on NVDA -> user_01 receives notification
  const res1 = engine.evaluateNotification({
    tenantId: 'tenant_01',
    event: { action: 'RESEARCH_PUBLISHED', targetId: 'NVDA' },
    targetType: 'SECURITY',
    targetId: 'NVDA',
    recipientId: 'user_01'
  });
  assert.strictEqual(res1.decision, 'REQUIRED');

  // Event on AAPL (not subscribed) -> notification suppressed
  const res2 = engine.evaluateNotification({
    tenantId: 'tenant_01',
    event: { action: 'RESEARCH_PUBLISHED', targetId: 'AAPL' },
    targetType: 'SECURITY',
    targetId: 'AAPL',
    recipientId: 'user_01'
  });
  assert.strictEqual(res2.decision, 'SUPPRESSED');
});

it('should deduplicate rapid identical notifications while permitting critical broadcasts', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const engine = new WorkflowNotificationEngine(store, audit);

  engine.subscribe({
    tenantId: 'tenant_01',
    subscriberId: 'user_02',
    targetType: 'PORTFOLIO',
    targetId: 'FUND_01'
  });

  // First notification: REQUIRED
  const n1 = engine.evaluateNotification({
    tenantId: 'tenant_01',
    event: { action: 'FACTOR_EXPOSURE_UPDATED' },
    targetType: 'PORTFOLIO',
    targetId: 'FUND_01',
    recipientId: 'user_02',
    severity: 'MEDIUM'
  });
  assert.strictEqual(n1.decision, 'REQUIRED');

  // Immediate second identical notification: SUPPRESSED (deduplicated)
  const n2 = engine.evaluateNotification({
    tenantId: 'tenant_01',
    event: { action: 'FACTOR_EXPOSURE_UPDATED' },
    targetType: 'PORTFOLIO',
    targetId: 'FUND_01',
    recipientId: 'user_02',
    severity: 'MEDIUM'
  });
  assert.strictEqual(n2.decision, 'SUPPRESSED');
  assert.ok(n2.reason.includes('Deduplicated'));

  // Critical event bypasses normal rate suppression
  const n3 = engine.evaluateNotification({
    tenantId: 'tenant_01',
    event: { action: 'FACTOR_EXPOSURE_UPDATED' },
    targetType: 'PORTFOLIO',
    targetId: 'FUND_01',
    recipientId: 'user_02',
    severity: 'CRITICAL'
  });
  assert.strictEqual(n3.decision, 'REQUIRED');
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
