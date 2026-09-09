/**
 * test-kg-common-driver-concentration.js
 * Suite 7: Portfolio Common-Driver Concentration, Driver HHI & N_eff Tests
 */

import assert from 'assert';
import { defaultPortfolioCommonDriverEngine } from '../knowledgeGraph/kg.commonDriver.engine.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 7: Portfolio Common Driver Tests ---');

// 1. Multi-position portfolio with hidden common driver concentration
const positions = [
  { ticker: 'NVDA', marketValue: 500000, drivers: { AI_CAPEX: 1.8, DATA_CENTER: 1.4 } },
  { ticker: 'MSFT', marketValue: 400000, drivers: { AI_CAPEX: 1.2, CLOUD_COMPUTE: 1.5 } },
  { ticker: 'TSMC', marketValue: 300000, drivers: { AI_CAPEX: 1.5, FOUNDRY_DEMAND: 1.6 } },
  { ticker: 'SHORT_LEGACY_IT', marketValue: -200000, drivers: { AI_CAPEX: -0.8, LEGACY_MAINT: 1.2 } }
];

const result = defaultPortfolioCommonDriverEngine.calculateCommonDrivers(positions);

// Gross vs Net values
testAssert(result.totalLongValue === 1200000, 'Total long value is $1.2M');
testAssert(result.totalShortValue === 200000, 'Total short value is $200k');
testAssert(result.netPortfolioValue === 1000000, 'Net portfolio value is $1.0M');
testAssert(result.grossPortfolioValue === 1400000, 'Gross portfolio value is $1.4M');

// Driver breakdown analysis
testAssert(result.totalDriversCount >= 4, 'Multiple drivers tracked');
const aiCapexDriver = result.driverBreakdown.find(d => d.driverName === 'AI_CAPEX');
testAssert(aiCapexDriver !== undefined, 'AI_CAPEX driver identified');
testAssert(aiCapexDriver.holdingsCount === 4, 'AI_CAPEX is shared across all 4 holdings (longs and shorts)');

// Net vs Gross dollar exposure for AI_CAPEX
// NVDA: 500k * 1.8 = 900k
// MSFT: 400k * 1.2 = 480k
// TSMC: 300k * 1.5 = 450k
// SHORT: -200k * -0.8 = +160k
// Net dollar sum: 900k + 480k + 450k + 160k = 1,990,000
testAssert(aiCapexDriver.netDollarExposure === 1990000, 'AI_CAPEX net dollar exposure calculated accurately');

// HHI and N_eff metrics
testAssert(result.driverHHI > 0, 'Driver HHI calculated');
testAssert(result.effectiveNumberOfDrivers > 0, 'Effective number of drivers (N_eff) calculated');
testAssert(result.top3DriverConcentrationPct > 50, 'Top 3 driver concentration reflects high thematic loading');

// 2. Empty portfolio test
const emptyRes = defaultPortfolioCommonDriverEngine.calculateCommonDrivers([]);
testAssert(emptyRes.netPortfolioValue === 0, 'Empty portfolio net value is 0');
testAssert(emptyRes.driverHHI === 0, 'Empty portfolio HHI is 0');

console.log(`[PASS] Suite 7 Portfolio Common Drivers passed: ${assertionCount} assertions`);
export default { assertionCount };
