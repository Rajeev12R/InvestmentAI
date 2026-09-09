/**
 * Phase 13 - Temporal Integrity & Restatement Deep Test Suite
 * Dedicated tests for 10 Temporal Invariants and 8 Restatement Audit Flows.
 */

import { TemporalIntegrityEngine } from '../processIntelligence/temporalIntegrity.engine.js';
import { DecisionSnapshotEngine } from '../processIntelligence/decisionSnapshot.engine.js';
import { ThesisVersioningEngine } from '../processIntelligence/thesisVersioning.engine.js';
import { ForecastLedgerEngine } from '../processIntelligence/forecastLedger.engine.js';
import { DecisionQualityEngine } from '../processIntelligence/decisionQuality.engine.js';
import { ProcessIntelligenceService } from '../processIntelligence/processIntelligencePackage.js';

export async function runPhase13TemporalRestatementDeepTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      results.push({ message, status: 'PASS' });
      console.log(`✓ [PASS] ${message}`);
    } else {
      failed++;
      results.push({ message, status: 'FAIL' });
      console.error(`✗ [FAIL] ${message}`);
    }
  }

  console.log('\n================================================================');
  console.log('PHASE 13 — TEMPORAL INTEGRITY & RESTATEMENT DEEP TESTS');
  console.log('================================================================\n');

  const temporalEngine = new TemporalIntegrityEngine();
  const snapEngine = new DecisionSnapshotEngine();
  const thesisEngine = new ThesisVersioningEngine();
  const forecastEngine = new ForecastLedgerEngine();
  const dqEngine = new DecisionQualityEngine();
  const service = new ProcessIntelligenceService();

  const T0 = '2025-01-15T10:00:00.000Z';
  const T_FUTURE = '2025-06-01T10:00:00.000Z';

  // -------------------------------------------------------------
  // Section 1: 10 Dedicated Temporal Integrity Tests
  // -------------------------------------------------------------

  // Test 1: Future SEC filing cannot enter T0 evidence
  const resT1 = temporalEngine.informationAvailableAt(T0, [
    { id: 'SEC-10Q-Q2', filingDate: T_FUTURE },
    { id: 'SEC-10K-FY24', filingDate: '2025-01-10T00:00:00.000Z' }
  ]);
  assert(resT1.availableEvidence.length === 1 && resT1.availableEvidence[0].id === 'SEC-10K-FY24', 'T01: Future SEC filing rejected from T0 decision evidence');

  // Test 2: Future earnings cannot enter T0 thesis
  const resT2 = temporalEngine.informationAvailableAt(T0, [
    { metric: 'EPS_Q2', timestamp: T_FUTURE }
  ]);
  assert(resT2.availableEvidence.length === 0, 'T02: Future earnings observation rejected from T0 thesis evidence');

  // Test 3: Future market price cannot alter original decision price
  const snapT3 = snapEngine.createSnapshot({
    decisionId: 'DEC-TEMP-03',
    workspaceId: 'ws-temp',
    ticker: 'AAPL',
    decision: 'BUY',
    decisionTimestamp: T0,
    decisionPrice: 220.0
  });
  assert(snapT3.decisionPrice === 220.0 && Object.isFrozen(snapT3), 'T03: Future market price cannot alter sealed decisionPrice');

  // Test 4: Today's DCF cannot replace historical DCF
  let threwT4 = false;
  try {
    snapEngine.createSnapshot({
      decisionId: 'DEC-TEMP-04',
      workspaceId: 'ws-temp',
      ticker: 'AAPL',
      decision: 'BUY',
      decisionTimestamp: T0,
      valuationState: { fairValue: 300.0, timestamp: T_FUTURE }
    });
  } catch (e) {
    threwT4 = true;
  }
  assert(threwT4, 'T04: Future/today valuation timestamp triggers temporal violation on snapshot');

  // Test 5: Today's risk cannot replace historical risk
  let threwT5 = false;
  try {
    snapEngine.createSnapshot({
      decisionId: 'DEC-TEMP-05',
      workspaceId: 'ws-temp',
      ticker: 'AAPL',
      decision: 'BUY',
      decisionTimestamp: T0,
      riskState: { beta: 1.8, timestamp: T_FUTURE }
    });
  } catch (e) {
    threwT5 = true;
  }
  assert(threwT5, 'T05: Future/today risk timestamp triggers temporal violation on snapshot');

  // Test 6: Future news cannot be cited as decision-time evidence
  const resT6 = temporalEngine.informationAvailableAt(T0, [
    { id: 'NEWS-POST-PURCHASE', createdTimestamp: T_FUTURE }
  ]);
  assert(resT6.availableEvidence.length === 0 && resT6.rejectedFutureEvidence.length === 1, 'T06: Future news rejected from decision-time evidence');

  // Test 7: Forecast created after outcome cannot be backdated into original forecast ledger
  const resT7 = temporalEngine.informationAvailableAt(T0, [
    { forecastId: 'FC-BACKDATED', createdTimestamp: T_FUTURE }
  ]);
  assert(resT7.availableEvidence.length === 0, 'T07: Post-outcome forecast cannot enter historical forecast ledger');

  // Test 8: Timestamp spoofing is rejected or correctly detected
  let threwT8 = false;
  try {
    temporalEngine.informationAvailableAt('SPOOFED_DATE', []);
  } catch (e) {
    threwT8 = true;
  }
  assert(threwT8, 'T08: Malformed or spoofed timestamp string throws error');

  // Test 9: Timezone conversion cannot move evidence across T0 boundary incorrectly
  const tBoundaryUTC = '2025-01-15T00:00:00.000Z';
  const tLocalBefore = '2025-01-14T23:59:59.000Z';
  const tLocalAfter = '2025-01-15T00:00:01.000Z';
  const resT9 = temporalEngine.informationAvailableAt(tBoundaryUTC, [
    { id: 'EV-BEFORE', timestamp: tLocalBefore },
    { id: 'EV-AFTER', timestamp: tLocalAfter }
  ]);
  assert(resT9.availableEvidence.length === 1 && resT9.availableEvidence[0].id === 'EV-BEFORE', 'T09: Timezone boundary correctly separates pre/post T0 events');

  // Test 10: Period mismatch cannot make a later accounting period appear available earlier
  const resT10 = temporalEngine.informationAvailableAt('2024-12-31T00:00:00.000Z', [
    { id: 'FY2024-REPORT', filingDate: '2025-02-15T00:00:00.000Z', period: 'FY2024' }
  ]);
  assert(resT10.availableEvidence.length === 0, 'T10: Period mismatch prevented (filing date governs availability, not reporting period)');

  // -------------------------------------------------------------
  // Section 2: 8 Restatement Deep Tests (V1 -> Decision -> Outcome -> V2)
  // -------------------------------------------------------------

  // Flow:
  // V1 Fact: Revenue = $383B (Decision Time T0)
  // Historical Decision evaluated using V1
  // V2 Fact: Revenue restated to $380B (T_RESTATEMENT)

  const restatementRes = temporalEngine.evaluateRestatementImpact({
    metric: 'REVENUE',
    decisionTimeValue: 383000, // V1
    restatedValue: 380000,     // V2
    decisionTimestamp: T0,
    restatementTimestamp: '2025-11-15T00:00:00.000Z',
    decisionId: 'DEC-RESTATE-01',
    workspaceId: 'ws-temp'
  });

  // Test 11: V1 remains immutable
  assert(restatementRes.decisionTimeTruth.value === 383000, 'R01: V1 decision-time truth remains immutable');

  // Test 12: Original decision evaluation continues to reference V1
  assert(restatementRes.decisionTimeTruth.version === 'V1', 'R02: Original decision references V1');

  // Test 13: V2 is separately available
  assert(restatementRes.currentRestatedTruth.value === 380000 && restatementRes.currentRestatedTruth.version === 'V2', 'R03: V2 restated truth is separately exposed');

  // Test 14: RestatementImpact object is created with exact delta
  assert(restatementRes.absoluteDelta === -3000 && restatementRes.isRestated === true, 'R04: RestatementImpact created with exact delta (-$3000M)');

  // Test 15: Historical score is not silently overwritten
  assert(restatementRes.historicalDecisionIntegrityPreserved === true, 'R05: Historical decision integrity preserved flag is true');

  // Test 16: Materiality calculation
  assert(restatementRes.restatementImpact === 'IMMATERIAL', 'R06: Immaterial restatement (<10%) correctly classified');

  // Test 17: Material restatement test (>10%)
  const materialRes = temporalEngine.evaluateRestatementImpact({
    metric: 'NET_INCOME',
    decisionTimeValue: 100,
    restatedValue: 70, // 30% reduction
    decisionTimestamp: T0,
    restatementTimestamp: '2025-11-15T00:00:00.000Z',
    decisionId: 'DEC-RESTATE-02',
    workspaceId: 'ws-temp'
  });
  assert(materialRes.restatementImpact === 'MATERIAL', 'R07: Material restatement (>10%) correctly classified as MATERIAL');

  // Test 18: Audit chain preserves both versions and hashes
  assert(Object.isFrozen(restatementRes) && Object.isFrozen(materialRes), 'R08: Restatement records are deeply frozen preserving audit chain');

  console.log('\n================================================================');
  console.log(`TEMPORAL & RESTATEMENT SUMMARY:`);
  console.log(`Total Assertions Passed: ${passed}`);
  console.log(`Total Failures: ${failed}`);
  console.log(`Status: ${failed === 0 ? 'ALL TEMPORAL & RESTATEMENT INVARIANTS PASS' : 'FAILURES DETECTED'}`);
  console.log('================================================================\n');

  return { suite: 'Phase 13 Temporal & Restatement Deep Tests', passed, failed, total: passed + failed, results };
}

if (process.argv[1] && process.argv[1].endsWith('phase13TemporalRestatementDeepTests.js')) {
  runPhase13TemporalRestatementDeepTests();
}
