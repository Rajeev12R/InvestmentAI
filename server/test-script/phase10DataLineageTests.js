/**
 * @file phase10DataLineageTests.js
 * Comprehensive Unit & Integration Tests for Phase 10 Data Lineage, Period Integrity & Conflict Engine.
 */

import assert from 'assert';
import { dataLineageEngine } from '../connectivity/dataLineage.engine.js';
import { sourceConflictEngine } from '../connectivity/sourceConflictEngine.js';
import { productionIngestionOrchestrator } from '../connectivity/productionIngestion.orchestrator.js';
import { SourceTier, PeriodType } from '../connectivity/source.types.js';
import { jobQueue } from '../jobs/job.queue.js';
import { JobStatus } from '../jobs/job.types.js';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 10 DATA LINEAGE & CONFLICT ENGINE SUITE');
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
  console.log('▶ Testing End-to-End Data Lineage Recording & Verification...');
  const trace = dataLineageEngine.recordLineage({
    ticker: 'AAPL',
    metric: 'REVENUE',
    period: 'FY2025',
    displayedValue: 391035000000,
    truthFactId: 'FACT-AAPL-REV-FY2025',
    snapshotId: 'SNAP-AAPL-2026-T1',
    candidateId: 'CAND-AAPL-REV-001',
    eventId: 'EVT-AAPL-10K-001',
    rawRecordId: 'RAW-AAPL-10K-001',
    providerId: 'SRC-SEC-EDGAR',
    sourceUri: 'https://data.sec.gov/edgar/aapl/2025/10k.htm',
    retrievalTimestamp: new Date().toISOString(),
    packageHash: 'a'.repeat(64)
  });

  check(trace.lineageId.startsWith('LIN-'), 'Lineage record generated with valid ID');
  checkEqual(trace.ticker, 'AAPL', 'Lineage ticker matches AAPL');
  checkEqual(trace.metric, 'REVENUE', 'Lineage metric matches REVENUE');

  const lineageLookup = dataLineageEngine.getLineage('AAPL', 'REVENUE', 'FY2025');
  checkEqual(lineageLookup.status, 'VERIFIED', 'Lineage status is VERIFIED');
  checkEqual(lineageLookup.chain.length, 6, 'Complete 6-stage provenance chain present');
  checkEqual(lineageLookup.chain[0].stage, 'DISPLAYED_VALUE', 'Stage 1 is DISPLAYED_VALUE');
  checkEqual(lineageLookup.chain[5].stage, 'RAW_RECORD', 'Stage 6 is RAW_RECORD');

  const unavailLookup = dataLineageEngine.getLineage('UNKNOWN_TICKER', 'REVENUE', 'FY2025');
  checkEqual(unavailLookup.status, 'UNAVAILABLE', 'Missing lineage returns UNAVAILABLE without fabricating trace');

  console.log('▶ Testing Source Conflict Resolution (Tier-Based Resolution)...');
  // Scenario 1: Tier 1 (SEC) vs Tier 3 (Yahoo) -> Tier 1 wins
  const conflictRes1 = sourceConflictEngine.resolveConflict({
    metric: 'REVENUE',
    candidates: [
      { sourceId: 'SRC-YAHOO-FINANCE', sourceTier: SourceTier.TIER_3_SECONDARY, value: 390000000000, period: 'FY2025', timestamp: '2025-11-02' },
      { sourceId: 'SRC-SEC-EDGAR', sourceTier: SourceTier.TIER_1_PRIMARY, value: 391035000000, period: 'FY2025', timestamp: '2025-11-01' }
    ]
  });
  checkEqual(conflictRes1.status, 'RESOLVED', 'Conflict successfully resolved');
  checkEqual(conflictRes1.selectedFact.sourceTier, SourceTier.TIER_1_PRIMARY, 'Tier 1 Primary source selected over Tier 3');
  checkEqual(conflictRes1.selectedFact.value, 391035000000, 'Selected exact Tier 1 value');
  checkEqual(conflictRes1.rejectedFacts.length, 1, 'Lower tier candidate recorded in rejectedFacts');

  console.log('▶ Testing Source Conflict Resolution (Restatement Precedence)...');
  // Scenario 2: Same Tier with Restatement
  const conflictRes2 = sourceConflictEngine.resolveConflict({
    metric: 'REVENUE',
    candidates: [
      { sourceId: 'SRC-SEC-EDGAR', sourceTier: SourceTier.TIER_1_PRIMARY, value: 100, period: 'FY2025', isRestated: false, timestamp: '2025-11-01' },
      { sourceId: 'SRC-SEC-EDGAR', sourceTier: SourceTier.TIER_1_PRIMARY, value: 110, period: 'FY2025', isRestated: true, timestamp: '2026-02-01' }
    ]
  });
  checkEqual(conflictRes2.status, 'RESOLVED', 'Restatement conflict resolved');
  checkEqual(conflictRes2.selectedFact.value, 110, 'Restated fact selected');
  checkEqual(conflictRes2.selectedFact.isRestated, true, 'Selected fact marked as restated');

  console.log('▶ Testing Source Conflict Resolution (Irreconcilable Same-Tier Divergence)...');
  // Scenario 3: Same Tier, Same Recency, Divergent Values without Restatement -> Must NOT average!
  const conflictRes3 = sourceConflictEngine.resolveConflict({
    metric: 'REVENUE',
    candidates: [
      { sourceId: 'SRC-TIER1-A', sourceTier: SourceTier.TIER_1_PRIMARY, value: 100, period: 'FY2025', isRestated: false, timestamp: '2025-11-01' },
      { sourceId: 'SRC-TIER1-B', sourceTier: SourceTier.TIER_1_PRIMARY, value: 150, period: 'FY2025', isRestated: false, timestamp: '2025-11-01' }
    ]
  });
  checkEqual(conflictRes3.status, 'UNAVAILABLE', 'Irreconcilable same-tier conflict returns UNAVAILABLE');
  checkEqual(conflictRes3.selectedFact, null, 'No fact selected (Averaging strictly prohibited)');
  check(conflictRes3.reason.includes('Averaging prohibited'), 'Reason explicitly states averaging prohibited');

  console.log('▶ Testing Period Integrity (FY vs Q1 vs TTM Separation)...');
  const periodConflict = sourceConflictEngine.resolveConflict({
    metric: 'REVENUE',
    candidates: [
      { sourceId: 'SRC-SEC-EDGAR', sourceTier: SourceTier.TIER_1_PRIMARY, value: 100, period: 'FY2025' },
      { sourceId: 'SRC-SEC-EDGAR', sourceTier: SourceTier.TIER_1_PRIMARY, value: 25, period: 'Q1_2025' }
    ]
  });
  checkEqual(periodConflict.status, 'CONFLICTING', 'Period mismatch flagged as CONFLICTING');

  console.log('▶ Testing Prioritized Ingestion Orchestration via Job Queue...');
  const ws = `LINEAGE-WS-${Date.now()}`;
  const job = await productionIngestionOrchestrator.scheduleIngestionJob({
    jobType: 'FUNDAMENTAL_REFRESH',
    workspaceId: ws,
    payload: { ticker: 'AAPL', period: 'FY2025' },
    priority: 'HIGH'
  });

  check(job.jobId.startsWith('JOB-'), 'Ingestion job enqueued with valid ID');
  checkEqual(job.priority, 'HIGH', 'Job assigned HIGH priority');

  // Process next job
  const processed = await jobQueue.processNextJob();
  checkEqual(processed.jobId, job.jobId, 'Job processed by queue worker');
  checkEqual(processed.status, JobStatus.SUCCEEDED, 'Job completed successfully');
  check(processed.result.fundamentals !== undefined, 'Job result contains normalized fundamentals');

  console.log('\n================================================================');
  console.log(`PHASE 10 DATA LINEAGE TEST SUITE COMPLETE: ${passCount} ASSERTIONS PASSED`);
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
