/**
 * test-macro-valuation-bridge.js
 * Suite 9: Macro Valuation Bridge Tests
 */

import assert from 'assert';
import { generateMacroValuationAdjustment } from '../macro/macro.valuation.bridge.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 9: Macro Valuation Bridge Tests ---');

// 1. Baseline valuation context
const baselineDCF = {
  ticker: 'NVDA',
  costOfEquity: 0.09, // 9.0%
  costOfDebt: 0.04,   // 4.0%
  wacc: 0.085,        // 8.5%
  perpetualGrowthRate: 0.03,
  enterpriseValue: 2000000000,
  equityValuePerShare: 120.0
};

const macroContext = {
  riskFreeRate: 0.045, // 4.5% (+50 bps higher than model baseline 4.0%)
  inflationRate: 0.032,
  spreadShift: 0.003
};

const adjusted = generateMacroValuationAdjustment(baselineDCF, macroContext);

testAssert(adjusted.ticker === 'NVDA', 'Ticker is NVDA');
testAssert(adjusted.classification === 'MODEL_ESTIMATE', 'Tagged as MODEL_ESTIMATE');
testAssert(adjusted.adjustedWacc >= baselineDCF.wacc, 'WACC rises with higher risk-free rate');
testAssert(adjusted.adjustedEquityValuePerShare < baselineDCF.equityValuePerShare, 'Equity value per share compresses');
testAssert(baselineDCF.equityValuePerShare === 120.0, 'Baseline model remains pristine and unmutated');

// 2. Multiples valuation bridge (P/E compress in high rates)
const baselineMultiples = {
  ticker: 'MSFT',
  forwardPE: 30.0,
  targetPrice: 450.0,
  epsForward: 15.0
};

const adjustedMultiples = generateMacroValuationAdjustment(baselineMultiples, {
  riskFreeRate: 0.05,
  inflationRate: 0.035
});

testAssert(adjustedMultiples.ticker === 'MSFT', 'Ticker is MSFT');
testAssert(adjustedMultiples.adjustedTargetPrice <= baselineMultiples.targetPrice, 'Target price adjusted downwards');
testAssert(baselineMultiples.forwardPE === 30.0, 'Baseline multiples preserved');

// 3. Immutability check
let mutErr = false;
try {
  adjusted.adjustedWacc = 0.5;
} catch {
  mutErr = true;
}
testAssert(mutErr, 'Valuation adjustment is frozen');

console.log(`[PASS] Suite 9 Macro Valuation Bridge passed: ${assertionCount} assertions`);
export default { assertionCount };
