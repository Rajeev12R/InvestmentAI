/**
 * server/test-script/test-earnings-truth-bridge-conflicts.js
 * 
 * Phase 21: Truth Layer Bridge, Conflict Preservation & Restatements Tests
 */

import assert from 'assert';
import { EarningsTruthBridge } from '../earnings/earnings.truthBridge.js';
import { EventClassification } from '../earnings/earnings.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 21 TRUTH BRIDGE & CONFLICTS TESTS ---');

const bridge = new EarningsTruthBridge();
const tenantId = 'TENANT-TRUTH-TEST';

// 1. Apply primary candidate from Regulatory Filing
const primaryCandidate = {
  ticker: 'AAPL',
  metric: 'REVENUE',
  value: 94930000000,
  unit: 'USD',
  period: 'Q4-2025',
  asOfDate: '2025-10-30T21:00:00Z',
  sourceId: 'SRC-SEC-10Q',
  sourceTier: 'TIER_1_REGULATORY_FILING',
  evidenceId: 'EVID-SEC-10Q',
  evidenceHash: '1111111111111111111111111111111111111111111111111111111111111111'
};

const res1 = bridge.applyCandidateToTruth(tenantId, primaryCandidate);
testAssert(res1.success === true, 'Primary fact applied to truth');
testAssert(res1.conflictState === 'NONE', 'No conflict on initial insert');
testAssert(res1.factRecord.version === 1, 'Version is V1');

const active1 = bridge.getActiveFact(tenantId, 'AAPL', 'REVENUE', 'Q4-2025');
testAssert(active1.value === 94930000000, 'Active fact value matches');
testAssert(active1.status === 'ACTIVE_TRUTH', 'Status is ACTIVE_TRUTH');

// 2. Ingest Conflicting Candidate from Alternate Vendor Feed -> Preserves both, flags conflict
const conflictingCandidate = {
  ticker: 'AAPL',
  metric: 'REVENUE',
  value: 95100000000, // Different revenue number
  unit: 'USD',
  period: 'Q4-2025',
  asOfDate: '2025-10-30T22:00:00Z',
  sourceId: 'SRC-VENDOR-NEWS',
  sourceTier: 'TIER_3_NEWSWIRE',
  evidenceId: 'EVID-VENDOR-NEWS',
  evidenceHash: '2222222222222222222222222222222222222222222222222222222222222222'
};

const res2 = bridge.applyCandidateToTruth(tenantId, conflictingCandidate);
testAssert(res2.conflictState === 'SOURCE_OBSERVATION_CONFLICT', 'Conflict detected');
testAssert(res2.totalVersions === 2, 'Total versions is 2 (both preserved)');

// Active fact returns UNAVAILABLE with conflict details
const activeConflicted = bridge.getActiveFact(tenantId, 'AAPL', 'REVENUE', 'Q4-2025');
testAssert(activeConflicted.status === 'UNAVAILABLE_CONFLICT_REQUIRES_RECONCILIATION', 'Conflicted fact returns UNAVAILABLE');
testAssert(activeConflicted.conflictingVersions.length === 2, 'Both conflicting versions accessible');

// 3. Official Regulatory Restatement Candidate -> Creates V3 with restatement metadata
const restatementCandidate = {
  ticker: 'AAPL',
  metric: 'REVENUE',
  value: 94900000000,
  unit: 'USD',
  period: 'Q4-2025',
  asOfDate: '2025-11-15T00:00:00Z',
  sourceId: 'SRC-SEC-10Q-A',
  sourceTier: 'TIER_1_REGULATORY_FILING',
  evidenceId: 'EVID-SEC-10Q-A',
  evidenceHash: '3333333333333333333333333333333333333333333333333333333333333333',
  isRestatement: true,
  restatementReason: 'Reclassification of deferred service contract revenues'
};

const res3 = bridge.applyCandidateToTruth(tenantId, restatementCandidate);
testAssert(res3.factRecord.version === 3, 'Restated fact is V3');
testAssert(res3.factRecord.isRestatement === true, 'isRestatement flag preserved');

const history = bridge.getFactHistory(tenantId, 'AAPL', 'REVENUE', 'Q4-2025');
testAssert(history.length === 3, 'Complete 3-version historical trail preserved');
testAssert(history[0].value === 94930000000, 'Original V1 snapshot unchanged');

console.log(`[PASS] Phase 21 Truth Bridge & Conflicts tests passed: ${assertionCount} assertions`);

export default { assertionCount };
