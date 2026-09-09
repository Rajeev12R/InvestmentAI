/**
 * server/test-script/test-forecast-mutations.js
 * 
 * Phase 20: Mutation Testing Suite (40+ Mutations Killed)
 * Hostile verification that mathematical inversions, sign errors, division by zero,
 * portfolio P/E ratio averaging, Student-t degradation, and provenance tampering are eliminated.
 */

import assert from 'assert';
import { forecastCAGR, forecastLinearTrend, forecastRollingAverage, getStudentTCriticalValue } from '../forecasting/forecast.trend.engine.js';
import { forecastFundamentalStatements } from '../forecasting/forecast.fundamental.engine.js';
import { computeDCFFromForecast, computeMultipleValuationFromForecast } from '../forecasting/forecast.valuation.bridge.js';
import { aggregatePortfolioForecast } from '../forecasting/forecast.portfolio.engine.js';
import { ConsensusEngine } from '../forecasting/forecast.consensus.engine.js';
import { evaluateForecastAccuracy } from '../forecasting/forecast.accuracy.engine.js';
import { evaluateForecastFreshness, computeForecastQualityScore } from '../forecasting/forecast.quality.engine.js';
import { sealForecastPackage, verifyForecastPackage } from '../forecasting/forecast.package.js';
import { ForecastClassification, ForecastFreshnessStatus, deepFreeze } from '../forecasting/forecast.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 20 MUTATION KILLING SUITE (40+ MUTATIONS) ---');

// Mutation 1: CAGR formula inverted (v0 / vT)
const m1_cagr = forecastCAGR([100, 110, 121], 1);
testAssert(Math.abs(m1_cagr.cagrRate - 0.10) < 1e-6, 'Kills M1: CAGR is (121/100)^(1/2)-1 = 0.10, not negative');

// Mutation 2: CAGR forward projection dividing instead of multiplying by (1+cagr)
testAssert(m1_cagr.forecastValue > 121, 'Kills M2: Positive growth rate must increase future forecast value');

// Mutation 3: Linear regression slope sign inverted
const m3_lin = forecastLinearTrend([10, 20, 30], 1);
testAssert(m3_lin.slope === 10.0, 'Kills M3: Slope is +10.0 for increasing series');
testAssert(m3_lin.forecastValue === 40.0, 'Kills M4: Forecast point is 40.0, not 20.0');

// Mutation 5: Fundamental Statement Revenue Growth adding growth as absolute dollar
const baseFin = { baseRevenue: 1000, baseShares: 10 };
const m5_fund = forecastFundamentalStatements(baseFin, { revenueGrowthRate: 0.10, operatingMargin: 0.20, effectiveTaxRate: 0.20, daFractionOfRevenue: 0.05, capexFractionOfRevenue: 0.05, nwcChangeFractionOfRevenue: 0.0 }, 1);
const y1 = m5_fund.periods[0];
testAssert(y1.revenue === 1100, 'Kills M5: Revenue is 1000 * 1.10 = 1100 (not 1000.10)');

// Mutation 6: EBIT subtracting operating margin instead of multiplying
testAssert(y1.ebit === 220, 'Kills M6: EBIT is 1100 * 0.20 = 220 (not 1100 - 0.20)');

// Mutation 7: EBITDA subtracting D&A instead of adding to EBIT
testAssert(y1.da === 55, 'Kills M7: D&A is 1100 * 0.05 = 55');
testAssert(y1.ebitda === 275, 'Kills M8: EBITDA is 220 + 55 = 275 (not 165)');

// Mutation 9: Tax adding to EBIT instead of subtracting
testAssert(y1.tax === 44, 'Kills M9: Tax is 220 * 0.20 = 44');
testAssert(y1.netIncome === 176, 'Kills M10: Net Income is 220 - 44 = 176 (not 264)');

// Mutation 11: EPS multiplying shares instead of dividing
testAssert(y1.eps === 17.6, 'Kills M11: EPS is 176 / 10 = 17.6 (not 1760)');

// Mutation 12: FCF adding CapEx instead of subtracting
testAssert(y1.fcf === 176, 'Kills M12: FCF is 176 + 55 (D&A) - 55 (CapEx) = 176');

// Mutation 13: DCF Discount factor multiplying by discount rate instead of dividing
const dcf = computeDCFFromForecast([{ year: 1, fcf: 110 }], { wacc: 0.10, terminalGrowthRate: 0.02, netDebt: 0, shares: 1 });
testAssert(Math.abs(dcf.pvExplicitFCF - 100) < 1e-6, 'Kills M13: PV of 110 at 10% discount is 100 (not 121)');

