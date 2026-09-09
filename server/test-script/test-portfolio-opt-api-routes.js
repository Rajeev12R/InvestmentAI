/**
 * server/test-script/test-portfolio-opt-api-routes.js
 * 
 * Phase 33 — Suite 11: REST API Endpoints, RBAC & Tenant Isolation
 */

import { portfolioOptimizationRouter } from '../portfolioOptimization/portfolioOptimization.routes.js';
import { portfolioOptimizationRepository } from '../portfolioOptimization/portfolioOptimization.repository.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 11: REST API Routes & RBAC/Tenant Isolation ---');

// Mock request / response helpers
function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

// Find route handlers from express router stack
function getHandler(method, path) {
  const layer = portfolioOptimizationRouter.stack.find(
    s => s.route && s.route.path === path && s.route.methods[method.toLowerCase()]
  );
  if (!layer) throw new Error(`Handler not found for ${method} ${path}`);
  return layer.route.stack[0].handle;
}

const optimizeHandler = getHandler('POST', '/optimize');
const feasibilityHandler = getHandler('POST', '/feasibility');
const scenariosHandler = getHandler('POST', '/scenarios');
const getPackageHandler = getHandler('GET', '/package/:packageId');
const getAsOfHandler = getHandler('GET', '/as-of');

// 1. Test POST /optimize
const optReq = {
  headers: { 'x-tenant-id': 'tenant_api_1' },
  body: {
    symbols: ['STK_A', 'STK_B'],
    covarianceMatrix: [[0.04, 0.01], [0.01, 0.04]],
    constraints: { longOnly: true },
    portfolioSnapshotId: 'SNAP-API-TEST'
  }
};
const optRes = createMockRes();
optimizeHandler(optReq, optRes);

assert(optRes.statusCode === 200, 'POST /optimize returns HTTP 200');
assert(optRes.body.success === true, 'POST /optimize returns success: true');
assert(optRes.body.optimizationResult.status === 'OPTIMAL', 'Optimization status is OPTIMAL');
assert(optRes.body.packageId !== undefined, 'Package ID returned in response');
assert(optRes.body.integrityHash !== undefined, 'Integrity hash returned in response');

// 2. Test GET /package/:packageId (Tenant Access)
const pkgId = optRes.body.packageId;
const getReq = {
  headers: { 'x-tenant-id': 'tenant_api_1' },
  params: { packageId: pkgId }
};
const getRes = createMockRes();
getPackageHandler(getReq, getRes);

assert(getRes.statusCode === 200, 'GET /package/:packageId returns HTTP 200 for authorized tenant');
assert(getRes.body.package.packageId === pkgId, 'Returned package matches requested package ID');

// 3. Test GET /package/:packageId (Cross-Tenant Unauthorized Access)
const snoopingReq = {
  headers: { 'x-tenant-id': 'tenant_attacker' },
  params: { packageId: pkgId }
};
const snoopRes = createMockRes();
getPackageHandler(snoopingReq, snoopRes);

assert(snoopRes.statusCode === 404, 'Cross-tenant package access fails closed with HTTP 404');
assert(snoopRes.body.success === false, 'Unauthorized cross-tenant request rejected');

// 4. Test POST /feasibility
const feasReq = {
  body: {
    symbols: ['A', 'B'],
    constraints: { minWeights: [0.6, 0.6] }
  }
};
const feasRes = createMockRes();
feasibilityHandler(feasReq, feasRes);

assert(feasRes.statusCode === 200, 'POST /feasibility returns HTTP 200');
assert(feasRes.body.feasibility.isFeasible === false, 'Feasibility endpoint identifies infeasible constraints');

// 5. Test POST /scenarios
const scReq = {
  body: {
    symbols: ['A', 'B'],
    covarianceMatrix: [[0.04, 0.01], [0.01, 0.04]]
  }
};
const scRes = createMockRes();
scenariosHandler(scReq, scRes);

assert(scRes.statusCode === 200, 'POST /scenarios returns HTTP 200');
assert(scRes.body.scenarioAnalysis.scenarios.length === 4, 'Scenario analysis returns 4 macro scenarios');

// 6. Test GET /as-of
const asOfReq = {
  headers: { 'x-tenant-id': 'tenant_api_1' },
  query: {
    snapshotId: 'SNAP-API-TEST',
    asOf: new Date(Date.now() + 10000).toISOString()
  }
};
const asOfRes = createMockRes();
getAsOfHandler(asOfReq, asOfRes);

assert(asOfRes.statusCode === 200, 'GET /as-of returns HTTP 200 for valid PIT query');
assert(asOfRes.body.package.portfolioSnapshotId === 'SNAP-API-TEST', 'PIT package matches snapshot ID');

console.log(`PASSED: ${passed}`);
