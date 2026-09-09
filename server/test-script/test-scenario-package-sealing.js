/**
 * server/test-script/test-scenario-package-sealing.js
 * 
 * Phase 19: Cryptographic Package Sealing & Tamper Verification Unit Tests
 */

import assert from 'assert';
import { sealScenarioPackage, verifyScenarioPackage } from '../scenario/scenario.package.js';
import { ScenarioType, ShockUnit } from '../scenario/scenario.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 19 PACKAGE SEALING & VERIFICATION TESTS ---');

const mockScenarioDef = {
  id: 'SCEN-TEST-SEAL',
  name: 'Sealing Validation Scenario',
  scenarioType: ScenarioType.HYPOTHETICAL_STRESS,
  shocks: [
    { targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT, shockValue: -0.15 }
  ]
};

const mockScenarioResult = {
  scenarioId: 'SCEN-TEST-SEAL',
  baseline: { nav: 100000 },
  stressed: { nav: 85000 },
  deltas: { pnlDollar: -15000, pnlPercent: -0.15 }
};

const mockPortfolio = {
  id: 'PORT-SEAL-01',
  positions: [{ ticker: 'AAPL', price: 150, shares: 100 }]
};

// 1. Seal package
const sealed = sealScenarioPackage({
  tenantId: 'TENANT-INST-001',
  scenarioResult: mockScenarioResult,
  portfolioSnapshot: mockPortfolio,
  scenarioDefinition: mockScenarioDef,
  sealedBy: 'USR-RISK-LEAD'
});

// 2. Structural & Seal ID checks
testAssert(typeof sealed.sealId === 'string' && sealed.sealId.startsWith('SEAL-SCEN-'), `Seal ID format correct: ${sealed.sealId}`);
testAssert(typeof sealed.canonicalHash === 'string' && sealed.canonicalHash.length === 64, `Canonical hash is 64 hex chars: ${sealed.canonicalHash}`);
testAssert(sealed.verification.isSealed === true, 'Package is sealed');
testAssert(sealed.sealedBy === 'USR-RISK-LEAD', 'SealedBy actor recorded');

// 3. Immutability verification (deepFreeze)
let mutationFailed = false;
try {
  sealed.tenantId = 'HACKED-TENANT';
} catch (err) {
  mutationFailed = true;
}
testAssert(mutationFailed, 'Sealed package top-level is immutable');

let nestedMutationFailed = false;
try {
  sealed.scenarioResult.deltas.pnlDollar = 0;
} catch (err) {
  nestedMutationFailed = true;
}
testAssert(nestedMutationFailed, 'Sealed package nested result is deeply immutable');

// 4. Verification of authentic package
const verifyAuthentic = verifyScenarioPackage(sealed);
testAssert(verifyAuthentic.valid === true, 'Authentic sealed package verifies successfully');
testAssert(verifyAuthentic.storedHash === verifyAuthentic.recomputedHash, 'Stored hash matches recomputed hash');

// 5. Tamper Detection: Clone and alter payload
const tamperedPackage = JSON.parse(JSON.stringify(sealed));
tamperedPackage.scenarioResult.deltas.pnlDollar = -5000; // Altered loss from -15,000 to -5,000

const verifyTampered = verifyScenarioPackage(tamperedPackage);
testAssert(verifyTampered.valid === false, 'Tampered package is correctly rejected by verification');
testAssert(verifyTampered.storedHash !== verifyTampered.recomputedHash, 'Tampered hash mismatch detected');

// 6. Tamper Detection: Altered definition
const tamperedDefPackage = JSON.parse(JSON.stringify(sealed));
tamperedDefPackage.scenarioDefinition.shocks[0].shockValue = -0.05;

const verifyTamperedDef = verifyScenarioPackage(tamperedDefPackage);
testAssert(verifyTamperedDef.valid === false, 'Tampered scenario shock definition rejected');

console.log(`[PASS] Phase 19 Package Sealing tests passed: ${assertionCount} assertions`);

export default { assertionCount };
