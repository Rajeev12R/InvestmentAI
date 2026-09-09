/**
 * @file phase7OperationsTests.js
 * Test suite for Phase 7 Decision Operations & Review Queue.
 * Tests decision review queue generation, urgency scoring, workflow status transitions,
 * persistence, and strict separation between workflow state and Truth facts.
 */

import assert from 'assert';
import { generateDecisionReviews } from '../operations/decisionReview.engine.js';
import { processDecisionOperations } from '../operations/operations.engine.js';
import { calculateOperationalUrgency } from '../operations/priority.engine.js';
import { createFollowUpItem } from '../operations/followUp.engine.js';
import { OperationsRepository } from '../operations/operations.repository.js';
import { WorkflowStatus, ReviewUrgency, RecommendedReviewAction, validateDecisionReviewItem } from '../operations/operations.types.js';
import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 7 DECISION OPERATIONS TEST SUITE');
console.log('================================================================\n');

let passCount = 0;

function it(desc, fn) {
  try {
    fn();
    passCount++;
    console.log(`  ✓ ${desc}`);
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Urgency Scoring Tests
it('1. Operational Urgency: Assigns IMMEDIATE urgency to AVOID downgrades and triggered breakers', () => {
  const urgency1 = calculateOperationalUrgency({ previousDecision: 'BUY', currentDecision: 'AVOID' });
  const urgency2 = calculateOperationalUrgency({ thesisBreakerStatus: 'TRIGGERED' });
  assert.strictEqual(urgency1, ReviewUrgency.IMMEDIATE);
  assert.strictEqual(urgency2, ReviewUrgency.IMMEDIATE);
});

it('2. Operational Urgency: Assigns HIGH urgency to BUY -> WATCH and approaching breakers', () => {
  const urgency1 = calculateOperationalUrgency({ previousDecision: 'BUY', currentDecision: 'WATCH' });
  const urgency2 = calculateOperationalUrgency({ thesisBreakerStatus: 'APPROACHING' });
  assert.strictEqual(urgency1, ReviewUrgency.HIGH);
  assert.strictEqual(urgency2, ReviewUrgency.HIGH);
});

// 2. Decision Review Generation Tests
it('3. Decision Reviews: Generates review items from decision shift attention items', () => {
  const attentionItems = [
    {
      attentionId: 'ATT-1',
      ticker: 'AAPL',
      previousDecision: 'BUY',
      currentDecision: 'AVOID',
      thesisBreakerStatus: 'TRIGGERED',
      packageHash: 'HASH-100',
      evidenceIds: ['EVD-10']
    }
  ];

  const reviews = generateDecisionReviews(attentionItems);
  assert.strictEqual(reviews.length, 1);
  assert.strictEqual(reviews[0].ticker, 'AAPL');
  assert.strictEqual(reviews[0].urgency, ReviewUrgency.IMMEDIATE);
  assert.strictEqual(reviews[0].status, WorkflowStatus.REVIEW);
  assert.strictEqual(reviews[0].recommendedAction, RecommendedReviewAction.CONSIDER_EXIT);
  assert.deepStrictEqual(reviews[0].evidenceIds, ['EVD-10']);
});

it('4. Decision Reviews: Generates review item for approaching thesis breaker', () => {
  const attentionItems = [
    {
      attentionId: 'ATT-2',
      ticker: 'RELIANCE.NS',
      previousDecision: 'BUY',
      currentDecision: 'BUY',
      thesisBreakerStatus: 'APPROACHING',
      packageHash: 'HASH-200'
    }
  ];

  const reviews = generateDecisionReviews(attentionItems);
  assert.strictEqual(reviews.length, 1);
  assert.strictEqual(reviews[0].ticker, 'RELIANCE.NS');
  assert.strictEqual(reviews[0].recommendedAction, RecommendedReviewAction.MONITOR_METRICS);
});

// 3. Follow-up Engine Tests
it('5. Follow-Up Engine: Creates tracking item for research investigation', () => {
  const followUp = createFollowUpItem({
    ticker: 'AAPL',
    attentionId: 'ATT-1',
    question: 'Why did operating margin decline in Q3?'
  });

  assert.strictEqual(followUp.ticker, 'AAPL');
  assert.strictEqual(followUp.status, WorkflowStatus.INVESTIGATING);
  assert.strictEqual(followUp.assignedTo, 'ANALYST');
});

// 4. Persistence & Truth Isolation Tests
it('6. Operations Repository: Persists workflow status updates without mutating truth facts', () => {
  const testDir = path.resolve(process.cwd(), 'server', 'data', 'test_operations');
  const repo = new OperationsRepository(testDir);
  const wsId = 'TEST_WS_' + Date.now();

  const reviews = [
    {
      reviewId: 'REV-1',
      attentionId: 'ATT-1',
      ticker: 'AAPL',
      currentDecision: 'AVOID',
      reason: 'Decision downgraded',
      urgency: 'IMMEDIATE',
      status: WorkflowStatus.REVIEW,
      recommendedAction: 'CONSIDER_EXIT',
      packageHash: 'HASH-ORIGINAL-TRUTH',
      createdAt: new Date().toISOString()
    }
  ];

  repo.syncReviews(wsId, reviews);

  // User changes status to INVESTIGATING and adds a note
  const updated = repo.updateReviewStatus(wsId, 'REV-1', WorkflowStatus.INVESTIGATING, 'Checking supply chain impact');
  assert.strictEqual(updated.status, WorkflowStatus.INVESTIGATING);
  assert.strictEqual(updated.notes.length, 1);
  assert.strictEqual(updated.packageHash, 'HASH-ORIGINAL-TRUTH'); // Truth package hash strictly preserved

  // Re-syncing does not overwrite user workflow status
  const resynced = repo.syncReviews(wsId, reviews);
  assert.strictEqual(resynced[0].status, WorkflowStatus.INVESTIGATING);
  assert.strictEqual(resynced[0].notes.length, 1);

  // Clean up
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (e) {}
});

it('7. Operations Repository: Rejects invalid workflow status transitions', () => {
  const testDir = path.resolve(process.cwd(), 'server', 'data', 'test_operations_invalid');
  const repo = new OperationsRepository(testDir);
  const wsId = 'TEST_WS_INVALID';

  assert.throws(() => {
    repo.updateReviewStatus(wsId, 'REV-FAKE', 'INVALID_STATUS');
  });

  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (e) {}
});

it('8. Operations Repository: Updates follow-up status and appends findings', () => {
  const testDir = path.resolve(process.cwd(), 'server', 'data', 'test_ops_followup');
  const repo = new OperationsRepository(testDir);
  const wsId = 'TEST_WS_FUP';

  const item = createFollowUpItem({ ticker: 'AAPL', attentionId: 'ATT-1', question: 'Verify DCF WACC' });
  repo.saveFollowUp(wsId, item);

  const updated = repo.updateFollowUpStatus(wsId, item.followUpId, WorkflowStatus.RESOLVED, 'WACC sensitivity is 8.5% to 9.5%');
  assert.strictEqual(updated.status, WorkflowStatus.RESOLVED);
  assert.strictEqual(updated.findings, 'WACC sensitivity is 8.5% to 9.5%');

  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (e) {}
});

it('9. Decision Review Sorting: Orders IMMEDIATE before HIGH, NORMAL, and LOW', () => {
  const items = [
    { ticker: 'A', attentionId: '1', currentDecision: 'WATCH', previousDecision: 'BUY', packageHash: 'H1' },
    { ticker: 'B', attentionId: '2', currentDecision: 'AVOID', previousDecision: 'BUY', packageHash: 'H2' },
    { ticker: 'C', attentionId: '3', currentDecision: 'BUY', previousDecision: 'BUY', metrics: { valuationDriftPct: 12.0 }, packageHash: 'H3' }
  ];

  const reviews = generateDecisionReviews(items);
  assert.strictEqual(reviews.length, 3);
  assert.strictEqual(reviews[0].ticker, 'B'); // IMMEDIATE
  assert.strictEqual(reviews[1].ticker, 'A'); // HIGH
  assert.strictEqual(reviews[2].ticker, 'C'); // NORMAL
});

it('10. Decision Reviews: Generates review on valuation drift >= 10%', () => {
  const items = [
    { ticker: 'AAPL', attentionId: 'ATT-V', currentDecision: 'BUY', previousDecision: 'BUY', metrics: { valuationDriftPct: -14.2 }, packageHash: 'HV' }
  ];
  const reviews = generateDecisionReviews(items);
  assert.strictEqual(reviews.length, 1);
  assert.strictEqual(reviews[0].recommendedAction, RecommendedReviewAction.REVIEW_VALUATION);
});

it('11. Decision Reviews: Generates review on portfolio concentration category', () => {
  const items = [
    { ticker: 'AAPL', attentionId: 'ATT-C', category: 'PORTFOLIO_CONCENTRATION', currentDecision: 'BUY', packageHash: 'HC' }
  ];
  const reviews = generateDecisionReviews(items);
  assert.strictEqual(reviews.length, 1);
  assert.strictEqual(reviews[0].recommendedAction, RecommendedReviewAction.REVIEW_POSITION_SIZING);
});

it('12. Operations Repository: Appends multiple sequential notes to review item', () => {
  const testDir = path.resolve(process.cwd(), 'server', 'data', 'test_ops_notes');
  const repo = new OperationsRepository(testDir);
  const wsId = 'TEST_WS_NOTES';

  repo.syncReviews(wsId, [{
    reviewId: 'REV-N',
    ticker: 'AAPL',
    currentDecision: 'WATCH',
    reason: 'Drift',
    urgency: 'HIGH',
    status: WorkflowStatus.REVIEW,
    recommendedAction: 'MONITOR_METRICS',
    packageHash: 'H-NOTES',
    createdAt: new Date().toISOString()
  }]);

  repo.updateReviewStatus(wsId, 'REV-N', WorkflowStatus.INVESTIGATING, 'First review note');
  repo.updateReviewStatus(wsId, 'REV-N', WorkflowStatus.INVESTIGATING, 'Second follow-up note');

  const state = repo.getState(wsId);
  assert.strictEqual(state.reviews[0].notes.length, 2);
  assert.strictEqual(state.reviews[0].notes[0].text, 'First review note');
  assert.strictEqual(state.reviews[0].notes[1].text, 'Second follow-up note');

  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (e) {}
});

it('13. Operations Repository: Empty review sync returns empty array gracefully', () => {
  const testDir = path.resolve(process.cwd(), 'server', 'data', 'test_ops_empty');
  const repo = new OperationsRepository(testDir);
  const res = repo.syncReviews('EMPTY_WS', []);
  assert.strictEqual(res.length, 0);

  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (e) {}
});

it('14. Types Validation: Validates correct DecisionReviewItem schema', () => {
  const valid = {
    reviewId: 'R1', ticker: 'AAPL', currentDecision: 'BUY', reason: 'Review',
    urgency: 'HIGH', status: 'REVIEW', recommendedAction: 'MONITOR_METRICS',
    createdAt: 'now', packageHash: 'H1'
  };
  const res = validateDecisionReviewItem(valid);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.errors.length, 0);
});

it('15. Types Validation: Rejects missing currentDecision in DecisionReviewItem', () => {
  const invalid = { reviewId: 'R1', ticker: 'AAPL' };
  const res = validateDecisionReviewItem(invalid);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('currentDecision')));
});

