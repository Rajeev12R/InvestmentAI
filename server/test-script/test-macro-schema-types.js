/**
 * test-macro-schema-types.js
 * Suite 1: Macro Schema, Enums, Hash, & Classification Types
 */

import assert from 'assert';
import { MacroEnums, canonicalSha256, deepFreeze } from '../macro/macro.types.js';
import { validateMacroObservation, validateMacroRegimeRule, validateMacroPackage } from '../macro/macro.schema.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 1: Macro Schema & Types Tests ---');

// 1. Enum verification
testAssert(Object.keys(MacroEnums.MacroCategory).length === 8, '8 Macro Categories defined');
testAssert(Object.keys(MacroEnums.MacroRegime).length === 13, '13 Macro Regimes defined');
testAssert(Object.keys(MacroEnums.TransmissionChannel).length === 12, '12 Transmission Channels defined');

// 2. Canonical SHA-256 Hashing Determinism
const objA = { z: 10, a: 5, nested: { b: 2, a: 1 } };
const objB = { a: 5, z: 10, nested: { a: 1, b: 2 } };
const hashA = canonicalSha256(objA);
const hashB = canonicalSha256(objB);
testAssert(hashA === hashB, 'SHA256 is deterministic across key ordering');
testAssert(typeof hashA === 'string' && hashA.length === 64, 'SHA256 is 64 hex chars');

// 3. Deep Freeze Immutability
const mutableObj = { factor: 'RATES', levels: [1, 2, 3] };
const frozen = deepFreeze(mutableObj);
let freezeCaught = false;
try {
  frozen.levels.push(4);
} catch {
  freezeCaught = true;
}
testAssert(freezeCaught, 'deepFreeze prevents array mutations');

// 4. Observation Schema Validation
const validObs = {
  tenantId: 'tenant-1',
  seriesId: 'US_FED_FUNDS_TARGET_UPPER',
  timestamp: '2026-01-01T00:00:00.000Z',
  value: 5.25,
  unit: '%',
  provenance: {
    sourceId: 'FRED',
    asOf: '2026-01-01T00:00:00.000Z',
    verified: true,
    authority: 'US_FEDERAL_RESERVE'
  }
};
const obsValRes = validateMacroObservation(validObs);
testAssert(obsValRes.isValid === true, 'Valid observation passes schema');

// 5. Invalid Observation Rejection
const invalidObs = {
  tenantId: '',
  seriesId: 'UNKNOWN_SERIES',
  timestamp: 'bad-date',
  value: NaN
};
const invObsRes = validateMacroObservation(invalidObs);
testAssert(invObsRes.isValid === false, 'Invalid observation fails schema');
testAssert(invObsRes.errors.length >= 2, 'Multiple errors reported');

console.log(`[PASS] Suite 1 Macro Schema & Types passed: ${assertionCount} assertions`);
export default { assertionCount };
