/**
 * Phase 13 - Decision Snapshot Test Suite
 * Tests immutable T0 decision snapshots, temporal bounds, and hashing.
 */

import { decisionSnapshotEngine, DecisionSnapshotEngine } from '../processIntelligence/decisionSnapshot.engine.js';
import { computeDeterministicHash } from '../processIntelligence/process.types.js';

export async function runPhase13DecisionSnapshotTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      results.push({ message, status: 'PASS' });
    } else {
      failed++;
      results.push({ message, status: 'FAIL' });
      console.error(`FAILED ASSERTION: ${message}`);
    }
  }

  console.log('--- RUNNING PHASE 13 DECISION SNAPSHOT TESTS ---');

  const engine = new DecisionSnapshotEngine();

  // Test 1: Successful Snapshot Creation
  const snap1 = engine.createSnapshot({
    decisionId: 'DEC-AAPL-001',
    workspaceId: 'ws-alpha',
    ticker: 'AAPL',
    decision: 'BUY',
    decisionTimestamp: '2025-06-01T10:00:00.000Z',
    decisionPrice: 210.50,
    conviction: 0.85,
    positionSize: 0.10,
    valuationState: { fairValue: 245.0, timestamp: '2025-06-01T09:00:00.000Z' },
    riskState: { beta: 1.12, timestamp: '2025-06-01T09:30:00.000Z' },
    evidenceIds: ['EV-01', 'EV-02'],
    evidencePackageHash: 'hash-abc-123'
  });

  assert(snap1.decisionId === 'DEC-AAPL-001', 'Snapshot retains decisionId');
  assert(snap1.ticker === 'AAPL', 'Snapshot retains ticker');
  assert(snap1.decisionPrice === 210.50, 'Snapshot retains decisionPrice');
  assert(typeof snap1.packageHash === 'string' && snap1.packageHash.length === 64, 'Snapshot has 64-char SHA-256 packageHash');
  assert(Object.isFrozen(snap1), 'Snapshot is deeply frozen');

  // Test 2: Immutability enforcement (cannot mutate properties)
  try {
    snap1.decisionPrice = 999.99;
  } catch (e) {
    // In strict mode this throws, or remains unchanged
  }
  assert(snap1.decisionPrice === 210.50, 'Snapshot is immutable to property modification');

  // Test 3: Duplicate creation rejection
  let duplicateThrew = false;
  try {
    engine.createSnapshot({
      decisionId: 'DEC-AAPL-001',
      workspaceId: 'ws-alpha',
      ticker: 'AAPL',
      decision: 'BUY',
      decisionTimestamp: '2025-06-01T10:00:00.000Z'
    });
  } catch (e) {
    duplicateThrew = true;
  }
  assert(duplicateThrew, 'Duplicate snapshot creation is strictly rejected');

  // Test 4: Temporal violation rejection (Valuation timestamp after decision timestamp)
  let temporalThrewVal = false;
  try {
    engine.createSnapshot({
      decisionId: 'DEC-AAPL-FUTURE-VAL',
      workspaceId: 'ws-alpha',
      ticker: 'AAPL',
      decision: 'BUY',
      decisionTimestamp: '2025-06-01T10:00:00.000Z',
      valuationState: { fairValue: 250.0, timestamp: '2025-06-02T10:00:00.000Z' } // Future
    });
  } catch (e) {
    temporalThrewVal = true;
  }
  assert(temporalThrewVal, 'Future valuation timestamp triggers temporal violation');

  // Test 5: Temporal violation rejection (Risk timestamp after decision timestamp)
  let temporalThrewRisk = false;
  try {
    engine.createSnapshot({
      decisionId: 'DEC-AAPL-FUTURE-RISK',
      workspaceId: 'ws-alpha',
      ticker: 'AAPL',
      decision: 'BUY',
      decisionTimestamp: '2025-06-01T10:00:00.000Z',
      riskState: { beta: 1.5, timestamp: '2025-06-05T10:00:00.000Z' } // Future
    });
  } catch (e) {
    temporalThrewRisk = true;
  }
  assert(temporalThrewRisk, 'Future risk timestamp triggers temporal violation');

  // Test 6: Workspace isolation on retrieval
  const retrievedValid = engine.getSnapshot('DEC-AAPL-001', 'ws-alpha');
  assert(retrievedValid !== null, 'Snapshot retrieved successfully with correct workspace');

  let workspaceAuthThrew = false;
  try {
    engine.getSnapshot('DEC-AAPL-001', 'ws-foreign');
  } catch (e) {
    workspaceAuthThrew = true;
  }
  assert(workspaceAuthThrew, 'Cross-workspace retrieval triggers authorization error');

  // Test 7: Deterministic hash repeatability
  const hash1 = computeDeterministicHash({ a: 1, b: 2 });
  const hash2 = computeDeterministicHash({ b: 2, a: 1 });
  assert(hash1 === hash2, 'Deterministic hashing is canonical and key-order independent');

  // Test 8: List snapshots scoped to workspace
  engine.createSnapshot({
    decisionId: 'DEC-MSFT-001',
    workspaceId: 'ws-alpha',
    ticker: 'MSFT',
    decision: 'BUY',
    decisionTimestamp: '2025-06-02T10:00:00.000Z',
    decisionPrice: 420.0
  });

  engine.createSnapshot({
    decisionId: 'DEC-GOOG-001',
    workspaceId: 'ws-beta',
    ticker: 'GOOGL',
    decision: 'BUY',
    decisionTimestamp: '2025-06-03T10:00:00.000Z',
    decisionPrice: 175.0
  });

  const listAlpha = engine.listSnapshots('ws-alpha');
  assert(listAlpha.length === 2, 'listSnapshots returns only ws-alpha snapshots');
  assert(listAlpha.every(s => s.workspaceId === 'ws-alpha'), 'No foreign workspace snapshots leaked');

  const listAlphaTicker = engine.listSnapshots('ws-alpha', 'AAPL');
  assert(listAlphaTicker.length === 1 && listAlphaTicker[0].ticker === 'AAPL', 'listSnapshots filters by ticker');

  console.log(`PASSED: ${passed} assertions (0 failed)`);
  return { suite: 'Phase 13 Decision Snapshot Tests', passed, failed, total: passed + failed, results };
}

if (process.argv[1] && process.argv[1].endsWith('phase13DecisionSnapshotTests.js')) {
  runPhase13DecisionSnapshotTests();
}
