/**
 * server/test-script/test-scenario-comparison.js
 * 
 * Phase 19: Multi-Scenario Comparison & Divergence Analysis Tests
 */

import assert from 'assert';
import { compareScenarios } from '../scenario/scenario.comparison.js';
import { ShockUnit, ScenarioType, ValueStatus } from '../scenario/scenario.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 19 SCENARIO COMPARISON TESTS ---');

const portfolio = {
  id: 'PORT-COMPARE-01',
  currency: 'USD',
  cash: 10000,
  positions: [
    { ticker: 'AAPL', price: 150, shares: 200, marketValue: 30000, beta: 1.2, sector: 'Information Technology', assetClass: 'EQUITY' },
    { ticker: 'XOM', price: 100, shares: 300, marketValue: 30000, beta: 0.8, sector: 'Energy', assetClass: 'EQUITY' }
  ]
};
// Baseline NAV = 30000 + 30000 + 10000 = 70,000

const scenMild = {
  id: 'SCEN-MILD',
  name: 'Mild Market Pullback',
  scenarioType: ScenarioType.HYPOTHETICAL_STRESS,
  shocks: [
    { targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT, shockValue: -0.05, betaAdjusted: true }
  ]
};

const scenSevere = {
  id: 'SCEN-SEVERE',
  name: 'Severe Market Crash',
  scenarioType: ScenarioType.HYPOTHETICAL_STRESS,
  shocks: [
    { targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT, shockValue: -0.25, betaAdjusted: true }
  ]
};

const scenTechCrash = {
  id: 'SCEN-TECH',
  name: 'Tech Sector Crash Only',
  scenarioType: ScenarioType.HYPOTHETICAL_STRESS,
  shocks: [
    { targetType: 'SECTOR', target: 'Information Technology', shockUnit: ShockUnit.PERCENT, shockValue: -0.30 }
  ]
};

const compResult = compareScenarios(portfolio, [scenMild, scenSevere, scenTechCrash]);

// 1. Structure Verification
testAssert(compResult.scenarioCount === 3, 'scenarioCount is 3');
testAssert(compResult.scenarios.length === 3, 'Summary comparison contains 3 entries');
testAssert(compResult.status === ValueStatus.SCENARIO_OUTPUT, 'Status is SCENARIO_OUTPUT');

// 2. Scenario 1 (Mild): AAPL -6% (-1800), XOM -4% (-1200) -> Total PnL = -3000 -> Stressed NAV = 67,000
const mildSumm = compResult.scenarios.find(s => s.scenarioId === 'SCEN-MILD');
testAssert(mildSumm.stressedNav === 67000, `Mild stressed NAV is 67,000, got ${mildSumm.stressedNav}`);
testAssert(mildSumm.pnlDollar === -3000, `Mild PnL is -3000`);

// 3. Scenario 2 (Severe): AAPL -30% (-9000), XOM -20% (-6000) -> Total PnL = -15000 -> Stressed NAV = 55,000
const severeSumm = compResult.scenarios.find(s => s.scenarioId === 'SCEN-SEVERE');
testAssert(severeSumm.stressedNav === 55000, `Severe stressed NAV is 55,000, got ${severeSumm.stressedNav}`);
testAssert(severeSumm.pnlDollar === -15000, `Severe PnL is -15,000`);

// 4. Scenario 3 (Tech Crash): AAPL -30% (-9000), XOM 0% -> Total PnL = -9000 -> Stressed NAV = 61,000
const techSumm = compResult.scenarios.find(s => s.scenarioId === 'SCEN-TECH');
testAssert(techSumm.stressedNav === 61000, `Tech crash stressed NAV is 61,000, got ${techSumm.stressedNav}`);
testAssert(techSumm.pnlDollar === -9000, `Tech crash PnL is -9000`);

// 5. Pairwise Spreads Verification
testAssert(compResult.pairwiseSpreads.length === 2, 'Two pairwise spreads against base scenario');
const spreadMildSevere = compResult.pairwiseSpreads.find(s => s.scenarioB === 'SCEN-SEVERE');
testAssert(spreadMildSevere.navSpreadDollar === -12000, `Severe is $12,000 worse than Mild: got ${spreadMildSevere.navSpreadDollar}`);
testAssert(spreadMildSevere.moreSevere === 'SCEN-SEVERE', 'Severe identified as more severe');

// 6. Cross-Scenario Position Matrix Verification
testAssert(compResult.positionMatrix.length === 2, 'Position matrix has 2 rows (AAPL, XOM)');
const aaplRow = compResult.positionMatrix.find(r => r.ticker === 'AAPL');
testAssert(aaplRow.scenarios['SCEN-MILD'].pnlDollar === -1800, 'AAPL Mild PnL is -1800');
testAssert(aaplRow.scenarios['SCEN-SEVERE'].pnlDollar === -9000, 'AAPL Severe PnL is -9000');
testAssert(aaplRow.scenarios['SCEN-TECH'].pnlDollar === -9000, 'AAPL Tech crash PnL is -9000');

const xomRow = compResult.positionMatrix.find(r => r.ticker === 'XOM');
testAssert(xomRow.scenarios['SCEN-TECH'].pnlDollar === 0, 'XOM unaffected by tech crash (PnL = 0)');

console.log(`[PASS] Phase 19 Scenario Comparison tests passed: ${assertionCount} assertions`);

export default { assertionCount };
