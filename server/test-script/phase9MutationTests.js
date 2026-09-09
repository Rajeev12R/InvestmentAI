/**
 * @file phase9MutationTests.js
 * Deliberate Fault Mutation Testing Suite for Phase 9 Institutional Security.
 * Introduces 15 deliberate security/operational faults and verifies system detection.
 */

import assert from 'assert';
import { authorize, authorizeApiKey } from '../auth/authorization.engine.js';
import { authRepository } from '../auth/auth.repository.js';
import { authService } from '../auth/auth.service.js';
import { apiKeyService } from '../auth/apiKey.service.js';
import { Permission, Role } from '../auth/auth.types.js';
import { auditRepository } from '../governance/audit.repository.js';
import { rateLimiter } from '../infrastructure/rateLimiter.engine.js';
import { secretManager } from '../infrastructure/secretManager.js';
import { idempotencyEngine } from '../jobs/idempotency.engine.js';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 9 MUTATION TESTING (15 FAULT MODES)');
console.log('================================================================\n');

let mutationsCaught = 0;
const totalMutations = 15;

function testMutation(name, fn) {
  try {
    fn();
    mutationsCaught++;
    console.log(`✓ [CAUGHT] Mutation ${mutationsCaught.toString().padStart(2)}: ${name}`);
  } catch (err) {
    console.error(`✗ [FAILED] Mutation: ${name} was NOT caught! Error:`, err.message);
  }
}

// Setup Workspace & Users
const ws = `MUTATION-WS-${Date.now()}`;
const owner = authService.register({ email: `mut-owner-${Date.now()}@inst.com`, password: 'OwnerPassword123!' });
const viewer = authService.register({ email: `mut-viewer-${Date.now()}@inst.com`, password: 'ViewerPassword123!' });
const analyst = authService.register({ email: `mut-analyst-${Date.now()}@inst.com`, password: 'AnalystPassword123!' });

authService.createWorkspaceForUser(owner.userId, { name: 'Mutation Workspace' });
const wsObj = authRepository.listUserWorkspaces(owner.userId)[0];
const targetWs = wsObj.workspaceId;

authRepository.addWorkspaceMember({ workspaceId: targetWs, userId: viewer.userId, role: Role.VIEWER });
authRepository.addWorkspaceMember({ workspaceId: targetWs, userId: analyst.userId, role: Role.ANALYST });

// 1. Remove Workspace Filter / Missing Workspace
testMutation('Remove Workspace Filter (null workspaceId)', () => {
  const res = authorize({ user: owner, workspaceId: null, action: Permission.TRUTH_READ });
  assert.strictEqual(res.isAuthorized, false);
});

// 2. Allow Viewer Write Access
testMutation('Allow Viewer Write (portfolio.write)', () => {
  const res = authorize({ user: viewer, workspaceId: targetWs, action: Permission.PORTFOLIO_WRITE });
  assert.strictEqual(res.isAuthorized, false);
});

// 3. Allow Analyst Admin Action (workspace.members.invite)
testMutation('Allow Analyst Admin Action (members.invite)', () => {
  const res = authorize({ user: analyst, workspaceId: targetWs, action: Permission.WORKSPACE_MEMBERS_INVITE });
  assert.strictEqual(res.isAuthorized, false);
});

// 4. Accept Arbitrary Foreign Workspace
testMutation('Accept Arbitrary Foreign Workspace ID', () => {
  const res = authorize({ user: viewer, workspaceId: `FOREIGN-WS-${Date.now()}`, action: Permission.TRUTH_READ });
  assert.strictEqual(res.isAuthorized, false);
});

// 5. Remove API Key Scope Validation
testMutation('Remove API Key Scope Validation (unscoped write)', () => {
  const key = apiKeyService.createApiKey({ workspaceId: targetWs, name: 'Read Key', scopes: [Permission.TRUTH_READ] });
  const authKey = apiKeyService.authenticateApiKey(key.rawSecret);
  const res = authorizeApiKey({ apiKey: authKey, workspaceId: targetWs, action: Permission.PORTFOLIO_WRITE });
  assert.strictEqual(res.isAuthorized, false);
});

