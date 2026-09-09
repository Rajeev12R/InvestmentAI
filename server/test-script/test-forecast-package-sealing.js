/**
 * server/test-script/test-forecast-package-sealing.js
 * 
 * Phase 20: Cryptographic Forecast Package Sealing & Verification Tests
 */

import assert from 'assert';
import { sealForecastPackage, verifyForecastPackage } from '../forecasting/forecast.package.js';
import { ForecastClassification } from '../forecasting/forecast.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 20 PACKAGE SEALING & VERIFICATION TESTS ---');

const mockForecastRecord = {
  forecastId: 'FCST-AAPL-REVENUE-2026-001',
  ticker: 'AAPL',
  metric: 'REVENUE',
  value: 420000,
  horizon: '1Y',
  assumptions: {
    revenueGrowthRate: 0.10,
    operatingMargin: 0.30
  },
  classification: ForecastClassification.FORECAST
};

// 1. Seal package
const sealed = sealForecastPackage({
  tenantId: 'TENANT-ALPHA',
  forecastRecord: mockForecastRecord,
  assumptions: mockForecastRecord.assumptions,
  sealedBy: 'USR-RESEARCH-ANALYST'
});

// 2. Structural & Seal ID checks
testAssert(typeof sealed.sealId === 'string' && sealed.sealId.startsWith('SEAL-FCST-'), `Seal ID format correct: ${sealed.sealId}`);
testAssert(typeof sealed.canonicalHash === 'string' && sealed.canonicalHash.length === 64, `Canonical hash is 64 hex chars: ${sealed.canonicalHash}`);
testAssert(sealed.verification.isSealed === true, 'Package is sealed');
testAssert(sealed.sealedBy === 'USR-RESEARCH-ANALYST', 'SealedBy actor recorded');

// 3. Immutability verification (deepFreeze)
let mutErr1 = false;
try {
  sealed.tenantId = 'HACKED-TENANT';
} catch {
  mutErr1 = true;
}
testAssert(mutErr1, 'Sealed package top-level is immutable');

let mutErr2 = false;
try {
  sealed.forecastRecord.value = 999999;
} catch {
  mutErr2 = true;
}
testAssert(mutErr2, 'Sealed package nested forecastRecord is deeply immutable');

// 4. Verification of authentic package
const verifyAuthentic = verifyForecastPackage(sealed);
testAssert(verifyAuthentic.valid === true, 'Authentic sealed package verifies successfully');
testAssert(verifyAuthentic.storedHash === verifyAuthentic.recomputedHash, 'Stored hash matches recomputed hash');

// 5. Tamper Detection: Clone and alter value
const tamperedPackage = JSON.parse(JSON.stringify(sealed));
tamperedPackage.value = 500000; // Altered value from 420k to 500k

const verifyTampered = verifyForecastPackage(tamperedPackage);
testAssert(verifyTampered.valid === false, 'Tampered package value is correctly rejected by verification');
testAssert(verifyTampered.storedHash !== verifyTampered.recomputedHash, 'Tampered hash mismatch detected');

// 6. Tamper Detection: Altered assumption
const tamperedAssumpPackage = JSON.parse(JSON.stringify(sealed));
tamperedAssumpPackage.assumptions.revenueGrowthRate = 0.25;

const verifyTamperedAssump = verifyForecastPackage(tamperedAssumpPackage);
testAssert(verifyTamperedAssump.valid === false, 'Tampered assumption rejected');

console.log(`[PASS] Phase 20 Package Sealing tests passed: ${assertionCount} assertions`);

export default { assertionCount };
