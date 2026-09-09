/**
 * @file phase9GovernanceAuditTests.js
 * Comprehensive Unit & Integration Tests for Phase 9 Governance, Audit Logs & Retention.
 */

import assert from 'assert';
import { auditRepository } from '../governance/audit.repository.js';
import { auditEngine } from '../governance/audit.engine.js';
import { complianceExportService } from '../governance/complianceExport.service.js';
import { retentionEngine } from '../governance/retention.engine.js';
import { RetentionCategory } from '../governance/audit.types.js';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 9 GOVERNANCE & AUDIT TEST SUITE');
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
  const ws = `AUDIT-TEST-WS-${Date.now()}`;

  console.log('▶ Testing Immutable Audit Event Append & Hash Chaining...');
  const e1 = auditEngine.logAuthEvent({
    workspaceId: ws,
    userId: 'USR-TEST-001',
    action: 'user.login',
    result: 'SUCCESS'
  });
  check(e1.id.startsWith('AUD-'), 'Event 1 has valid ID prefix');
  checkEqual(e1.prevHash, '0000000000000000000000000000000000000000000000000000000000000000', 'Genesis/initial event prevHash');
  checkEqual(e1.hash.length, 64, 'Event 1 has SHA-256 hash');

  const e2 = auditEngine.logDecisionReviewApproval({
    workspaceId: ws,
    actorId: 'USR-TEST-001',
    reviewId: 'REV-AAPL-001',
    ticker: 'AAPL',
    decision: 'WATCH',
    attentionId: 'ATT-AAPL-VALUATION',
    truthPackageHash: 'a'.repeat(64),
    snapshotId: 'SNAP-AAPL-001',
    actionApproved: 'CONFIRM_WATCH'
  });
  checkEqual(e2.prevHash, e1.hash, 'Event 2 prevHash links cryptographically to Event 1');
  checkEqual(e2.metadata.isTradeExecuted, false, 'Decision review guarantees isTradeExecuted: false');

  console.log('▶ Testing Cryptographic Audit Chain Verification...');
  const integrity = auditEngine.verifyIntegrity();
  checkEqual(integrity.isValid, true, 'Audit chain integrity verified across all events');
  check(integrity.totalEvents >= 2, 'Integrity verification covers all recorded events');

  console.log('▶ Testing Decision Audit Trail Querying & Filtering...');
  const events = auditEngine.listAuditEvents({ workspaceId: ws });
  checkEqual(events.length, 2, 'Retrieved all events for workspace');
  checkEqual(events[0].id, e2.id, 'Events returned in reverse chronological order');

  const authOnly = auditEngine.listAuditEvents({ workspaceId: ws, action: 'user.login' });
  checkEqual(authOnly.length, 1, 'Action filtering returns exact match');
  checkEqual(authOnly[0].id, e1.id, 'Filtered event matches expected record');

  console.log('▶ Testing Compliance-Ready Export Generation...');
  const exportBundle = complianceExportService.generateExport({
    workspaceId: ws,
    exportType: 'FULL_WORKSPACE',
    actorId: 'USR-COMPLIANCE-01'
  });
  check(exportBundle.exportId.startsWith('EXP-'), 'Export generated with valid export ID');
  checkEqual(exportBundle.checksum.length, 64, 'Export bundle includes SHA-256 checksum');
  check(Array.isArray(exportBundle.data.auditTrail), 'Export contains audit trail array');
  checkEqual(exportBundle.data.auditChainVerification.isValid, true, 'Export includes verifiable chain integrity check');

  console.log('▶ Testing Configurable Data Retention Policies...');
  const defaultPolicy = retentionEngine.getWorkspacePolicy(ws);
  checkEqual(defaultPolicy[RetentionCategory.FINANCIAL_TRUTH].retentionDays, 3650, 'Financial truth retention default 10 years');
  checkEqual(defaultPolicy[RetentionCategory.FINANCIAL_TRUTH].immutable, true, 'Financial truth is immutable');

  // Verify retention evaluation
  const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(); // 40 days old
  const tempRet = retentionEngine.evaluateRetention(ws, RetentionCategory.TEMPORARY_ARTIFACTS, oldDate);
  checkEqual(tempRet.shouldRetain, false, 'Temporary artifact past 30-day limit flagged for purge');

  const truthRet = retentionEngine.evaluateRetention(ws, RetentionCategory.FINANCIAL_TRUTH, oldDate);
  checkEqual(truthRet.shouldRetain, true, 'Financial truth retained within 10-year policy');

  // Attempt to reduce immutable retention period (Must throw error)
  assert.throws(() => {
    retentionEngine.updateWorkspacePolicy(ws, RetentionCategory.FINANCIAL_TRUTH, { retentionDays: 100 });
  }, /Cannot reduce retention period for immutable category/);
  passCount++;

  console.log('\n================================================================');
  console.log(`PHASE 9 GOVERNANCE & AUDIT TEST SUITE COMPLETE: ${passCount} ASSERTIONS PASSED`);
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
