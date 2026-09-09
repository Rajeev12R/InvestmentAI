/**
 * test-macro-package-sealing.js
 * Suite 11: Macro Audit Package Sealing & Copilot Tool Tests
 */

import assert from 'assert';
import { sealMacroPackage, verifyMacroPackage } from '../macro/macro.package.js';
import { MacroEnums } from '../macro/macro.types.js';
import { getMacroSnapshot, getRegimeAnalysis } from '../macro/macro.tool.js';
import { createMacroStore } from '../macro/macro.store.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 11: Macro Package Sealing & Copilot Tool Tests ---');

// 1. Package creation and cryptographic sealing
const payload = {
  tenantId: 'tenant-alpha',
  asOfDate: '2026-03-31T23:59:59.000Z',
  regime: MacroEnums.MacroRegime.LATE_CYCLE_SLOWDOWN,
  derivedMetrics: { US_10Y_2Y_SPREAD: -0.35, US_REAL_10Y: 2.1 },
  portfolioExposures: { netPortfolioValue: 1000000, portfolioSensitivities: { RATES: -0.8 } }
};

const sealedPkg = sealMacroPackage(payload, 'auditor-1');
testAssert(sealedPkg.packageId.startsWith('PKG-MACRO-'), 'Package ID starts with PKG-MACRO-');
testAssert(typeof sealedPkg.sha256Signature === 'string', 'SHA256 signature is string');
testAssert(sealedPkg.sha256Signature.length === 64, 'SHA256 signature is 64 hex chars');
testAssert(sealedPkg.createdBy === 'auditor-1', 'CreatedBy is auditor-1');

// 2. Package verification - intact
const verification = verifyMacroPackage(sealedPkg);
testAssert(verification.isValid === true, 'Untampered package verifies valid');

// 3. Package verification - tampering detection
const tamperedPkg = JSON.parse(JSON.stringify(sealedPkg));
tamperedPkg.payload.regime = MacroEnums.MacroRegime.GOLDILOCKS;
const tamperedCheck = verifyMacroPackage(tamperedPkg);
testAssert(tamperedCheck.isValid === false, 'Tampered package is rejected');

// 4. Read-only Copilot Tool execution
const store = createMacroStore();
store.ingestObservation({
  tenantId: 'tenant-copilot',
  seriesId: 'US_FED_FUNDS_TARGET_UPPER',
  timestamp: '2026-01-01T00:00:00.000Z',
  value: 5.25,
  unit: '%',
  provenance: { sourceId: 'FRED', verified: true, authority: 'US_FEDERAL_RESERVE' }
});

const snapToolRes = await getMacroSnapshot({ tenantId: 'tenant-copilot', seriesIds: ['US_FED_FUNDS_TARGET_UPPER'] }, { store });
testAssert(snapToolRes.tenantId === 'tenant-copilot', 'Copilot tool returns tenantId');
testAssert(snapToolRes.snapshot.US_FED_FUNDS_TARGET_UPPER.value === 5.25, 'Copilot tool returns observation value');

const regimeToolRes = await getRegimeAnalysis({ tenantId: 'tenant-copilot' }, { store });
testAssert(regimeToolRes.regime !== undefined, 'Copilot tool returns regime');
testAssert(typeof regimeToolRes.confidence === 'number', 'Copilot tool returns confidence');

console.log(`[PASS] Suite 11 Macro Package Sealing & Copilot Tools passed: ${assertionCount} assertions`);
export default { assertionCount };