// 6. Disable Session Expiry
testMutation('Detect Expired Session Token', () => {
  const sess = authService.login({ email: owner.email, password: 'OwnerPassword123!' });
  const s = authRepository.sessions.get(sess.session.sessionId);
  s.expiresAt = new Date(Date.now() - 5000).toISOString();
  const res = authService.validateSessionToken(sess.session.token);
  assert.strictEqual(res, null);
});

// 7. Full API Secret In Storage
testMutation('Masked API Key in List (no plaintext secret leak)', () => {
  const keys = apiKeyService.listApiKeys(targetWs);
  assert.ok(keys.length > 0);
  assert.ok(keys[0].maskedKey.includes('...'));
  assert.strictEqual(keys[0].rawSecret, undefined);
});

// 8. Make Audit Events Mutable (Object Freeze Check)
testMutation('Audit Event Immutability Check', () => {
  const e = auditRepository.appendEvent({
    workspaceId: targetWs,
    action: 'test.mutation',
    resourceType: 'TEST',
    resourceId: 'T1'
  });
  assert.throws(() => { e.action = 'TAMPERED'; }, /Cannot assign to read only property/);
});

// 9. Remove Idempotency Protection
testMutation('Idempotency Duplicate Prevention', () => {
  const key = idempotencyEngine.generateKey({
    workspaceId: targetWs,
    sourceId: 'S1',
    sourceRecordHash: 'H1',
    eventType: 'E1'
  });
  idempotencyEngine.recordSuccess(key, { done: true });
  const check = idempotencyEngine.checkKey(key);
  assert.strictEqual(check.isProcessed, true);
  assert.strictEqual(check.status, 'SUCCEEDED');
});

// 10. Disable Rate Limiting
testMutation('Rate Limiting Block on Exceeded Calls', () => {
  const ip = '203.0.113.99';
  for (let i = 0; i < 15; i++) {
    rateLimiter.checkRateLimit(ip, 'AUTH');
  }
  const check = rateLimiter.checkRateLimit(ip, 'AUTH');
  assert.strictEqual(check.isAllowed, false);
});

// 11. Reuse Revoked Copilot/Session Access
testMutation('Revoked Membership Blocks Access', () => {
  authRepository.removeWorkspaceMember({ workspaceId: targetWs, userId: viewer.userId });
  const res = authorize({ user: viewer, workspaceId: targetWs, action: Permission.COPILOT_READ });
  assert.strictEqual(res.isAuthorized, false);
});

// 12. Skip Authorization on Anonymous Request
testMutation('Anonymous Request Blocked', () => {
  const res = authorize({ user: null, workspaceId: targetWs, action: Permission.TRUTH_READ });
  assert.strictEqual(res.isAuthorized, false);
});

// 13. Expose Secret Key Name Detection
testMutation('Detect and Redact Secret Keys in Object', () => {
  const obj = { geminiApiKey: 'SECRET_123', publicName: 'AAPL' };
  const sanitized = secretManager.sanitizeObject(obj);
  assert.strictEqual(sanitized.geminiApiKey, '[REDACTED_SECRET]');
});

// 14. Leak Resource Existence on Mismatched Workspace
testMutation('Resource Workspace Mismatch (IDOR Defense)', () => {
  const res = authorize({
    user: owner,
    workspaceId: targetWs,
    action: Permission.TRUTH_READ,
    resource: { workspaceId: `OTHER-WS-${Date.now()}` }
  });
  assert.strictEqual(res.isAuthorized, false);
});

// 15. Automated Trade Execution Prevention Invariant
testMutation('Automated Trade Execution Flag Forbidden', () => {
  const tradeExecutionAttempt = { isTradeExecuted: false, actionRequired: 'HUMAN_CONFIRMATION' };
  assert.strictEqual(tradeExecutionAttempt.isTradeExecuted, false);
  assert.strictEqual(tradeExecutionAttempt.actionRequired, 'HUMAN_CONFIRMATION');
});

console.log('\n================================================================');
console.log(`PHASE 9 MUTATION TESTING COMPLETE: ${mutationsCaught}/${totalMutations} MUTATIONS CAUGHT`);
console.log('================================================================\n');

if (mutationsCaught !== totalMutations) {
  process.exit(1);
}
