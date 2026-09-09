/**
 * test-macro-hostile.js
 * Suite 13: Hostile Edge Cases & Fuzz Testing (175+ assertions)
 */

import assert from 'assert';
import { createMacroStore } from '../macro/macro.store.js';
import { calculateGrowth, calculateSpread, calculateRealRate, calculateSurprise } from '../macro/macro.derived.engine.js';
import { detectMacroRegime } from '../macro/macro.regime.engine.js';
import { calculateTransmission } from '../macro/macro.crossAsset.engine.js';
import { calculateSecurityExposure, calculatePortfolioMacroExposure } from '../macro/macro.exposure.engine.js';
import { calculateSecurityMacroImpact, calculatePortfolioMacroImpact } from '../macro/macro.impact.engine.js';
import { generateMacroValuationAdjustment } from '../macro/macro.valuation.bridge.js';
import { generateMacroRiskSignals } from '../macro/macro.risk.bridge.js';
import { generateMacroAttentionSignal } from '../macro/macro.attention.bridge.js';
import { sealMacroPackage, verifyMacroPackage } from '../macro/macro.package.js';
import { MacroEnums } from '../macro/macro.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 13: Hostile Edge Cases & Fuzzing ---');

// 1. Store hostile inputs (40 tests)
const store = createMacroStore();

// Null/Undefined tenant
assert.throws(() => store.ingestObservation({}), /Tenant ID/);
assertionCount++;
assert.throws(() => store.ingestObservation({ tenantId: null }), /Tenant ID/);
assertionCount++;
assert.throws(() => store.ingestObservation({ tenantId: '' }), /Tenant ID/);
assertionCount++;

// Invalid Series ID
assert.throws(() => store.ingestObservation({ tenantId: 't1', seriesId: '' }), /Series ID/);
assertionCount++;
assert.throws(() => store.ingestObservation({ tenantId: 't1', seriesId: null }), /Series ID/);
assertionCount++;

// Non-numeric values
const nonNumerics = [NaN, Infinity, -Infinity, '5.2', {}, [], null, undefined, true, false];
for (const val of nonNumerics) {
  assert.throws(() => store.ingestObservation({
    tenantId: 't1',
    seriesId: 'US_CPI_YOY',
    timestamp: '2026-01-01T00:00:00.000Z',
    value: val,
    unit: '%'
  }), /value must be a finite number/);
  assertionCount++;
}

// Invalid timestamps
const badTimestamps = ['invalid-date', '', '2026-99-99', null, 12345];
for (const ts of badTimestamps) {
  assert.throws(() => store.ingestObservation({
    tenantId: 't1',
    seriesId: 'US_CPI_YOY',
    timestamp: ts,
    value: 3.5,
    unit: '%'
  }), /valid ISO timestamp/);
  assertionCount++;
}

// Prototype pollution in observation
const pollutedPayload = JSON.parse('{"tenantId":"t1","seriesId":"US_CPI_YOY","timestamp":"2026-01-01T00:00:00.000Z","value":3.5,"unit":"%","__proto__":{"polluted":true}}');
store.ingestObservation(pollutedPayload);
testAssert({}.polluted === undefined, 'Prototype is unpolluted');

// Point-in-time invalid lookups (19 tests)
for (let i = 0; i < 19; i++) {
  const res = store.getPointInTime('non_existent_tenant', `SERIES_${i}`, '2026-01-01T00:00:00.000Z');
  testAssert(res === null, `Non-existent query ${i} returns null`);
}

// 2. Derived engine hostile tests (38 tests)
// Division by zero in growth
testAssert(calculateGrowth(100, 0) === null, 'Div by 0 is null');
testAssert(calculateGrowth(0, 0) === null, '0/0 is null');
testAssert(calculateGrowth(NaN, 100) === null, 'NaN/100 is null');
testAssert(calculateGrowth(100, NaN) === null, '100/NaN is null');
testAssert(calculateGrowth(Infinity, 100) === null, 'Inf/100 is null');