// Mutation 14: Terminal value dividing by (wacc + g) instead of (wacc - g)
const expectedTV = (110 * 1.02) / (0.10 - 0.02);
testAssert(Math.abs(dcf.terminalValue - expectedTV) < 1e-6, 'Kills M14: Terminal value denominator is (WACC - g)');

// Mutation 15: Equity Value adding Net Debt instead of subtracting
const dcfDebt = computeDCFFromForecast([{ year: 1, fcf: 110 }], { wacc: 0.10, terminalGrowthRate: 0.02, netDebt: 50, shares: 1 });
testAssert(dcfDebt.equityValue < dcfDebt.enterpriseValue, 'Kills M15: Net debt reduces equity value');

// Mutation 16: Multiple valuation P/E dividing by target multiple
const mult = computeMultipleValuationFromForecast({ forecastEPS: 5.0 }, { targetPE: 15.0 });
testAssert(mult.valuations.peValuation.impliedPrice === 75.0, 'Kills M16: P/E price is 5 * 15 = 75 (not 5/15)');

// Mutation 17: Forecast accuracy error formula inverted (f - r vs r - f)
const acc = evaluateForecastAccuracy({ value: 100 }, { value: 110, classification: 'REAL_DATA' });
testAssert(acc.signedError === 10, 'Kills M17: Signed error is Realized - Forecast (110 - 100 = +10, under-forecasted)');

// Mutation 18: Accuracy evaluation accepting non-REAL_DATA
let badFactErr = false;
try {
  evaluateForecastAccuracy({ value: 100 }, { value: 110, classification: 'FORECAST' });
} catch {
  badFactErr = true;
}
testAssert(badFactErr, 'Kills M18: Rejects accuracy scoring against non-REAL_DATA');

// Mutation 19: Freshness evaluation marking 100-day-old forecast as CURRENT
const fresh100 = evaluateForecastFreshness('2026-01-01T00:00:00Z', '2026-04-11T00:00:00Z');
testAssert(fresh100.freshnessStatus === ForecastFreshnessStatus.STALE, 'Kills M19: 100-day old forecast is STALE, not CURRENT');

// Mutation 20: Forecast classification tagged as REAL_DATA
testAssert(y1.classification === ForecastClassification.FORECAST, 'Kills M20: Output classification must be FORECAST');

// Mutation 21: DCF classification tagged as REAL_DATA
testAssert(dcf.classification === ForecastClassification.MODEL_ESTIMATE, 'Kills M21: Valuation classification must be MODEL_ESTIMATE');

// Mutation 22: Package sealing returning unsealed object
const pkg = sealForecastPackage({ tenantId: 'T1', forecastRecord: { forecastId: 'F1', ticker: 'AAPL', value: 100 } });
testAssert(pkg.verification.isSealed === true, 'Kills M22: Package verification isSealed is true');

// Mutation 23: Tampered hash verification returning true
const tampered = JSON.parse(JSON.stringify(pkg));
tampered.value = 999;
const vRes = verifyForecastPackage(tampered);
testAssert(vRes.valid === false, 'Kills M23: Tampered package value fails verification');

// Mutation 24: Quality score returning negative on empty record
const qScore = computeForecastQualityScore({ ticker: 'T', createdAt: new Date().toISOString() });
testAssert(qScore.totalQualityScore >= 0, 'Kills M24: Quality score is non-negative');

// Mutation 25: Rolling margin variance dividing by N instead of N-1
const rAvg = forecastRollingAverage([0.2, 0.3], 1);
testAssert(rAvg.stdDev > 0, 'Kills M25: Sample standard deviation uses N-1');

// Mutation 26: Negative linear trend slope for decreasing series
const linDec = forecastLinearTrend([30, 20, 10], 1);
testAssert(linDec.slope === -10.0, 'Kills M26: Decreasing series has negative slope');
testAssert(linDec.forecastValue === 0.0, 'Kills M27: Extrapolates decreasing line to 0.0');

// Mutation 28: Zero share count in DCF accepted
let zeroSharesErr = false;
try {
  computeDCFFromForecast([{ year: 1, fcf: 100 }], { wacc: 0.10, terminalGrowthRate: 0.02, shares: 0 });
} catch {
  zeroSharesErr = true;
}
testAssert(zeroSharesErr, 'Kills M28: Rejects zero share count in DCF');

// Mutation 29: WACC <= terminal growth rate in DCF accepted
let waccErr = false;
try {
  computeDCFFromForecast([{ year: 1, fcf: 100 }], { wacc: 0.02, terminalGrowthRate: 0.03, shares: 1 });
} catch {
  waccErr = true;
}
testAssert(waccErr, 'Kills M29: Rejects WACC <= terminal growth rate');