it('16. Types Validation: Rejects invalid review urgency', () => {
  const invalid = {
    reviewId: 'R1', ticker: 'AAPL', currentDecision: 'BUY', reason: 'Review',
    urgency: 'NOT_A_REAL_URGENCY', status: 'REVIEW', recommendedAction: 'MONITOR_METRICS',
    createdAt: 'now', packageHash: 'H1'
  };
  const res = validateDecisionReviewItem(invalid);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('Invalid urgency')));
});

it('17. Operational Urgency: Assigns LOW urgency for minor, unshifted metrics', () => {
  const urgency = calculateOperationalUrgency({ previousDecision: 'HOLD', currentDecision: 'HOLD', valuationDriftPct: 1.0 });
  assert.strictEqual(urgency, ReviewUrgency.LOW);
});

it('18. Operational Urgency: Assigns NORMAL urgency on 5-10% valuation drift without decision change', () => {
  const urgency = calculateOperationalUrgency({ previousDecision: 'BUY', currentDecision: 'BUY', valuationDriftPct: 7.5 });
  assert.strictEqual(urgency, ReviewUrgency.NORMAL);
});

it('19. Operational Urgency: Assigns HIGH urgency on >= 15% valuation drift', () => {
  const urgency = calculateOperationalUrgency({ previousDecision: 'BUY', currentDecision: 'BUY', valuationDriftPct: -16.0 });
  assert.strictEqual(urgency, ReviewUrgency.HIGH);
});

