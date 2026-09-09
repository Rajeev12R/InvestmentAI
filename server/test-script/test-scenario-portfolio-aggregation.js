/**
 * server/test-script/test-scenario-portfolio-aggregation.js
 * 
 * Phase 19: Portfolio Scenario Aggregation & Attribution Tests
 */

import assert from 'assert';
import { aggregatePortfolioScenario } from '../scenario/scenario.aggregation.js';
import { ValueStatus, ScenarioType, ShockUnit } from '../scenario/scenario.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 19 PORTFOLIO AGGREGATION TESTS ---');

const samplePortfolio = {
  id: 'PORT-INST-001',
  name: 'Institutional Global Balanced Portfolio',
  currency: 'USD',
  cash: 50000,
  positions: [
    { ticker: 'AAPL', price: 150, shares: 200, marketValue: 30000, beta: 1.2, sector: 'Information Technology', assetClass: 'EQUITY' },
    { ticker: 'MSFT', price: 300, shares: 100, marketValue: 30000, beta: 1.1, sector: 'Information Technology', assetClass: 'EQUITY' },
    { ticker: 'JNJ', price: 160, shares: 125, marketValue: 20000, beta: 0.6, sector: 'Healthcare', assetClass: 'EQUITY' },
    { ticker: 'UST10Y', price: 100, shares: 700, marketValue: 70000, duration: 6.0, convexity: 50.0, sector: 'Government', assetClass: 'FIXED_INCOME' }
  ]
};

// Total Baseline NAV = 30000 + 30000 + 20000 + 70000 + 50000 (cash) = 200,000

const sampleScenario = {
  id: 'SCEN-STRESS-MIXED',
  name: 'Mixed Multi-Asset Shock',
  scenarioType: ScenarioType.HYPOTHETICAL_STRESS,
  shocks: [
    { targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT, shockValue: -0.10, betaAdjusted: true },
    { targetType: 'FACTOR', target: 'RATE_US_10Y', shockUnit: ShockUnit.BPS, shockValue: 100 }, // +100 bps
    { targetType: 'SECTOR', target: 'Healthcare', shockUnit: ShockUnit.PERCENT, shockValue: 0.05 } // +5% defensive boost
  ]
};

const result = aggregatePortfolioScenario(samplePortfolio, sampleScenario);

// 1. Baseline NAV verification
testAssert(result.baseline.nav === 200000, `Baseline NAV is 200,000, got ${result.baseline.nav}`);
testAssert(result.baseline.positionsValue === 150000, `Baseline Positions Value is 150,000, got ${result.baseline.positionsValue}`);
testAssert(result.baseline.cash === 50000, `Baseline Cash is 50,000`);
testAssert(result.baseline.status === ValueStatus.DERIVED, 'Baseline status is DERIVED');

// 2. Position Stressed Calculations
// AAPL: beta 1.2 * -10% = -12% -> price = 150 * 0.88 = 132 -> marketValue = 132 * 200 = 26,400 (PnL: -3600)
const aaplRes = result.positions.find(p => p.ticker === 'AAPL');
testAssert(Math.abs(aaplRes.stressed.marketValue - 26400) < 1e-8, `AAPL stressed market value is 26,400, got ${aaplRes.stressed.marketValue}`);
testAssert(Math.abs(aaplRes.deltas.pnlDollar - (-3600)) < 1e-8, 'AAPL PnL dollar is -3600');
testAssert(Math.abs(aaplRes.deltas.contributionToNavPercent - (-3600 / 200000)) < 1e-8, 'AAPL contribution to NAV is -1.8%');

// MSFT: beta 1.1 * -10% = -11% -> price = 300 * 0.89 = 267 -> marketValue = 267 * 100 = 26,700 (PnL: -3300)
const msftRes = result.positions.find(p => p.ticker === 'MSFT');
testAssert(Math.abs(msftRes.stressed.marketValue - 26700) < 1e-8, `MSFT stressed market value is 26,700`);

