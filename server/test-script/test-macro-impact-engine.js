/**
 * test-macro-impact-engine.js
 * Suite 8: Macro Impact Propagation Engine Tests
 */

import assert from 'assert';
import { calculateSecurityMacroImpact, calculatePortfolioMacroImpact } from '../macro/macro.impact.engine.js';
import { MacroEnums } from '../macro/macro.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 8: Macro Impact Engine Tests ---');

// 1. Single security rate shock impact
const secImpact = calculateSecurityMacroImpact({
  ticker: 'NVDA',
  marketValue: 100000,
  sensitivities: { RATES: -1.5, INFLATION: -0.8 }
}, {
  factor: MacroEnums.MacroFactorType.RATES,
  shockMagnitude: 0.50, // +50 bps
  shockUnit: 'bps'
});

testAssert(secImpact.ticker === 'NVDA', 'Ticker is NVDA');
testAssert(secImpact.classification === 'MODEL_ESTIMATE', 'Tagged as MODEL_ESTIMATE');
testAssert(secImpact.factor === 'RATES', 'Factor is RATES');
testAssert(secImpact.shockMagnitude === 0.50, 'Shock magnitude is 0.50');
testAssert(secImpact.estimatedPriceImpactPct === -0.75, 'Price impact is -0.75% (-1.5 * 0.50)');
testAssert(secImpact.estimatedDollarImpact === -750, 'Dollar impact is -$750 (-0.75% of 100k)');

// 2. Portfolio shock impact with multiple positions
const portImpact = calculatePortfolioMacroImpact({
  positions: [
    { ticker: 'NVDA', marketValue: 500000, sensitivities: { RATES: -1.2, INFLATION: -0.8 } },
    { ticker: 'JNJ', marketValue: 300000, sensitivities: { RATES: -0.2, INFLATION: 0.1 } },
    { ticker: 'SHORT_QQQ', marketValue: -200000, sensitivities: { RATES: 1.5, INFLATION: 0.7 } }
  ]
}, {
  factor: MacroEnums.MacroFactorType.RATES,
  shockMagnitude: 1.0, // +100 bps
  shockUnit: 'bps'
});

testAssert(portImpact.classification === 'MODEL_ESTIMATE', 'Portfolio impact is MODEL_ESTIMATE');
testAssert(portImpact.factor === 'RATES', 'Portfolio factor is RATES');
testAssert(portImpact.positionImpacts.length === 3, '3 position impacts calculated');
testAssert(typeof portImpact.totalEstimatedDollarImpact === 'number', 'Total dollar impact is a number');
testAssert(typeof portImpact.portfolioPercentageImpact === 'number', 'Portfolio pct impact is a number');

// 3. Negative shock test
const easingImpact = calculateSecurityMacroImpact({
  ticker: 'AAPL',
  marketValue: 200000,
  sensitivities: { RATES: -1.0 }
}, {
  factor: MacroEnums.MacroFactorType.RATES,
  shockMagnitude: -0.50, // -50 bps rate cut
  shockUnit: 'bps'
});
testAssert(easingImpact.estimatedPriceImpactPct === 0.50, 'Easing price impact is +0.50%');
testAssert(easingImpact.estimatedDollarImpact === 1000, 'Easing dollar impact is +$1000');

// 4. Immutability verification
let mutErr = false;
try {
  portImpact.totalEstimatedDollarImpact = 999;
} catch {
  mutErr = true;
}
testAssert(mutErr, 'Port impact is frozen');

console.log(`[PASS] Suite 8 Macro Impact Engine passed: ${assertionCount} assertions`);
export default { assertionCount };