it('20. Follow-up Engine: Creates follow-up with custom assignee', () => {
  const fup = createFollowUpItem({ ticker: 'JPM', attentionId: 'A2', question: 'Audit loan book', assignedTo: 'SENIOR_RISK_OFFICER' });
  assert.strictEqual(fup.assignedTo, 'SENIOR_RISK_OFFICER');
  assert.strictEqual(fup.ticker, 'JPM');
});

it('21. Operations Repository: Updates existing follow-up item in-place', () => {
  const testDir = path.resolve(process.cwd(), 'server', 'data', 'test_ops_in_place');
  const repo = new OperationsRepository(testDir);
  const wsId = 'WS-IN-PLACE';

  const fup = createFollowUpItem({ ticker: 'AAPL', attentionId: 'A1', question: 'Original Q' });
  repo.saveFollowUp(wsId, fup);

  fup.question = 'Updated Q';
  repo.saveFollowUp(wsId, fup);

  const state = repo.getState(wsId);
  assert.strictEqual(state.followUps.length, 1);
  assert.strictEqual(state.followUps[0].question, 'Updated Q');

  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (e) {}
});

it('22. Operations Repository: Throws when updating non-existent follow-up ID', () => {
  const testDir = path.resolve(process.cwd(), 'server', 'data', 'test_ops_missing_fup');
  const repo = new OperationsRepository(testDir);
  assert.throws(() => {
    repo.updateFollowUpStatus('WS', 'NON_EXISTENT_ID', WorkflowStatus.RESOLVED);
  });
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (e) {}
});