// JNJ: beta 0.6 * -10% (-6%) + Sector shock Healthcare +5% = net -1% -> price = 160 * 0.99 = 158.4 -> marketValue = 158.4 * 125 = 19,800 (PnL: -200)
const jnjRes = result.positions.find(p => p.ticker === 'JNJ');
testAssert(Math.abs(jnjRes.stressed.marketValue - 19800) < 1e-8, `JNJ stressed market value is 19,800, got ${jnjRes.stressed.marketValue}`);

// UST10Y: duration 6.0, deltaYield = +0.01 (+100 bps), convexity 50.0
// Price shock = -6.0 * 0.01 + 0.5 * 50 * (0.01^2) = -0.06 + 25 * 0.0001 = -0.06 + 0.0025 = -0.0575 (-5.75%)
// Stressed price = 100 * (1 - 0.0575) = 94.25 -> marketValue = 94.25 * 700 = 65,975 (PnL: -4025)
const bondRes = result.positions.find(p => p.ticker === 'UST10Y');
testAssert(Math.abs(bondRes.stressed.marketValue - 65975) < 1e-8, `Bond stressed market value is 65,975, got ${bondRes.stressed.marketValue}`);

// 3. Stressed Total NAV
// Stressed Positions = 26400 + 26700 + 19800 + 65975 = 138,875
// Stressed Total NAV = 138,875 + 50,000 = 188,875
// Portfolio PnL = 188,875 - 200,000 = -11,125 (-5.5625%)
testAssert(Math.abs(result.stressed.positionsValue - 138875) < 1e-8, `Stressed positions value is 138,875`);
testAssert(Math.abs(result.stressed.nav - 188875) < 1e-8, `Stressed NAV is 188,875, got ${result.stressed.nav}`);
testAssert(Math.abs(result.deltas.pnlDollar - (-11125)) < 1e-8, `Portfolio PnL dollar is -11,125`);
testAssert(Math.abs(result.deltas.pnlPercent - (-0.055625)) < 1e-8, `Portfolio PnL percent is -5.5625%`);

// 4. Sector Attribution Verification
const techSector = result.sectorAttribution.find(s => s.sector === 'Information Technology');
testAssert(techSector !== undefined, 'Technology sector attribution present');
testAssert(techSector.baselineValue === 60000, 'Tech baseline value is 60,000');
testAssert(Math.abs(techSector.stressedValue - 53100) < 1e-8, 'Tech stressed value is 53,100');
testAssert(Math.abs(techSector.pnlDollar - (-6900)) < 1e-8, 'Tech PnL dollar is -6,900');
testAssert(Math.abs(techSector.contributionToNavPercent - (-6900 / 200000)) < 1e-8, 'Tech contribution to NAV is -3.45%');

// 5. Asset Class Attribution Verification
const eqClass = result.assetClassAttribution.find(a => a.assetClass === 'EQUITY');
testAssert(eqClass !== undefined, 'Equity asset class attribution present');
testAssert(eqClass.baselineValue === 80000, 'Equity baseline value is 80,000');
testAssert(Math.abs(eqClass.stressedValue - 72900) < 1e-8, 'Equity stressed value is 72,900');

// 6. Top Gainers & Losers Ranking
testAssert(result.topLosers[0].ticker === 'AAPL', `Top loser is AAPL (-12% price return)`);
testAssert(result.topGainers[0].ticker === 'JNJ', `Top gainer is JNJ (-1% price return relative to portfolio)`);

// 7. Weight Drift Verification
testAssert(aaplRes.baseline.weight === 30000 / 200000, 'AAPL baseline weight is 15%');
testAssert(Math.abs(aaplRes.stressed.weight - (26400 / 188875)) < 1e-6, 'AAPL stressed weight updated correctly');

console.log(`[PASS] Phase 19 Portfolio Aggregation tests passed: ${assertionCount} assertions`);

export default { assertionCount };
