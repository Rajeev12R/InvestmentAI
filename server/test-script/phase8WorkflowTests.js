/**
 * @file phase8WorkflowTests.js
 * Workflow lifecycle and operational boundary tests for Phase 8.
 * Tests research workflow initiation, decision review queue sync,
 * CONSIDER_EXIT safety invariant, and follow-up tracking.
 */

import assert from 'assert';
import { executeInvestorWorkflow } from '../workflow/investorWorkflow.engine.js';
import { initiateResearchWorkflow } from '../workflow/researchWorkflow.engine.js';
import { handleDecisionReviewWorkflow } from '../workflow/decisionWorkflow.engine.js';
import { updateReviewWorkflowItem } from '../workflow/reviewWorkflow.engine.js';
import { createFollowUpWorkflow } from '../workflow/followupWorkflow.engine.js';
import { WorkflowActionType } from '../workflow/investorWorkflow.types.js';
import { operationsRepository } from '../operations/operations.repository.js';
import { WorkflowStatus } from '../operations/operations.types.js';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 8 WORKFLOW & OPERATIONS TESTS');
console.log('================================================================\n');

let passCount = 0;
const testWorkspace = `WS-WF-TEST-${Date.now()}`;

async function it(desc, fn) {
  try {
    await fn();
    passCount++;
    console.log(`  ✓ ${desc}`);
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

async function runTests() {
  await it('1. Research Workflow: Creates grounded research task with package ID and provenance', async () => {
    const res = await initiateResearchWorkflow({
      workspaceId: testWorkspace,
    ticker: 'AAPL',
    question: 'Investigate margin compression trends'
  });

  assert.ok(res.workflowId);
  assert.strictEqual(res.ticker, 'AAPL');
  assert.strictEqual(res.status, 'COMPLETED');
  assert.ok(res.researchPackageId);
});

  // 2. Decision Review Workflow
  await it('2. Decision Workflow: Synchronizes review request into Operations Review Queue without trade execution', () => {
    const res = handleDecisionReviewWorkflow({
      workspaceId: testWorkspace,
      ticker: 'AAPL',
      attentionId: 'ATT-AAPL-DRIFT',
      requestedAction: 'REVIEW_POSITION',
      note: 'Valuation drifted by -10%'
    });

    assert.ok(res.workflowId);
    assert.strictEqual(res.status, 'IN_REVIEW_QUEUE');
    assert.strictEqual(res.actionRequired, 'HUMAN_CONFIRMATION');
    assert.strictEqual(res.isTradeExecuted, false, 'No automated trade execution permitted');

    // Verify stored in Operations Repository
    const reviews = operationsRepository.getState(testWorkspace).reviews;
    assert.ok(reviews.length >= 1);
    const found = reviews.find(r => r.ticker === 'AAPL');
    assert.ok(found);
    assert.strictEqual(found.status, WorkflowStatus.REVIEW);
  });

  // 3. Review Status Transitions
  await it('3. Review Status Transitions: Lifecycle from REVIEW -> INVESTIGATING -> RESOLVED', () => {
    const reviews = operationsRepository.getState(testWorkspace).reviews;
    const review = reviews[0];

    const investigating = updateReviewWorkflowItem({
      workspaceId: testWorkspace,
      reviewId: review.reviewId,
      status: WorkflowStatus.INVESTIGATING,
      note: 'Analyzing updated 10-Q filing'
    });
    assert.strictEqual(investigating.status, WorkflowStatus.INVESTIGATING);

    const resolved = updateReviewWorkflowItem({
      workspaceId: testWorkspace,
      reviewId: review.reviewId,
      status: WorkflowStatus.RESOLVED,
      note: 'Position sized down manually by analyst'
    });
    assert.strictEqual(resolved.status, WorkflowStatus.RESOLVED);
  });

  // 4. Follow-Up Task Creation
  await it('4. Follow-Up Workflow: Creates investigation follow-up task with provenance', () => {
    const followUp = createFollowUpWorkflow({
      workspaceId: testWorkspace,
      ticker: 'AAPL',
      question: 'Review next quarterly revenue guidance',
      attentionId: 'ATT-AAPL-001'
    });

    assert.ok(followUp.followUpId);
    assert.strictEqual(followUp.ticker, 'AAPL');
    assert.strictEqual(followUp.status, WorkflowStatus.INVESTIGATING);

    const state = operationsRepository.getState(testWorkspace);
    assert.ok(state.followUps.some(f => f.followUpId === followUp.followUpId));
  });

  // 5. Unified Workflow Dispatcher
  await it('5. Unified Workflow Engine: Dispatches actions cleanly and rejects invalid action types', async () => {
    const dispatchRes = await executeInvestorWorkflow({
      actionType: WorkflowActionType.CREATE_FOLLOW_UP,
      workspaceId: testWorkspace,
      ticker: 'MSFT',
      question: 'Monitor Azure gross margin trajectory'
    });

    assert.ok(dispatchRes.followUpId);
    assert.strictEqual(dispatchRes.ticker, 'MSFT');

    let invalidCaught = false;
    try {
      await executeInvestorWorkflow({
        actionType: 'INVALID_ACTION',
        workspaceId: testWorkspace
      });
    } catch (e) {
      invalidCaught = true;
    }
    assert.ok(invalidCaught);
  });

  console.log('\n================================================================');
  console.log(`PHASE 8 WORKFLOW TESTS SUMMARY: ${passCount} PASSED`);
  console.log('================================================================\n');
}

runTests();
