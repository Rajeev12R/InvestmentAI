/**
 * @file phase35OrganizationWorkspaceTests.js
 * Comprehensive Multi-Tenant Organization & Workspace Test Suite for Phase 35.
 * 
 * Validates:
 * 1. Organization Lifecycle & Ownership Hierarchy
 * 2. Workspace Multi-Tenant Scoping & Lifecycle
 * 3. Membership Management & Role Transitions
 * 4. Strict Tenant Isolation & Anti-IDOR Boundaries
 * 5. Privilege Escalation & Deny-by-Default RBAC
 * 6. Concurrency & Deterministic Replay
 * 7. Audit Lineage & Observability
 */

import http from 'http';
import assert from 'assert';
import app from '../index.js';
import { authRepository } from '../auth/auth.repository.js';
import { authService } from '../auth/auth.service.js';
import { auditRepository } from '../governance/audit.repository.js';
import { authorize, canAssignRole } from '../auth/authorization.engine.js';
import { Role, OrganizationRole, OrganizationStatus, WorkspaceStatus, MembershipStatus, Permission } from '../auth/auth.types.js';

let server;
let baseUrl;

async function startTestServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
}

async function stopTestServer() {
  return new Promise((resolve) => {
    if (server) server.close(resolve);
    else resolve();
  });
}

