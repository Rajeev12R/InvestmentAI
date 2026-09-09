/**
 * test-macro-cross-asset.js
 * Suite 6: Cross-Asset Transmission & Elasticity Tests
 */

import assert from 'assert';
import { calculateTransmission } from '../macro/macro.crossAsset.engine.js';
import { MacroEnums } from '../macro/macro.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 6: Cross-Asset Transmission Tests ---');

// 1. Rates to Equities Transmission
const res1 = calculateTransmission(
  MacroEnums.TransmissionChannel.RATES_TO_EQUITIES,
  0.50 // +50 bps rate hike
);

testAssert(res1.channel === MacroEnums.TransmissionChannel.RATES_TO_EQUITIES, 'Channel verified');
testAssert(res1.classification === 'MODEL_ESTIMATE', 'Tagged as MODEL_ESTIMATE');
testAssert(res1.transmittedShock < 0, 'Rate hike creates negative transmitted shock for equities');
testAssert(typeof res1.elasticity === 'number', 'Elasticity is a number');

// 2. Commodity to Inflation Transmission
const res2 = calculateTransmission(
  MacroEnums.TransmissionChannel.COMMODITY_TO_INFLATION,
  0.20 // +20% oil surge
);
testAssert(res2.transmittedShock > 0, 'Oil surge increases inflation expectation');

// 3. FX to Inflation Transmission
const res3 = calculateTransmission(
  MacroEnums.TransmissionChannel.FX_TO_INFLATION,
  0.10 // 10% currency depreciation
);
testAssert(res3.transmittedShock > 0, 'Currency depreciation transmits to higher import inflation');

// 4. Unknown channel gracefully returns zero shock
const res4 = calculateTransmission('INVALID_CHANNEL', 0.5);
testAssert(res4.transmittedShock === 0, 'Invalid channel returns 0 shock');

// 5. Immutability
let mutErr = false;
try {
  res1.elasticity = 999;
} catch {
  mutErr = true;
}
testAssert(mutErr, 'Transmission result is frozen');

console.log(`[PASS] Suite 6 Cross-Asset Transmission passed: ${assertionCount} assertions`);
export default { assertionCount };
