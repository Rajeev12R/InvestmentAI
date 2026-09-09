/**
 * @file phase34SaaSFoundationTests.js
 * Comprehensive Verification & Security Test Suite for Phase 34 SaaS Product Foundation.
 */

import assert from 'assert';
import http from 'http';
import app from '../index.js';
import { authService } from '../auth/auth.service.js';
import { authRepository } from '../auth/auth.repository.js';
import { apiKeyService } from '../auth/apiKey.service.js';
import { ApiErrorCode, normalizeApiError, ApiError } from '../../client/src/services/errorTypes.js';

let server;
let baseUrl;

async function startTestServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
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
  const url = new URL(path, baseUrl);
  const options = {
    method,
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runPhase34Tests() {
  console.log('================================================================');
  console.log('INVESTMENTAI — PHASE 34 SAAS PRODUCT FOUNDATION VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function check(desc, condition) {
    total++;
    try {
      assert.ok(condition, desc);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${desc}: ${err.message}`);
      throw err;
    }
  }

  await startTestServer();

  try {
    // -------------------------------------------------------------
    // Section 1: Error Normalization & Error Classification Engine
    // -------------------------------------------------------------
    console.log('Running Section 1: Standardized Error Normalization...');

    const err401 = normalizeApiError({ response: { status: 401, data: { message: 'Unauthorized session' } } });
    check('S1.1: Normalize 401 to AUTHENTICATION_ERROR', err401.code === ApiErrorCode.AUTHENTICATION_ERROR);

    const err403 = normalizeApiError({ response: { status: 403, data: { message: 'Forbidden scope' } } });
    check('S1.2: Normalize 403 to AUTHORIZATION_ERROR', err403.code === ApiErrorCode.AUTHORIZATION_ERROR);

    const err404 = normalizeApiError({ response: { status: 404, data: { message: 'Not found' } } });
    check('S1.3: Normalize 404 to NOT_FOUND', err404.code === ApiErrorCode.NOT_FOUND);

    const err422 = normalizeApiError({ response: { status: 422, data: { code: 'INSUFFICIENT_DATA', message: 'Model requires more observations' } } });
    check('S1.4: Normalize 422 with code to INSUFFICIENT_DATA', err422.code === ApiErrorCode.INSUFFICIENT_DATA);

    const err429 = normalizeApiError({ response: { status: 429, data: { message: 'Rate limit exceeded' } } });
    check('S1.5: Normalize 429 to RATE_LIMITED', err429.code === ApiErrorCode.RATE_LIMITED);

    const err500 = normalizeApiError({ response: { status: 500, data: { message: 'Internal server error' } } });
    check('S1.6: Normalize 500 to SERVER_ERROR', err500.code === ApiErrorCode.SERVER_ERROR);

    const errTimeout = normalizeApiError({ code: 'ECONNABORTED', message: 'timeout of 120000ms exceeded' });
    check('S1.7: Normalize timeout to NETWORK_ERROR', errTimeout.code === ApiErrorCode.NETWORK_ERROR);

    const errNetwork = normalizeApiError({ message: 'Network Error' });
    check('S1.8: Normalize connection failure to NETWORK_ERROR', errNetwork.code === ApiErrorCode.NETWORK_ERROR);

    // -------------------------------------------------------------
    // Section 2: Authenticated Application Entry & Session Lifecycle
    // -------------------------------------------------------------
    console.log('Running Section 2: Authentication & Session Lifecycle...');

    // Login default root user
    const loginRes = await rawRequest('POST', '/api/auth/login', {
      email: 'admin@investmentai.local',
      password: 'Admin123!Secure',
      workspaceId: 'default'
    });
    const token = loginRes.body.session?.token || loginRes.body.token;
    check('S2.2: Login returns valid Bearer token', typeof token === 'string' && token.length > 20);
    check('S2.3: Login returns active session object', loginRes.body.session?.sessionId && loginRes.body.user?.userId);

    // Validate session endpoint
    const sessionRes = await rawRequest('GET', '/api/auth/session', null, {
      'Authorization': `Bearer ${token}`
    });
    check('S2.4: Session verification status 200', sessionRes.status === 200);
    check('S2.5: Verified session matches user ID', sessionRes.body.user?.userId === loginRes.body.user.userId);
    check('S2.6: Verified session returns workspaceId', sessionRes.body.workspaceId === 'default');

    // List authorized workspaces
    const wsListRes = await rawRequest('GET', '/api/auth/workspaces', null, {
      'Authorization': `Bearer ${token}`
    });
    check('S2.7: List user workspaces status 200', wsListRes.status === 200);
    check('S2.8: User has at least 1 authorized workspace', Array.isArray(wsListRes.body.workspaces) && wsListRes.body.workspaces.length >= 1);

    // Create a secondary workspace
    const newWsRes = await rawRequest('POST', '/api/auth/workspaces', { name: 'Quantitative Research Sleeve' }, {
      'Authorization': `Bearer ${token}`
    });
    check('S2.9: Create secondary workspace status 201', newWsRes.status === 201);
    check('S2.10: Created workspace has distinct workspaceId', newWsRes.body.workspaceId?.startsWith('WS-'));

    // -------------------------------------------------------------
    // Section 3: Workspace Context & Scoping Invariants
    // -------------------------------------------------------------
    console.log('Running Section 3: Workspace Context & Scoping...');

    const secWsId = newWsRes.body.workspaceId;

    // Check workspace retrieval with x-workspace-id header
    const wsFetchRes = await rawRequest('GET', `/api/workspaces/${secWsId}`, null, {
      'Authorization': `Bearer ${token}`,
      'x-workspace-id': secWsId
    });
    const fetchedWs = wsFetchRes.body.data || wsFetchRes.body.workspace || wsFetchRes.body;
    check('S3.2: Scoped workspace returns correct workspaceId', fetchedWs.workspaceId === secWsId || fetchedWs.id === secWsId);

    // -------------------------------------------------------------
    // Section 4: RBAC & Sovereign Security Boundaries
    // -------------------------------------------------------------
    console.log('Running Section 4: RBAC & Sovereign Security Boundaries...');

    // 1. Unauthenticated request to protected route
    const unauthRes = await rawRequest('GET', '/api/auth/keys');
    check('S4.1: Unauthenticated request rejected with 401', unauthRes.status === 401);
    check('S4.2: Unauthenticated response returns AUTH_REQUIRED code', unauthRes.body.code === 'AUTH_REQUIRED');

    // 2. Register a ReadOnly Analyst
    const analystRegRes = await rawRequest('POST', '/api/auth/register', {
      email: `analyst_${Date.now()}@investmentai.local`,
      password: 'Analyst123!Secure',
      name: 'Junior Analyst'
    });
    check('S4.3: Analyst registration status 201', analystRegRes.status === 201);

    const analystLoginRes = await rawRequest('POST', '/api/auth/login', {
      email: analystRegRes.body.email,
      password: 'Analyst123!Secure'
    });
    const analystToken = analystLoginRes.body.session?.token || analystLoginRes.body.token;

    // 3. Analyst attempting to create an API key in default workspace (without membership / permissions)
    const analystKeyCreateRes = await rawRequest('POST', '/api/auth/keys', {
      name: 'Forbidden Key',
      scopes: ['api_keys:create'],
      expiresDays: 30
    }, {
      'Authorization': `Bearer ${analystToken}`,
      'x-workspace-id': 'default'
    });
    check('S4.4: Unauthorized role rejected with 403 Forbidden', analystKeyCreateRes.status === 403);
    check('S4.5: Unauthorized rejection specifies code', analystKeyCreateRes.body.code === 'FORBIDDEN_PERMISSION');

    // -------------------------------------------------------------
    // Section 5: Intelligence & Data Freshness Interfaces
    // -------------------------------------------------------------
    console.log('Running Section 5: Data Freshness & Pipeline Interfaces...');

    const tickersRes = await rawRequest('GET', '/api/market/ticker');
    check('S5.1: Market tickers endpoint returns status 200', tickersRes.status === 200);
    check('S5.2: Market tickers returns non-empty array', Array.isArray(tickersRes.body.data) && tickersRes.body.data.length > 0);

    const alertsRes = await rawRequest('GET', '/api/workspaces/default/alerts', null, {
      'Authorization': `Bearer ${token}`
    });
    check('S5.3: Workspace alerts endpoint returns status 200', alertsRes.status === 200);
    check('S5.4: Workspace alerts returns structured array', Array.isArray(alertsRes.body.data || alertsRes.body.alerts || alertsRes.body));

    // -------------------------------------------------------------
    // Section 6: Idempotent Safe Reads vs Non-Retryable Mutations
    // -------------------------------------------------------------
    console.log('Running Section 6: Idempotent Read vs Mutation Safety...');

    // Attempt invalid login (mutation)
    const badLoginRes = await rawRequest('POST', '/api/auth/login', {
      email: 'nonexistent@investmentai.local',
      password: 'WrongPassword123'
    });
    check('S6.1: Bad credentials returns 401 without retry side-effects', badLoginRes.status === 401);

    // Logout session
    const logoutRes = await rawRequest('POST', '/api/auth/logout', null, {
      'Authorization': `Bearer ${token}`
    });
    check('S6.2: Session logout returns status 200 with success: true', logoutRes.status === 200 && logoutRes.body.success === true);

    // Verify token is now invalid
    const postLogoutSessionRes = await rawRequest('GET', '/api/auth/session', null, {
      'Authorization': `Bearer ${token}`
    });
    check('S6.3: Revoked token session check rejected with 401', postLogoutSessionRes.status === 401);

    console.log(`\n✅ Phase 34 Suite: ${passed}/${total} assertions passed cleanly.`);
  } finally {
    await stopTestServer();
  }

  return { passed, total, suites: 1 };
}

if (process.argv[1]?.endsWith('phase34SaaSFoundationTests.js')) {
  runPhase34Tests()
    .then((res) => {
      console.log(`\nFinal Phase 34 Test Count: ${res.passed} passed.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Phase 34 Test Suite Error:', err);
      process.exit(1);
    });
}

export { runPhase34Tests };