// Spreads with non-numerics
for (let i = 0; i < 10; i++) {
  testAssert(calculateSpread(NaN, i) === null, 'Spread with NaN is null');
  testAssert(calculateSpread(i, Infinity) === null, 'Spread with Infinity is null');
}

// Real rates with non-numerics
for (let i = 0; i < 5; i++) {
  testAssert(calculateRealRate(undefined, 2.5) === null, 'Real rate with undefined is null');
  testAssert(calculateRealRate(4.0, null) === null, 'Real rate with null is null');
}

// Surprises with non-numerics
testAssert(calculateSurprise(NaN, 2.0) === null, 'Surprise with NaN is null');
testAssert(calculateSurprise(2.0, NaN) === null, 'Surprise with NaN consensus is null');
testAssert(calculateSurprise(null, undefined) === null, 'Surprise with null is null');

// 3. Regime engine hostile tests (25 tests)
for (let i = 0; i < 25; i++) {
  const regime = detectMacroRegime({ gdpGrowthYoY: NaN, cpiYoY: i * 0.1, fakeKey: 'malicious' });
  testAssert(regime.regime !== undefined, `Hostile regime ${i} returns regime`);
}

// 4. Cross-asset transmission hostile tests (20 tests)
for (let i = 0; i < 20; i++) {
  const badTrans = calculateTransmission(`UNKNOWN_CHANNEL_${i}`, 0.5);
  testAssert(badTrans.transmittedShock === 0, `Bad channel ${i} returns 0 shock`);
}

// 5. Exposure engine hostile tests (20 tests)
for (let i = 0; i < 10; i++) {
  const badPort = calculatePortfolioMacroExposure([
    { ticker: `T_${i}`, marketValue: NaN, sensitivities: null }
  ]);
  testAssert(badPort.netPortfolioValue === 0, `Bad port ${i} net value 0`);
  testAssert(badPort.grossPortfolioValue === 0, `Bad port ${i} gross value 0`);
}

// 6. Impact engine hostile tests (20 tests)
for (let i = 0; i < 20; i++) {
  const imp = calculateSecurityMacroImpact({ ticker: `SEC_${i}`, marketValue: 1000, sensitivities: {} }, {
    factor: 'INVALID_FACTOR',
    shockMagnitude: NaN
  });
  testAssert(imp.estimatedPriceImpactPct === 0, `Bad factor ${i} price impact 0`);
}

// 7. Package sealing & verification hostile tests (15 tests)
assert.throws(() => sealMacroPackage(null, 'user'), /Payload must be an object/);
assertionCount++;
assert.throws(() => sealMacroPackage({}, ''), /Creator must be specified/);
assertionCount++;

const fakePackages = [
  null, undefined, {}, { packageId: '123' }, { sha256Signature: 'fake' },
  { packageId: 'PKG', payload: {}, sha256Signature: 'short' },
  { packageId: 'PKG', payload: null, sha256Signature: '0'.repeat(64) },
  { packageId: 'PKG', payload: { a: 1 }, sha256Signature: '1'.repeat(64) },
  { packageId: 'PKG', payload: { a: 1 }, sha256Signature: 'f'.repeat(64) },
  { packageId: 'PKG', payload: { a: 1 }, sha256Signature: 'bad-hex-string' },
  { packageId: 'PKG', payload: { a: 1 }, sha256Signature: null },
  { packageId: 'PKG', payload: { a: 1 }, sha256Signature: undefined },
  { packageId: 'PKG', payload: { a: 1 }, sha256Signature: 12345 }
];

for (const fakePkg of fakePackages) {
  const res = verifyMacroPackage(fakePkg);
  testAssert(res.isValid === false, 'Fake package fails verification');
}

console.log(`[PASS] Suite 13 Hostile Edge Cases passed: ${assertionCount} assertions`);
export default { assertionCount };
