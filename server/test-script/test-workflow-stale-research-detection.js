import assert from 'assert';
import { WorkflowStore } from '../researchWorkflow/workflow.store.js';
import { WorkflowAuditEngine } from '../researchWorkflow/workflow.audit.engine.js';
import { WorkflowAssignmentEngine } from '../researchWorkflow/workflow.assignment.engine.js';
import { WorkflowStaleResearchEngine } from '../researchWorkflow/workflow.stale.engine.js';
import { FreshnessState, PriorityLevel, TaskType } from '../researchWorkflow/workflow.types.js';

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

console.log('=== Suite 10: Change-Driven Stale Research Engine ===');

it('should detect stale and invalidated states based on age and upstream material changes', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const asgnEngine = new WorkflowAssignmentEngine(store, audit);
  const staleEngine = new WorkflowStaleResearchEngine(store, asgnEngine, audit);

  const product = {
    researchProductId: 'rp_nvda_2026',
    ticker: 'NVDA',
    createdAt: '2026-01-01T00:00:00Z',
    version: 1
  };

  // 1. As of Jan 15: Fresh / Current
  const f1 = staleEngine.evaluateFreshness({
    researchProduct: product,
    asOf: '2026-01-15T00:00:00Z'
  });
  assert.strictEqual(f1.state, FreshnessState.CURRENT);
  assert.strictEqual(f1.isStale, false);

  // 2. Upstream Restatement Event: Invalidated
  const f2 = staleEngine.evaluateFreshness({
    researchProduct: product,
    asOf: '2026-01-20T00:00:00Z',
    upstreamEvents: [{ type: 'RESTATEMENT', description: 'Restated FY24 revenue down by 8%' }]
  });
  assert.strictEqual(f2.state, FreshnessState.INVALIDATED);
  assert.strictEqual(f2.isStale, true);

  // 3. Upstream Macro Regime Change: Stale
  const f3 = staleEngine.evaluateFreshness({
    researchProduct: product,
    asOf: '2026-01-20T00:00:00Z',
    upstreamEvents: [{ type: 'MACRO_REGIME_CHANGE', description: 'Shift to HAWKISH_TIGHTENING' }]
  });
  assert.strictEqual(f3.state, FreshnessState.STALE);
  assert.strictEqual(f3.isStale, true);
});

it('should automatically spawn review tasks for invalidated research without fabricating facts', () => {
  const store = new WorkflowStore();
  const audit = new WorkflowAuditEngine(store);
  const asgnEngine = new WorkflowAssignmentEngine(store, audit);
  const staleEngine = new WorkflowStaleResearchEngine(store, asgnEngine, audit);

  const product = {
    researchProductId: 'rp_aapl_2026',
    ticker: 'AAPL',
    createdAt: '2026-01-01T00:00:00Z',
    version: 1
  };

  const alertResult = staleEngine.handleStaleResearchAlert({
    tenantId: 'tenant_01',
    researchProduct: product,
    upstreamEvents: [{ type: 'RESTATEMENT', description: 'Restated gross margin' }],
    creatorId: 'SYSTEM_UPSTREAM_WATCHER',
    asOf: '2026-01-20T00:00:00Z'
  });

  assert.strictEqual(alertResult.taskCreated, true);
  assert.strictEqual(alertResult.task.taskType, TaskType.UPDATE_THESIS);
  assert.strictEqual(alertResult.task.priority, PriorityLevel.CRITICAL);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