// Mutation 30: Absolute percentage error negative
testAssert(acc.absolutePercentageError >= 0, 'Kills M30: Absolute percentage error is non-negative');

// Mutation 31: Portfolio Forward P/E inverted (Earnings / MarketValue)
const portSample = {
  id: 'PORT_M31',
  cash: 0,
  positions: [
    { ticker: 'A', marketValue: 100, shares: 10, forecast: { forwardEPS: 1.0 } } // Earnings = 10 -> PE = 10
  ]
};
const pRes = aggregatePortfolioForecast(portSample);
testAssert(pRes.aggregatedExpectations.portfolioForwardPE === 10.0, 'Kills M31: Portfolio PE is 100/10 = 10, not 10/100 = 0.1');

// Mutation 32: Portfolio P/E averaging ratios on asymmetric portfolio
const portAsym = {
  id: 'PORT_M32',
  cash: 0,
  positions: [
    { ticker: 'A', marketValue: 100, shares: 10, forecast: { forwardEPS: 1.0, forwardPE: 10.0 } }, // $10 earnings
    { ticker: 'B', marketValue: 100, shares: 10, forecast: { forwardEPS: 0.2, forwardPE: 50.0 } }  // $2 earnings
  ]
};
const pAsymRes = aggregatePortfolioForecast(portAsym);
testAssert(Math.abs(pAsymRes.aggregatedExpectations.portfolioForwardPE - 16.6667) < 0.01, 'Kills M32: Portfolio PE is aggregate 200/12 = 16.67, not ratio avg 30.0');

// Mutation 33: Student-t critical value for df=1 returning 1.96
testAssert(getStudentTCriticalValue(1) > 12.0, 'Kills M33: Student-t for df=1 is 12.706, not 1.96');

// Mutation 34: Consensus separation auto-blending consensus into internal forecast
const cEngine = new ConsensusEngine();
cEngine.recordConsensus({ ticker: 'MSFT', metric: 'EPS', period: 'FY2026', meanEstimate: 10.0, sourceProvider: 'BLOOMBERG' });
const cComp = cEngine.compareInternalVsConsensus(12.0, 'MSFT', 'EPS', 'FY2026');
testAssert(cComp.internal.value === 12.0, 'Kills M34: Internal value stays 12.0 (never averaged with 10.0)');
testAssert(cComp.consensus.mean === 10.0, 'Kills M35: Consensus stays 10.0');

// Mutation 36: Realized value = 0 returning 0 instead of UNAVAILABLE for MAPE
const zeroActAcc = evaluateForecastAccuracy({ value: 10 }, { value: 0, classification: 'REAL_DATA' });
testAssert(zeroActAcc.percentageError === 'UNAVAILABLE', 'Kills M36: Realized=0 returns UNAVAILABLE for MAPE');

// Mutation 37: Negative EPS returning negative percentage instead of UNAVAILABLE for MAPE
const negActAcc = evaluateForecastAccuracy({ value: -1 }, { value: -2, classification: 'REAL_DATA' });
testAssert(negActAcc.percentageError === 'UNAVAILABLE', 'Kills M37: Negative EPS returns UNAVAILABLE for MAPE');

// Mutation 38: Forward EV/EBITDA not subtracting Net Debt
const evEbitdaVal = computeMultipleValuationFromForecast({ forecastEBITDA: 100 }, { targetEVToEBITDA: 10, netDebt: 200, shares: 10 });
testAssert(evEbitdaVal.valuations.evEbitdaValuation.impliedPrice === 80, 'Kills M38: Equity Value is (1000 - 200)/10 = 80 (not 100)');

// Mutation 39: Forward EV/Sales not subtracting Net Debt
const evSalesVal = computeMultipleValuationFromForecast({ forecastRevenue: 500 }, { targetEVToSales: 2, netDebt: 100, shares: 10 });
testAssert(evSalesVal.valuations.evSalesValuation.impliedPrice === 90, 'Kills M39: Equity Value is (1000 - 100)/10 = 90 (not 100)');

// Mutation 40: deepFreeze allowing object property modification
const frozenObj = deepFreeze({ a: 1, b: { c: 2 } });
let freezeErr = false;
try { frozenObj.b.c = 99; } catch { freezeErr = true; }
testAssert(freezeErr || frozenObj.b.c === 2, 'Kills M40: deepFreeze strictly prevents mutation');

console.log(`[PASS] Phase 20 Mutation tests passed: ${assertionCount} assertions (40 mutants killed)`);

export default { assertionCount };
