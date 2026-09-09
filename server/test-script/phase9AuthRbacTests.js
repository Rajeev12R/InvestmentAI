/**
 * @file phase9AuthRbacTests.js
 * Comprehensive Unit & Integration Tests for Phase 9 Authentication, RBAC, and API Keys.
 */

import assert from 'assert';
import { authService } from '../auth/auth.service.js';
import { authRepository } from '../auth/auth.repository.js';
import { apiKeyService } from '../auth/apiKey.service.js';
import { authorize, authorizeApiKey } from '../auth/authorization.engine.js';
import { Role, Permission, MembershipStatus } from '../auth/auth.types.js';
import { hasPermission } from '../auth/rbac.engine.js';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 9 AUTH & RBAC TEST SUITE');
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
  console.log('▶ Testing User Registration & Password Security...');
  const user1 = authService.register({
    email: 'analyst1@institution.com',
    password: 'Password123!Secure',
    name: 'Senior Equity Analyst'
  });
  check(user1.userId.startsWith('USR-'), 'User ID generated with correct prefix');
  checkEqual(user1.email, 'analyst1@institution.com', 'Email normalized and stored');

  // Duplicate email prevention
  assert.throws(() => {
    authService.register({
      email: 'analyst1@institution.com',
      password: 'AnotherPassword123!',
      name: 'Duplicate Analyst'
    });
  }, /already exists/);
  passCount++;

  console.log('▶ Testing User Login & Session Creation...');
  const loginRes = authService.login({
    email: 'analyst1@institution.com',
    password: 'Password123!Secure'
  });
  check(loginRes.session.token !== undefined, 'Session token issued');
  checkEqual(loginRes.user.email, 'analyst1@institution.com', 'User profile returned');

  // Invalid password rejection
  assert.throws(() => {
    authService.login({
      email: 'analyst1@institution.com',
      password: 'WrongPassword!'
    });
  }, /Invalid email or password/);
  passCount++;

  console.log('▶ Testing Session Token Validation & Revocation...');
  const validSession = authService.validateSessionToken(loginRes.session.token);
  check(validSession !== null, 'Session token successfully validated');
  checkEqual(validSession.user.userId, user1.userId, 'User associated with valid session');

  const logoutOk = authService.logout(loginRes.session.token);
  checkEqual(logoutOk, true, 'Logout successfully revokes session');
  const postLogout = authService.validateSessionToken(loginRes.session.token);
  checkEqual(postLogout, null, 'Revoked session is rejected');

  console.log('▶ Testing Multi-User Workspace Creation & Memberships...');
  const ws1 = authService.createWorkspaceForUser(user1.userId, { name: 'Alpha Hedge Strategy' });
  check(ws1.workspaceId.startsWith('WS-'), 'Workspace created with valid ID');
  checkEqual(ws1.ownerId, user1.userId, 'Creator is set as Workspace Owner');

  // Verify Owner membership
  const ownerMem = authRepository.getMembership(ws1.workspaceId, user1.userId);
  checkEqual(ownerMem.role, Role.OWNER, 'Creator has OWNER role in workspace');

  // Add a Viewer user
  const user2 = authService.register({
    email: 'viewer1@client.com',
    password: 'ViewerPassword123!',
    name: 'Client Representative'
  });
  const mem2 = authRepository.addWorkspaceMember({
    workspaceId: ws1.workspaceId,
    userId: user2.userId,
    role: Role.VIEWER
  });
  checkEqual(mem2.role, Role.VIEWER, 'Member added with VIEWER role');

  console.log('▶ Testing Granular RBAC Permissions...');
  // OWNER has all permissions
  check(hasPermission(Role.OWNER, Permission.WORKSPACE_DELETE), 'OWNER has workspace.delete');
  check(hasPermission(Role.OWNER, Permission.PORTFOLIO_WRITE), 'OWNER has portfolio.write');
  check(hasPermission(Role.OWNER, Permission.AUDIT_READ), 'OWNER has audit.read');

  // ADMIN permissions
  check(hasPermission(Role.ADMIN, Permission.WORKSPACE_MEMBERS_INVITE), 'ADMIN can invite members');
  check(!hasPermission(Role.ADMIN, Permission.WORKSPACE_DELETE), 'ADMIN cannot delete workspace');

  // ANALYST permissions
  check(hasPermission(Role.ANALYST, Permission.WATCHLIST_WRITE), 'ANALYST can modify watchlists');
  check(hasPermission(Role.ANALYST, Permission.RESEARCH_WRITE), 'ANALYST can generate research');
  check(!hasPermission(Role.ANALYST, Permission.WORKSPACE_MEMBERS_INVITE), 'ANALYST cannot invite members');
  check(!hasPermission(Role.ANALYST, Permission.AUDIT_READ), 'ANALYST cannot read audit logs');

  // VIEWER permissions
  check(hasPermission(Role.VIEWER, Permission.TRUTH_READ), 'VIEWER can read truth');
  check(hasPermission(Role.VIEWER, Permission.COPILOT_READ), 'VIEWER can use Copilot');
  check(!hasPermission(Role.VIEWER, Permission.WATCHLIST_WRITE), 'VIEWER cannot modify watchlists');
  check(!hasPermission(Role.VIEWER, Permission.PORTFOLIO_WRITE), 'VIEWER cannot modify portfolios');

  // AUDITOR permissions
  check(hasPermission(Role.AUDITOR, Permission.AUDIT_READ), 'AUDITOR can read audit logs');
  check(hasPermission(Role.AUDITOR, Permission.EXPORT_READ), 'AUDITOR can export compliance data');
  check(!hasPermission(Role.AUDITOR, Permission.WATCHLIST_WRITE), 'AUDITOR cannot modify investments');

  console.log('▶ Testing Centralized Authorization Engine...');
  // 1. Valid authorization for Owner
  const authz1 = authorize({
    user: user1,
    workspaceId: ws1.workspaceId,
    action: Permission.PORTFOLIO_WRITE
  });
  check(authz1.isAuthorized, 'Owner authorized for portfolio.write');

  // 2. Denied authorization for Viewer attempting write
  const authz2 = authorize({
    user: user2,
    workspaceId: ws1.workspaceId,
    action: Permission.PORTFOLIO_WRITE
  });
  checkEqual(authz2.isAuthorized, false, 'Viewer denied for portfolio.write');
  check(authz2.reason.includes('DENY'), 'Denial reason provided');

  // 3. Denied cross-workspace access (User not a member)
  const ws2 = authService.createWorkspaceForUser(user1.userId, { name: 'Beta Private Strategy' });
  const authz3 = authorize({
    user: user2,
    workspaceId: ws2.workspaceId,
    action: Permission.TRUTH_READ
  });
  checkEqual(authz3.isAuthorized, false, 'Non-member denied access to foreign workspace');

  // 4. Denied after membership revocation
  authRepository.removeWorkspaceMember({ workspaceId: ws1.workspaceId, userId: user2.userId });
  const authz4 = authorize({
    user: user2,
    workspaceId: ws1.workspaceId,
    action: Permission.TRUTH_READ
  });
  checkEqual(authz4.isAuthorized, false, 'Revoked member denied access');

  console.log('▶ Testing Scoped API Key Management...');
  const apiKey = apiKeyService.createApiKey({
    workspaceId: ws1.workspaceId,
    name: 'Quantitative Feed Service',
    scopes: [Permission.TRUTH_READ, Permission.COPILOT_READ]
  });
  check(apiKey.rawSecret.startsWith('inv_live_'), 'API key generated with secure prefix');
  check(apiKey.maskedKey.includes('...'), 'Masked key generated');

  const authKey = apiKeyService.authenticateApiKey(apiKey.rawSecret);
  check(authKey !== null, 'API key successfully authenticated');
  checkEqual(authKey.workspaceId, ws1.workspaceId, 'API key workspace matched');

  // Verify scope checks
  const keyAuthz1 = authorizeApiKey({
    apiKey: authKey,
    workspaceId: ws1.workspaceId,
    action: Permission.TRUTH_READ
  });
  check(keyAuthz1.isAuthorized, 'API key authorized for scoped action');

  const keyAuthz2 = authorizeApiKey({
    apiKey: authKey,
    workspaceId: ws1.workspaceId,
    action: Permission.PORTFOLIO_WRITE
  });
  checkEqual(keyAuthz2.isAuthorized, false, 'API key denied for unscoped action');

  // Revoke API Key
  apiKeyService.revokeApiKey(ws1.workspaceId, apiKey.keyId);
  const postRevokeKey = apiKeyService.authenticateApiKey(apiKey.rawSecret);
  checkEqual(postRevokeKey, null, 'Revoked API key rejected on authentication');

  console.log('\n================================================================');
  console.log(`PHASE 9 AUTH & RBAC TEST SUITE COMPLETE: ${passCount} ASSERTIONS PASSED`);
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