async function rawRequest(method, path, body = null, headers = {}) {
  const url = `${baseUrl}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  const res = await fetch(url, {
    ...options,
    body: body ? JSON.stringify(body) : undefined
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    // raw text
  }

  return {
    status: res.status,
    headers: res.headers,
    body: json
  };
}

async function runPhase35Tests() {
  console.log('================================================================');
  console.log('INVESTMENTAI — PHASE 35 ORGANIZATION & WORKSPACE VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function check(name, condition, details = '') {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${name} ${details ? `(${details})` : ''}`);
      throw new Error(`Assertion failed: ${name}`);
    }
  }

  await startTestServer();

  try {
    // -------------------------------------------------------------
    // Section 1: Organization Lifecycle & Hierarchy
    // -------------------------------------------------------------
    console.log('Running Section 1: Organization Lifecycle & Hierarchy...');

    // 1. Root Admin Login
    const adminLoginRes = await rawRequest('POST', '/api/auth/login', {
      email: 'admin@investmentai.local',
      password: 'Admin123!Secure'
    });
    const adminToken = adminLoginRes.body.session?.token || adminLoginRes.body.token;
    check('S1.1: Root Admin login succeeds with token', !!adminToken);

    // 2. Create Organization A
    const createOrgRes = await rawRequest('POST', '/api/organizations', {
      name: 'Apex Capital Partners',
      slug: 'apex-capital',
      settings: { defaultCurrency: 'USD', timezone: 'America/New_York' }
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    check('S1.2: Organization creation returns 201', createOrgRes.status === 201);
    check('S1.3: Organization has generated orgId', !!createOrgRes.body.data?.orgId);
    const orgAId = createOrgRes.body.data?.orgId;

    // 3. Organization creator automatically assigned OWNER
    const orgMembership = authRepository.getOrganizationMembership(orgAId, 'USR-ROOT-001');
    check('S1.4: Organization creator automatically assigned OWNER role', orgMembership?.role === OrganizationRole.OWNER);

    // 4. Update Organization Metadata
    const updateOrgRes = await rawRequest('PATCH', `/api/organizations/${orgAId}`, {
      name: 'Apex Global Capital Partners',
      settings: { enforceMfa: true }
    }, {
      'Authorization': `Bearer ${adminToken}`,
      'x-org-id': orgAId
    });
    check('S1.5: Organization update returns 200', updateOrgRes.status === 200);
    check('S1.6: Organization name updated', updateOrgRes.body.data?.name === 'Apex Global Capital Partners');
    check('S1.7: Organization settings updated', updateOrgRes.body.data?.settings?.enforceMfa === true);

    // 5. List User Organizations
    const listOrgsRes = await rawRequest('GET', '/api/organizations', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    check('S1.8: List user organizations returns 200', listOrgsRes.status === 200);
    check('S1.9: List contains created organization', listOrgsRes.body.data?.some(o => o.orgId === orgAId));

    // -------------------------------------------------------------
    // Section 2: Workspace Multi-Tenant Scoping & Lifecycle
    // -------------------------------------------------------------
    console.log('Running Section 2: Workspace Multi-Tenant Scoping & Lifecycle...');

    // 1. Provision Workspace in Org A
    const createWsRes = await rawRequest('POST', `/api/organizations/${orgAId}/workspaces`, {
      name: 'Apex Long Short Equity',
      description: 'Fundamental long-short equity fund'
    }, {
      'Authorization': `Bearer ${adminToken}`,
      'x-org-id': orgAId
    });
    check('S2.1: Workspace provisioning in organization returns 201', createWsRes.status === 201);
    const wsAId = createWsRes.body.data?.workspaceId;
    check('S2.2: Workspace belongs to Org A', createWsRes.body.data?.orgId === orgAId);
    check('S2.3: Workspace status is ACTIVE', createWsRes.body.data?.status === WorkspaceStatus.ACTIVE);

    // 2. Creator assigned Workspace OWNER
    const wsMembership = authRepository.getMembership(wsAId, 'USR-ROOT-001');
    check('S2.4: Workspace creator automatically assigned OWNER role', wsMembership?.role === Role.OWNER);

    // 3. Update Workspace Settings
    const updateWsRes = await rawRequest('PATCH', `/api/workspaces/${wsAId}`, {
      description: 'Updated quantitative strategy workspace'
    }, {
      'Authorization': `Bearer ${adminToken}`,
      'x-workspace-id': wsAId
    });
    check('S2.5: Workspace update returns 200', updateWsRes.status === 200);
    check('S2.6: Workspace description updated', updateWsRes.body.data?.description === 'Updated quantitative strategy workspace');

    // 4. Archive Workspace
    const archiveWsRes = await rawRequest('POST', `/api/workspaces/${wsAId}/archive`, null, {
      'Authorization': `Bearer ${adminToken}`,
      'x-workspace-id': wsAId
    });
    check('S2.7: Workspace archiving returns 200', archiveWsRes.status === 200);
    check('S2.8: Workspace status changed to ARCHIVED', archiveWsRes.body.data?.status === WorkspaceStatus.ARCHIVED);

    // 5. Verify Archived Workspace rejects new active modifications
    const authzArchived = authorize({
      user: { userId: 'USR-ROOT-001' },
      workspaceId: wsAId,
      action: Permission.PORTFOLIO_WRITE
    });
    check('S2.9: Archived workspace rejects action with DENY', !authzArchived.isAuthorized);

    // Provision a second active workspace in Org A
    const createWs2Res = await rawRequest('POST', `/api/organizations/${orgAId}/workspaces`, {
      name: 'Apex Tech Opportunities',
      description: 'High conviction tech strategy'
    }, {
      'Authorization': `Bearer ${adminToken}`,
      'x-org-id': orgAId
    });
    const wsA2Id = createWs2Res.body.data?.workspaceId;
    check('S2.10: Second active workspace provisioned', !!wsA2Id);

    // -------------------------------------------------------------
    // Section 3: Membership Management & Role Transitions
    // -------------------------------------------------------------
    console.log('Running Section 3: Membership Management & Role Transitions...');

    // 1. Create Analyst User
    const analystReg = await rawRequest('POST', '/api/auth/register', {
      email: 'analyst1@apex.local',
      password: 'Analyst123!Secure',
      name: 'Sarah Chen'
    });
    const analystId = analystReg.body.userId;
    check('S3.1: Analyst user registered', !!analystId);

    // 2. Add Analyst to Org A as MEMBER
    const addOrgMemRes = await rawRequest('POST', `/api/organizations/${orgAId}/members`, {
      userId: analystId,
      role: OrganizationRole.MEMBER
    }, {
      'Authorization': `Bearer ${adminToken}`,
      'x-org-id': orgAId
    });
    check('S3.2: Add organization member returns 201', addOrgMemRes.status === 201);
    check('S3.3: Organization member role is MEMBER', addOrgMemRes.body.data?.role === OrganizationRole.MEMBER);

    // 3. Add Analyst to Workspace A2 as ANALYST
    const addWsMemRes = await rawRequest('POST', `/api/workspaces/${wsA2Id}/members`, {
      userId: analystId,
      role: Role.ANALYST
    }, {
      'Authorization': `Bearer ${adminToken}`,
      'x-workspace-id': wsA2Id
    });
    check('S3.4: Add workspace member returns 201', addWsMemRes.status === 201);
    check('S3.5: Workspace member role is ANALYST', addWsMemRes.body.data?.role === Role.ANALYST);

    // 4. Update Analyst Role in Workspace A2 to ADMIN
    const updateRoleRes = await rawRequest('PATCH', `/api/workspaces/${wsA2Id}/members/${analystId}`, {
      role: Role.ADMIN
    }, {
      'Authorization': `Bearer ${adminToken}`,
      'x-workspace-id': wsA2Id
    });
    check('S3.6: Workspace role update returns 200', updateRoleRes.status === 200);
    check('S3.7: Updated role is ADMIN', updateRoleRes.body.data?.role === Role.ADMIN);

    // 5. Remove Analyst from Workspace A2
    const removeWsMemRes = await rawRequest('DELETE', `/api/workspaces/${wsA2Id}/members/${analystId}`, null, {
      'Authorization': `Bearer ${adminToken}`,
      'x-workspace-id': wsA2Id
    });
    check('S3.8: Remove workspace member returns 200', removeWsMemRes.status === 200);
    const postRemoveMem = authRepository.getMembership(wsA2Id, analystId);
    check('S3.9: Membership status marked REVOKED', postRemoveMem?.status === MembershipStatus.REVOKED);

    // -------------------------------------------------------------
    // Section 4: Strict Multi-Tenant Isolation & Anti-IDOR Boundaries
    // -------------------------------------------------------------
    console.log('Running Section 4: Strict Tenant Isolation & Anti-IDOR Boundaries...');

    // 1. Create a separate Organization B with User B
    const userBReg = await rawRequest('POST', '/api/auth/register', {
      email: 'owner@beaconridge.local',
      password: 'Beacon123!Secure',
      name: 'Marcus Vance'
    });
    const userBId = userBReg.body.userId;

    const userBLogin = await rawRequest('POST', '/api/auth/login', {
      email: 'owner@beaconridge.local',
      password: 'Beacon123!Secure'
    });
    const userBToken = userBLogin.body.session?.token || userBLogin.body.token;

    const createOrgBRes = await rawRequest('POST', '/api/organizations', {
      name: 'Beacon Ridge Capital',
      slug: 'beacon-ridge'
    }, {
      'Authorization': `Bearer ${userBToken}`
    });
    const orgBId = createOrgBRes.body.data?.orgId;

    const createWsBRes = await rawRequest('POST', `/api/organizations/${orgBId}/workspaces`, {
      name: 'Beacon Global Macro',
      description: 'Cross-asset macro portfolio'
    }, {
      'Authorization': `Bearer ${userBToken}`,
      'x-org-id': orgBId
    });
    const wsBId = createWsBRes.body.data?.workspaceId;

    check('S4.1: Tenant B (Org B & Workspace B) provisioned', !!orgBId && !!wsBId);

    // 2. User B attempts to read Organization A -> MUST REJECT (403)
    const idorOrgReadRes = await rawRequest('GET', `/api/organizations/${orgAId}`, null, {
      'Authorization': `Bearer ${userBToken}`,
      'x-org-id': orgAId
    });
    check('S4.2: Cross-tenant organization read rejected with 403', idorOrgReadRes.status === 403);
    check('S4.3: Error code is FORBIDDEN_PERMISSION', idorOrgReadRes.body.code === 'FORBIDDEN_PERMISSION');

    // 3. User B attempts to update Organization A -> MUST REJECT (403)
    const idorOrgUpdateRes = await rawRequest('PATCH', `/api/organizations/${orgAId}`, {
      name: 'Hacked Organization'
    }, {
      'Authorization': `Bearer ${userBToken}`,
      'x-org-id': orgAId
    });
    check('S4.4: Cross-tenant organization update rejected with 403', idorOrgUpdateRes.status === 403);

    // 4. User B attempts to list members of Workspace A2 -> MUST REJECT (403)
    const idorWsMembersRes = await rawRequest('GET', `/api/workspaces/${wsA2Id}/members`, null, {
      'Authorization': `Bearer ${userBToken}`,
      'x-workspace-id': wsA2Id
    });
    check('S4.5: Cross-tenant workspace members read rejected with 403', idorWsMembersRes.status === 403);

    // 5. User B attempts to archive Workspace A2 -> MUST REJECT (403)
    const idorWsArchiveRes = await rawRequest('POST', `/api/workspaces/${wsA2Id}/archive`, null, {
      'Authorization': `Bearer ${userBToken}`,
      'x-workspace-id': wsA2Id
    });
    check('S4.6: Cross-tenant workspace archive rejected with 403', idorWsArchiveRes.status === 403);

    // 6. User B attempts header spoofing (x-workspace-id: wsA2Id while accessing resources)
    const authzSpoof = authorize({
      user: { userId: userBId },
      workspaceId: wsA2Id,
      action: Permission.WORKSPACE_READ
    });
    check('S4.7: Direct authorization engine rejects non-member with DENY', !authzSpoof.isAuthorized);

    // -------------------------------------------------------------
    // Section 5: Privilege Escalation & Deny-by-Default RBAC
    // -------------------------------------------------------------
    console.log('Running Section 5: Privilege Escalation & Deny-by-Default RBAC...');

    // 1. Analyst login
    const analystLogin = await rawRequest('POST', '/api/auth/login', {
      email: 'analyst1@apex.local',
      password: 'Analyst123!Secure'
    });
    const analystToken = analystLogin.body.session?.token || analystLogin.body.token;

    // 2. Analyst attempts to create new Organization Workspace -> MUST REJECT (403)
    const analystCreateWsRes = await rawRequest('POST', `/api/organizations/${orgAId}/workspaces`, {
      name: 'Unauthorized Fund'
    }, {
      'Authorization': `Bearer ${analystToken}`,
      'x-org-id': orgAId
    });
    check('S5.1: Non-admin member cannot create workspace in org (403)', analystCreateWsRes.status === 403);

    // 3. Analyst attempts to add member to Organization -> MUST REJECT (403)
    const analystAddMemRes = await rawRequest('POST', `/api/organizations/${orgAId}/members`, {
      userId: userBId,
      role: OrganizationRole.ADMIN
    }, {
      'Authorization': `Bearer ${analystToken}`,
      'x-org-id': orgAId
    });
    check('S5.2: Non-admin member cannot add organization members (403)', analystAddMemRes.status === 403);

    // 4. Role Hierarchy Guard (Viewer attempting to assign Owner)
    check('S5.3: canAssignRole rejects Viewer assigning Owner', !canAssignRole(Role.VIEWER, Role.OWNER));
    check('S5.4: canAssignRole rejects Analyst assigning Admin', !canAssignRole(Role.ANALYST, Role.ADMIN));
    check('S5.5: canAssignRole permits Owner assigning Admin', canAssignRole(Role.OWNER, Role.ADMIN));

    // 5. Unauthenticated request to admin endpoints
    const unauthRes = await rawRequest('GET', '/api/organizations', null);
    check('S5.6: Unauthenticated request rejected with 401', unauthRes.status === 401);
    check('S5.7: Unauthenticated error code is AUTH_REQUIRED', unauthRes.body.code === 'AUTH_REQUIRED');

    // -------------------------------------------------------------
    // Section 6: Concurrency & Deterministic Replay
    // -------------------------------------------------------------
    console.log('Running Section 6: Concurrency & Deterministic Replay...');

    // 1. 50 concurrent workspace operations
    const concurrentTasks = Array.from({ length: 50 }).map((_, idx) => {
      return rawRequest('GET', `/api/organizations/${orgAId}/workspaces`, null, {
        'Authorization': `Bearer ${adminToken}`,
        'x-org-id': orgAId
      });
    });
    const concurrentResults = await Promise.all(concurrentTasks);
    check('S6.1: 50 concurrent organization workspace reads succeed 200', concurrentResults.every(r => r.status === 200));

    // 2. 100 Deterministic Replay Cycles
    let replayConsistent = true;
    for (let i = 0; i < 100; i++) {
      const authzA = authorize({ user: { userId: 'USR-ROOT-001' }, orgId: orgAId, action: Permission.ORG_UPDATE });
      const authzB = authorize({ user: { userId: userBId }, orgId: orgAId, action: Permission.ORG_UPDATE });
      if (!authzA.isAuthorized || authzB.isAuthorized) {
        replayConsistent = false;
        break;
      }
    }
    check('S6.2: 100 deterministic replay cycles produce 100% identical authorization states', replayConsistent);

    // -------------------------------------------------------------
    // Section 7: Audit Lineage & Observability
    // -------------------------------------------------------------
    console.log('Running Section 7: Audit Lineage & Observability...');

    const auditEvents = auditRepository.getEvents({ limit: 100 });
    const hasOrgCreate = auditEvents.some(e => e.action === 'organization.create');
    const hasOrgUpdate = auditEvents.some(e => e.action === 'organization.update');
    const hasWsCreate = auditEvents.some(e => e.action === 'workspace.create');
    const hasWsArchive = auditEvents.some(e => e.action === 'workspace.archive');

    check('S7.1: Audit event emitted for organization.create', hasOrgCreate);
    check('S7.2: Audit event emitted for organization.update', hasOrgUpdate);
    check('S7.3: Audit event emitted for workspace.create', hasWsCreate);
    check('S7.4: Audit event emitted for workspace.archive', hasWsArchive);

    console.log(`\n✅ Phase 35 Suite: ${passed}/${total} assertions passed cleanly.`);
  } finally {
    await stopTestServer();
  }

  return { passed, total, suites: 1 };
}

if (process.argv[1]?.endsWith('phase35OrganizationWorkspaceTests.js')) {
  runPhase35Tests()
    .then((res) => {
      console.log(`\nFinal Phase 35 Test Count: ${res.passed} passed.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Phase 35 Test Suite Error:', err);
      process.exit(1);
    });
}

export { runPhase35Tests };