it('23. Operations Repository: Throws when updating non-existent review ID', () => {
  const testDir = path.resolve(process.cwd(), 'server', 'data', 'test_ops_missing_rev');
  const repo = new OperationsRepository(testDir);
  assert.throws(() => {
    repo.updateReviewStatus('WS', 'NON_EXISTENT_REV_ID', WorkflowStatus.DISMISSED);
  });
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (e) {}
});

it('24. Operations Repository: Isolates follow-ups between separate workspaces', () => {
  const testDir = path.resolve(process.cwd(), 'server', 'data', 'test_ops_iso');
  const repo = new OperationsRepository(testDir);
  const fupA = createFollowUpItem({ ticker: 'AAPL', attentionId: 'A1', question: 'QA' });
  const fupB = createFollowUpItem({ ticker: 'JPM', attentionId: 'A2', question: 'QB' });

  repo.saveFollowUp('WS-A', fupA);
  repo.saveFollowUp('WS-B', fupB);

  const stateA = repo.getState('WS-A');
  const stateB = repo.getState('WS-B');

  assert.strictEqual(stateA.followUps.length, 1);
  assert.strictEqual(stateA.followUps[0].ticker, 'AAPL');
  assert.strictEqual(stateB.followUps.length, 1);
  assert.strictEqual(stateB.followUps[0].ticker, 'JPM');

  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (e) {}
});

