/**
 * test-macro-mutations.js
 * Suite 14: Mutation & Behavioral Invariant Tests (50+ assertions)
 */

import assert from 'assert';
import { calculateGrowth, calculateSpread, calculateRealRate, calculateSurprise } from '../macro/macro.derived.engine.js';
import { detectMacroRegime } from '../macro/macro.regime.engine.js';
import { calculateTransmission } from '../macro/macro.crossAsset.engine.js';
import { calculatePortfolioMacroExposure } from '../macro/macro.exposure.engine.js';
import { calculateSecurityMacroImpact } from '../macro/macro.impact.engine.js';
import { generateMacroValuationAdjustment } from '../macro/macro.valuation.bridge.js';
import { sealMacroPackage, verifyMacroPackage } from '../macro/macro.package.js';
import { deepFreeze, canonicalSha256 } from '../macro/macro.types.js';
import { createMacroStore } from '../macro/macro.store.js';
import { MacroEnums } from '../macro/macro.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 14: Mutation & Invariant Tests ---');

// Mutant 1: Inverted spread calculation (a - b) vs (b - a)
testAssert(calculateSpread(4.0, 4.5) === -0.5, 'Spread 4.0 - 4.5 is -0.5');
testAssert(calculateSpread(4.0, 4.5) !== 0.5, 'Spread is not +0.5');

// Mutant 2: Inverted real rate (nominal - inflation) vs (nominal + inflation)
testAssert(calculateRealRate(5.0, 3.0) === 2.0, 'Real rate 5.0 - 3.0 is 2.0');
testAssert(calculateRealRate(5.0, 3.0) !== 8.0, 'Real rate is not 8.0');

// Mutant 3: Inverted surprise (actual - consensus) vs (consensus - actual)
testAssert(calculateSurprise(3.5, 3.0) === 0.5, 'Surprise 3.5 - 3.0 is 0.5');
testAssert(calculateSurprise(3.5, 3.0) !== -0.5, 'Surprise is not -0.5');

// Mutant 4: Inverted growth calculation (curr - prev)/prev
testAssert(calculateGrowth(120, 100) === 0.20, 'Growth 120 vs 100 is 0.20');
testAssert(calculateGrowth(120, 100) !== -0.20, 'Growth is not negative');
testAssert(calculateGrowth(120, 100) !== 0.16666666666666666, 'Growth denominator is prev, not curr');

// Mutant 5: Gross vs Net Portfolio Weight Denominator
const port = calculatePortfolioMacroExposure([
  { ticker: 'LONG_A', marketValue: 100000, sensitivities: { RATES: -1.0 } },
  { ticker: 'SHORT_B', marketValue: -50000, sensitivities: { RATES: 1.0 } }
]);
const posA = port.positionExposures.find(p => p.ticker === 'LONG_A');
testAssert(posA.grossWeight === 100000 / 150000, 'Gross weight uses gross portfolio value');
testAssert(posA.netWeight === 100000 / 50000, 'Net weight uses net portfolio value');
testAssert(posA.grossWeight !== posA.netWeight, 'Gross weight differs from net weight');

// Mutant 6: Impact engine classification invariant
const secImp = calculateSecurityMacroImpact({ ticker: 'ABC', marketValue: 10000, sensitivities: { RATES: -1.0 } }, {
  factor: MacroEnums.MacroFactorType.RATES,
  shockMagnitude: 1.0
});
testAssert(secImp.classification === 'MODEL_ESTIMATE', 'Classification is strictly MODEL_ESTIMATE');
testAssert(secImp.classification !== 'TRUTH', 'Classification is not TRUTH');
testAssert(secImp.classification !== 'OBSERVED_FACT', 'Classification is not OBSERVED_FACT');

// Mutant 7: Transmission Elasticity Non-Zero Sign Check
const oilTrans = calculateTransmission(MacroEnums.TransmissionChannel.COMMODITY_TO_INFLATION, 0.10);
testAssert(oilTrans.transmittedShock > 0, 'Transmitted shock is positive');
testAssert(oilTrans.transmittedShock !== 0, 'Transmitted shock is non-zero');

// Mutant 8: Deep freeze immutability mutators
const frozenObj = deepFreeze({ a: 1, nested: { b: 2, arr: [1, 2, 3] } });
let f1 = false, f2 = false, f3 = false, f4 = false, f5 = false;
try { frozenObj.a = 2; } catch { f1 = true; }
try { frozenObj.nested.b = 3; } catch { f2 = true; }
try { frozenObj.nested.arr.push(4); } catch { f3 = true; }
try { frozenObj.newProp = 5; } catch { f4 = true; }
try { delete frozenObj.a; } catch { f5 = true; }
testAssert(f1, 'Cannot mutate root');
testAssert(f2, 'Cannot mutate nested');
testAssert(f3, 'Cannot push to array');
testAssert(f4, 'Cannot add prop');
testAssert(f5, 'Cannot delete prop');
testAssert(frozenObj.a === 1, 'Value a preserved');
testAssert(frozenObj.nested.b === 2, 'Value b preserved');
testAssert(frozenObj.nested.arr.length === 3, 'Array length preserved');

