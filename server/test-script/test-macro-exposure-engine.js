/**
 * test-macro-exposure-engine.js
 * Suite 7: Security & Portfolio Macro Exposure Engine Tests
 */

import assert from 'assert';
import { calculateSecurityExposure, calculatePortfolioMacroExposure } from '../macro/macro.exposure.engine.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 7: Macro Exposure Engine Tests ---');

// 1. Security baseline exposure
const secExp = calculateSecurityExposure('NVDA', {
  betaToSp500: 1.6,
  ratesSensitivity: -1.2,
  inflationSensitivity: -0.8,
  usdSensitivity: -0.5,
  commoditySensitivity: 0.1,
  creditSpreadSensitivity: -1.1
});
testAssert(secExp.ticker === 'NVDA', 'Ticker is NVDA');
testAssert(secExp.sensitivities.RATES === -1.2, 'Rates sensitivity is -1.2');
testAssert(secExp.sensitivities.INFLATION === -0.8, 'Inflation sensitivity is -0.8');

// 2. Portfolio Gross vs Net calculation
const positions = [
  { ticker: 'NVDA', marketValue: 500000, sensitivities: { RATES: -1.2, INFLATION: -0.8, USD: -0.5 } },
  { ticker: 'JNJ', marketValue: 300000, sensitivities: { RATES: -0.2, INFLATION: 0.1, USD: -0.2 } },
  { ticker: 'SHORT_QQQ', marketValue: -200000, sensitivities: { RATES: 1.5, INFLATION: 0.7, USD: 0.4 } }
];

const portExp = calculatePortfolioMacroExposure(positions);
testAssert(portExp.totalLongValue === 800000, 'Total long value is 800k');
testAssert(portExp.totalShortValue === 200000, 'Total short value is 200k');
testAssert(portExp.netPortfolioValue === 600000, 'Net portfolio value is 600k');
testAssert(portExp.grossPortfolioValue === 1000000, 'Gross portfolio value is 1M');

// 3. Weight calculations
const nvdaPos = portExp.positionExposures.find(p => p.ticker === 'NVDA');
testAssert(nvdaPos.grossWeight === 0.5, 'NVDA gross weight is 50%');
testAssert(nvdaPos.netWeight === 500000 / 600000, 'NVDA net weight is 500k/600k');

// 4. Aggregate portfolio sensitivity
testAssert(portExp.portfolioSensitivities.RATES !== undefined, 'RATES aggregate sensitivity calculated');
testAssert(portExp.portfolioSensitivities.INFLATION !== undefined, 'INFLATION aggregate sensitivity calculated');
testAssert(portExp.portfolioSensitivities.USD !== undefined, 'USD aggregate sensitivity calculated');

// 5. Zero portfolio value handling
const zeroPort = calculatePortfolioMacroExposure([]);
testAssert(zeroPort.netPortfolioValue === 0, 'Zero portfolio net value is 0');
testAssert(zeroPort.positionExposures.length === 0, 'Zero portfolio positions is empty');

// 6. Immutability
let mutErr = false;
try {
  portExp.netPortfolioValue = 999;
} catch {
  mutErr = true;
}
testAssert(mutErr, 'Portfolio exposure is frozen');

console.log(`[PASS] Suite 7 Macro Exposure Engine passed: ${assertionCount} assertions`);
export default { assertionCount };
