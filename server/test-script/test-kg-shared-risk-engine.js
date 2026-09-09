/**
 * test-kg-shared-risk-engine.js
 * Suite 8: Shared Risk & Hidden Thematic Exposure Engine Tests
 */

import assert from 'assert';
import { defaultSharedRiskEngine } from '../knowledgeGraph/kg.sharedRisk.engine.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 8: Shared Risk Engine Tests ---');

// 1. Portfolio with shared risks across disparate holdings
const holdings = [
  { ticker: 'AAPL', marketValue: 500000, sharedRisks: ['TAIWAN_STRAIT_GEOPOLITICAL', 'CHINA_CONSUMER_WEAKNESS', 'USD_STRENGTH'] },
  { ticker: 'NVDA', marketValue: 400000, sharedRisks: ['TAIWAN_STRAIT_GEOPOLITICAL', 'EXPORT_CONTROL_RESTRICTIONS', 'VALUATION_MULTIPLE_DURATION'] },
  { ticker: 'QCOM', marketValue: 300000, sharedRisks: ['TAIWAN_STRAIT_GEOPOLITICAL', 'CHINA_CONSUMER_WEAKNESS', 'MODEM_COMMODITIZATION'] }
];

const sharedRisksRes = defaultSharedRiskEngine.calculateSharedRisks(holdings);

testAssert(sharedRisksRes.totalGrossPortfolioValue === 1200000, 'Gross portfolio value is $1.2M');
testAssert(sharedRisksRes.totalSharedRisksCount >= 5, 'Tracked multiple distinct risk dimensions');

// Taiwan Strait Geopolitical is shared across all 3 holdings (500k + 400k + 300k = 1.2M -> 100% of portfolio)
const taiwanRisk = sharedRisksRes.topSharedRisks.find(r => r.riskName === 'TAIWAN_STRAIT_GEOPOLITICAL');
testAssert(taiwanRisk !== undefined, 'Taiwan Strait risk identified');
testAssert(taiwanRisk.exposedCapital === 1200000, '$1.2M exposed capital');
testAssert(taiwanRisk.capitalSharePct === 100, '100% portfolio capital exposed to Taiwan Strait supply risk');
testAssert(taiwanRisk.holdingsCount === 3, 'All 3 holdings exposed');

// China Consumer Weakness shared across AAPL + QCOM (500k + 300k = 800k -> 66.67%)
const chinaRisk = sharedRisksRes.topSharedRisks.find(r => r.riskName === 'CHINA_CONSUMER_WEAKNESS');
testAssert(chinaRisk !== undefined, 'China Consumer Weakness identified');
testAssert(chinaRisk.exposedCapital === 800000, '$800k exposed capital');
testAssert(chinaRisk.holdingsCount === 2, '2 holdings exposed');

// Empty portfolio test
const emptyRisks = defaultSharedRiskEngine.calculateSharedRisks([]);
testAssert(emptyRisks.totalGrossPortfolioValue === 0, 'Empty portfolio gross value is 0');
testAssert(emptyRisks.topSharedRisks.length === 0, 'Empty portfolio returns 0 shared risks');

console.log(`[PASS] Suite 8 Shared Risk Engine passed: ${assertionCount} assertions`);
export default { assertionCount };
