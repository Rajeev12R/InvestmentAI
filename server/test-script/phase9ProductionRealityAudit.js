/**
 * @file phase9ProductionRealityAudit.js
 * Production Reality & Multi-User Governance Audit for Phase 9.
 * Validates actual HTTP production paths (20+ assertions), multi-tenant isolation across
 * 2 workspaces and 3 users, failure injection, and institutional security invariants.
 */

import assert from 'assert';
import http from 'http';
import app from '../index.js';
import { authService } from '../auth/auth.service.js';
import { authRepository } from '../auth/auth.repository.js';
import { Role } from '../auth/auth.types.js';
import { rateLimiter } from '../infrastructure/rateLimiter.engine.js';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 9 PRODUCTION REALITY & MULTI-USER AUDIT');
console.log('================================================================\n');

let passCount = 0;
let httpAssertions = 0;

function check(cond, msg, isHttp = false) {
  assert.ok(cond, msg);
  passCount++;
  if (isHttp) httpAssertions++;
}
function checkEqual(actual, expected, msg, isHttp = false) {
  assert.strictEqual(actual, expected, msg);
  passCount++;
  if (isHttp) httpAssertions++;
}

async function runAudit() {
  const server = http.createServer(app);
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    console.log('▶ Auditing Real Multi-User Provisioning & Workspaces...');
    // User 1: Institutional Owner
    const owner = authService.register({
      email: `inst-owner-${Date.now()}@fund.com`,
      password: 'FundOwner123!Secure',
      name: 'Managing Director'
    });
    const ownerLogin = authService.login({ email: owner.email, password: 'FundOwner123!Secure' });
    const ownerToken = ownerLogin.session.token;

    // User 2: Research Analyst
    const analyst = authService.register({
      email: `inst-analyst-${Date.now()}@fund.com`,
      password: 'Analyst123!Secure',
      name: 'Senior Analyst'
    });
    const analystLogin = authService.login({ email: analyst.email, password: 'Analyst123!Secure' });
    const analystToken = analystLogin.session.token;

    // User 3: External Auditor / Client
    const auditor = authService.register({
      email: `inst-auditor-${Date.now()}@compliance.com`,
      password: 'Auditor123!Secure',
      name: 'Lead Auditor'
    });
    const auditorLogin = authService.login({ email: auditor.email, password: 'Auditor123!Secure' });
    const auditorToken = auditorLogin.session.token;

    // Create 2 Workspaces
    const ws1 = authService.createWorkspaceForUser(owner.userId, { name: 'Alpha Equity Fund' });
    const ws2 = authService.createWorkspaceForUser(owner.userId, { name: 'Private Credit Fund' });
    const ws1Id = ws1.workspaceId;
    const ws2Id = ws2.workspaceId;

    // Assign Analyst to Workspace 1 only, Auditor to Workspace 1 & 2
    authRepository.addWorkspaceMember({ workspaceId: ws1Id, userId: analyst.userId, role: Role.ANALYST });
    authRepository.addWorkspaceMember({ workspaceId: ws1Id, userId: auditor.userId, role: Role.AUDITOR });
    authRepository.addWorkspaceMember({ workspaceId: ws2Id, userId: auditor.userId, role: Role.AUDITOR });

    console.log('▶ Auditing HTTP Endpoints (20+ Production Path Assertions)...');

    // 1. GET /health
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthBody = await healthRes.json();
    checkEqual(healthRes.status, 200, 'HTTP /health returns 200 OK', true);
    checkEqual(healthBody.status, 'UP', 'Health liveness is UP', true);

    // 2. GET /ready
    const readyRes = await fetch(`${baseUrl}/ready`);
    const readyBody = await readyRes.json();
    checkEqual(readyRes.status, 200, 'HTTP /ready returns 200 OK', true);
    checkEqual(readyBody.status, 'READY', 'System readiness is READY', true);

    // 3. GET /metrics
    const metricsRes = await fetch(`${baseUrl}/metrics`);
    const metricsBody = await metricsRes.json();
    checkEqual(metricsRes.status, 200, 'HTTP /metrics returns 200 OK', true);
    check(metricsBody.requests?.total !== undefined, 'Metrics reports requests total', true);

    // 4. POST /api/auth/login
    const httpLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: owner.email, password: 'FundOwner123!Secure' })
    });
    const httpLoginBody = await httpLoginRes.json();
    checkEqual(httpLoginRes.status, 200, 'HTTP /api/auth/login returns 200 OK', true);
    check(httpLoginBody.session?.token !== undefined, 'Login issues session token', true);

    // 5. GET /api/auth/session
    const sessionRes = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const sessionBody = await sessionRes.json();
    checkEqual(sessionRes.status, 200, 'HTTP /api/auth/session returns 200 OK', true);
    checkEqual(sessionBody.user.userId, owner.userId, 'Session matches authenticated user', true);

    // 6. POST /api/auth/keys - Generate API Key
    const apiKeyRes = await fetch(`${baseUrl}/api/auth/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'x-workspace-id': ws1Id
      },
      body: JSON.stringify({ name: 'Alpha Quant Key', scopes: ['truth.read', 'copilot.read'] })
    });
    const apiKeyBody = await apiKeyRes.json();
    checkEqual(apiKeyRes.status, 201, 'HTTP /api/auth/keys returns 201 Created', true);
    check(apiKeyBody.rawSecret.startsWith('inv_live_'), 'Returns raw secret once', true);

    // 7. GET /api/auth/keys - List API Keys
    const listKeysRes = await fetch(`${baseUrl}/api/auth/keys`, {
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'x-workspace-id': ws1Id
      }
    });
    const listKeysBody = await listKeysRes.json();
    checkEqual(listKeysRes.status, 200, 'HTTP GET /api/auth/keys returns 200 OK', true);
    check(listKeysBody.apiKeys.length >= 1, 'API keys list populated', true);

    // 8. GET /api/governance/members - List workspace members
    const membersRes = await fetch(`${baseUrl}/api/governance/members`, {
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'x-workspace-id': ws1Id
      }
    });
    const membersBody = await membersRes.json();
    checkEqual(membersRes.status, 200, 'HTTP /api/governance/members returns 200 OK', true);
    checkEqual(membersBody.members.length, 3, 'Returns 3 members in Workspace 1', true);

    // 9. GET /api/governance/audit - List audit trail (Auditor access)
    const auditRes = await fetch(`${baseUrl}/api/governance/audit`, {
      headers: {
        'Authorization': `Bearer ${auditorToken}`,
        'x-workspace-id': ws1Id
      }
    });
    const auditBody = await auditRes.json();
    checkEqual(auditRes.status, 200, 'HTTP /api/governance/audit returns 200 OK for Auditor', true);
    check(auditBody.events.length > 0, 'Audit trail returns recorded events', true);

    // 10. POST /api/governance/export - Compliance Export
    const exportRes = await fetch(`${baseUrl}/api/governance/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auditorToken}`,
        'x-workspace-id': ws1Id
      },
      body: JSON.stringify({ exportType: 'FULL_WORKSPACE' })
    });
    const exportBody = await exportRes.json();
    checkEqual(exportRes.status, 200, 'HTTP /api/governance/export returns 200 OK', true);
    checkEqual(exportBody.checksum.length, 64, 'Export contains SHA-256 checksum', true);

    // 11. GET /api/jobs/stats - Inspect Queue Stats
    const jobStatsRes = await fetch(`${baseUrl}/api/jobs/stats`, {
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'x-workspace-id': ws1Id
      }
    });
    const jobStatsBody = await jobStatsRes.json();
    checkEqual(jobStatsRes.status, 200, 'HTTP /api/jobs/stats returns 200 OK', true);
    check(jobStatsBody.totalJobs !== undefined, 'Job stats contains totalJobs', true);

    // 12. Cross-Workspace Isolation: Analyst attempting to read Workspace 2 audit logs
    const crossAuditRes = await fetch(`${baseUrl}/api/governance/audit`, {
      headers: {
        'Authorization': `Bearer ${analystToken}`,
        'x-workspace-id': ws2Id // Analyst is NOT a member of ws2
      }
    });
    checkEqual(crossAuditRes.status, 403, 'Cross-workspace access denied with 403 Forbidden', true);

    // 13. Role Isolation: Analyst attempting to create API key (Requires ADMIN/OWNER)
    const analystKeyRes = await fetch(`${baseUrl}/api/auth/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${analystToken}`,
        'x-workspace-id': ws1Id
      },
      body: JSON.stringify({ name: 'Unauthorized Key', scopes: ['truth.read'] })
    });
    checkEqual(analystKeyRes.status, 403, 'Analyst denied API key creation with 403 Forbidden', true);

    // 14. DELETE /api/auth/keys/:keyId - Revoke API Key
    const revokeRes = await fetch(`${baseUrl}/api/auth/keys/${apiKeyBody.keyId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'x-workspace-id': ws1Id
      }
    });
    const revokeBody = await revokeRes.json();
    checkEqual(revokeRes.status, 200, 'HTTP DELETE /api/auth/keys/:keyId returns 200 OK', true);
    checkEqual(revokeBody.success, true, 'Key successfully revoked', true);

    // 15. POST /api/auth/logout
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const logoutBody = await logoutRes.json();
    checkEqual(logoutRes.status, 200, 'HTTP /api/auth/logout returns 200 OK', true);
    checkEqual(logoutBody.success, true, 'Logout reported success', true);

    console.log('▶ Auditing Failure Injection & System Resilience...');
    // Failure Injection: Request with corrupted token
    const badTokenRes = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { 'Authorization': 'Bearer MALFORMED_TOKEN_123' }
    });
    checkEqual(badTokenRes.status, 401, 'Malformed token returns 401 Unauthorized', true);

    // Failure Injection: Rate limit trigger
    for (let i = 0; i < 12; i++) {
      await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'fake@test.com', password: 'bad' })
      });
    }
    const rateLimitedRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fake@test.com', password: 'bad' })
    });
    checkEqual(rateLimitedRes.status, 429, 'Rate limiter responds with 429 Too Many Requests', true);
    rateLimiter.reset();

  } finally {
    server.close();
  }

  console.log('\n================================================================');
  console.log(`PHASE 9 PRODUCTION REALITY AUDIT COMPLETE`);
  console.log(`  Total Assertions:               ${passCount} PASSED`);
  console.log(`  Production HTTP Assertions:     ${httpAssertions}`);
  console.log(`  Workspaces Validated:           2 (Alpha Equity Fund, Private Credit Fund)`);
  console.log(`  Users Validated:                3 (Owner, Analyst, Auditor)`);
  console.log('================================================================\n');
}

runAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
