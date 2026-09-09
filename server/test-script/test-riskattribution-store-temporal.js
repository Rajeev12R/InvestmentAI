/**
 * server/test-script/test-riskattribution-store-temporal.js
 * 
 * Phase 32 — Suite 2: Multi-Tenant Repository, Point-in-Time Temporal Store & Audit Lineage
 */

import { RiskAttributionRepository } from '../riskAttribution/riskAttribution.repository.js';
import { RiskAttributionEngine } from '../riskAttribution/riskAttribution.engine.js';
import { RiskAttributionExplanationDAG } from '../riskAttribution/riskAttribution.explanation.js';
import { RiskAttributionPackageBuilder } from '../riskAttribution/riskAttribution.package.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 2: Multi-Tenant Repository, Temporal PIT Store & Audit Lineage ---');

const repo = new RiskAttributionRepository();

const attrT1 = RiskAttributionEngine.runComprehensiveAttribution({
  symbols: ['AAPL', 'MSFT'],
  weights: [0.5, 0.5],
  covarianceMatrix: [[0.04, 0.01], [0.01, 0.04]],
  asOf: '2026-01-15T12:00:00.000Z'
});
const dagT1 = RiskAttributionExplanationDAG.buildExplanationDAG(attrT1);
const pkgT1 = RiskAttributionPackageBuilder.buildSealedPackage({
  attributionResult: attrT1,
  explanationDAG: dagT1,
  portfolioSnapshotId: 'SNAP-PORT-100',
  tenantId: 'tenant_alpha'
});

// 1. Save Package for Tenant Alpha
repo.savePackage('tenant_alpha', pkgT1, 'user_pm1');
assert(repo.getPackage('tenant_alpha', pkgT1.packageId) !== null, 'Package saved and retrieved for tenant_alpha');

// 2. Strict Tenant Isolation
assert(repo.getPackage('tenant_beta', pkgT1.packageId) === null, 'Tenant Beta CANNOT access Tenant Alpha package');
assert(repo.listPackages('tenant_beta').length === 0, 'Tenant Beta listPackages is empty');

// 3. Point-in-Time Snapshot Retrieval @ T1
const retrievedT1 = repo.getAttributionAsOf('tenant_alpha', 'SNAP-PORT-100', '2026-01-16T00:00:00.000Z');
assert(retrievedT1 !== null && retrievedT1.packageId === pkgT1.packageId, 'PIT retrieval @ T1 succeeds');

const beforeT1 = repo.getAttributionAsOf('tenant_alpha', 'SNAP-PORT-100', '2026-01-01T00:00:00.000Z');
assert(beforeT1 === null, 'PIT query before creation timestamp returns null');

// 4. Save a Later Snapshot @ T2 (e.g., February 2026)
const attrT2 = RiskAttributionEngine.runComprehensiveAttribution({
  symbols: ['AAPL', 'MSFT'],
  weights: [0.7, 0.3],
  covarianceMatrix: [[0.05, 0.02], [0.02, 0.06]],
  asOf: '2026-02-15T12:00:00.000Z'
});
const dagT2 = RiskAttributionExplanationDAG.buildExplanationDAG(attrT2);
const pkgT2 = RiskAttributionPackageBuilder.buildSealedPackage({
  attributionResult: attrT2,
  explanationDAG: dagT2,
  portfolioSnapshotId: 'SNAP-PORT-100',
  tenantId: 'tenant_alpha'
});
repo.savePackage('tenant_alpha', pkgT2, 'user_pm1');

// Verify PIT query @ T1 STILL returns exact original T1 result unchanged
const pitCheckT1 = repo.getAttributionAsOf('tenant_alpha', 'SNAP-PORT-100', '2026-01-20T00:00:00.000Z');
assert(pitCheckT1.packageId === pkgT1.packageId, 'Historical T1 snapshot remains unchanged after T2 is added');
assert(pitCheckT1.positions[0].weight === 0.5, 'T1 snapshot preserves original 0.5 weight');

// PIT query @ T2 returns T2 result
const pitCheckT2 = repo.getAttributionAsOf('tenant_alpha', 'SNAP-PORT-100', '2026-02-20T00:00:00.000Z');
assert(pitCheckT2.packageId === pkgT2.packageId, 'T2 snapshot correctly retrieved for T2 timestamp');
assert(pitCheckT2.positions[0].weight === 0.7, 'T2 snapshot contains updated 0.7 weight');

// 5. Versioned Restatements
const restatedPkgT1 = RiskAttributionPackageBuilder.buildSealedPackage({
  attributionResult: attrT1,
  explanationDAG: dagT1,
  portfolioSnapshotId: 'SNAP-PORT-100',
  tenantId: 'tenant_alpha',
  modelProvenance: { restatementOf: pkgT1.packageId, reason: 'CORRECTED_DIVIDEND_ADJUSTMENT' }
});
repo.recordRestatement('tenant_alpha', pkgT1.packageId, restatedPkgT1, 'CORRECTED_DIVIDEND_ADJUSTMENT', 'risk_auditor');

assert(repo.getPackage('tenant_alpha', pkgT1.packageId) !== null, 'Original package is preserved after restatement');
assert(repo.getPackage('tenant_alpha', restatedPkgT1.packageId) !== null, 'Restated package exists as distinct immutable record');

// 6. Audit Trail Logging
const auditLogs = repo.getAuditLogs('tenant_alpha');
assert(auditLogs.length >= 3, 'Audit logs recorded for save and restate actions');
const restateLog = auditLogs.find(l => l.action === 'RESTATE_ATTRIBUTION_PACKAGE');
assert(restateLog && restateLog.originalPackageId === pkgT1.packageId, 'Restatement audit log contains original package reference');
assert(restateLog.user === 'risk_auditor', 'Audit log records actor');

// 7. Tamper Detection / Rejection
let caughtTamper = false;
try {
  const tampered = JSON.parse(JSON.stringify(pkgT1));
  tampered.positions[0].weight = 0.999; // mutate without updating hash
  repo.savePackage('tenant_alpha', tampered);
} catch (e) {
  caughtTamper = true;
}
assert(caughtTamper, 'Repository rejects persisting tampered package with mismatched hash');

console.log(`PASSED: ${passed}`);