it('25. Decision Reviews: Empty attention items list generates empty review list', () => {
  const reviews = generateDecisionReviews([]);
  assert.deepStrictEqual(reviews, []);
});

it('26. Decision Reviews: Preserves multiple changeIds and eventIds in review item', () => {
  const items = [{
    attentionId: 'A1', ticker: 'AAPL', previousDecision: 'BUY', currentDecision: 'AVOID',
    changeIds: ['C1', 'C2'], eventIds: ['E1', 'E2'], packageHash: 'H1'
  }];
  const reviews = generateDecisionReviews(items);
  assert.deepStrictEqual(reviews[0].changeIds, ['C1', 'C2']);
  assert.deepStrictEqual(reviews[0].eventIds, ['E1', 'E2']);
});

it('27. Workflow Status: Supports DISMISSED workflow state', () => {
  const testDir = path.resolve(process.cwd(), 'server', 'data', 'test_ops_dismissed');
  const repo = new OperationsRepository(testDir);
  const wsId = 'WS-DISMISSED-TEST';
  repo.syncReviews(wsId, [{
    reviewId: 'R1', ticker: 'AAPL', currentDecision: 'WATCH', reason: 'R', urgency: 'LOW',
    status: WorkflowStatus.REVIEW, recommendedAction: 'MONITOR_METRICS', packageHash: 'H', createdAt: 'now'
  }]);
  const updated = repo.updateReviewStatus(wsId, 'R1', WorkflowStatus.DISMISSED, 'Noise event');
  assert.strictEqual(updated.status, WorkflowStatus.DISMISSED);
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (e) {}
});

it('28. Workflow Status: Supports RESOLVED workflow state', () => {
  const testDir = path.resolve(process.cwd(), 'server', 'data', 'test_ops_resolved');
  const repo = new OperationsRepository(testDir);
  const wsId = 'WS-RESOLVED-TEST';
  repo.syncReviews(wsId, [{
    reviewId: 'R1', ticker: 'AAPL', currentDecision: 'WATCH', reason: 'R', urgency: 'LOW',
    status: WorkflowStatus.REVIEW, recommendedAction: 'MONITOR_METRICS', packageHash: 'H', createdAt: 'now'
  }]);
  const updated = repo.updateReviewStatus(wsId, 'R1', WorkflowStatus.RESOLVED, 'Addressed in committee');
  assert.strictEqual(updated.status, WorkflowStatus.RESOLVED);
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (e) {}
});

it('29. Operations Engine: Syncs and returns updated reviews array via processDecisionOperations', () => {
  const reviews = processDecisionOperations({
    workspaceId: 'WS-OPS-ENGINE-TEST',
    attentionItems: [{
      attentionId: 'A-ENG', ticker: 'TMPV.NS', previousDecision: 'BUY', currentDecision: 'AVOID', packageHash: 'H-ENG'
    }]
  });
  assert.ok(reviews.length >= 1);
  assert.strictEqual(reviews[0].ticker, 'TMPV.NS');
});

it('30. Recommended Action: Assigns MONITOR_METRICS on BUY -> WATCH transition', () => {
  const items = [{
    attentionId: 'A-WATCH', ticker: 'AAPL', previousDecision: 'BUY', currentDecision: 'WATCH', packageHash: 'H-W'
  }];
  const reviews = generateDecisionReviews(items);
  assert.strictEqual(reviews[0].recommendedAction, RecommendedReviewAction.MONITOR_METRICS);
});

console.log(`\n================================================================`);
console.log(`PHASE 7 DECISION OPERATIONS TESTS: ${passCount} / ${passCount} PASSED`);
console.log(`================================================================\n`);
