/**
 * test-macro-derived-metrics.js
 * Suite 4: Derived Macro Math, Spreads, Real Rates & Surprises Tests
 */

import assert from 'assert';
import { calculateGrowth, calculateSpread, calculateRealRate, calculateSurprise } from '../macro/macro.derived.engine.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 4: Derived Macro Metrics Tests ---');

// 1. Growth calculations
const g1 = calculateGrowth(105, 100);
testAssert(g1 === 0.05, '105 vs 100 is 5% growth');

const g2 = calculateGrowth(90, 100);
testAssert(g2 === -0.10, '90 vs 100 is -10% growth');

// Zero denominator protection
testAssert(calculateGrowth(100, 0) === null, 'Zero denominator returns null');
testAssert(calculateGrowth(0, 0) === null, '0/0 returns null');

// 2. Yield Spreads (10Y - 2Y)
const spreadNormal = calculateSpread(4.50, 3.80);
testAssert(spreadNormal === 0.70, '4.50 - 3.80 = 0.70% (+70 bps)');

const spreadInverted = calculateSpread(3.90, 4.70);
testAssert(spreadInverted === -0.80, '3.90 - 4.70 = -0.80% (-80 bps inversion)');

// 3. Real Rates (Nominal - Inflation)
const realRate = calculateRealRate(5.25, 3.20);
testAssert(realRate === 2.05, '5.25 - 3.20 = 2.05% real rate');

const realRateNegative = calculateRealRate(2.0, 4.5);
testAssert(realRateNegative === -2.5, '2.0 - 4.5 = -2.5% negative real rate');

// 4. Macro Surprises (Actual - Consensus)
const surpriseBeat = calculateSurprise(3.4, 3.1);
testAssert(surpriseBeat === 0.3, '3.4 actual vs 3.1 consensus = +0.3% surprise');

const surpriseMiss = calculateSurprise(2.8, 3.1);
testAssert(surpriseMiss === -0.3, '2.8 actual vs 3.1 consensus = -0.3% surprise');

console.log(`[PASS] Suite 4 Derived Macro Metrics passed: ${assertionCount} assertions`);
export default { assertionCount };
