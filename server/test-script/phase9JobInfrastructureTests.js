/**
 * @file phase9JobInfrastructureTests.js
 * Comprehensive Unit & Integration Tests for Phase 9 Persistent Job Queue & Worker Infrastructure.
 */

import assert from 'assert';
import { jobQueue } from '../jobs/job.queue.js';
import { JobType, JobStatus } from '../jobs/job.types.js';
import { idempotencyEngine } from '../jobs/idempotency.engine.js';
import { transactionEngine } from '../infrastructure/transaction.engine.js';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 9 JOB INFRASTRUCTURE & WORKERS TEST SUITE');
console.log('================================================================\n');

let passCount = 0;
function check(cond, msg) {
  assert.ok(cond, msg);
  passCount++;
}
function checkEqual(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg);
  passCount++;
}

async function runTests() {
  const ws = `JOB-TEST-WS-${Date.now()}`;

  console.log('▶ Testing Job Enqueue, Priority Ordering & FIFO...');
  jobQueue.registerHandler('MOCK_TEST_TASK', async (payload) => {
    if (payload.shouldFail) throw new Error('Deliberate task failure');
    return { processed: true, value: payload.val * 2 };
  });

  const j1 = jobQueue.enqueueJob({
    type: 'MOCK_TEST_TASK',
    workspaceId: ws,
    payload: { val: 10 },
    priority: 'NORMAL'
  });
  check(j1.jobId.startsWith('JOB-'), 'Job enqueued with valid ID');
  checkEqual(j1.status, JobStatus.QUEUED, 'Initial status is QUEUED');

  const j2High = jobQueue.enqueueJob({
    type: 'MOCK_TEST_TASK',
    workspaceId: ws,
    payload: { val: 50 },
    priority: 'HIGH'
  });
  check(j2High.jobId.startsWith('JOB-'), 'High priority job enqueued');

  // Process next job - High priority must be processed first
  const processedFirst = await jobQueue.processNextJob();
  checkEqual(processedFirst.jobId, j2High.jobId, 'High priority job processed before normal FIFO');
  checkEqual(processedFirst.status, JobStatus.SUCCEEDED, 'High priority job succeeded');
  checkEqual(processedFirst.result.value, 100, 'Handler executed and returned result');

  // Process normal priority job
  const processedSecond = await jobQueue.processNextJob();
  checkEqual(processedSecond.jobId, j1.jobId, 'Normal priority job processed next');
  checkEqual(processedSecond.status, JobStatus.SUCCEEDED, 'Normal priority job succeeded');

  console.log('▶ Testing Job Retries, Exponential Backoff & Dead-Letter Queue...');
  const failJob = jobQueue.enqueueJob({
    type: 'MOCK_TEST_TASK',
    workspaceId: ws,
    payload: { shouldFail: true },
    maxRetries: 2
  });

  // First attempt (Attempt 1 -> Retrying)
  const att1 = await jobQueue.processNextJob();
  checkEqual(att1.status, JobStatus.RETRYING, 'Attempt 1 failed and flagged for retry');
  checkEqual(att1.attempts, 1, 'Attempt counter incremented to 1');

  // Second attempt (Attempt 2 -> Dead Letter)
  const att2 = await jobQueue.processNextJob();
  checkEqual(att2.status, JobStatus.DEAD_LETTER, 'Max retries exhausted; job moved to DEAD_LETTER');
  checkEqual(att2.attempts, 2, 'Attempt counter reached max retries (2)');
  check(att2.attemptsHistory.length === 2, 'Full failure attempt history preserved');

  const queueStats = jobQueue.getQueueStats();
  check(queueStats.deadLetterCount >= 1, 'Dead letter queue tracks failed job');

  console.log('▶ Testing Distributed-Safe Idempotency...');
  const idemKey = idempotencyEngine.generateKey({
    workspaceId: ws,
    sourceId: 'SEC_EDGAR_10Q',
    sourceRecordHash: 'abcdef1234567890'.repeat(4),
    eventType: 'FINANCIAL_UPDATE',
    reportingPeriod: '2026_Q2'
  });
  checkEqual(idemKey.length, 64, 'Idempotency key generated with SHA-256');

  const jobA = jobQueue.enqueueJob({
    type: 'MOCK_TEST_TASK',
    workspaceId: ws,
    payload: { val: 25 },
    idempotencyKey: idemKey
  });
  await jobQueue.processNextJob();

  // Duplicate submission with same idempotency key
  const jobADup = jobQueue.enqueueJob({
    type: 'MOCK_TEST_TASK',
    workspaceId: ws,
    payload: { val: 25 },
    idempotencyKey: idemKey
  });
  checkEqual(jobADup.isDuplicate, true, 'Duplicate submission detected via idempotency key');
  checkEqual(jobADup.status, JobStatus.SUCCEEDED, 'Returned prior successful status without re-enqueue');

  console.log('▶ Testing Transactional Boundaries & Compensating Rollbacks...');
  let rollbackExecuted = false;
  const txResult = await transactionEngine.executeTransaction({
    name: 'TEST_INGESTION_TRANSACTION',
    steps: [
      {
        step: 'STEP_1_RAW_PERSISTENCE',
        execute: async () => ({ rawId: 'RAW-001' }),
        rollback: async (res) => { rollbackExecuted = true; }
      },
      {
        step: 'STEP_2_EVENT_NORMALIZATION',
        execute: async () => { throw new Error('Event schema validation failed'); }
      }
    ]
  });
  checkEqual(txResult.success, false, 'Transaction failed gracefully on error');
  checkEqual(txResult.failedStep, 'STEP_2_EVENT_NORMALIZATION', 'Identified exact failing step');
  checkEqual(txResult.rolledBack, true, 'Transaction marked as rolled back');
  checkEqual(rollbackExecuted, true, 'Compensating rollback handler executed for prior steps');

  console.log('\n================================================================');
  console.log(`PHASE 9 JOB INFRASTRUCTURE TEST SUITE COMPLETE: ${passCount} ASSERTIONS PASSED`);
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
