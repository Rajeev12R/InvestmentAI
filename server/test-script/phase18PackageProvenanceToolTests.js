/**
 * Phase 18 — Test Suite 3: Package Sealing, Provenance, Repository & Copilot Tool Tests
 */

import { strict as assert } from 'assert';
import { LiquidityStatus, ExecutionFeasibility, LiquidityDataStatus } from '../liquidity/liquidity.types.js';
import { SealedLiquidityIntelligencePackage } from '../liquidity/liquidity.package.js';
import { liquidityRepository } from '../liquidity/liquidity.repository.js';
import { LiquidityCopilotTool } from '../liquidity/liquidity.tool.js';
import { LiquidityExplanationEngine } from '../liquidity/liquidity.explanation.engine.js';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 18 SUITE 3: PACKAGE, PROVENANCE, REPOSITORY & COPILOT TOOL TESTS ---');

// 1. Package Sealing & Cryptographic Verification
const samplePayload = {
  workspaceId: 'WS-INST-1',
  portfolioId: 'PORT-MAIN-1',
  timestamp: '2025-01-15T12:00:00.000Z',
  observations: [
    { ticker: 'AAPL', adv: 1000000, price: 150.0, bid: 149.95, ask: 150.05 }
  ],
  metrics: {
    portfolioDollarAdv: 150000000,
    weightedSpreadBps: 6.67
  },
  feasibility: {
    overallFeasibility: 'FEASIBLE'
  },
  evidenceGraph: [
    { evidenceId: 'EVID-SRC-LIQ-INST-2024', hash: 'a71e860959086f6d5423f0545f44e1837494f6c4ff98444a161bb774fcfbaae9' }
  ]
};

const sealed = SealedLiquidityIntelligencePackage.sealPackage(samplePayload);
testAssert(sealed.status === LiquidityStatus.PASS, 'Package seals successfully');
testAssert(typeof sealed.packageHash === 'string' && sealed.packageHash.length === 64, 'Valid 64-char SHA-256 hash');
testAssert(sealed.packageId.startsWith('SEAL-LIQ-WS-INST-1-PORT-MAIN-1-'), 'Deterministic Package ID prefix');

// 2. Package Integrity Verification
const isValid = SealedLiquidityIntelligencePackage.verifyPackage(sealed);
testAssert(isValid === true, 'Untampered package verifies true');

// Tamper check
const tampered = {
  packageId: sealed.packageId,
  packageHash: sealed.packageHash,
  package: {
    ...sealed.package,
    workspaceId: 'WS-HACKED'
  }
};
const isTamperedValid = SealedLiquidityIntelligencePackage.verifyPackage(tampered);
testAssert(isTamperedValid === false, 'Tampered package is rejected');

// 3. Repository Workspace Isolation
liquidityRepository.clearAll();

liquidityRepository.saveObservation('WS-TENANT-A', {
  ticker: 'AAPL',
  adv: 1000000,
  price: 150.0,
  bid: 149.95,
  ask: 150.05
});

liquidityRepository.saveObservation('WS-TENANT-B', {
  ticker: 'MSFT',
  adv: 800000,
  price: 300.0,
  bid: 299.90,
  ask: 300.10
});

testAssert(liquidityRepository.getObservation('WS-TENANT-A', 'AAPL') !== null, 'Tenant A can access AAPL');
testAssert(liquidityRepository.getObservation('WS-TENANT-A', 'MSFT') === null, 'Tenant A cannot access MSFT (isolated)');
testAssert(liquidityRepository.getObservation('WS-TENANT-B', 'MSFT') !== null, 'Tenant B can access MSFT');
testAssert(liquidityRepository.getObservation('WS-TENANT-B', 'AAPL') === null, 'Tenant B cannot access AAPL (isolated)');

// 4. Audit Logging Invariants
const auditRec = liquidityRepository.recordAuditEvent('WS-TENANT-A', {
  action: 'OBSERVATION_UPDATED',
  ticker: 'AAPL',
  actor: 'USR-CHIEF-RISK'
});
testAssert(auditRec.eventId.startsWith('AUDIT-LIQ-'), 'Audit event ID generated');
testAssert(auditRec.eventHash.length === 64, 'Deterministic event hash present');

const auditLogs = liquidityRepository.getAuditLogs('WS-TENANT-A');
testAssert(auditLogs.length === 1, 'Audit log recorded in Tenant A');
testAssert(liquidityRepository.getAuditLogs('WS-TENANT-B').length === 0, 'No audit leak to Tenant B');

// 5. Copilot Read-Only Tool Invariants
const copilotSecurityQuery = LiquidityCopilotTool.querySecurityLiquidity('WS-TENANT-A', 'AAPL');
testAssert(copilotSecurityQuery.status === LiquidityStatus.PASS, 'Copilot queries security liquidity');
testAssert(typeof copilotSecurityQuery.explanation === 'string', 'Deterministic explanation generated');
testAssert(copilotSecurityQuery.explanation.includes('AAPL'), 'Explanation references ticker');

const copilotFeasibilityQuery = LiquidityCopilotTool.queryTradeFeasibility('WS-TENANT-A', {
  ticker: 'AAPL',
  orderQuantity: 10000
});
testAssert(copilotFeasibilityQuery.status === LiquidityStatus.PASS, 'Copilot evaluates feasibility');
testAssert(copilotFeasibilityQuery.feasibility.feasibility === ExecutionFeasibility.FEASIBLE, 'Evaluated as FEASIBLE');

const copilotStressQuery = LiquidityCopilotTool.queryLiquidityStress('WS-TENANT-A', {
  ticker: 'AAPL',
  orderQuantity: 50000
});
testAssert(copilotStressQuery.status === LiquidityStatus.PASS, 'Copilot evaluates stress');
testAssert(copilotStressQuery.stressResult.delta.costIncreaseBps > 0, 'Stress increases cost');

// 6. Missing Observation in Copilot Query
const copilotMissingQuery = LiquidityCopilotTool.querySecurityLiquidity('WS-TENANT-A', 'NONEXISTENT');
testAssert(copilotMissingQuery.status === LiquidityStatus.UNAVAILABLE, 'Nonexistent ticker returns UNAVAILABLE');
testAssert(copilotMissingQuery.explanation.includes('UNAVAILABLE'), 'Explanation indicates UNAVAILABLE status');

console.log(`PASSED: Suite 3 completed with ${totalAssertions} assertions.`);
