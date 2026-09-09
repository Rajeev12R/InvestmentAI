/**
 * test-synthesis-portfolio-brief.js
 * Suite 9: Portfolio Research Brief & Cross-Domain Interaction Tests
 */

import assert from 'assert';
import { defaultPortfolioResearchSynthesisEngine } from '../researchSynthesis/synthesis.portfolio.engine.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 9: Portfolio Research Brief Tests ---');

const portInput = {
  portfolioId: 'INSTITUTIONAL_ALPHA_FUND',
  totalGrossValue: 15000000,
  totalNetValue: 14000000,
  cashReserve: 1000000,
  performance: {
    ytdReturnPct: 16.5,
    benchmarkReturnPct: 12.0,
    activeReturnPct: 4.5,
    allocationEffectBps: 180,
    selectionEffectBps: 270
  },
  commonDrivers: {
    driverHHI: 2400,
    effectiveNumberOfDrivers: 4.17,
    top3DriverConcentrationPct: 71.2
  },
  sharedRisks: {
    totalSharedRisksCount: 3
  },
  macro: {
    currentRegime: 'HAWKISH_TIGHTENING',
    portfolioDurationYears: 2.1
  }
};

const brief = defaultPortfolioResearchSynthesisEngine.synthesizePortfolioBrief(portInput);

testAssert(brief.portfolioId === 'INSTITUTIONAL_ALPHA_FUND', 'Portfolio ID preserved');
testAssert(brief.performance.activeReturnPct === 4.5, 'Active return calculated');
testAssert(brief.performance.allocationEffectBps === 180, 'Allocation effect captured');
testAssert(brief.commonDrivers.driverHHI === 2400, 'Driver HHI captured');
testAssert(brief.commonDrivers.top3DriverConcentrationPct === 71.2, 'Top 3 driver concentration captured');
testAssert(brief.sharedRisks.totalSharedRisksCount === 3, 'Shared risks count captured');

// Cross-domain transmission checks
testAssert(brief.macroTransmission.rateShockTransmission.length === 4, '4-step rate shock transmission mapped');
testAssert(brief.macroTransmission.rateShockTransmission[0].domain === 'MACRO', 'Step 1 is MACRO');
testAssert(brief.macroTransmission.rateShockTransmission[1].domain === 'SECURITY_VALUATION', 'Step 2 is SECURITY_VALUATION');
testAssert(brief.macroTransmission.rateShockTransmission[2].domain === 'PORTFOLIO_IMPACT', 'Step 3 is PORTFOLIO_IMPACT');
testAssert(brief.macroTransmission.rateShockTransmission[3].domain === 'LIQUIDITY_REBALANCE', 'Step 4 is LIQUIDITY_REBALANCE');

console.log(`[PASS] Suite 9 Portfolio Research Brief passed: ${assertionCount} assertions`);
export default { assertionCount };