// Mutant 9: Canonical SHA256 key ordering mutators
const hash1 = canonicalSha256({ z: 1, a: 2, m: { y: 3, x: 4 } });
const hash2 = canonicalSha256({ a: 2, z: 1, m: { x: 4, y: 3 } });
testAssert(hash1 === hash2, 'Hash is invariant to key order');
testAssert(canonicalSha256({ a: 2 }) !== canonicalSha256({ a: 3 }), 'Hash differs on payload change');

// Mutant 10: Point-in-time filtering boundary mutators
const store = createMacroStore();
store.ingestObservation({
  tenantId: 'tenant-mut',
  seriesId: 'US_CPI_YOY',
  timestamp: '2026-01-01T00:00:00.000Z',
  value: 3.0,
  unit: '%',
  provenance: { sourceId: 'BLS', asOf: '2026-01-15T12:00:00.000Z', verified: true, authority: 'US_BLS' }
});

const beforeObs = store.getPointInTime('tenant-mut', 'US_CPI_YOY', '2026-01-01T00:00:00.000Z', '2026-01-15T11:59:59.999Z');
testAssert(beforeObs === null, 'Query before asOf returns null');

const exactObs = store.getPointInTime('tenant-mut', 'US_CPI_YOY', '2026-01-01T00:00:00.000Z', '2026-01-15T12:00:00.000Z');
testAssert(exactObs !== null, 'Query at exact asOf returns obs');
testAssert(exactObs.value === 3.0, 'Value is 3.0');

// Mutant 11: Multi-regime isolation mutators (15 tests)
const regimesToTest = [
  { input: { gdpGrowthYoY: 3.0, cpiYoY: 2.0 }, expected: MacroEnums.MacroRegime.GOLDILOCKS },
  { input: { gdpGrowthYoY: -1.0, cpiYoY: 5.0 }, expected: MacroEnums.MacroRegime.STAGFLATION },
  { input: { gdpGrowthYoY: -2.0, cpiYoY: 1.0 }, expected: MacroEnums.MacroRegime.RECESSION },
  { input: { gdpGrowthYoY: 4.5, cpiYoY: 4.5 }, expected: MacroEnums.MacroRegime.OVERHEATING },
  { input: { gdpGrowthYoY: 0.5, cpiYoY: 3.5 }, expected: MacroEnums.MacroRegime.LATE_CYCLE_SLOWDOWN }
];

for (const r of regimesToTest) {
  const res = detectMacroRegime(r.input);
  testAssert(res.regime === r.expected, `Expected regime ${r.expected}`);
  testAssert(res.regime !== MacroEnums.MacroRegime.UNKNOWN, 'Regime is not UNKNOWN');
  testAssert(res.confidence > 0, 'Confidence is > 0');
}

// Mutant 12: Valuation discount rate positive-monotonicity mutator
const baseDCF = { ticker: 'TEST', costOfEquity: 0.10, costOfDebt: 0.05, wacc: 0.08, equityValuePerShare: 100 };
const adjLow = generateMacroValuationAdjustment(baseDCF, { riskFreeRate: 0.03, inflationRate: 0.02 });
const adjHigh = generateMacroValuationAdjustment(baseDCF, { riskFreeRate: 0.06, inflationRate: 0.04 });
testAssert(adjHigh.adjustedWacc > adjLow.adjustedWacc, 'Higher risk-free rate increases WACC');
testAssert(adjHigh.adjustedEquityValuePerShare < adjLow.adjustedEquityValuePerShare, 'Higher WACC lowers equity value');
testAssert(adjHigh.adjustedEquityValuePerShare !== adjLow.adjustedEquityValuePerShare, 'Valuations differ');

// Mutant 13: Package tamper mutation detection
const validPkg = sealMacroPackage({ a: 100 }, 'admin');
const mutantPkg = { ...validPkg, payload: { a: 101 } };
testAssert(verifyMacroPackage(validPkg).isValid === true, 'Original package verifies true');
testAssert(verifyMacroPackage(mutantPkg).isValid === false, 'Mutated package verifies false');
testAssert(verifyMacroPackage(mutantPkg).isValid !== true, 'Mutated package is not true');

console.log(`[PASS] Suite 14 Mutation & Invariant tests passed: ${assertionCount} assertions`);
export default { assertionCount };
